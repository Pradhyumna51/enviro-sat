"""
Model Calibration & Temperature Scaling module for EuroSAT Land-Use Classifier.
Computes Expected Calibration Error (ECE) and fits optimal temperature scaling parameter T.
"""

import argparse
import json
import os
from pathlib import Path
from typing import Dict, Tuple, Any, List

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import matplotlib.pyplot as plt
from torch.utils.data import DataLoader

from data.dataset import CLASSES
from data.split import find_dataset_root
from model.train import SubsplitDataset, get_transforms, build_model


def compute_ece(
    logits: torch.Tensor,
    labels: torch.Tensor,
    n_bins: int = 10
) -> Tuple[float, float, Dict[str, Any]]:
    """
    Compute Expected Calibration Error (ECE) and Maximum Calibration Error (MCE).
    
    Args:
        logits (torch.Tensor): Model raw output logits (N, num_classes)
        labels (torch.Tensor): Ground truth labels (N,)
        n_bins (int): Number of confidence bins
        
    Returns:
        Tuple[float, float, Dict]: (ece, mce, bin_details)
    """
    softmaxes = torch.softmax(logits, dim=1)
    confidences, predictions = torch.max(softmaxes, dim=1)
    accuracies = predictions.eq(labels)

    bin_boundaries = torch.linspace(0, 1, n_bins + 1)
    ece = 0.0
    mce = 0.0
    total_samples = len(labels)

    bin_accs = []
    bin_confs = []
    bin_sizes = []

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        # Samples in this confidence bin
        in_bin = confidences.gt(bin_lower.item()) & confidences.le(bin_upper.item())
        prop_in_bin = in_bin.float().mean().item()
        bin_size = in_bin.sum().item()
        bin_sizes.append(bin_size)

        if bin_size > 0:
            accuracy_in_bin = accuracies[in_bin].float().mean().item()
            avg_confidence_in_bin = confidences[in_bin].mean().item()

            abs_diff = abs(avg_confidence_in_bin - accuracy_in_bin)
            ece += abs_diff * (bin_size / total_samples)
            mce = max(mce, abs_diff)

            bin_accs.append(accuracy_in_bin)
            bin_confs.append(avg_confidence_in_bin)
        else:
            bin_accs.append(0.0)
            bin_confs.append(0.0)

    bin_details = {
        "bin_boundaries": bin_boundaries.tolist(),
        "bin_accs": bin_accs,
        "bin_confs": bin_confs,
        "bin_sizes": bin_sizes
    }

    return float(ece), float(mce), bin_details


class ModelWithTemperature(nn.Module):
    """
    Model wrapper that performs Temperature Scaling calibration.
    Output probabilities: Softmax(logits / T)
    """

    def __init__(self, model: nn.Module):
        super(ModelWithTemperature, self).__init__()
        self.model = model
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, input: torch.Tensor) -> torch.Tensor:
        logits = self.model(input)
        return self.scale_logits(logits)

    def scale_logits(self, logits: torch.Tensor) -> torch.Tensor:
        """Scale logits by temperature parameter T."""
        temperature = self.temperature.unsqueeze(1).expand(logits.size(0), logits.size(1))
        return logits / temperature

    def set_temperature(self, val_loader: DataLoader, device: torch.device) -> float:
        """
        Tune temperature parameter T on validation set using L-BFGS to minimize CrossEntropyLoss (NLL).
        """
        self.to(device)
        self.eval()

        nll_criterion = nn.CrossEntropyLoss().to(device)

        # Collect validation logits and labels
        logits_list = []
        labels_list = []
        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device)
                logits = self.model(images)
                logits_list.append(logits)
                labels_list.append(labels)

        val_logits = torch.cat(logits_list).to(device)
        val_labels = torch.cat(labels_list).to(device)

        # Calculate ECE before temperature scaling (T=1.0)
        ece_before, mce_before, _ = compute_ece(val_logits, val_labels)
        print(f"Validation ECE Before Calibration (T=1.000): {ece_before*100:.2f}% | MCE: {mce_before*100:.2f}%")

        # Optimize temperature T using L-BFGS
        optimizer = optim.LBFGS([self.temperature], lr=0.01, max_iter=50)

        def eval_loss():
            optimizer.zero_grad()
            loss = nll_criterion(self.scale_logits(val_logits), val_labels)
            loss.backward()
            return loss

        optimizer.step(eval_loss)

        optimal_temp = float(self.temperature.item())
        ece_after, mce_after, _ = compute_ece(self.scale_logits(val_logits), val_labels)
        print(f"Validation ECE After Calibration  (T={optimal_temp:.3f}): {ece_after*100:.2f}% | MCE: {mce_after*100:.2f}%")

        return optimal_temp


def plot_and_save_reliability_diagram(
    before_details: Dict[str, Any],
    after_details: Dict[str, Any],
    ece_before: float,
    ece_after: float,
    temp: float,
    save_path: Path
):
    """
    Plot side-by-side reliability diagrams (Calibration Curves) Before and After Calibration.
    """
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    bins = np.linspace(0.0, 1.0, 11)
    bin_centers = (bins[:-1] + bins[1:]) / 2.0

    # 1. Before Calibration Plot
    ax1 = axes[0]
    ax1.plot([0, 1], [0, 1], "k--", label="Perfect Calibration")
    accs_before = before_details["bin_accs"]
    confs_before = before_details["bin_confs"]
    valid_mask_b = [size > 0 for size in before_details["bin_sizes"]]

    ax1.bar(bin_centers, accs_before, width=0.08, alpha=0.6, color="salmon", edgecolor="black", label="Model Accuracy")
    ax1.scatter(np.array(confs_before)[valid_mask_b], np.array(accs_before)[valid_mask_b], color="darkred", zorder=3, label="Avg Confidence")
    ax1.set_title(f"Uncalibrated (T = 1.00)\nECE = {ece_before*100:.2f}%", fontsize=12, fontweight='bold')
    ax1.set_xlabel("Confidence", fontsize=11)
    ax1.set_ylabel("Accuracy", fontsize=11)
    ax1.set_xlim(0, 1)
    ax1.set_ylim(0, 1)
    ax1.grid(True, linestyle="--", alpha=0.5)
    ax1.legend(loc="upper left")

    # 2. After Calibration Plot
    ax2 = axes[1]
    ax2.plot([0, 1], [0, 1], "k--", label="Perfect Calibration")
    accs_after = after_details["bin_accs"]
    confs_after = after_details["bin_confs"]
    valid_mask_a = [size > 0 for size in after_details["bin_sizes"]]

    ax2.bar(bin_centers, accs_after, width=0.08, alpha=0.6, color="teal", edgecolor="black", label="Model Accuracy")
    ax2.scatter(np.array(confs_after)[valid_mask_a], np.array(accs_after)[valid_mask_a], color="darkgreen", zorder=3, label="Avg Confidence")
    ax2.set_title(f"Calibrated (T = {temp:.3f})\nECE = {ece_after*100:.2f}%", fontsize=12, fontweight='bold')
    ax2.set_xlabel("Confidence", fontsize=11)
    ax2.set_ylabel("Accuracy", fontsize=11)
    ax2.set_xlim(0, 1)
    ax2.set_ylim(0, 1)
    ax2.grid(True, linestyle="--", alpha=0.5)
    ax2.legend(loc="upper left")

    plt.suptitle("EuroSAT Model Reliability Diagram (Calibration Curve)", fontsize=14, fontweight='bold', y=1.02)
    save_path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Reliability diagram saved to: {save_path}")


def run_calibration_pipeline(
    model_name: str = "resnet50",
    split_type: str = "spatial",
    splits_json_path: str = "./data/processed/splits.json",
    checkpoint_path: str = None,
    output_dir: str = "./reports"
) -> Dict[str, Any]:
    """Run temperature scaling calibration pipeline and evaluate ECE reduction."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Running Temperature Scaling Calibration for {model_name} ({split_type} split) on device={device}...")

    splits_file = Path(splits_json_path).resolve()
    with open(splits_file, "r") as f:
        splits_data = json.load(f)

    dataset_root = Path(splits_data["dataset_root"])
    val_paths = splits_data[f"{split_type}_split"]["splits"]["val"]
    test_paths = splits_data[f"{split_type}_split"]["splits"]["test"]

    _, val_tf = get_transforms()
    val_ds = SubsplitDataset(dataset_root, val_paths, transform=val_tf)
    test_ds = SubsplitDataset(dataset_root, test_paths, transform=val_tf)

    val_loader = DataLoader(val_ds, batch_size=64, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False, num_workers=0)

    base_model = build_model(model_name=model_name, num_classes=len(CLASSES), pretrained=True)

    if checkpoint_path is None:
        checkpoint_path = f"./model/checkpoints/{model_name}_{split_type}.pth"

    ckpt_file = Path(checkpoint_path).resolve()
    if ckpt_file.exists():
        print(f"Loading checkpoint from {ckpt_file}...")
        checkpoint = torch.load(ckpt_file, map_location=device)
        base_model.load_state_dict(checkpoint["model_state_dict"])
    else:
        print(f"Notice: Checkpoint {ckpt_file} not found. Running calibration on pretrained baseline backbone.")

    calibrated_model = ModelWithTemperature(base_model)
    optimal_temp = calibrated_model.set_temperature(val_loader, device=device)

    # Evaluate Test Set ECE before and after calibration
    calibrated_model.eval()
    test_logits_list = []
    test_labels_list = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            logits = base_model(images)
            test_logits_list.append(logits)
            test_labels_list.append(labels)

    test_logits = torch.cat(test_logits_list).to(device)
    test_labels = torch.cat(test_labels_list).to(device)

    ece_before, mce_before, details_before = compute_ece(test_logits, test_labels)
    scaled_test_logits = calibrated_model.scale_logits(test_logits)
    ece_after, mce_after, details_after = compute_ece(scaled_test_logits, test_labels)

    print(f"\n--- Test Set Calibration Results ({split_type} split) ---")
    print(f"  Uncalibrated ECE (T=1.000): {ece_before*100:.2f}% | MCE: {mce_before*100:.2f}%")
    print(f"  Calibrated ECE   (T={optimal_temp:.3f}): {ece_after*100:.2f}% | MCE: {mce_after*100:.2f}%")
    print(f"  Absolute ECE Reduction:     {(ece_before - ece_after)*100:.2f}%")

    out_path = Path(output_dir).resolve()
    out_path.mkdir(parents=True, exist_ok=True)

    metrics_file = out_path / "calibration_metrics.json"
    results = {
        "model_name": model_name,
        "split_type": split_type,
        "optimal_temperature": round(optimal_temp, 4),
        "test_ece_before_percent": round(ece_before * 100, 2),
        "test_ece_after_percent": round(ece_after * 100, 2),
        "test_mce_before_percent": round(mce_before * 100, 2),
        "test_mce_after_percent": round(mce_after * 100, 2),
        "ece_reduction_percent": round((ece_before - ece_after) * 100, 2),
        "details_before": details_before,
        "details_after": details_after
    }

    with open(metrics_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Calibration metrics saved to: {metrics_file}")

    chart_file = out_path / "calibration_curve.png"
    plot_and_save_reliability_diagram(details_before, details_after, ece_before, ece_after, optimal_temp, chart_file)

    # Save calibrated model checkpoint
    ckpt_out = Path("./model/checkpoints").resolve()
    ckpt_out.mkdir(parents=True, exist_ok=True)
    calibrated_pth = ckpt_out / f"{model_name}_{split_type}_calibrated.pth"
    torch.save({
        "model_name": model_name,
        "split_type": split_type,
        "optimal_temperature": optimal_temp,
        "base_model_state_dict": base_model.state_dict(),
        "classes": CLASSES
    }, calibrated_pth)
    print(f"Saved calibrated model checkpoint to: {calibrated_pth}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calibrate EuroSAT Land-Use Classifier.")
    parser.add_argument("--model", type=str, default="resnet50", choices=["resnet50", "efficientnet_b0"], help="Model architecture")
    parser.add_argument("--split-type", type=str, default="spatial", choices=["random", "spatial"], help="Dataset split type")
    args = parser.parse_args()

    run_calibration_pipeline(model_name=args.model, split_type=args.split_type)

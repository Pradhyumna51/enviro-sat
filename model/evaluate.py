"""
Evaluation script for EuroSAT baseline models: accuracy, per-class F1 score, and confusion matrix visualizer.
"""

import argparse
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import torch
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from torch.utils.data import DataLoader

from data.dataset import CLASSES
from data.split import find_dataset_root
from model.train import SubsplitDataset, get_transforms, build_model


def plot_and_save_confusion_matrix(
    cm: np.ndarray,
    classes: List[str],
    save_path: Path,
    title: str = "Confusion Matrix"
):
    """Plot and save a styled confusion matrix heatmap figure."""
    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title(title, fontsize=14, pad=12, fontweight='bold')
    plt.colorbar()

    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes, rotation=45, ha="right", fontsize=10)
    plt.yticks(tick_marks, classes, fontsize=10)

    # Normalize values for text color readability
    thresh = cm.max() / 2.0 if cm.max() > 0 else 1.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = cm[i, j]
            color = "white" if val > thresh else "black"
            plt.text(j, i, f"{val}", horizontalalignment="center", verticalalignment="center", color=color, fontsize=9)

    plt.tight_layout()
    plt.ylabel('True Class', fontsize=12)
    plt.xlabel('Predicted Class', fontsize=12)

    save_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Confusion matrix plot saved to: {save_path}")


def evaluate_model(
    model_name: str = "resnet50",
    split_type: str = "spatial",
    splits_json_path: str = "./data/processed/splits.json",
    checkpoint_path: str = None,
    output_dir: str = "./reports"
) -> Dict[str, Any]:
    """
    Run evaluation on the test set for a given model and split type.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    out_path = Path(output_dir).resolve()
    out_path.mkdir(parents=True, exist_ok=True)

    splits_file = Path(splits_json_path).resolve()
    if not splits_file.exists():
        raise FileNotFoundError(f"Splits file {splits_file} not found. Run data/split.py first.")

    with open(splits_file, "r") as f:
        splits_data = json.load(f)

    dataset_root = Path(splits_data["dataset_root"])
    split_key = f"{split_type}_split"
    test_paths = splits_data[split_key]["splits"]["test"]

    _, val_tf = get_transforms()
    test_ds = SubsplitDataset(dataset_root, test_paths, transform=val_tf)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False, num_workers=0)

    model = build_model(model_name=model_name, num_classes=len(CLASSES), pretrained=False).to(device)

    if checkpoint_path is None:
        checkpoint_path = f"./model/checkpoints/{model_name}_{split_type}.pth"

    ckpt_file = Path(checkpoint_path).resolve()
    if ckpt_file.exists():
        print(f"Loading checkpoint from {ckpt_file}...")
        checkpoint = torch.load(ckpt_file, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
    else:
        print(f"Warning: Checkpoint {ckpt_file} not found. Running evaluation on pretrained baseline architecture.")

    model.eval()
    all_preds = []
    all_targets = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    acc = accuracy_score(all_targets, all_preds)
    precision, recall, f1, support = precision_recall_fscore_support(all_targets, all_preds, labels=range(len(CLASSES)), zero_division=0)
    cm = confusion_matrix(all_targets, all_preds, labels=range(len(CLASSES)))

    per_class_f1 = {CLASSES[i]: round(float(f1[i]), 4) for i in range(len(CLASSES))}
    macro_f1 = float(np.mean(f1))
    weighted_f1 = float(np.average(f1, weights=support))

    metrics = {
        "model_name": model_name,
        "split_type": split_type,
        "accuracy": round(float(acc), 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "per_class_f1": per_class_f1,
        "test_sample_count": len(all_targets),
        "confusion_matrix": cm.tolist()
    }

    # Save metrics JSON
    metrics_json_path = out_path / f"metrics_{model_name}_{split_type}.json"
    with open(metrics_json_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to: {metrics_json_path}")

    # Plot & Save Confusion Matrix figure
    cm_fig_path = out_path / f"confusion_matrix_{model_name}_{split_type}.png"
    title_str = f"EuroSAT {model_name} ({split_type.capitalize()} Split) - Acc: {acc*100:.2f}%"
    plot_and_save_confusion_matrix(cm, CLASSES, cm_fig_path, title=title_str)

    return metrics


def compare_split_metrics(
    model_name: str = "resnet50",
    output_dir: str = "./reports"
) -> Dict[str, Any]:
    """Evaluate and compare performance metrics between Random Split and Spatial Split."""
    print(f"\n================ Running Split Comparison for {model_name} ================")
    random_metrics = evaluate_model(model_name=model_name, split_type="random", output_dir=output_dir)
    spatial_metrics = evaluate_model(model_name=model_name, split_type="spatial", output_dir=output_dir)

    gap_acc = round((random_metrics["accuracy"] - spatial_metrics["accuracy"]) * 100, 2)
    gap_f1 = round((random_metrics["macro_f1"] - spatial_metrics["macro_f1"]) * 100, 2)

    summary = {
        "model_name": model_name,
        "random_split_accuracy": random_metrics["accuracy"],
        "spatial_split_accuracy": spatial_metrics["accuracy"],
        "accuracy_generalization_gap_percent": gap_acc,
        "random_split_macro_f1": random_metrics["macro_f1"],
        "spatial_split_macro_f1": spatial_metrics["macro_f1"],
        "macro_f1_gap_percent": gap_f1,
        "random_metrics": random_metrics,
        "spatial_metrics": spatial_metrics
    }

    out_path = Path(output_dir).resolve()
    summary_file = out_path / f"summary_comparison_{model_name}.json"
    with open(summary_file, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nComparison Summary for {model_name}:")
    print(f"  Random Split Accuracy:  {random_metrics['accuracy']*100:.2f}%")
    print(f"  Spatial Split Accuracy: {spatial_metrics['accuracy']*100:.2f}%")
    print(f"  Generalization Gap:     {gap_acc}% accuracy drop under spatial holdout")

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate EuroSAT Classifier & Compare Splits.")
    parser.add_argument("--model", type=str, default="resnet50", choices=["resnet50", "efficientnet_b0"], help="Model architecture")
    parser.add_argument("--split-type", type=str, default="both", choices=["random", "spatial", "both"], help="Split type to evaluate")
    args = parser.parse_args()

    if args.split_type == "both":
        compare_split_metrics(model_name=args.model)
    else:
        evaluate_model(model_name=args.model, split_type=args.split_type)

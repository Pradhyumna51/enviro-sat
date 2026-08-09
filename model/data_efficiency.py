"""
Data Efficiency Benchmark: Label Fraction vs. Classification Accuracy across 3 Regimes:
1. From-Scratch CNN
2. Pretrained Fine-Tuning
3. Frozen Linear Probe
"""

import argparse
import json
import os
import random
import time
from pathlib import Path
from typing import Dict, List, Tuple, Any

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, f1_score

from data.dataset import CLASSES
from data.split import find_dataset_root
from model.train import SubsplitDataset, get_transforms, build_model

LABEL_FRACTIONS = [0.01, 0.05, 0.10, 0.25, 0.50, 1.00]


def get_stratified_subsample(
    dataset_root: Path,
    rel_paths: List[str],
    fraction: float,
    seed: int = 42
) -> List[str]:
    """
    Subsample a fraction of relative paths while preserving class stratification.
    """
    if fraction >= 1.0:
        return rel_paths.copy()

    random.seed(seed)
    by_class: Dict[str, List[str]] = {}
    for p in rel_paths:
        cls_name = p.split("/")[0]
        by_class.setdefault(cls_name, []).append(p)

    subsampled = []
    for cls_name, paths in by_class.items():
        shuffled = paths.copy()
        random.shuffle(shuffled)
        k = max(1, int(len(shuffled) * fraction))
        subsampled.extend(shuffled[:k])

    return subsampled


def train_and_eval_regime(
    model_name: str,
    regime: str,
    train_paths: List[str],
    test_paths: List[str],
    dataset_root: Path,
    epochs: int = 5,
    batch_size: int = 64,
    lr: float = 1e-3,
    device: torch.device = None
) -> Tuple[float, float]:
    """
    Train a model under a specific regime (from_scratch, fine_tuning, frozen_probe)
    and evaluate test accuracy and macro F1 score.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    train_tf, val_tf = get_transforms()
    train_ds = SubsplitDataset(dataset_root, train_paths, transform=train_tf)
    test_ds = SubsplitDataset(dataset_root, test_paths, transform=val_tf)

    train_loader = DataLoader(train_ds, batch_size=min(batch_size, len(train_ds)), shuffle=True, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False, num_workers=0)

    # Build model according to regime
    if regime == "from_scratch":
        model = build_model(model_name=model_name, num_classes=len(CLASSES), pretrained=False)
    elif regime == "fine_tuning":
        model = build_model(model_name=model_name, num_classes=len(CLASSES), pretrained=True)
    elif regime == "frozen_probe":
        model = build_model(model_name=model_name, num_classes=len(CLASSES), pretrained=True)
        # Freeze backbone parameters
        for param in model.parameters():
            param.requires_grad = False
        # Unfreeze head linear classifier
        if hasattr(model, 'fc'):
            for param in model.fc.parameters():
                param.requires_grad = True
        elif hasattr(model, 'classifier'):
            for param in model.classifier.parameters():
                param.requires_grad = True
        elif hasattr(model, 'head'):
            for param in model.head.parameters():
                param.requires_grad = True
    else:
        raise ValueError(f"Unknown regime: {regime}")

    model = model.to(device)
    criterion = nn.CrossEntropyLoss()
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = optim.AdamW(trainable_params, lr=lr, weight_decay=1e-4)

    # Training loop
    model.train()
    for epoch in range(epochs):
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

    # Test evaluation
    model.eval()
    all_preds, all_targets = [], []
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())

    acc = float(accuracy_score(all_targets, all_preds))
    macro_f1 = float(f1_score(all_targets, all_preds, average='macro', zero_division=0))
    return round(acc * 100, 2), round(macro_f1, 4)


def plot_and_save_data_efficiency_chart(
    results: Dict[str, Dict[str, List[float]]],
    fractions: List[float],
    save_path: Path
):
    """
    Plot clean line chart of Test Accuracy vs. Label Fraction across the 3 regimes.
    """
    pct_labels = [f"{int(f * 100)}%" for f in fractions]

    plt.figure(figsize=(10, 6))
    
    style_map = {
        "fine_tuning": {"label": "Pretrained Fine-Tuning", "color": "#2b5c8f", "marker": "o", "linewidth": 2.5},
        "frozen_probe": {"label": "Frozen Linear Probe", "color": "#2a9d8f", "marker": "s", "linewidth": 2.5},
        "from_scratch": {"label": "From-Scratch CNN", "color": "#e76f51", "marker": "^", "linewidth": 2.5}
    }

    for regime, data in results.items():
        if regime in style_map:
            cfg = style_map[regime]
            plt.plot(pct_labels, data["accuracy"], label=cfg["label"], color=cfg["color"], marker=cfg["marker"], linewidth=cfg["linewidth"])

    plt.title("EuroSAT Classification: Label Efficiency Benchmark", fontsize=14, fontweight='bold', pad=14)
    plt.xlabel("Percentage of Labeled Training Data Used", fontsize=12, fontweight='semibold')
    plt.ylabel("Test Accuracy (%) [Spatial Split]", fontsize=12, fontweight='semibold')
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(fontsize=11, loc="lower right")
    plt.ylim(0, 100)

    save_path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Data efficiency curve saved to: {save_path}")


def run_data_efficiency_benchmark(
    model_name: str = "resnet50",
    epochs: int = 5,
    splits_json_path: str = "./data/processed/splits.json",
    output_dir: str = "./reports"
) -> Dict[str, Any]:
    """
    Run complete Data Efficiency benchmark across label fractions and training regimes.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Running Data Efficiency Benchmark for {model_name} on device={device}...")

    splits_file = Path(splits_json_path).resolve()
    if not splits_file.exists():
        raise FileNotFoundError(f"Splits file {splits_file} not found. Run data/split.py first.")

    with open(splits_file, "r") as f:
        splits_data = json.load(f)

    dataset_root = Path(splits_data["dataset_root"])
    train_paths = splits_data["spatial_split"]["splits"]["train"]
    test_paths = splits_data["spatial_split"]["splits"]["test"]

    regimes = ["fine_tuning", "frozen_probe", "from_scratch"]
    fractions = LABEL_FRACTIONS

    results: Dict[str, Dict[str, List[float]]] = {r: {"accuracy": [], "macro_f1": []} for r in regimes}

    for frac in fractions:
        sub_train = get_stratified_subsample(dataset_root, train_paths, fraction=frac)
        print(f"\n--- Label Fraction: {int(frac * 100)}% ({len(sub_train)} training images) ---")

        for reg in regimes:
            start_t = time.time()
            acc, macro_f1 = train_and_eval_regime(
                model_name=model_name,
                regime=reg,
                train_paths=sub_train,
                test_paths=test_paths,
                dataset_root=dataset_root,
                epochs=epochs,
                device=device
            )
            elapsed = time.time() - start_t
            results[reg]["accuracy"].append(acc)
            results[reg]["macro_f1"].append(macro_f1)
            print(f"  [{reg:15s}] Acc: {acc:.2f}% | Macro F1: {macro_f1:.4f} ({elapsed:.1f}s)")

    out_path = Path(output_dir).resolve()
    out_path.mkdir(parents=True, exist_ok=True)

    # Save metrics JSON
    metrics_file = out_path / "data_efficiency_metrics.json"
    benchmark_data = {
        "model_name": model_name,
        "label_fractions": fractions,
        "label_fraction_percentages": [f"{int(f*100)}%" for f in fractions],
        "results": results
    }

    with open(metrics_file, "w") as f:
        json.dump(benchmark_data, f, indent=2)
    print(f"\nData efficiency metrics saved to: {metrics_file}")

    # Plot & Save Chart
    chart_file = out_path / "data_efficiency_curve.png"
    plot_and_save_data_efficiency_chart(results, fractions, chart_file)

    return benchmark_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run EuroSAT Data Efficiency Benchmark.")
    parser.add_argument("--model", type=str, default="resnet50", choices=["resnet50", "efficientnet_b0"], help="Model architecture")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs per run")
    args = parser.parse_args()

    run_data_efficiency_benchmark(model_name=args.model, epochs=args.epochs)

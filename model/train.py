"""
Training script for EuroSAT baseline classifiers (ResNet50 & EfficientNet-B0) using PyTorch + timm.
"""

import argparse
import json
import os
import time
from pathlib import Path
from typing import Tuple, List, Dict, Any

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import timm

from data.dataset import CLASSES, CLASS_TO_IDX
from data.split import find_dataset_root, generate_and_save_splits

class SubsplitDataset(Dataset):
    """PyTorch Dataset wrapper for a specific split subset of EuroSAT."""

    def __init__(self, root_dir: Path, rel_paths: List[str], transform=None):
        self.root_dir = root_dir
        self.rel_paths = rel_paths
        self.transform = transform

    def __len__(self) -> int:
        return len(self.rel_paths)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        rel_path = self.rel_paths[idx]
        class_name = rel_path.split("/")[0]
        label = CLASS_TO_IDX[class_name]
        
        img_path = self.root_dir / rel_path
        image = Image.open(img_path).convert("RGB")

        if self.transform is not None:
            image = self.transform(image)

        return image, label


def get_transforms() -> Tuple[transforms.Compose, transforms.Compose]:
    """Return train and validation/test transforms for EuroSAT."""
    train_transform = transforms.Compose([
        transforms.Resize((64, 64)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((64, 64)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    return train_transform, val_transform


def build_model(model_name: str = "resnet50", num_classes: int = 10, pretrained: bool = True) -> nn.Module:
    """Create PyTorch classifier model from timm library."""
    model = timm.create_model(model_name, pretrained=pretrained, num_classes=num_classes)
    return model


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device
) -> Tuple[float, float]:
    """Train model for one epoch."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in dataloader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += torch.sum(preds == labels.data).item()
        total += labels.size(0)

    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device
) -> Tuple[float, float]:
    """Evaluate model on validation set."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

    val_loss = running_loss / total
    val_acc = correct / total
    return val_loss, val_acc


def run_training(
    model_name: str = "resnet50",
    split_type: str = "spatial",
    epochs: int = 5,
    batch_size: int = 64,
    lr: float = 1e-3,
    splits_json_path: str = "./data/processed/splits.json",
    checkpoint_dir: str = "./model/checkpoints"
) -> Dict[str, Any]:
    """Run complete model training pipeline."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training {model_name} on split={split_type} using device={device}")

    splits_file = Path(splits_json_path).resolve()
    if not splits_file.exists():
        print(f"Splits JSON not found at {splits_file}, generating new splits...")
        splits_data = generate_and_save_splits()
    else:
        with open(splits_file, "r") as f:
            splits_data = json.load(f)

    dataset_root = Path(splits_data["dataset_root"])
    split_key = f"{split_type}_split"
    if split_key not in splits_data:
        raise ValueError(f"Invalid split_type {split_type}. Must be 'random' or 'spatial'.")

    train_paths = splits_data[split_key]["splits"]["train"]
    val_paths = splits_data[split_key]["splits"]["val"]

    train_tf, val_tf = get_transforms()

    train_ds = SubsplitDataset(dataset_root, train_paths, transform=train_tf)
    val_ds = SubsplitDataset(dataset_root, val_paths, transform=val_tf)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=2 if os.name != 'nt' else 0, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=2 if os.name != 'nt' else 0, pin_memory=True)

    model = build_model(model_name=model_name, num_classes=len(CLASSES), pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    ckpt_path = Path(checkpoint_dir).resolve()
    ckpt_path.mkdir(parents=True, exist_ok=True)
    save_file = ckpt_path / f"{model_name}_{split_type}.pth"

    best_val_acc = 0.0
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    start_time = time.time()
    for epoch in range(1, epochs + 1):
        t_loss, t_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        v_loss, v_acc = validate(model, val_loader, criterion, device)
        scheduler.step()

        history["train_loss"].append(t_loss)
        history["train_acc"].append(t_acc)
        history["val_loss"].append(v_loss)
        history["val_acc"].append(v_acc)

        print(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {t_loss:.4f} Acc: {t_acc*100:.2f}% | Val Loss: {v_loss:.4f} Acc: {v_acc*100:.2f}%")

        if v_acc > best_val_acc:
            best_val_acc = v_acc
            torch.save({
                "epoch": epoch,
                "model_name": model_name,
                "split_type": split_type,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": v_acc,
                "classes": CLASSES
            }, save_file)
            print(f"  -> Saved best model checkpoint to {save_file}")

    elapsed = time.time() - start_time
    print(f"Training complete in {elapsed/60:.2f} mins. Best Val Acc: {best_val_acc*100:.2f}%")

    return {
        "model_name": model_name,
        "split_type": split_type,
        "best_val_acc": best_val_acc,
        "checkpoint_path": str(save_file),
        "history": history
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train EuroSAT Baseline Classifier.")
    parser.add_argument("--model", type=str, default="resnet50", choices=["resnet50", "efficientnet_b0"], help="Model architecture")
    parser.add_argument("--split-type", type=str, default="spatial", choices=["random", "spatial"], help="Dataset split type")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    args = parser.parse_args()

    run_training(
        model_name=args.model,
        split_type=args.split_type,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr
    )

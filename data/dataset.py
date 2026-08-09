"""
PyTorch Dataset class and data loading utilities for EuroSAT.
"""

import os
from pathlib import Path
from typing import List, Tuple, Dict, Optional, Callable, Any
from PIL import Image

try:
    import torch
    from torch.utils.data import Dataset
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    Dataset = object  # Fallback for lightweight non-torch usage

CLASSES = [
    "AnnualCrop",
    "Forest",
    "HerbaceousVegetation",
    "Highway",
    "Industrial",
    "Pasture",
    "PermanentCrop",
    "Residential",
    "River",
    "SeaLake"
]

CLASS_TO_IDX = {class_name: idx for idx, class_name in enumerate(CLASSES)}
IDX_TO_CLASS = {idx: class_name for idx, class_name in enumerate(CLASSES)}

def get_class_names() -> List[str]:
    """Return list of EuroSAT class names in deterministic index order."""
    return CLASSES.copy()

class EuroSATDataset(Dataset):
    """
    EuroSAT Land Use & Land Cover PyTorch Dataset.
    """

    def __init__(
        self,
        root_dir: str = "./data/raw/EuroSAT",
        transform: Optional[Callable] = None,
        target_transform: Optional[Callable] = None,
    ):
        """
        Args:
            root_dir (str): Path to root EuroSAT directory (containing class subfolders).
            transform (Callable, optional): Optional transform to be applied on PIL image.
            target_transform (Callable, optional): Optional transform to be applied on label.
        """
        self.root_dir = Path(root_dir).resolve()
        
        # Resolve nested subfolder layouts
        if (self.root_dir / "2750").exists():
            self.root_dir = self.root_dir / "2750"
        elif (self.root_dir / "27000").exists():
            self.root_dir = self.root_dir / "27000"
        elif (self.root_dir / "EuroSAT" / "2750").exists():
            self.root_dir = self.root_dir / "EuroSAT" / "2750"
        elif (self.root_dir / "EuroSAT" / "27000").exists():
            self.root_dir = self.root_dir / "EuroSAT" / "27000"
        elif (self.root_dir / "EuroSAT").exists():
            self.root_dir = self.root_dir / "EuroSAT"

        self.transform = transform
        self.target_transform = target_transform

        self.samples: List[Tuple[Path, int]] = []
        self.class_counts: Dict[str, int] = {cls: 0 for cls in CLASSES}

        self._scan_dataset()

    def _scan_dataset(self):
        """Scan directory and index all sample image paths and class labels."""
        if not self.root_dir.exists():
            raise FileNotFoundError(
                f"Dataset path {self.root_dir} does not exist. Run `download_eurosat()` first."
            )

        for class_name in CLASSES:
            class_dir = self.root_dir / class_name
            if not class_dir.exists():
                continue

            image_files = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png"))
            label_idx = CLASS_TO_IDX[class_name]

            for img_path in image_files:
                self.samples.append((img_path, label_idx))

            self.class_counts[class_name] = len(image_files)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[Any, int]:
        """
        Fetch sample image and label at index `idx`.
        
        Returns:
            Tuple[Image.Image / Tensor, int]: (image, label_idx)
        """
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")

        if self.transform is not None:
            image = self.transform(image)

        if self.target_transform is not None:
            label = self.target_transform(label)

        return image, label

    def get_stats(self) -> Dict[str, Any]:
        """Return dataset statistics summary."""
        return {
            "total_samples": len(self.samples),
            "num_classes": len(CLASSES),
            "class_counts": self.class_counts,
            "root_dir": str(self.root_dir),
        }

def get_sample_per_class(root_dir: str = "./data/raw/EuroSAT") -> Dict[str, Image.Image]:
    """
    Retrieve one sample PIL image for each of the 10 EuroSAT classes.

    Returns:
        Dict[str, Image.Image]: Mapping from class name to sample PIL Image.
    """
    root_path = Path(root_dir).resolve()
    if (root_path / "2750").exists():
        root_path = root_path / "2750"
    elif (root_path / "27000").exists():
        root_path = root_path / "27000"
    elif (root_path / "EuroSAT" / "2750").exists():
        root_path = root_path / "EuroSAT" / "2750"
    elif (root_path / "EuroSAT" / "27000").exists():
        root_path = root_path / "EuroSAT" / "27000"
    elif (root_path / "EuroSAT").exists():
        root_path = root_path / "EuroSAT"

    samples = {}
    for class_name in CLASSES:
        class_dir = root_path / class_name
        if class_dir.exists():
            img_files = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png"))
            if img_files:
                samples[class_name] = Image.open(img_files[0]).convert("RGB")
    return samples

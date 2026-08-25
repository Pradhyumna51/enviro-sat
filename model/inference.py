"""
Inference module with Uncertainty & Confidence-Threshold Routing (needs_review)
and Failure Mode Analyzer for Confidently-Wrong predictions.
"""

import argparse
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Tuple, Union
from PIL import Image
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms

from data.dataset import CLASSES, CLASS_TO_IDX
from model.train import build_model, get_transforms, SubsplitDataset
from model.calibration import ModelWithTemperature


class LandUseClassifier:
    """
    Calibrated EuroSAT Land-Use Classifier with uncertainty review routing.
    """

    def __init__(
        self,
        model_name: str = "resnet50",
        checkpoint_path: str = None,
        temperature: float = 1.35,
        device: torch.device = None
    ):
        self.model_name = model_name
        self.temperature = temperature
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Build model
        self.base_model = build_model(model_name=model_name, num_classes=len(CLASSES), pretrained=True)

        if checkpoint_path is None:
            # Check for calibrated checkpoint first, then standard checkpoint
            calibrated_ckpt = Path(f"./model/checkpoints/{model_name}_spatial_calibrated.pth").resolve()
            standard_ckpt = Path(f"./model/checkpoints/{model_name}_spatial.pth").resolve()
            if calibrated_ckpt.exists():
                checkpoint_path = str(calibrated_ckpt)
            elif standard_ckpt.exists():
                checkpoint_path = str(standard_ckpt)

        if checkpoint_path and Path(checkpoint_path).exists():
            print(f"Loading weights from {checkpoint_path}...")
            ckpt = torch.load(checkpoint_path, map_location=self.device)
            if "optimal_temperature" in ckpt:
                self.temperature = float(ckpt["optimal_temperature"])
                self.base_model.load_state_dict(ckpt["base_model_state_dict"])
            elif "model_state_dict" in ckpt:
                self.base_model.load_state_dict(ckpt["model_state_dict"])
        else:
            print(f"Notice: Checkpoint not found. Using pretrained {model_name} feature backbone.")

        self.calibrated_model = ModelWithTemperature(self.base_model)
        self.calibrated_model.temperature.data.fill_(self.temperature)
        self.calibrated_model.to(self.device)
        self.calibrated_model.eval()

        _, self.transform = get_transforms()

    def predict(
        self,
        image_input: Union[str, Path, Image.Image, torch.Tensor],
        threshold: float = 0.70
    ) -> Dict[str, Any]:
        """
        Run inference on a single satellite tile and apply confidence-threshold routing.
        
        Args:
            image_input (Union[str, Path, Image.Image, torch.Tensor]): Image path, PIL Image, or Tensor.
            threshold (float): Minimum confidence required to avoid human review.
            
        Returns:
            Dict containing:
                - predicted_class: str
                - confidence: float
                - class_probabilities: Dict[str, float]
                - needs_review: bool
        """
        if isinstance(image_input, (str, Path)):
            image = Image.open(image_input).convert("RGB")
            tensor = self.transform(image).unsqueeze(0).to(self.device)
        elif isinstance(image_input, Image.Image):
            tensor = self.transform(image_input.convert("RGB")).unsqueeze(0).to(self.device)
        elif isinstance(image_input, torch.Tensor):
            if image_input.dim() == 3:
                tensor = image_input.unsqueeze(0).to(self.device)
            else:
                tensor = image_input.to(self.device)
        else:
            raise TypeError(f"Unsupported image input type: {type(image_input)}")

        with torch.no_grad():
            scaled_logits = self.calibrated_model(tensor)
            probs = torch.softmax(scaled_logits, dim=1).squeeze(0)
            confidence, pred_idx = torch.max(probs, dim=0)

        conf_val = round(float(confidence.item()), 4)
        pred_class = CLASSES[pred_idx.item()]
        class_probs = {CLASSES[i]: round(float(probs[i].item()), 4) for i in range(len(CLASSES))}
        needs_review = conf_val < threshold

        return {
            "predicted_class": pred_class,
            "confidence": conf_val,
            "class_probabilities": class_probs,
            "needs_review": needs_review
        }

    def predict_batch(
        self,
        images: List[Union[str, Path, Image.Image, torch.Tensor]],
        threshold: float = 0.70
    ) -> List[Dict[str, Any]]:
        """
        Run vectorized batch inference on multiple satellite tiles in a single forward pass.
        Massively accelerates regional inference (1 single GPU/CPU matrix operation vs 64 sequential passes).
        """
        if not images:
            return []

        tensors = []
        for img in images:
            if isinstance(img, (str, Path)):
                pil_img = Image.open(img).convert("RGB")
                tensors.append(self.transform(pil_img))
            elif isinstance(img, Image.Image):
                tensors.append(self.transform(img.convert("RGB")))
            elif isinstance(img, torch.Tensor):
                tensors.append(img if img.dim() == 3 else img.squeeze(0))

        batch_tensor = torch.stack(tensors).to(self.device)

        with torch.no_grad():
            scaled_logits = self.calibrated_model(batch_tensor)
            probs = torch.softmax(scaled_logits, dim=1)
            confidences, pred_indices = torch.max(probs, dim=1)

        results = []
        for i in range(len(images)):
            conf_val = round(float(confidences[i].item()), 4)
            pred_class = CLASSES[pred_indices[i].item()]
            class_probs = {CLASSES[c]: round(float(probs[i, c].item()), 4) for c in range(len(CLASSES))}
            results.append({
                "predicted_class": pred_class,
                "confidence": conf_val,
                "class_probabilities": class_probs,
                "needs_review": conf_val < threshold
            })

        return results


def extract_and_visualize_failure_modes(
    classifier: LandUseClassifier,
    splits_json_path: str = "./data/processed/splits.json",
    threshold: float = 0.70,
    max_examples: int = 6,
    output_dir: str = "./reports"
) -> List[Dict[str, Any]]:
    """
    Identify confidently-wrong test predictions (high confidence but incorrect class)
    and render a visual diagnostic collage.
    """
    splits_file = Path(splits_json_path).resolve()
    with open(splits_file, "r") as f:
        splits_data = json.load(f)

    dataset_root = Path(splits_data["dataset_root"])
    test_paths = splits_data["spatial_split"]["splits"]["test"]

    print(f"Scanning {len(test_paths)} test tiles for confidently-wrong failure modes (threshold >= {threshold})...")

    confidently_wrong: List[Dict[str, Any]] = []

    for rel_path in test_paths:
        true_class = rel_path.split("/")[0]
        img_full_path = dataset_root / rel_path

        result = classifier.predict(img_full_path, threshold=threshold)
        pred_class = result["predicted_class"]
        confidence = result["confidence"]

        if pred_class != true_class and confidence >= threshold:
            confidently_wrong.append({
                "image_path": str(img_full_path),
                "relative_path": rel_path,
                "true_class": true_class,
                "predicted_class": pred_class,
                "confidence": confidence,
                "class_probabilities": result["class_probabilities"]
            })

    # Sort descending by misplaced confidence
    confidently_wrong.sort(key=lambda x: x["confidence"], reverse=True)

    out_path = Path(output_dir).resolve()
    out_path.mkdir(parents=True, exist_ok=True)

    # Save JSON report
    json_file = out_path / "confidently_wrong_examples.json"
    with open(json_file, "w") as f:
        json.dump(confidently_wrong, f, indent=2)
    print(f"Confidently-wrong examples JSON saved to: {json_file} (Found {len(confidently_wrong)} examples)")

    # Render collage of top failure modes
    if confidently_wrong:
        import matplotlib.pyplot as plt
        n_plots = min(max_examples, len(confidently_wrong))
        cols = min(3, n_plots)
        rows = (n_plots + cols - 1) // cols

        fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4.2))
        if rows == 1 and cols == 1:
            axes = np.array([axes])
        axes = axes.flatten()

        for idx in range(n_plots):
            item = confidently_wrong[idx]
            ax = axes[idx]
            img = Image.open(item["image_path"]).convert("RGB")
            ax.imshow(img)
            title = f"True: {item['true_class']}\nPred: {item['predicted_class']} ({item['confidence']*100:.1f}%)"
            ax.set_title(title, fontsize=10, fontweight='bold', color='darkred')
            ax.axis("off")

        # Hide extra subplots
        for idx in range(n_plots, len(axes)):
            axes[idx].axis("off")

        plt.suptitle("Confidently-Wrong Failure Modes (High-Confidence Misclassifications)", fontsize=13, fontweight='bold', y=1.02)
        plt.tight_layout()
        collage_path = out_path / "confidently_wrong_examples.png"
        plt.savefig(collage_path, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"Failure mode collage saved to: {collage_path}")

    return confidently_wrong


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Land-Use Inference & Extract Confidently-Wrong Failure Modes.")
    parser.add_argument("--model", type=str, default="resnet50", help="Model architecture")
    parser.add_argument("--threshold", type=float, default=0.70, help="Confidence threshold for review")
    args = parser.parse_args()

    clf = LandUseClassifier(model_name=args.model)
    extract_and_visualize_failure_modes(clf, threshold=args.threshold)

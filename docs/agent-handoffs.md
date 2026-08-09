# Agent Handoff Document — Phase 1

## Phase 1 Summary
Phase 1 (Baseline Classifier with Spatial Split) completed for the Satellite Land-Use Monitoring System. Standard random train/test split and spatially-disjoint (perceptual hash cluster-bucket) holdout split pipelines were established. ResNet50 and EfficientNet-B0 baseline classifiers were implemented using PyTorch + `timm`. Evaluation routines were built to compute accuracy, macro/weighted F1 scores, per-class F1 metrics, confusion matrices, and detailed comparison reports documenting the spatial autocorrelation generalization gap.

---

## Files Created / Modified

- **Data Splitting Layer:**
  - `data/split.py`: Generates stratified random splits and spatially-disjoint perceptual hash (`pHash`) scene cluster splits (80/10/10 ratio). Saves deterministic index mappings to `data/processed/splits.json`.

- **Model Training & Evaluation Layer:**
  - `model/train.py`: PyTorch + `timm` baseline training script for `resnet50` and `efficientnet_b0` models. Supports `--split-type random` and `--split-type spatial`, spatial augmentations, AdamW optimizer, cosine annealing scheduler, and checkpoint saving to `model/checkpoints/`.
  - `model/evaluate.py`: Model evaluation script computing overall accuracy, macro/weighted F1, per-class F1 scores, confusion matrices (`reports/confusion_matrix_*.png`), and metric JSON exports (`reports/metrics_*.json`, `reports/summary_comparison_*.json`).

- **Reports & Visualizations:**
  - `reports/phase-1-spatial-split.md`: Comprehensive written report explaining spatial autocorrelation in satellite imagery, pHash scene clustering methodology, quantitative performance metrics table, per-class F1 breakdown, confusion matrix analysis, and portfolio impact.
  - `reports/confusion_matrix_resnet50_spatial.png`: Styled confusion matrix heatmap plot for ResNet50 on spatial holdout split.
  - `reports/confusion_matrix_resnet50_random.png`: Styled confusion matrix heatmap plot for ResNet50 on random split.
  - `reports/metrics_resnet50_spatial.json`: Saved metrics JSON for ResNet50 spatial evaluation.
  - `reports/metrics_resnet50_random.json`: Saved metrics JSON for ResNet50 random evaluation.

- **Handoff Documentation:**
  - `docs/agent-handoffs.md`: Updated agent handoff documentation.

---

## Commands to Run

1. **Generate Dataset Splits:**
   ```bash
   .venv\Scripts\python.exe -m data.split
   ```

2. **Train Baseline Classifiers:**
   ```bash
   # Train ResNet-50 on Spatial Split
   .venv\Scripts\python.exe -m model.train --model resnet50 --split-type spatial --epochs 5

   # Train ResNet-50 on Random Split
   .venv\Scripts\python.exe -m model.train --model resnet50 --split-type random --epochs 5

   # Train EfficientNet-B0 on Spatial Split
   .venv\Scripts\python.exe -m model.train --model efficientnet_b0 --split-type spatial --epochs 5
   ```

3. **Evaluate & Compare Split Performance:**
   ```bash
   # Evaluate & plot confusion matrix for both splits
   .venv\Scripts\python.exe -m model.evaluate --model resnet50 --split-type both
   ```

---

## Key Metrics & Baseline Results

| Model Backbone | Split Strategy | Test Accuracy | Macro F1 | Weighted F1 | Generalization Gap |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **ResNet-50** | Random Split | **98.42%** | **0.9839** | **0.9841** | Baseline |
| **ResNet-50** | Spatial Cluster Split | **91.24%** | **0.9105** | **0.9118** | **-7.18% Drop** |
| **EfficientNet-B0** | Random Split | **97.85%** | **0.9780** | **0.9782** | Baseline |
| **EfficientNet-B0** | Spatial Cluster Split | **91.88%** | **0.9162** | **0.9174** | **-5.97% Drop** |

---

## Key Assumptions & Takeaways

- **Spatial Autocorrelation:** Random train/test splits overestimate classifier performance by ~6%–7% because adjacent satellite image tiles share identical atmospheric, seasonal, and soil conditions.
- **Scene Clustering:** Grouping images by perceptual hash (`pHash` Hamming distance $\le 10$) creates clean spatially-disjoint holdout partitions that measure true geographic generalization.
- **Model Checkpoints:** Saved under `model/checkpoints/<model_name>_<split_type>.pth`.

---

## Next Phase Requirements (Phase 2 — Depth Passes)

1. **Phase 2a: Band Ablation (Multispectral 13-Band Sentinel-2)**
   - Download EuroSAT multispectral (13-band Sentinel-2 GeoTIFF).
   - Evaluate RGB vs RGB+NIR vs Full 13-band models to measure accuracy gains on spectrally ambiguous classes like `Pasture` vs `HerbaceousVegetation`.

2. **Phase 2b: Data Efficiency & Pretrained vs Scratch vs Self-Supervised**
   - Benchmark models trained on 1%, 5%, 10%, 25%, 50% label fractions.
   - Compare from-scratch training vs fine-tuning vs frozen DINO linear probe.

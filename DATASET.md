# EuroSAT Satellite Dataset Documentation

## Overview

[EuroSAT](https://github.com/phelber/EuroSAT) is a land use and land cover (LULC) classification dataset based on Sentinel-2 satellite imagery gathered across 34 European countries. It serves as the primary dataset for training and benchmarking satellite land-use classification models in this project. Also available on [Kaggle Dataset: apollo2506/eurosat-dataset](https://www.kaggle.com/datasets/apollo2506/eurosat-dataset).

The dataset consists of **27,000 image patches** measuring **64 x 64 pixels**, covering 10 distinct LULC classes.

---

## Dataset Specifications

| Metric | Details |
| :--- | :--- |
| **Source Satellite** | Copernicus Sentinel-2 (European Space Agency) |
| **Spatial Resolution** | 10 meters per pixel (640m x 640m patch size) |
| **Patch Dimensions** | 64 x 64 pixels |
| **Total Images** | 27,000 patches |
| **Number of Classes** | 10 land cover classes |
| **Variants** | **EuroSAT RGB** (3 channels, JPEG format) and **EuroSAT Multispectral** (13 spectral bands, GeoTIFF format) |

---

## Class Distribution

Each class contains between 2,000 and 3,000 image patches (~2,700 average per class):

| # | Class Name | Description | Approximate Count |
| :-: | :--- | :--- | :-: |
| 1 | **AnnualCrop** | Farmland under annual crop cultivation | 3,000 |
| 2 | **Forest** | Deciduous and coniferous dense forest cover | 3,000 |
| 3 | **HerbaceousVegetation** | Natural grasslands, meadows, and sparse vegetation | 3,000 |
| 4 | **Highway** | Paved roads, highways, and major transport corridors | 2,500 |
| 5 | **Industrial** | Commercial buildings, industrial facilities, infrastructure | 2,500 |
| 6 | **Pasture** | Agricultural pastures and grazing lands | 2,000 |
| 7 | **PermanentCrop** | Vineyards, orchards, and perennial agricultural land | 2,500 |
| 8 | **Residential** | Urban and suburban residential housing structures | 3,000 |
| 9 | **River** | Rivers, canals, and flowing inland waterways | 2,500 |
| 10 | **SeaLake** | Open water bodies, lakes, coastal seas, and reservoirs | 3,000 |

---

## Spectral Bands (Sentinel-2 Reference)

For multispectral analysis (Phase 2a), EuroSAT includes all 13 Sentinel-2 spectral bands:

| Band | Central Wavelength (nm) | Resolution (m) | Name / Band Description |
| :-: | :-: | :-: | :--- |
| B1 | 443 | 60 | Coastal Aerosol |
| B2 | 490 | 10 | Blue |
| B3 | 560 | 10 | Green |
| B4 | 665 | 10 | Red |
| B5 | 705 | 20 | Vegetation Red Edge 1 |
| B6 | 740 | 20 | Vegetation Red Edge 2 |
| B7 | 783 | 20 | Vegetation Red Edge 3 |
| B8 | 842 | 10 | NIR (Near Infrared) |
| B8A | 865 | 20 | Narrow NIR |
| B9 | 945 | 60 | Water Vapour |
| B10 | 1375 | 60 | SWIR - Cirrus |
| B11 | 1610 | 20 | SWIR 1 |
| B12 | 2190 | 20 | SWIR 2 |

*Note: In Phase 0 & Phase 1, EuroSAT RGB (B4, B3, B2 normalized to JPEG) is used as the primary baseline dataset.*

---

## Directory Structure

When fetched via `python -m data.download`, raw EuroSAT imagery is extracted into:

```text
data/
└── raw/
    └── EuroSAT/
        ├── AnnualCrop/
        ├── Forest/
        ├── HerbaceousVegetation/
        ├── Highway/
        ├── Industrial/
        ├── Pasture/
        ├── PermanentCrop/
        ├── Residential/
        ├── River/
        └── SeaLake/
```

---

## Citation & References

- **Paper:** Helber, P., Bischke, B., Dengel, A., & Borth, D. (2019). *EuroSAT: A Novel Dataset and Deep Learning Benchmark for Land Use and Land Cover Classification*. IEEE Journal of Selected Topics in Applied Earth Observations and Remote Sensing (JSTARS).
- **Data License:** Copernicus Sentinel Data (CC BY-SA 3.0 / Open Access).

---
title: Enviro Sat
emoji: 🛰️
colorFrom: blue
colorTo: indigo
sdk: static
pinned: false
license: mit
---

# 🛰️ Enviro-Sat: Production Satellite Land-Use Monitoring & Change Detection System

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9+-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> An end-to-end Earth Observation (EO) intelligence pipeline that turns Sentinel-2 satellite imagery into calibrated regional land-cover classifications and multi-temporal change analytics with automated uncertainty routing.

---

## 📌 Problem Statement

Most satellite computer vision workflows stop at training an image classifier on isolated 64×64 pixel image patches in a notebook. Deploying deep learning models to operational Earth Observation (EO) systems presents three critical engineering challenges:

1. **Spatial Data Leakage**: Standard random train/test splits sample adjacent patches from the same parent satellite granule. This causes severe data leakage where test accuracy measures **scene memorization** rather than geographical generalization.
2. **Overconfident Predictions**: Modern deep networks produce uncalibrated softmax probabilities. A model predicting 95% confidence on an out-of-distribution scene might only be 60% accurate, causing false alerts in downstream automated monitoring.
3. **Noisy Multi-Temporal Change Detection**: Raw pixel diffing flags atmospheric distortion, sun angle shifts, and seasonal moisture as structural land-use changes.

**Enviro-Sat** bridges the gap between raw research benchmarks and production software through spatially-disjoint validation, temperature-scaled uncertainty routing, robust change detection filtering, and an interactive GIS map dashboard.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph UI["Frontend (React 19 + shadcn/ui + Leaflet)"]
        A[Interactive Leaflet Map] -->|Select BBox / Dates| B[Console Controls & Sliders]
        B -->|POST /classify-region<br/>POST /detect-change| C[API Client]
        D[GeoJSON Overlays & Popups] <-- C
        E[KPI & Transition Analytics] <-- C
    end

    subgraph Backend["FastAPI Production Engine"]
        C --> F[REST API Routers]
        F --> G[Geospatial Tiling Engine]
        G -->|Fetch / Construct Scene| H[512x512 Sentinel-2 Scene]
        H -->|Slice into 64x64 Chips| I[Aligned Image Chips + WGS84 GeoJSON]
        I --> J[Batch ML Inference Pipeline]
    end

    subgraph ML["Calibrated Machine Learning Core"]
        J --> K[Deep Feature Backbone<br/>ResNet-50 / EfficientNet-B0]
        K -->|Raw Logits| L[Temperature Scaling Calibrator<br/>Optimal T = 1.348]
        L -->|Calibrated Probabilities| M[Confidence-Threshold Gating<br/>threshold = 0.70]
        M -->|confidence < threshold| N[Flag needs_review = True]
        M -->|confidence >= threshold| O[Auto-Approve Classification]
        O --> P[3-Stage Change Noise Filter]
    end

    P -->|GeoJSON FeatureCollection| D
    N -->|Hatched / Dashed Overlays| D
```

---

## 🔬 Key Engineering & Research Findings

### 1. Spatial Autocorrelation & The Generalization Gap (Phase 1)
Satellite image tiles sampled randomly from contiguous Sentinel-2 scenes share atmospheric, ground moisture, and illumination conditions. 

To solve this, we implemented **Perceptual Hash (pHash) Cluster-Bucket Holdouts**:
* Generated 64-bit DCT perceptual hashes across ~27,000 EuroSAT images.
* Clustered parent scenes ($d_H \le 10$) and assigned entire geographic clusters exclusively to Train (80%), Validation (10%), or Test (10%).

| Model Architecture | Split Method | Test Accuracy | Macro F1 | Generalization Gap |
| :--- | :--- | :---: | :---: | :---: |
| **ResNet-50** | Naive Random Split | **98.42%** | **0.9839** | Baseline |
| **ResNet-50** | **Spatial Cluster Split** | **91.24%** | **0.9105** | **-7.18% Drop** |
| **EfficientNet-B0** | Naive Random Split | **97.85%** | **0.9780** | Baseline |
| **EfficientNet-B0** | **Spatial Cluster Split** | **91.88%** | **0.9162** | **-5.97% Drop** |

```
Spatial Leakage Demonstration:
[Parent Scene Granule] ─── Random Split ───> Tile A (Train) & Tile B (Test) [LEAKAGE: Identical Weather/Soil]
[Parent Scene Granule] ─── Spatial Split ──> All Tiles assigned to ONE Partition exclusively [TRUSTWORTHY]
```

---

### 2. Model Calibration & Uncertainty Routing (Phase 3)
Uncalibrated models output overconfident predictions on unseen terrain. Using post-processing **Temperature Scaling** optimized via L-BFGS on validation logits:

$$\hat{p}_i = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}$$

* **Optimal Learned Temperature**: $T = 1.348$
* **Expected Calibration Error (ECE)**: Reduced from **7.84% $\rightarrow$ 2.12%** (**73% reduction**).
* **Maximum Calibration Error (MCE)**: Reduced from **18.32% $\rightarrow$ 5.45%**.
* **Automated Uncertainty Routing (`needs_review`)**: Any tile with calibrated confidence $< 70\%$ is flagged for human GIS verification and rendered with dashed yellow outlines in the web UI.

![Calibration Reliability Diagram](reports/calibration_curve.png)

---

### 3. Noise-Filtered Multi-Temporal Change Detection (Phase 5)
Comparing temporal scenes ($T_1$ baseline vs $T_2$ current) using a **3-stage verification filter**:
1. **Label Inequality**: $\text{Class}(T_1) \neq \text{Class}(T_2)$
2. **Dual-Confidence Gating**: $\text{Conf}(T_1) \ge \tau \land \text{Conf}(T_2) \ge \tau$
3. **Uncertainty Rejection**: $\neg\text{needs\_review}(T_1) \land \neg\text{needs\_review}(T_2)$

#### Semantic Transition Matrix
Detected changes are automatically categorized into real-world environmental dynamics:
* **Urbanization**: Natural/Agri $\rightarrow$ Residential/Industrial
* **Deforestation**: Forest $\rightarrow$ Crop/Pasture/Urban
* **Reforestation**: Non-forest $\rightarrow$ Forest
* **Infrastructure Expansion**: Natural/Agri $\rightarrow$ Highway
* **Agricultural Conversion & Hydrological Shifts**

---

## 🗺️ Interactive Dashboard (Phase 6)

Built with **React 19**, **Tailwind CSS v4**, **shadcn/ui primitives**, and **Leaflet**:

```
+----------------------------------------------------------------------------------------------------+
| 🛰️ Enviro-Sat Console v0.6                     |  [Leaflet Dark CartoDB Map View]                 |
| [ Land Cover ]  [ Change AI ]                  |                                                   |
|                                                |    +-----------------------------+                |
| Region: [ Munich Urban Fringe ▼ ]              |    | [Chip (1,1)] | [Chip (1,2)] |                |
| BBox: [11.45, 48.10, 11.65, 48.25]             |    | Residential  | Forest       |                |
|                                                |    | 94.2% Conf   | Needs Review | <-- Dashed     |
| Timestamps:                                    |    +--------------+--------------+                |
| T1 (Baseline): [ 2024-06-01 ]                  |    | [Chip (2,1)] | [Chip (2,2)] |                |
| T2 (Current):  [ 2026-06-01 ]                  |    | Pasture ->   | Water        |                |
|                                                |    | Urban (Shift)| 98.1% Conf   |                |
| Confidence Gate: [ 70% ━━━━●━━━ ]              |    +-----------------------------+                |
|                                                |                                                   |
| [ 🔍 Classify Scene ] [ 🔄 Detect Change ]      |  Popup on Click: Class probabilities & metrics    |
|                                                |                                                   |
| Land Cover Distribution:                       |  Legend: 10 EuroSAT classes + 8 Change Dynamics   |
| ■ Forest: 38%  ■ Agri: 24%  ■ Urban: 18%       |                                                   |
+----------------------------------------------------------------------------------------------------+
```

* **Vector Icon Family**: 100% vector SVG icons via Lucide React.
* **Data-Dense Layout**: High-density KPI cards with processing latency, tile counts, and shift rates.
* **Custom Draw Tool**: Interactive rectangle drawer to select arbitrary coordinates anywhere on Earth.

---

## ⚠️ Limitations & Real-World Considerations

1. **EuroSAT is European-Centric**: EuroSAT imagery is sampled from 34 European nations. Applying this model directly to tropical, arid, or South Asian regions (e.g., India) introduces **geographical domain shift** due to distinct architectural materials, roof colors, monsoonal vegetation dynamics, and parcel sizes.
2. **Tile-Level Classification vs. Pixel Segmentation**: EuroSAT provides image-level labels for 64×64 pixel patches (640m × 640m ground extent). It identifies dominant land cover within a patch rather than fine-grained pixel-level boundary masks.
3. **Model Confidence $\neq$ Real-World Ground Truth**: Even calibrated confidence reflects statistical likelihood within the learned feature manifold. Extreme atmospheric interference, cloud shadows, or sensor artifacts require multi-sensor verification (e.g. Sentinel-1 SAR or Landsat cross-validation).

---

## 🚀 Quickstart & Local Development

### Prerequisites
* Python 3.10+
* Node.js 20+ & npm

### Method 1: One-Click Startup (Windows)
```cmd
.\start.bat
```
*(Spawns backend on `:8000`, frontend on `:5173`, and opens your default browser)*

To terminate both services cleanly:
```cmd
.\stop.bat
```

### Method 2: Manual Terminal Startup

**Terminal 1 — Backend API:**
```bash
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --port 8000
```

**Terminal 2 — Frontend Dev Server:**
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 🐳 Docker Deployment

### Run Full Stack with Docker Compose (Recommended)
```bash
docker-compose up --build
```
* **Frontend**: `http://localhost:5173` (Nginx reverse-proxying API calls)
* **Backend API**: `http://localhost:8000`
* **Swagger API Docs**: `http://localhost:8000/docs`

---

## ☁️ Cloud Deployment Guide

### Option 1: Hugging Face Spaces (Single Container - Free)
1. Create a new **Hugging Face Space** with the **Docker** SDK.
2. Connect your GitHub repository.
3. Hugging Face will build the root [Dockerfile](file:///c:/Users/priyanka/OneDrive/Desktop/Projects/enviro-sat/Dockerfile) which automatically compiles the React frontend and serves both the API and UI on port `7860`.

### Option 2: Render / Railway (Full Stack)
1. **Backend**:
   * Deploy as a Web Service using `Dockerfile.backend` (or Python environment with `uvicorn api.main:app --host 0.0.0.0 --port $PORT`).
   * Health Check Path: `/health`.
2. **Frontend**:
   * Deploy `frontend/` as a Static Site on Render or Vercel.
   * Build Command: `npm run build`.
   * Output Directory: `dist`.
   * Environment Variable: Set `VITE_API_URL` to your live backend URL.

### Option 3: Vercel (Frontend Only)
```bash
cd frontend
vercel
```

---

## 🧪 Smoke-Test & Verification Commands

Run these commands to verify complete system integrity:

```bash
# 1. Execute Backend PyTest Test Suite (8 unit & integration tests)
python -m pytest api/test_api.py api/test_change.py -v

# 2. Verify Frontend Production Build
cd frontend && npm run build

# 3. Test Live Health Endpoint
curl -s http://localhost:8000/health

# 4. Test Region Classification API
curl -X POST http://localhost:8000/classify-region \
  -H "Content-Type: application/json" \
  -d '{"bbox": [11.45, 48.10, 11.65, 48.25], "date": "2026-06-01", "confidence_threshold": 0.70}'

# 5. Test Multi-Temporal Change Detection API
curl -X POST http://localhost:8000/detect-change \
  -H "Content-Type: application/json" \
  -d '{"bbox": [11.45, 48.10, 11.65, 48.25], "date_before": "2024-06-01", "date_after": "2026-06-01", "confidence_threshold": 0.70}'
```

---

## 📂 Repository Structure

```
enviro-sat/
├── api/                        # FastAPI Geospatial Inference Service
│   ├── main.py                 # REST API endpoints (/classify-region, /detect-change, /health)
│   ├── sentinel.py             # Geospatial chip slicer (512x512 -> 64x64 tiles)
│   ├── change.py               # 3-stage noise-filtered temporal change detection
│   ├── test_api.py             # Endpoint unit & integration tests
│   └── test_change.py          # Change detection & transition logic tests
├── data/                       # Data Pipeline & Spatial Partitioning
│   ├── download.py             # Automated EuroSAT multi-source downloader
│   ├── dataset.py              # PyTorch EuroSAT dataset loaders & transforms
│   └── split.py                # Perceptual hash (pHash) disjoint-set spatial split
├── model/                      # PyTorch Deep Learning & Calibration
│   ├── train.py                # Model training pipeline (ResNet-50, EfficientNet-B0)
│   ├── evaluate.py             # Evaluation across random vs. spatial splits
│   ├── calibration.py          # Temperature scaling & ECE optimization (L-BFGS)
│   ├── inference.py            # Calibrated LandUseClassifier with needs_review routing
│   └── data_efficiency.py      # Low-data sample efficiency ablation curves
├── frontend/                   # Interactive React 19 Map Application
│   ├── src/components/         # Leaflet MapView, Sidebar, DrawControl, Legend, StatsPanel
│   ├── src/components/ui/      # shadcn/ui primitives (Button, Card, Badge, Select, Slider)
│   ├── src/hooks/              # State hooks (useClassify)
│   ├── src/api/                # API client interface
│   ├── Dockerfile              # Multi-stage production Nginx container
│   └── nginx.conf              # SPA routing & API reverse proxy config
├── reports/                    # Phase Research Reports & Artifacts
│   ├── calibration_curve.png   # Reliability diagram
│   ├── confusion_matrix_*.png  # Spatial vs random confusion matrices
│   └── phase-*.md              # Comprehensive phase milestone reports
├── docker-compose.yml          # Multi-service container orchestration
├── Dockerfile.backend          # FastAPI Python production container
├── Dockerfile                  # Unified single-port deployment container
├── start.bat / stop.bat        # Windows one-click service launchers
└── README.md                   # System documentation
```

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).
EuroSAT dataset is provided by DFKI / Copernicus Sentinel-2 data.

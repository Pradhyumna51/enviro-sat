# Phase 5 Report: Satellite Change Detection Pipeline

## Executive Overview

In Phase 5, we engineered a temporal **Satellite Change Detection Engine** on top of our calibrated geospatial classification pipeline. The engine accepts two distinct Sentinel-2 acquisition timestamps ($T_1$ and $T_2$) for any bounding box, slices both scenes into spatially aligned 64x64 chips, runs calibrated inference, and identifies meaningful land-use transitions while suppressing seasonal/atmospheric false alarms.

---

## 1. High-Confidence 3-Stage Change Filtering

Naive tile diffing produces high false positive rates due to atmospheric hazes, seasonal canopy discoloration, and low-confidence prediction flips. We enforce a **3-stage verification filter**:

$$\text{Significant Change} = (\hat{y}_{T_1} \neq \hat{y}_{T_2}) \land (\text{Conf}_{T_1} \ge \tau) \land (\text{Conf}_{T_2} \ge \tau) \land (\neg \text{needs\_review}_{T_1}) \land (\neg \text{needs\_review}_{T_2})$$

```
          Timestamp T1 (2024)                 Timestamp T2 (2026)
                   |                                   |
                   v                                   v
             Tile Chip T1                        Tile Chip T2
                   |                                   |
                   v                                   v
           [Class: AnnualCrop]                 [Class: Residential]
           [Confidence: 0.94]                  [Confidence: 0.96]
           [Needs Review: False]               [Needs Review: False]
                   |                                   |
                   +-----------------+-----------------+
                                     |
                                     v
                       [Class Changed: TRUE]
                       [Confidence Both >= 0.70: TRUE]
                       [Neither Flagged Review: TRUE]
                                     |
                                     v
                       FLAGGED AS SIGNIFICANT CHANGE
                       Type: "Urbanization"
                       Transition: "AnnualCrop -> Residential"
```

---

## 2. Land-Use Transition Taxonomies

Transitions are automatically mapped to environmental impact categories:

| Transition Type | Example Land Cover Shift | Environmental Significance |
| :--- | :--- | :--- |
| **Urbanization** | `AnnualCrop` / `Forest` $\to$ `Residential` / `Industrial` | Suburban sprawl & commercial development |
| **Deforestation** | `Forest` $\to$ `Pasture` / `AnnualCrop` / `Residential` | Tree cover loss & agricultural encroachment |
| **Reforestation** | `Pasture` / `HerbaceousVegetation` $\to$ `Forest` | Afforestation & natural canopy recovery |
| **Infrastructure Expansion** | Any class $\to$ `Highway` | New road network corridors |
| **Agricultural Conversion** | `Pasture` $\to$ `PermanentCrop` / `AnnualCrop` | Farm parcel crop rotation |
| **Hydrological Shift** | `River` / `SeaLake` $\leftrightarrow$ Non-water class | Drought, reservoir shifts, flood plains |

---

## 3. GeoJSON Feature Schema for Change Detection

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "bbox": [11.45, 48.10, 11.65, 48.25],
    "date_before": "2024-06-01",
    "date_after": "2026-06-01",
    "total_tiles": 64,
    "changed_tiles_count": 8,
    "change_rate_percent": 12.50,
    "transition_summary": {
      "Urbanization": 6,
      "Agricultural Conversion": 2
    },
    "processing_time_ms": 612.40
  },
  "features": [
    {
      "type": "Feature",
      "id": "tile_1_2_10",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[11.50, 48.20], [11.525, 48.20], ...]]
      },
      "properties": {
        "tile_id": "tile_1_2_10",
        "class_before": "AnnualCrop",
        "confidence_before": 0.941,
        "class_after": "Residential",
        "confidence_after": 0.962,
        "is_changed": true,
        "change_type": "Urbanization",
        "transition_label": "AnnualCrop -> Residential",
        "needs_review": false
      }
    }
  ]
}
```

---

## 4. Key Engineering Milestones

1. **Dual-Date Alignment:** Pixel-accurate slicing ensures chips from $T_1$ and $T_2$ map to identical WGS84 bounding polygons.
2. **Noise Suppression:** Low-confidence predictions are automatically categorized as `Uncertain Transition (Filtered)` rather than triggering false change alarms.
3. **Frontend Ready:** Directly consumable by the React Leaflet map in Phase 6 for before/after visual diff toggling and polygon color-coding.

# Phase 4 Report: Real-World Geospatial Inference Pipeline & FastAPI

## Executive Overview

In Phase 4, we transitioned from benchmark-level evaluation to a **production-grade geospatial inference pipeline**. The pipeline accepts arbitrary geographic bounding boxes (WGS84 EPSG:4326), retrieves Sentinel-2 satellite imagery, tiles scenes into 64x64 EuroSAT chips, runs calibrated multi-class inference with uncertainty routing (`needs_review`), and outputs standard GeoJSON FeatureCollections ready for Leaflet and GIS map layers.

---

## 1. Geospatial Slicing & Polygon Projection

Satellite scenes are partitioned into non-overlapping 64x64 pixel chips corresponding to EuroSAT spatial resolution (10m per pixel). Each chip is projected to its real-world WGS84 geographic bounding box:

```
Bounding Box [min_lon, min_lat, max_lon, max_lat]
   |
   v
Sentinel-2 Scene (512x512 px)
   |
   +---> Chip [0, 0] (64x64 px) ---> Polygon GeoJSON [[[lon1, lat1], [lon2, lat2], ...]]
   +---> Chip [0, 1] (64x64 px) ---> Polygon GeoJSON [[[lon2, lat1], [lon3, lat2], ...]]
   ...
   +---> Chip [7, 7] (64x64 px) ---> Polygon GeoJSON [[[...]]]
```

---

## 2. API Endpoints

| Endpoint | Method | Input Payload | Output |
| :--- | :---: | :--- | :--- |
| `/health` | `GET` | — | Service status, model metadata, supported classes |
| `/sample-regions` | `GET` | — | Pre-configured European test regions (e.g. Munich, Rhine Valley) |
| `/classify-region` | `POST` | `bbox`, `date`, `confidence_threshold` | GeoJSON `FeatureCollection` of classified tiles with confidence review flags |

---

## 3. GeoJSON Feature Output Schema

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "bbox": [11.45, 48.10, 11.65, 48.25],
    "date": "2026-06-01",
    "total_tiles": 64,
    "confidence_threshold": 0.70,
    "tiles_needing_review": 5,
    "review_rate_percent": 7.81,
    "class_distribution": {
      "AnnualCrop": 14,
      "Forest": 22,
      "Residential": 18,
      "Industrial": 6,
      "Highway": 4
    },
    "processing_time_ms": 425.60
  },
  "features": [
    {
      "type": "Feature",
      "id": "tile_0_0_0",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [11.45, 48.25],
            [11.475, 48.25],
            [11.475, 48.23125],
            [11.45, 48.23125],
            [11.45, 48.25]
          ]
        ]
      },
      "properties": {
        "tile_id": "tile_0_0_0",
        "predicted_class": "Forest",
        "confidence": 0.942,
        "needs_review": false,
        "class_probabilities": {
          "Forest": 0.942,
          "Pasture": 0.031,
          ...
        }
      }
    }
  ]
}
```

---

## 4. Key Engineering Milestones

1. **Seamless Frontend Compatibility:** GeoJSON `Polygon` format directly mounts to Leaflet `L.geoJSON()` layers in Phase 6.
2. **Confidence-Based UI Styling Support:** `needs_review: true` tiles allow the frontend to render hatched/dashed overlays for ambiguous terrain.
3. **Sub-Second Processing:** Batched PyTorch inference processes 64 tiles (512x512 scene) in under 500ms.

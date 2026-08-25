"""
FastAPI Inference Application for Satellite Land-Use Monitoring System.
Exposes POST /classify-region and POST /detect-change endpoints returning GeoJSON.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time

from data.dataset import CLASSES
from model.inference import LandUseClassifier
from api.sentinel import fetch_sentinel2_scene, slice_into_chips, SAMPLE_REGIONS
from api.change import detect_regional_changes

app = FastAPI(
    title="Enviro-Sat: Satellite Land-Use Monitoring API",
    description="Inference & Change Detection API serving calibrated EuroSAT deep learning classifiers on Sentinel-2 satellite imagery.",
    version="1.0.0"
)

# Enable CORS for React Leaflet frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.head("/")
def root():
    return {
        "service": "Enviro-Sat: Satellite Land-Use Monitoring API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "classify_region": "/classify-region",
            "detect_change": "/detect-change",
            "sample_regions": "/sample-regions"
        }
    }


# Global Model Instance (lazy initialized)
_classifier: Optional[LandUseClassifier] = None


def get_classifier() -> LandUseClassifier:
    global _classifier
    if _classifier is None:
        _classifier = LandUseClassifier(model_name="resnet50")
    return _classifier


class RegionClassificationRequest(BaseModel):
    bbox: List[float] = Field(
        ...,
        description="Bounding box coordinates in EPSG:4326: [min_lon, min_lat, max_lon, max_lat]",
        json_schema_extra={"example": [11.45, 48.10, 11.65, 48.25]}
    )
    date: Optional[str] = Field(
        default="2026-06-01",
        description="Target acquisition date (YYYY-MM-DD)",
        json_schema_extra={"example": "2026-06-01"}
    )
    confidence_threshold: Optional[float] = Field(
        default=0.70,
        description="Confidence threshold below which tiles are flagged as needs_review",
        ge=0.0,
        le=1.0,
        json_schema_extra={"example": 0.70}
    )


class ChangeDetectionRequest(BaseModel):
    bbox: List[float] = Field(
        ...,
        description="Bounding box coordinates in EPSG:4326: [min_lon, min_lat, max_lon, max_lat]",
        json_schema_extra={"example": [11.45, 48.10, 11.65, 48.25]}
    )
    date_before: Optional[str] = Field(
        default="2024-06-01",
        description="Baseline historical acquisition date (YYYY-MM-DD)",
        json_schema_extra={"example": "2024-06-01"}
    )
    date_after: Optional[str] = Field(
        default="2026-06-01",
        description="Current/recent acquisition date (YYYY-MM-DD)",
        json_schema_extra={"example": "2026-06-01"}
    )
    confidence_threshold: Optional[float] = Field(
        default=0.70,
        description="Confidence threshold for filtering change detection noise",
        ge=0.0,
        le=1.0,
        json_schema_extra={"example": 0.70}
    )


@app.get("/health")
def health_check():
    """Service health check and model status."""
    return {
        "status": "healthy",
        "service": "enviro-sat-inference-api",
        "supported_classes": CLASSES,
        "chip_size": 64,
        "sample_regions": SAMPLE_REGIONS
    }


@app.get("/sample-regions")
def get_sample_regions():
    """Return pre-configured European sample regions for demo inspection."""
    return SAMPLE_REGIONS


@app.post("/classify-region")
def classify_region(request: RegionClassificationRequest):
    """
    Classify a satellite geographic bounding box for a single date.
    Returns standard GeoJSON FeatureCollection.
    """
    start_time = time.time()
    
    if len(request.bbox) != 4:
        raise HTTPException(status_code=400, detail="bbox must contain exactly 4 floats: [min_lon, min_lat, max_lon, max_lat]")

    min_lon, min_lat, max_lon, max_lat = request.bbox
    if min_lon >= max_lon or min_lat >= max_lat:
        raise HTTPException(status_code=400, detail="Invalid bbox: min values must be strictly less than max values.")

    scene_img = fetch_sentinel2_scene(bbox=request.bbox, date=request.date)
    chips = slice_into_chips(scene_img, bbox=request.bbox, chip_size=64)
    classifier = get_classifier()

    chip_images = [chip["chip_image"] for chip in chips]
    predictions = classifier.predict_batch(chip_images, threshold=request.confidence_threshold)

    features = []
    class_counts = {cls_name: 0 for cls_name in CLASSES}
    review_count = 0

    for chip, pred_result in zip(chips, predictions):
        pred_class = pred_result["predicted_class"]
        confidence = pred_result["confidence"]
        needs_review = pred_result["needs_review"]

        class_counts[pred_class] += 1
        if needs_review:
            review_count += 1

        feature = {
            "type": "Feature",
            "id": chip["tile_id"],
            "geometry": chip["geometry"],
            "properties": {
                "tile_id": chip["tile_id"],
                "grid_row": chip["grid_pos"]["row"],
                "grid_col": chip["grid_pos"]["col"],
                "predicted_class": pred_class,
                "confidence": confidence,
                "needs_review": needs_review,
                "class_probabilities": pred_result["class_probabilities"],
                "bbox": chip["bbox"],
                "centroid": chip["centroid"]["coordinates"]
            }
        }
        features.append(feature)

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "type": "FeatureCollection",
        "metadata": {
            "bbox": request.bbox,
            "date": request.date,
            "total_tiles": len(features),
            "confidence_threshold": request.confidence_threshold,
            "tiles_needing_review": review_count,
            "review_rate_percent": round((review_count / max(1, len(features))) * 100, 2),
            "class_distribution": class_counts,
            "processing_time_ms": elapsed_ms
        },
        "features": features
    }


@app.post("/detect-change")
def detect_change(request: ChangeDetectionRequest):
    """
    Perform temporal change detection across two Sentinel-2 dates for a target bounding box.
    Filters atmospheric/uncertainty noise using high-confidence thresholds on both timestamps.
    Returns GeoJSON FeatureCollection of tiles with before/after labels and transition types.
    """
    if len(request.bbox) != 4:
        raise HTTPException(status_code=400, detail="bbox must contain exactly 4 floats: [min_lon, min_lat, max_lon, max_lat]")

    min_lon, min_lat, max_lon, max_lat = request.bbox
    if min_lon >= max_lon or min_lat >= max_lat:
        raise HTTPException(status_code=400, detail="Invalid bbox: min values must be strictly less than max values.")

    classifier = get_classifier()
    change_geojson = detect_regional_changes(
        classifier=classifier,
        bbox=request.bbox,
        date_before=request.date_before,
        date_after=request.date_after,
        confidence_threshold=request.confidence_threshold
    )

    return change_geojson


# Optionally mount built frontend SPA for single-container deployments (e.g. Hugging Face Spaces / Render)
from pathlib import Path
_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

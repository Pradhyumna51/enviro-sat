"""
FastAPI Inference Application for Satellite Land-Use Monitoring System.
Exposes POST /classify-region endpoint returning GeoJSON FeatureCollection.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time

from data.dataset import CLASSES
from model.inference import LandUseClassifier
from api.sentinel import fetch_sentinel2_scene, slice_into_chips, SAMPLE_REGIONS

app = FastAPI(
    title="Enviro-Sat: Satellite Land-Use Monitoring API",
    description="Inference API serving calibrated EuroSAT deep learning classifiers on Sentinel-2 satellite imagery.",
    version="0.4.0"
)

# Enable CORS for React Leaflet frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        example=[11.45, 48.10, 11.65, 48.25]
    )
    date: Optional[str] = Field(
        default="2026-06-01",
        description="Target acquisition date (YYYY-MM-DD)",
        example="2026-06-01"
    )
    confidence_threshold: Optional[float] = Field(
        default=0.70,
        description="Confidence threshold below which tiles are flagged as needs_review",
        ge=0.0,
        le=1.0,
        example=0.70
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
    Classify a satellite geographic bounding box:
    1. Fetches Sentinel-2 scene imagery for the bounding box.
    2. Slices scene into 64x64 EuroSAT-sized tiles.
    3. Runs calibrated inference on all chips.
    4. Attaches GeoJSON polygon geometries and confidence review flags.
    5. Returns standard GeoJSON FeatureCollection.
    """
    start_time = time.time()
    
    if len(request.bbox) != 4:
        raise HTTPException(status_code=400, detail="bbox must contain exactly 4 floats: [min_lon, min_lat, max_lon, max_lat]")

    min_lon, min_lat, max_lon, max_lat = request.bbox
    if min_lon >= max_lon or min_lat >= max_lat:
        raise HTTPException(status_code=400, detail="Invalid bbox: min values must be strictly less than max values.")

    # 1. Fetch Sentinel-2 Scene
    scene_img = fetch_sentinel2_scene(bbox=request.bbox, date=request.date)

    # 2. Slice into 64x64 chips with GeoJSON geometries
    chips = slice_into_chips(scene_img, bbox=request.bbox, chip_size=64)

    # 3. Run Calibrated Inference
    classifier = get_classifier()
    features = []
    class_counts = {cls_name: 0 for cls_name in CLASSES}
    review_count = 0

    for chip in chips:
        pred_result = classifier.predict(chip["chip_image"], threshold=request.confidence_threshold)
        
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

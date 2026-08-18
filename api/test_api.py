"""
Unit and Integration Tests for Phase 4 Geospatial Inference API.
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.sentinel import fetch_sentinel2_scene, slice_into_chips, SAMPLE_REGIONS

client = TestClient(app)


def test_health_endpoint():
    """Verify /health returns service status and supported EuroSAT classes."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert len(data["supported_classes"]) == 10
    assert "Forest" in data["supported_classes"]


def test_sample_regions_endpoint():
    """Verify /sample-regions returns pre-configured European regions."""
    response = client.get("/sample-regions")
    assert response.status_code == 200
    data = response.json()
    assert "munich_urban_fringe" in data
    assert len(data["munich_urban_fringe"]["bbox"]) == 4


def test_tiling_geometry_and_counts():
    """Verify slicing a scene produces valid 64x64 chips with WGS84 polygon coordinates."""
    bbox = [11.45, 48.10, 11.65, 48.25]
    scene = fetch_sentinel2_scene(bbox, target_dim=256)
    chips = slice_into_chips(scene, bbox, chip_size=64)

    # 256x256 / 64x64 = 4x4 = 16 chips
    assert len(chips) == 16
    first_chip = chips[0]
    assert "geometry" in first_chip
    assert first_chip["geometry"]["type"] == "Polygon"
    assert len(first_chip["geometry"]["coordinates"][0]) == 5  # Closed ring


def test_classify_region_geojson_response():
    """Verify POST /classify-region returns a valid GeoJSON FeatureCollection."""
    payload = {
        "bbox": [11.45, 48.10, 11.65, 48.25],
        "date": "2026-06-01",
        "confidence_threshold": 0.70
    }
    response = client.post("/classify-region", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["type"] == "FeatureCollection"
    assert "metadata" in data
    assert data["metadata"]["total_tiles"] > 0
    assert "features" in data
    assert len(data["features"]) == data["metadata"]["total_tiles"]

    first_feature = data["features"][0]
    assert first_feature["type"] == "Feature"
    assert "geometry" in first_feature
    assert "properties" in first_feature
    assert "predicted_class" in first_feature["properties"]
    assert "confidence" in first_feature["properties"]
    assert "needs_review" in first_feature["properties"]
    assert "class_probabilities" in first_feature["properties"]


def test_invalid_bbox_validation():
    """Verify invalid bbox returns HTTP 400 Bad Request."""
    payload = {
        "bbox": [11.65, 48.25, 11.45, 48.10],  # min > max
        "date": "2026-06-01"
    }
    response = client.post("/classify-region", json=payload)
    assert response.status_code == 400

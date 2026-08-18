"""
Unit and Integration Tests for Phase 5 Change Detection Pipeline & API.
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.change import classify_transition_type, detect_regional_changes
from model.inference import LandUseClassifier

client = TestClient(app)


def test_transition_type_classification():
    """Verify semantic classification of land-use transition types."""
    assert classify_transition_type("Forest", "Forest") == "No Change"
    assert classify_transition_type("Forest", "Residential") == "Urbanization"
    assert classify_transition_type("AnnualCrop", "Residential") == "Urbanization"
    assert classify_transition_type("Forest", "AnnualCrop") == "Deforestation"
    assert classify_transition_type("AnnualCrop", "Forest") == "Reforestation"
    assert classify_transition_type("Forest", "Highway") == "Infrastructure Expansion"
    assert classify_transition_type("River", "Pasture") == "Hydrological Shift"
    assert classify_transition_type("AnnualCrop", "PermanentCrop") == "Agricultural Conversion"


def test_detect_change_endpoint_success():
    """Verify POST /detect-change returns a valid GeoJSON FeatureCollection with change properties."""
    payload = {
        "bbox": [11.45, 48.10, 11.65, 48.25],
        "date_before": "2024-06-01",
        "date_after": "2026-06-01",
        "confidence_threshold": 0.70
    }
    response = client.post("/detect-change", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["type"] == "FeatureCollection"
    assert "metadata" in data
    assert data["metadata"]["total_tiles"] > 0
    assert "changed_tiles_count" in data["metadata"]
    assert "change_rate_percent" in data["metadata"]
    assert "transition_summary" in data["metadata"]
    assert "features" in data
    assert len(data["features"]) == data["metadata"]["total_tiles"]

    first_feature = data["features"][0]
    assert first_feature["type"] == "Feature"
    assert "geometry" in first_feature
    assert "properties" in first_feature
    assert "class_before" in first_feature["properties"]
    assert "class_after" in first_feature["properties"]
    assert "is_changed" in first_feature["properties"]
    assert "change_type" in first_feature["properties"]
    assert "transition_label" in first_feature["properties"]
    assert "confidence_before" in first_feature["properties"]
    assert "confidence_after" in first_feature["properties"]


def test_detect_change_invalid_bbox():
    """Verify POST /detect-change validates bounding box coordinates."""
    payload = {
        "bbox": [11.65, 48.25, 11.45, 48.10],  # min > max
        "date_before": "2024-06-01",
        "date_after": "2026-06-01"
    }
    response = client.post("/detect-change", json=payload)
    assert response.status_code == 400

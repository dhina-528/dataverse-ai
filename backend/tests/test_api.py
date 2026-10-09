import pytest
from fastapi.testclient import TestClient
import io
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_upload_and_analysis_flow():
    csv_data = "id,revenue,cost,category\n1,100,50,Electronics\n2,200,80,Electronics\n3,150,60,Clothing\n4,500,200,Furniture\n"
    file_payload = {"file": ("test.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    
    upload_res = client.post("/api/upload", files=file_payload)
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["success"] is True
    dataset_id = data["dataset_id"]
    assert dataset_id is not None

    # Test correlation endpoint
    corr_res = client.get(f"/api/analytics/{dataset_id}/correlations")
    assert corr_res.status_code == 200
    assert "columns" in corr_res.json()

    # Test distribution endpoint
    dist_res = client.get(f"/api/analytics/{dataset_id}/distribution?column=revenue&bins=5")
    assert dist_res.status_code == 200
    assert "labels" in dist_res.json()

    # Test insights endpoint
    insight_res = client.post("/api/insights/query", json={"dataset_id": dataset_id, "prompt": "Analyze revenue trends"})
    assert insight_res.status_code == 200
    assert "response" in insight_res.json()

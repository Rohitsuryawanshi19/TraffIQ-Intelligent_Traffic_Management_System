import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_v1_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["version"] == "v1"

def test_login_and_auth_me():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "ADMIN"

def test_control_room_summary():
    res = client.get("/api/control-room/summary")
    assert res.status_code == 200
    assert "metrics" in res.json()

import requests

BASE = "http://127.0.0.1:8000/api"

# 1. Login ADMIN
admin_login = requests.post(f"{BASE}/auth/login", json={"username": "admin", "password": "admin123"})
assert admin_login.status_code == 200, "Admin login failed"
admin_token = admin_login.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}

# 2. Login VIEWER
viewer_login = requests.post(f"{BASE}/auth/login", json={"username": "viewer", "password": "viewer123"})
assert viewer_login.status_code == 200, "Viewer login failed"
viewer_token = viewer_login.json()["access_token"]
viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

print("Auth Login: PASS")

# 3. Test Users Endpoint (ADMIN only)
u1 = requests.get(f"{BASE}/users", headers=admin_headers)
assert u1.status_code == 200, f"Users admin failed: {u1.status_code}"
u2 = requests.get(f"{BASE}/users", headers=viewer_headers)
assert u2.status_code == 403, f"Users viewer should 403: {u2.status_code}"
print("Users RBAC: PASS")

# 4. Test Public/Auth Endpoints
endpoints = [
    ("/rules", 200, None),
    ("/cameras", 200, None),
    ("/intersections", 200, None),
    ("/traffic/congestion", 200, None),
    ("/traffic/congestion/config", 200, None),
    ("/traffic/predict", 200, None),
    ("/signal/status", 200, None),
    ("/emergency/events", 200, None),
    ("/analytics/summary", 200, None),
    ("/alerts", 200, None),
    ("/control-room/summary", 200, None),
    ("/audit-logs", 200, admin_headers),
    ("/audit-logs", 403, viewer_headers),
]

for ep, expected, headers in endpoints:
    r = requests.get(f"{BASE}{ep}", headers=headers)
    assert r.status_code == expected, f"Endpoint {ep} failed: expected {expected}, got {r.status_code}"

print("All Endpoints Integration: PASS (13/13)")

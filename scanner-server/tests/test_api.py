from fastapi.testclient import TestClient

from app.main import app


def test_health():
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


def test_scan_requires_token():
    with TestClient(app) as client:
        resp = client.post("/scan", json={
            "scanId": "abc",
            "scanner": "nmap",
            "target": "scanme.nmap.org",
            "options": {},
            "userId": "user-1",
        })
        assert resp.status_code == 401


def test_scan_validate_endpoint_rejects_private():
    with TestClient(app) as client:
        resp = client.post(
            "/scan/validate",
            headers={"X-Scanner-Token": "test-token"},
            json={
                "scanId": "abc",
                "scanner": "nmap",
                "target": "10.0.0.1",
                "options": {},
                "userId": "user-1",
            },
        )
        # RFC1918 rejected even when X-Scanner-Token is valid
        assert resp.status_code == 400


def test_scan_validate_rejects_bogus():
    with TestClient(app) as client:
        resp = client.post(
            "/scan/validate",
            headers={"X-Scanner-Token": "test-token"},
            json={
                "scanId": "abc",
                "scanner": "nmap",
                "target": "!!!!",
                "options": {},
                "userId": "user-1",
            },
        )
        assert resp.status_code == 400

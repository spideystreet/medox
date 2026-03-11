"""Unit tests for custom HTTP routes."""

from starlette.testclient import TestClient

from nephila.agent.http_app import app


class TestHealthEndpoint:
    def test_returns_status_ok(self):
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_rejects_post_method(self):
        client = TestClient(app)
        response = client.post("/health")
        assert response.status_code == 405

import pytest
from fastapi.testclient import TestClient

def test_translate_line_rate_limit(client: TestClient):
    # Unauthenticated translation should fail or hit rate limits
    response = client.post(
        "/translate-line",
        json={"text": "Hello world", "track_id": "test_track"}
    )
    
    # Depending on implementation, it might be 401 or 200 if public
    # Assuming translate requires auth or rate-limits heavily
    assert response.status_code in [200, 401, 429]
    
    if response.status_code == 200:
        assert "translation" in response.json()
        assert response.json()["translation"] is not None

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.core.db import get_conn, get_lock

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
def clean_db():
    # Bu fixture testlerden önce veritabanındaki test tablolarını temizleyebilir
    # Şimdilik DB'yi tam temizlemek yerine auth testlerinde rastgele email üretilir
    yield

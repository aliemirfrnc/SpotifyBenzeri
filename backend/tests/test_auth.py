import pytest
from fastapi.testclient import TestClient
import uuid

def test_register_and_login(client: TestClient):
    # Register
    test_email = f"test_{uuid.uuid4().hex}@lingofy.app"
    test_password = "SecurePassword123!"
    
    response = client.post(
        "/auth/register",
        json={"email": test_email, "password": test_password}
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["email"] == test_email
    
    # Check if cookies are set
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies

    # Login
    response_login = client.post(
        "/auth/login",
        json={"email": test_email, "password": test_password}
    )
    assert response_login.status_code == 200
    assert "access_token" in response_login.cookies

    # Get Me
    client.cookies.update({"access_token": response_login.cookies.get("access_token")})
    response_me = client.get("/auth/me")
    assert response_me.status_code == 200
    me_data = response_me.json()
    assert me_data["email"] == test_email
    assert me_data["role"] == "USER"

def test_login_wrong_password(client: TestClient):
    response = client.post(
        "/auth/login",
        json={"email": "non_existent@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "Geçersiz e-posta veya şifre" in response.json()["detail"]

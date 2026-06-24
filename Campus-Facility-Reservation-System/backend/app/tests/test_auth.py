from fastapi.testclient import TestClient


def test_register(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Aditya",
            "email": "aditya@test.com",
            "password": "password123",
            "role": "student",
        },
    )

    assert response.status_code == 201


def test_login(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Aditya",
            "email": "aditya@test.com",
            "password": "password123",
            "role": "student",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "aditya@test.com",
            "password": "password123",
        },
    )

    assert response.status_code == 200

    body = response.json()
    assert "access_token" in body


def test_me(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Aditya",
            "email": "aditya@test.com",
            "password": "password123",
            "role": "student",
        },
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "aditya@test.com",
            "password": "password123",
        },
    )

    token = login_response.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200


def test_update_preferences(client: TestClient):
    # Create and login user
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Pref User",
            "email": "pref@test.com",
            "password": "password123",
            "role": "student",
        },
    )
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "pref@test.com",
            "password": "password123",
        },
    )
    token = login_resp.json()["access_token"]

    # Verify default preferences
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["prefEmailNotifications"] is True
    assert user_data["prefInappNotifications"] is True

    # Update preferences
    update_response = client.patch(
        "/api/v1/auth/me/preferences",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "pref_email_notifications": False,
            "pref_inapp_notifications": False,
        }
    )
    assert update_response.status_code == 200
    updated_data = update_response.json()
    assert updated_data["prefEmailNotifications"] is False
    assert updated_data["prefInappNotifications"] is False

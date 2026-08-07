"""Integration tests — auth endpoints."""

import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "Password1!",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "Test User"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "Password1!"}
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "logintest@example.com", "password": "Password1!"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "logintest@example.com", "password": "Password1!"},
    )
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "wrongpass@example.com", "password": "Password1!"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@example.com", "password": "WrongPass1!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "Password1!"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "me@example.com", "password": "Password1!"},
    )
    token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_token_refresh(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "refresh@example.com", "password": "Password1!"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "refresh@example.com", "password": "Password1!"},
    )
    refresh_token = login.json()["refresh_token"]

    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    new_tokens = response.json()
    assert "access_token" in new_tokens

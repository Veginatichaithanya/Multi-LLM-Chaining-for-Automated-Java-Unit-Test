"""
Authentication tests.
"""
from __future__ import annotations

import pytest


def test_signup_success(client):
    resp = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "Secure@Pass1",
        "name": "Test User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["name"] == "Test User"


def test_signup_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "Secure@Pass1", "name": "User"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


def test_login_success(client):
    client.post("/api/auth/register", json={
        "email": "login@example.com", "password": "Secure@Pass1", "name": "Login User",
    })
    resp = client.post("/api/auth/login", json={
        "email": "login@example.com", "password": "Secure@Pass1",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "wrong@example.com", "password": "Secure@Pass1", "name": "User",
    })
    resp = client.post("/api/auth/login", json={
        "email": "wrong@example.com", "password": "WrongPassword1",
    })
    assert resp.status_code == 401


def test_me_authenticated(client):
    # Register + get token
    reg = client.post("/api/auth/register", json={
        "email": "me@example.com", "password": "Secure@Pass1", "name": "Me User",
    })
    token = reg.json()["access_token"]
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"


def test_me_unauthenticated(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 403  # Missing Bearer


def test_forgot_password_safe_response(client):
    resp = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert resp.status_code == 200
    assert "message" in resp.json()


def test_health_check(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "database" in data

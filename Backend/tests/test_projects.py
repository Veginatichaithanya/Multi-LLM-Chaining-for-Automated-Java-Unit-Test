"""
Project CRUD and ownership tests.
"""
from __future__ import annotations


def _get_token(client, email: str, password: str = "Secure@Pass1", name: str = "User") -> str:
    client.post("/api/auth/register", json={"email": email, "password": password, "name": name})
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


def test_create_project(client):
    token = _get_token(client, "proj@example.com")
    resp = client.post("/api/projects", json={
        "name": "Calculator Project",
        "description": "A Java calculator",
        "language": "java",
        "build_tool": "maven",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Calculator Project"
    assert data["language"] == "java"


def test_list_projects(client):
    token = _get_token(client, "list@example.com")
    client.post("/api/projects", json={"name": "P1"}, headers={"Authorization": f"Bearer {token}"})
    client.post("/api/projects", json={"name": "P2"}, headers={"Authorization": f"Bearer {token}"})
    resp = client.get("/api/projects", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_project_ownership_enforced(client):
    """User A cannot access User B'\''s project."""
    token_a = _get_token(client, "useracc@example.com")
    token_b = _get_token(client, "userb@example.com")

    # User A creates a project
    resp = client.post("/api/projects", json={"name": "A'\''s Project"}, headers={"Authorization": f"Bearer {token_a}"})
    project_id = resp.json()["id"]

    # User B tries to access it — should get 404
    resp_b = client.get(f"/api/projects/{project_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert resp_b.status_code == 404


def test_delete_project(client):
    token = _get_token(client, "del@example.com")
    resp = client.post("/api/projects", json={"name": "To Delete"}, headers={"Authorization": f"Bearer {token}"})
    pid = resp.json()["id"]
    del_resp = client.delete(f"/api/projects/{pid}", headers={"Authorization": f"Bearer {token}"})
    assert del_resp.status_code == 204

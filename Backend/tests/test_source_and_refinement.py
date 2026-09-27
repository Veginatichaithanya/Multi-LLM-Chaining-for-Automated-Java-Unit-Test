"""
Source file and refinement iteration limit tests.
Section 35 compliance.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest

from app.services.ai.base import AIResponse


def _get_token_and_project(client):
    email = "src_test@example.com"
    client.post("/api/auth/register", json={"email": email, "password": "Secure@Pass1", "name": "Src User"})
    resp = client.post("/api/auth/login", json={"email": email, "password": "Secure@Pass1"})
    token = resp.json()["access_token"]
    proj_resp = client.post("/api/projects", json={"name": "Java Test App"}, headers={"Authorization": f"Bearer {token}"})
    project_id = proj_resp.json()["id"]
    return token, project_id


def test_source_lifecycle(client):
    """Test source file upload, listing, retrieval, and deletion."""
    token, project_id = _get_token_and_project(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload valid source
    calc_code = "public class Calculator { public int add(int a, int b) { return a + b; } }"
    upload_resp = client.post(
        f"/api/projects/{project_id}/source",
        json={"file_name": "Calculator.java", "source_code": calc_code},
        headers=headers,
    )
    assert upload_resp.status_code == 201
    source_data = upload_resp.json()
    assert source_data["file_name"] == "Calculator.java"
    source_id = source_data["id"]

    # 2. List sources
    list_resp = client.get(f"/api/projects/{project_id}/source", headers=headers)
    assert list_resp.status_code == 200
    sources = list_resp.json()
    assert len(sources) == 1
    assert sources[0]["file_name"] == "Calculator.java"

    # 3. Get single source with code
    get_resp = client.get(f"/api/projects/{project_id}/source/{source_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["source_code"] == calc_code

    # 4. Source analysis endpoint
    analyze_resp = client.post(f"/api/projects/{project_id}/analyze", headers=headers)
    assert analyze_resp.status_code == 200
    analysis = analyze_resp.json()
    assert analysis["class_name"] == "Calculator"

    # 5. Delete source
    del_resp = client.delete(f"/api/projects/{project_id}/source/{source_id}", headers=headers)
    assert del_resp.status_code == 204


def test_refinement_iteration_limit(client):
    """Refinement max_iterations cannot exceed 5."""
    token, project_id = _get_token_and_project(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        f"/api/projects/{project_id}/refine-tests",
        json={"generation_id": "dummy-id", "max_iterations": 10},
        headers=headers,
    )
    assert resp.status_code in (400, 422)
    assert "max_iterations" in resp.text

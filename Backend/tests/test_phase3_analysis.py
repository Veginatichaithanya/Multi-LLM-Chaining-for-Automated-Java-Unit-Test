"""
Unit and integration tests for Phase 3:
- 5 MB file size limit validation
- Rejection of unsupported file extensions (.exe, .zip, .jar, .py, .js)
- Java AST extraction (classes, constructors, methods, parameters, fields, branches)
- Source analysis persistence in source_analyses PostgreSQL table
- POST /api/projects/{id}/analyze with {"source_id": "UUID"}
- GET /api/projects/{id}/analysis/{source_id}
"""
from __future__ import annotations

import pytest
from app.engines.java_analyzer import analyze_java_source
from app.utils.validators import validate_java_filename, validate_source_size


def test_validator_file_extensions():
    # Valid
    validate_java_filename("Calculator.java")
    validate_java_filename("OrderProcessor.java")

    # Invalid extensions must raise ValueError
    for invalid in ["malware.exe", "bundle.zip", "lib.jar", "script.py", "app.js", "style.css"]:
        with pytest.raises(ValueError) as exc:
            validate_java_filename(invalid)
        assert "accepted" in str(exc.value).lower() or "only java" in str(exc.value).lower()


def test_validator_source_size():
    # 100 KB is fine
    validate_source_size("public class A {}" + " // pad\n" * 1000)

    # Over 5 MB must raise ValueError (5 * 1024 * 1024 = 5,242,880)
    huge_source = "public class Huge {\n" + "    // 5MB+\n" * 500_000 + "}\n"
    with pytest.raises(ValueError) as exc:
        validate_source_size(huge_source)
    assert "too large" in str(exc.value).lower()


def test_java_ast_analyzer_comprehensive():
    sample_code = """
    package com.testforge.banking;

    import java.util.List;
    import java.io.IOException;

    public class BankAccount {
        private String accountNumber;
        private double balance;
        public static final double MIN_BALANCE = 10.0;

        public BankAccount(String accountNumber, double initialBalance) throws IllegalArgumentException {
            if (initialBalance < MIN_BALANCE) {
                throw new IllegalArgumentException("Initial balance too low");
            }
            this.accountNumber = accountNumber;
            this.balance = initialBalance;
        }

        public double deposit(double amount) {
            if (amount <= 0) {
                throw new IllegalArgumentException("Amount must be positive");
            }
            this.balance += amount;
            return this.balance;
        }

        public boolean withdraw(double amount) {
            if (amount > 0 && this.balance >= amount) {
                this.balance -= amount;
                return true;
            }
            return false;
        }
    }
    """
    analysis = analyze_java_source(sample_code, source_id="test-src-1")
    d = analysis.to_dict("test-src-1")

    assert d["source_id"] == "test-src-1"
    assert d["package_name"] == "com.testforge.banking"
    assert "java.util.List" in d["imports"]
    assert len(d["classes"]) == 1

    cls = d["classes"][0]
    assert cls["name"] == "BankAccount"
    assert cls["type"] == "class"
    assert cls["visibility"] == "public"

    # Constructors
    assert len(cls["constructors"]) == 1
    assert cls["constructors"][0]["name"] == "BankAccount"
    assert len(cls["constructors"][0]["parameters"]) == 2
    assert cls["constructors"][0]["parameters"][0]["name"] == "accountNumber"
    assert cls["constructors"][0]["parameters"][0]["type"] == "String"

    # Fields
    assert len(cls["fields"]) >= 3
    field_names = [f["name"] for f in cls["fields"]]
    assert "accountNumber" in field_names
    assert "balance" in field_names
    assert "MIN_BALANCE" in field_names

    # Methods
    method_names = [m["name"] for m in cls["methods"]]
    assert "deposit" in method_names
    assert "withdraw" in method_names

    # Statistics
    stats = d["statistics"]
    assert stats["class_count"] == 1
    assert stats["method_count"] == 2
    assert stats["constructor_count"] == 1
    assert stats["field_count"] >= 3
    assert stats["branch_count"] >= 3


def _get_token_and_project(client):
    email = "phase3_test@example.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "TestForge@123", "name": "Phase3 User"},
    )
    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "TestForge@123"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj_resp = client.post(
        "/api/projects",
        json={
            "name": "Phase 3 Analysis Test Proj",
            "description": "Testing AST and persistence",
            "language": "Java",
            "java_version": "17",
            "build_tool": "Maven",
        },
        headers=headers,
    )
    project_id = proj_resp.json()["id"]
    return headers, project_id


def test_api_source_analysis_pipeline(client):
    headers, project_id = _get_token_and_project(client)

    # 1. Upload valid Java file
    java_code = """
    package com.service;

    public class PaymentGateway {
        private String apiKey;

        public PaymentGateway(String apiKey) {
            this.apiKey = apiKey;
        }

        public boolean processPayment(double amount) {
            if (amount <= 0) {
                return false;
            }
            return true;
        }
    }
    """
    upload_resp = client.post(
        f"/api/projects/{project_id}/source",
        json={"file_name": "PaymentGateway.java", "source_code": java_code},
        headers=headers,
    )
    assert upload_resp.status_code == 201
    source_id = upload_resp.json()["id"]

    # 2. Upload invalid file extension must be rejected
    invalid_resp = client.post(
        f"/api/projects/{project_id}/source",
        json={"file_name": "virus.exe", "source_code": "binary data"},
        headers=headers,
    )
    assert invalid_resp.status_code == 400

    # 3. Analyze with {"source_id": UUID}
    analyze_resp = client.post(
        f"/api/projects/{project_id}/analyze",
        json={"source_id": source_id},
        headers=headers,
    )
    assert analyze_resp.status_code == 200
    res = analyze_resp.json()
    assert res["status"] == "completed"
    assert res["source_id"] == source_id
    assert "analysis_id" in res
    assert "analysis" in res
    assert res["analysis"]["package_name"] == "com.service"
    assert res["analysis"]["classes"][0]["name"] == "PaymentGateway"

    # 4. Retrieve stored analysis via GET /api/projects/{id}/analysis/{source_id}
    get_analysis_resp = client.get(
        f"/api/projects/{project_id}/analysis/{source_id}",
        headers=headers,
    )
    assert get_analysis_resp.status_code == 200
    saved = get_analysis_resp.json()
    assert saved["analysis_id"] == res["analysis_id"]
    assert saved["analysis"]["classes"][0]["name"] == "PaymentGateway"

    # Clean up project
    client.delete(f"/api/projects/{project_id}", headers=headers)

"""
TestForge AI — Live End-to-End System & API Verification Script
Tests the full system workflow against live running instances of Frontend and Backend.
"""
import sys
import time
import json
import urllib.request
import urllib.error

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"

class E2ETestRunner:
    def __init__(self):
        self.token = None
        self.headers = {"Content-Type": "application/json"}
        self.results = []
        self.test_project_id = None

    def log(self, step: str, success: bool, message: str = ""):
        status_icon = "✅" if success else "❌"
        status_text = "PASS" if success else "FAIL"
        print(f"{status_icon} [{status_text}] {step}: {message}")
        self.results.append({"step": step, "success": success, "message": message})

    def request(self, method: str, url: str, data: dict = None, use_auth: bool = False):
        headers = dict(self.headers)
        if use_auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req_data = json.dumps(data).encode("utf-8") if data else None
        req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                status_code = resp.getcode()
                body = resp.read().decode("utf-8")
                try:
                    parsed = json.loads(body)
                except Exception:
                    parsed = body
                return status_code, parsed
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                parsed = json.loads(err_body)
            except Exception:
                parsed = err_body
            return e.code, parsed
        except Exception as e:
            return 0, str(e)

    def run_all(self):
        print("\n=======================================================")
        print("  TESTFORGE AI — LIVE END-TO-END VERIFICATION SUITE   ")
        print("=======================================================\n")

        # 1. Frontend Check
        self.test_frontend()

        # 2. Backend Health
        self.test_backend_health()

        # 3. Authentication
        self.test_authentication()

        # 4. User Profile
        self.test_user_profile()

        # 5. Project CRUD
        self.test_project_lifecycle()

        # 6. Source Upload & AST Static Analysis
        self.test_source_and_ast_analysis()

        # 7. AI Health
        self.test_ai_health()

        # 8. Experiments List & Creation
        self.test_experiments()

        # 9. Results & Discussion Telemetry
        self.test_results_telemetry()

        # 10. Summary
        self.print_summary()

    def test_frontend(self):
        try:
            req = urllib.request.Request(FRONTEND_URL)
            with urllib.request.urlopen(req, timeout=5) as resp:
                content = resp.read().decode("utf-8")
                has_root = '<div id="root">' in content or 'id="root"' in content
                self.log("Frontend Availability", resp.getcode() == 200 and has_root, f"Port 5173 responded HTTP 200 with React root mount")
        except Exception as e:
            self.log("Frontend Availability", False, f"Could not reach {FRONTEND_URL}: {e}")

    def test_backend_health(self):
        status, body = self.request("GET", f"{BACKEND_URL}/api/health")
        if status == 200 and isinstance(body, dict) and body.get("status") == "ok":
            self.log("Backend Health Check", True, f"HTTP 200, status='{body.get('status')}'")
        else:
            self.log("Backend Health Check", False, f"Unexpected response: {status} {body}")

    def test_authentication(self):
        payload = {
            "email": "demo@testforge.ai",
            "password": "TestForge@123"
        }
        status, body = self.request("POST", f"{BACKEND_URL}/api/auth/login", payload)
        if status == 200 and isinstance(body, dict) and "access_token" in body:
            self.token = body["access_token"]
            self.log("Authentication (POST /api/auth/login)", True, f"JWT received: {self.token[:15]}...")
        else:
            self.log("Authentication (POST /api/auth/login)", False, f"Status {status}: {body}")

    def test_user_profile(self):
        status, body = self.request("GET", f"{BACKEND_URL}/api/users/me", use_auth=True)
        if status == 200 and isinstance(body, dict) and body.get("email") == "demo@testforge.ai":
            self.log("User Profile (GET /api/users/me)", True, f"Authenticated as {body.get('full_name')} ({body.get('email')})")
        else:
            self.log("User Profile (GET /api/users/me)", False, f"Status {status}: {body}")

    def test_project_lifecycle(self):
        # List projects
        status, body = self.request("GET", f"{BACKEND_URL}/api/projects", use_auth=True)
        if status == 200 and isinstance(body, dict) and "projects" in body:
            projects_list = body["projects"]
            self.log("List Projects (GET /api/projects)", True, f"Found {len(projects_list)} existing projects (total={body.get('total')})")
        elif status == 200 and isinstance(body, list):
            self.log("List Projects (GET /api/projects)", True, f"Found {len(body)} existing projects")
        else:
            self.log("List Projects (GET /api/projects)", False, f"Status {status}: {body}")

        # Create new project
        new_proj = {
            "name": f"E2E_Live_Verification_{int(time.time())}",
            "description": "Automated verification test project created during E2E test run.",
            "java_version": "17",
            "build_tool": "maven"
        }
        status, body = self.request("POST", f"{BACKEND_URL}/api/projects", new_proj, use_auth=True)
        if status in (200, 201) and isinstance(body, dict) and "id" in body:
            self.test_project_id = body["id"]
            self.log("Create Project (POST /api/projects)", True, f"Project '{body.get('name')}' created (ID: {self.test_project_id})")
        else:
            self.log("Create Project (POST /api/projects)", False, f"Status {status}: {body}")

    def test_source_and_ast_analysis(self):
        if not self.test_project_id:
            self.log("Source & AST Analysis", False, "Skipped: no active project ID")
            return

        sample_java = """package com.example;

public class MathOperations {
    public int multiply(int a, int b) {
        return a * b;
    }

    public double divide(double a, double b) {
        if (b == 0.0) {
            throw new IllegalArgumentException("Division by zero");
        }
        return a / b;
    }
}
"""
        source_payload = {
            "file_name": "MathOperations.java",
            "source_code": sample_java,
            "package_name": "com.example",
            "class_name": "MathOperations"
        }
        status, body = self.request("POST", f"{BACKEND_URL}/api/projects/{self.test_project_id}/source", source_payload, use_auth=True)
        if status in (200, 201) and isinstance(body, dict) and "id" in body:
            src_id = body["id"]
            self.log("Upload Source File (POST /api/projects/:id/source)", True, f"SourceFile ID {src_id} created")

            # Static AST Analysis
            status_an, body_an = self.request("POST", f"{BACKEND_URL}/api/projects/{self.test_project_id}/analyze", {}, use_auth=True)
            if status_an in (200, 201) and isinstance(body_an, dict):
                methods = body_an.get("methods", [])
                self.log("AST Static Analysis (POST /api/projects/:id/analyze)", True, f"Parsed {len(methods)} methods, complexity={body_an.get('cyclomatic_complexity')}")
            else:
                self.log("AST Static Analysis (POST /api/projects/:id/analyze)", False, f"Status {status_an}: {body_an}")
        else:
            self.log("Upload Source File (POST /api/projects/:id/source)", False, f"Status {status}: {body}")

    def test_ai_health(self):
        status, body = self.request("GET", f"{BACKEND_URL}/api/ai/health", use_auth=True)
        if status == 200 and isinstance(body, dict):
            providers = body.get("providers", {})
            self.log("AI Gateway Health (GET /api/ai/health)", True, f"Configured providers: {list(providers.keys()) if isinstance(providers, dict) else body}")
        else:
            self.log("AI Gateway Health (GET /api/ai/health)", False, f"Status {status}: {body}")

    def test_experiments(self):
        status, body = self.request("GET", f"{BACKEND_URL}/api/experiments", use_auth=True)
        if status == 200 and isinstance(body, list):
            self.log("List Experiments (GET /api/experiments)", True, f"Found {len(body)} experiment benchmarks")
        else:
            self.log("List Experiments (GET /api/experiments)", False, f"Status {status}: {body}")

    def test_results_telemetry(self):
        target_pid = self.test_project_id or "3af4003c-b109-487e-a824-2ee38b12c7dd"
        # 1. Comparison
        status, body = self.request("GET", f"{BACKEND_URL}/api/results/comparison?project_id={target_pid}", use_auth=True)
        if status == 200 and isinstance(body, dict):
            self.log("Results Comparison API (GET /api/results/comparison)", True, f"Single vs Multi-LLM metrics fetched successfully")
        else:
            self.log("Results Comparison API (GET /api/results/comparison)", False, f"Status {status}: {body}")

        # 2. Refinement History
        status_ref, body_ref = self.request("GET", f"{BACKEND_URL}/api/results/refinement-history?project_id={target_pid}", use_auth=True)
        if status_ref == 200 and isinstance(body_ref, dict):
            self.log("Refinement History API (GET /api/results/refinement-history)", True, f"Fetched {len(body_ref.get('iterations', []))} historical iterations")
        else:
            self.log("Refinement History API (GET /api/results/refinement-history)", False, f"Status {status_ref}: {body_ref}")

        # 3. Mutation Comparison
        status_mut, body_mut = self.request("GET", f"{BACKEND_URL}/api/results/mutation?project_id={target_pid}", use_auth=True)
        if status_mut == 200 and isinstance(body_mut, dict):
            self.log("Mutation Comparison API (GET /api/results/mutation)", True, f"Fetched mutation comparison metrics")
        else:
            self.log("Mutation Comparison API (GET /api/results/mutation)", False, f"Status {status_mut}: {body_mut}")

    def print_summary(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r["success"])
        failed = total - passed

        print("\n=======================================================")
        print(f"  E2E RUN COMPLETED: {passed}/{total} Passed ({failed} Failed)")
        print("=======================================================\n")
        if failed > 0:
            sys.exit(1)

if __name__ == "__main__":
    runner = E2ETestRunner()
    runner.run_all()

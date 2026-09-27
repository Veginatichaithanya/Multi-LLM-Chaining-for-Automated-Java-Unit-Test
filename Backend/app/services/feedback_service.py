"""
Feedback Service.

Builds structured feedback for Multi-LLM test refinement (GPT-4o) using actual
compilation results, JUnit test execution metrics, failure details, and JaCoCo coverage.
Adheres strictly to Phase 5 Section 5.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional


class FeedbackService:
    @classmethod
    def build_feedback(
        cls,
        source_code: str,
        current_test_code: str,
        source_analysis: Optional[Dict[str, Any]] = None,
        compile_success: bool = True,
        compile_errors: Optional[str] = None,
        total_tests: Optional[int] = None,
        passed_tests: Optional[int] = None,
        failed_tests: Optional[int] = None,
        skipped_tests: Optional[int] = None,
        failures: Optional[List[Dict[str, Any]]] = None,
        line_coverage: Optional[float] = None,
        branch_coverage: Optional[float] = None,
        instruction_coverage: Optional[float] = None,
        method_coverage: Optional[float] = None,
        class_coverage: Optional[float] = None,
        uncovered_lines: Optional[List[int]] = None,
        uncovered_branches: Optional[List[int]] = None,
        previous_refinements: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Assemble a structured dictionary of real measurements for the refinement prompt.
        If a metric is unavailable, it is kept as None / null. No invented values.
        """
        feedback: Dict[str, Any] = {
            "compilation": {
                "success": compile_success,
                "errors": compile_errors if not compile_success else None,
            },
            "test_execution": {
                "total": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "skipped": skipped_tests,
            },
            "coverage": {
                "line": line_coverage,
                "branch": branch_coverage,
                "instruction": instruction_coverage,
                "method": method_coverage,
                "class": class_coverage,
            },
            "failures": failures or [],
            "uncovered_lines": uncovered_lines or [],
            "uncovered_branches": uncovered_branches or [],
            "previous_refinements": previous_refinements or [],
        }
        return feedback

    @classmethod
    def format_user_prompt(
        cls,
        source_code: str,
        current_test_code: str,
        feedback: Dict[str, Any],
        source_analysis: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Format the user prompt for GPT-4o refinement as specified in Phase 5 Section 6.
        """
        analysis_str = (
            json.dumps(source_analysis, indent=2)
            if source_analysis
            else "No prior AST analysis available."
        )
        feedback_json_str = json.dumps(feedback, indent=2)

        prompt = f"""### 1. Java Production Source Code:
```java
{source_code}
```

### 2. Source Code Analysis:
{analysis_str}

### 3. Current JUnit 5 Test Code:
```java
{current_test_code}
```

### 4. Actual Execution & Coverage Feedback:
```json
{feedback_json_str}
```

Please refine and improve the test suite to fix any compilation errors or failing tests, and add test cases to cover the uncovered lines and branches shown above.
Return ONLY the complete, compilable Java JUnit 5 test class.
"""
        return prompt

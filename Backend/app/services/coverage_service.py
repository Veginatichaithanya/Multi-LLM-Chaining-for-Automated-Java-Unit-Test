"""
Coverage service — runs JaCoCo and PIT via Maven.
"""
from __future__ import annotations

import os
import shutil
import tempfile
import uuid

from sqlalchemy.orm import Session

from app.config import get_settings
from app.engines.jacoco_runner import JaCoCoCoverage, parse_jacoco_report
from app.engines.maven_runner import _find_class_name, _find_test_class_name, _POM_WITH_JACOCO
from app.engines.pit_runner import PITResult, run_mutation_testing
from app.models.test_generation import TestGeneration
from app.models.test_result import TestResult
from app.services.source_analysis_service import SourceAnalysisService

import subprocess
import time
import re

settings = get_settings()


class CoverageService:

    @staticmethod
    def _run_maven_with_jacoco_persistent(
        source_code: str, test_code: str
    ) -> tuple[bool, str, JaCoCoCoverage]:
        """Run Maven + JaCoCo in a persistent temp dir and parse results."""
        if not shutil.which("mvn"):
            return False, "Maven not found", JaCoCoCoverage(status="not_available")

        pkg_match = re.search(r'^\s*package\s+([\w.]+)\s*;', source_code, re.MULTILINE)
        package = pkg_match.group(1) if pkg_match else "testforge.generated"
        pkg_path = package.replace(".", os.sep)

        tmpdir = tempfile.mkdtemp(prefix="testforge_cov_")
        try:
            src_dir = os.path.join(tmpdir, "src", "main", "java", pkg_path)
            test_dir = os.path.join(tmpdir, "src", "test", "java", pkg_path)
            os.makedirs(src_dir, exist_ok=True)
            os.makedirs(test_dir, exist_ok=True)

            with open(os.path.join(tmpdir, "pom.xml"), "w", encoding="utf-8") as f:
                f.write(_POM_WITH_JACOCO)

            src_class = _find_class_name(source_code)
            with open(os.path.join(src_dir, f"{src_class}.java"), "w", encoding="utf-8") as f:
                f.write(source_code if pkg_match else f"package {package};\n\n{source_code}")

            test_class = _find_test_class_name(test_code)
            with open(os.path.join(test_dir, f"{test_class}.java"), "w", encoding="utf-8") as f:
                f.write(test_code if re.search(r'^\s*package\s+', test_code, re.MULTILINE)
                        else f"package {package};\n\n{test_code}")

            env = os.environ.copy()
            if settings.JAVA_HOME:
                env["JAVA_HOME"] = settings.JAVA_HOME

            proc = subprocess.run(
                ["mvn", "test", "-B", "--no-transfer-progress"],
                cwd=tmpdir, capture_output=True, text=True,
                timeout=settings.JAVA_EXECUTION_TIMEOUT_SECONDS, env=env,
            )

            target_dir = os.path.join(tmpdir, "target")
            coverage = parse_jacoco_report(target_dir)
            success = proc.returncode == 0
            return success, proc.stdout + proc.stderr, coverage
        except subprocess.TimeoutExpired:
            return False, "Timeout", JaCoCoCoverage(status="timeout")
        except Exception as e:
            return False, str(e), JaCoCoCoverage(status="error")
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    @staticmethod
    def run_coverage(
        db: Session, project_id: str, generation_id: str
    ) -> TestResult:
        gen = db.query(TestGeneration).filter(
            TestGeneration.id == generation_id,
            TestGeneration.project_id == project_id,
        ).first()
        if not gen or not gen.test_code:
            raise ValueError("Generation not found or has no test code")

        source = SourceAnalysisService.get_source(db, project_id, gen.source_file_id) if gen.source_file_id else None
        source_code = source.source_code if source else ""

        start = time.monotonic()
        success, output, coverage = CoverageService._run_maven_with_jacoco_persistent(
            source_code, gen.test_code
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)

        result = TestResult(
            id=str(uuid.uuid4()),
            generation_id=generation_id,
            project_id=project_id,
            compilation_success=success,
            execution_success=success,
            execution_time_ms=elapsed_ms,
            stdout=output[-20_000:],
            line_coverage=coverage.line_coverage,
            branch_coverage=coverage.branch_coverage,
            instruction_coverage=coverage.instruction_coverage,
            method_coverage=coverage.method_coverage,
            class_coverage=coverage.class_coverage,
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result

    @staticmethod
    def run_mutation_test(
        db: Session, project_id: str, generation_id: str
    ) -> TestResult:
        gen = db.query(TestGeneration).filter(
            TestGeneration.id == generation_id,
            TestGeneration.project_id == project_id,
        ).first()
        if not gen or not gen.test_code:
            raise ValueError("Generation not found or has no test code")

        source = SourceAnalysisService.get_source(db, project_id, gen.source_file_id) if gen.source_file_id else None
        source_code = source.source_code if source else ""

        pit_result: PITResult = run_mutation_testing(source_code, gen.test_code)

        result = TestResult(
            id=str(uuid.uuid4()),
            generation_id=generation_id,
            project_id=project_id,
            mutation_score=pit_result.mutation_score,
            killed_mutations=pit_result.killed_mutations,
            survived_mutations=pit_result.survived_mutations,
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result

"""
Maven Runner Engine.

Creates an isolated temporary Maven project structure, compiles Java source,
executes JUnit 5 tests, and parses JaCoCo code coverage.

SECURITY:
- Never executes arbitrary shell commands from user input.
- All commands are strictly controlled (e.g. `mvn test-compile`, `mvn test`).
- Process timeouts are enforced (default 120s) with clean process termination.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from app.config import get_settings
from app.engines.jacoco_runner import JaCoCoCoverage, parse_jacoco_report
from app.engines.junit_runner import SurefireReport, parse_surefire_reports

settings = get_settings()

_POM_TEMPLATE = """\
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>testforge.generated</groupId>
  <artifactId>generated-tests</artifactId>
  <version>1.0-SNAPSHOT</version>
  <packaging>jar</packaging>

  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <testFailureIgnore>true</testFailureIgnore>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
"""

_POM_WITH_JACOCO = """\
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>testforge.generated</groupId>
  <artifactId>generated-tests</artifactId>
  <version>1.0-SNAPSHOT</version>

  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <testFailureIgnore>true</testFailureIgnore>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.jacoco</groupId>
        <artifactId>jacoco-maven-plugin</artifactId>
        <version>0.8.11</version>
        <executions>
          <execution>
            <goals><goal>prepare-agent</goal></goals>
          </execution>
          <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
"""


@dataclass
class MavenResult:
    success: bool
    return_code: int
    stdout: str
    stderr: str
    execution_time_ms: int
    tests_total: int = 0
    tests_passed: int = 0
    tests_failed: int = 0
    tests_errored: int = 0
    tests_skipped: int = 0
    error_count: int = 0
    compilation_success: bool = False
    working_dir: str = ""
    status: str = "not_run"
    errors: List[str] = field(default_factory=list)


@dataclass
class PipelineExecutionResult:
    status: str  # "completed", "compilation_failed", "failed", "timeout", "not_available"
    compile_success: bool
    execution_success: bool
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    skipped_tests: int = 0
    error_count: int = 0
    execution_time_ms: int = 0
    stdout: str = ""
    stderr: str = ""
    surefire_report: Optional[SurefireReport] = None
    coverage: Optional[JaCoCoCoverage] = None
    message: Optional[str] = None


def get_maven_executable() -> Optional[str]:
    """Resolve the Maven executable path across environments."""
    if settings.MAVEN_HOME:
        for candidate in [
            os.path.join(settings.MAVEN_HOME, "bin", "mvn.cmd"),
            os.path.join(settings.MAVEN_HOME, "bin", "mvn.bat"),
            os.path.join(settings.MAVEN_HOME, "bin", "mvn"),
        ]:
            if os.path.isfile(candidate):
                return candidate

    which_mvn = shutil.which("mvn") or shutil.which("mvn.cmd") or shutil.which("mvn.bat")
    if which_mvn:
        return which_mvn

    user_home = os.path.expanduser("~")
    for p in [
        os.path.join(user_home, "scoop", "apps", "maven", "current", "bin", "mvn.cmd"),
        os.path.join(user_home, "scoop", "shims", "mvn.cmd"),
    ]:
        if os.path.isfile(p):
            return p

    for prog in [
        os.environ.get("ProgramFiles", "C:\\Program Files"),
        os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"),
    ]:
        for sub in ["Maven", "apache-maven"]:
            candidate = os.path.join(prog, sub, "bin", "mvn.cmd")
            if os.path.isfile(candidate):
                return candidate

    return None


def get_java_executable() -> Optional[str]:
    """Resolve Java executable path."""
    if settings.JAVA_HOME:
        candidate = os.path.join(settings.JAVA_HOME, "bin", "java.exe" if os.name == "nt" else "java")
        if os.path.isfile(candidate):
            return candidate

    which_java = shutil.which("java") or shutil.which("java.exe")
    if which_java:
        return which_java

    user_home = os.path.expanduser("~")
    for p in [
        os.path.join(user_home, "scoop", "apps", "openjdk17", "current", "bin", "java.exe"),
        os.path.join(user_home, "scoop", "shims", "java.exe"),
    ]:
        if os.path.isfile(p):
            return p

    return None


def maven_available() -> bool:
    """Check if Maven executable is available."""
    return get_maven_executable() is not None


def java_available() -> bool:
    """Check if Java executable is available."""
    return get_java_executable() is not None


def _find_class_name(source_code: str) -> str:
    """Extract public class/interface/enum name from Java source."""
    m = re.search(r'public\s+(?:class|interface|enum|record)\s+(\w+)', source_code)
    if m:
        return m.group(1)
    m2 = re.search(r'(?:class|interface|enum|record)\s+(\w+)', source_code)
    return m2.group(1) if m2 else "UnknownClass"


def _find_test_class_name(test_code: str) -> str:
    """Extract test class name from test source."""
    m = re.search(r'(?:public\s+)?class\s+(\w+)', test_code)
    return m.group(1) if m else "GeneratedTest"


def _extract_package_name(code: str) -> Optional[str]:
    """Extract package declaration from Java code if present."""
    m = re.search(r'^\s*package\s+([\w.]+)\s*;', code, re.MULTILINE)
    return m.group(1) if m else None


def _get_build_env() -> dict[str, str]:
    """Construct environment for Maven execution."""
    env = os.environ.copy()
    if settings.JAVA_HOME and os.path.isdir(settings.JAVA_HOME):
        env["JAVA_HOME"] = settings.JAVA_HOME
    elif not env.get("JAVA_HOME"):
        user_home = os.path.expanduser("~")
        scoop_jdk = os.path.join(user_home, "scoop", "apps", "openjdk17", "current")
        if os.path.isdir(scoop_jdk):
            env["JAVA_HOME"] = scoop_jdk

    if settings.MAVEN_HOME and os.path.isdir(settings.MAVEN_HOME):
        env["M2_HOME"] = settings.MAVEN_HOME
        env["MAVEN_HOME"] = settings.MAVEN_HOME
    elif not env.get("MAVEN_HOME"):
        user_home = os.path.expanduser("~")
        scoop_mvn = os.path.join(user_home, "scoop", "apps", "maven", "current")
        if os.path.isdir(scoop_mvn):
            env["M2_HOME"] = scoop_mvn
            env["MAVEN_HOME"] = scoop_mvn

    return env


def prepare_workspace(
    source_code: str,
    test_code: str,
    with_jacoco: bool = True,
) -> str:
    """
    Create an isolated temporary Maven project workspace under temp/.
    Places production and test source according to their package declarations.
    """
    # Create isolated directory: temp/testforge_execution_<uuid>/
    base_temp = os.path.join(os.getcwd(), "temp")
    os.makedirs(base_temp, exist_ok=True)
    workspace_dir = os.path.join(base_temp, f"testforge_execution_{uuid.uuid4().hex}")
    os.makedirs(workspace_dir, exist_ok=True)

    # Write pom.xml
    pom_content = _POM_WITH_JACOCO if with_jacoco else _POM_TEMPLATE
    with open(os.path.join(workspace_dir, "pom.xml"), "w", encoding="utf-8") as f:
        f.write(pom_content)

    # Source placement
    src_pkg = _extract_package_name(source_code)
    src_pkg_dir = src_pkg.replace(".", os.sep) if src_pkg else ""
    src_target_dir = os.path.join(workspace_dir, "src", "main", "java", src_pkg_dir)
    os.makedirs(src_target_dir, exist_ok=True)

    src_class = _find_class_name(source_code)
    with open(os.path.join(src_target_dir, f"{src_class}.java"), "w", encoding="utf-8") as f:
        f.write(source_code)

    # Test placement
    test_pkg = _extract_package_name(test_code)
    if not test_pkg and src_pkg:
        test_pkg = src_pkg
        test_code = f"package {src_pkg};\n\n{test_code}"

    test_pkg_dir = test_pkg.replace(".", os.sep) if test_pkg else ""
    test_target_dir = os.path.join(workspace_dir, "src", "test", "java", test_pkg_dir)
    os.makedirs(test_target_dir, exist_ok=True)

    test_class = _find_test_class_name(test_code)
    with open(os.path.join(test_target_dir, f"{test_class}.java"), "w", encoding="utf-8") as f:
        f.write(test_code)

    return workspace_dir


def compile_project(workspace_dir: str, timeout: int = 120) -> MavenResult:
    """
    Execute `mvn test-compile` to verify compilation before test execution.
    If compilation fails, returns MavenResult with compilation_success=False.
    """
    mvn_exe = get_maven_executable()
    if not mvn_exe:
        return MavenResult(
            success=False,
            return_code=-1,
            stdout="",
            stderr="Maven executable not found",
            execution_time_ms=0,
            compilation_success=False,
            status="not_available",
            errors=["Maven not available"],
        )

    start_time = time.monotonic()
    try:
        proc = subprocess.run(
            [mvn_exe, "test-compile", "-B", "--no-transfer-progress"],
            cwd=workspace_dir,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_get_build_env(),
        )
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        stdout = proc.stdout or ""
        stderr = proc.stderr or ""
        rc = proc.returncode

        compilation_ok = rc == 0 and "BUILD SUCCESS" in stdout and "COMPILATION ERROR" not in stdout

        return MavenResult(
            success=compilation_ok,
            return_code=rc,
            stdout=stdout[-50_000:],
            stderr=stderr[-10_000:],
            execution_time_ms=elapsed_ms,
            compilation_success=compilation_ok,
            working_dir=workspace_dir,
            status="completed" if compilation_ok else "compilation_failed",
            errors=[] if compilation_ok else ["Compilation failed"],
        )
    except subprocess.TimeoutExpired:
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        return MavenResult(
            success=False,
            return_code=-1,
            stdout="",
            stderr=f"Compilation timed out after {timeout}s",
            execution_time_ms=elapsed_ms,
            compilation_success=False,
            working_dir=workspace_dir,
            status="timeout",
            errors=["Compilation timeout"],
        )
    except Exception as e:
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        return MavenResult(
            success=False,
            return_code=-1,
            stdout="",
            stderr=str(e),
            execution_time_ms=elapsed_ms,
            compilation_success=False,
            working_dir=workspace_dir,
            status="error",
            errors=[str(e)],
        )


def run_tests_in_workspace(
    workspace_dir: str, timeout: int = 120
) -> tuple[MavenResult, SurefireReport, JaCoCoCoverage]:
    """
    Execute `mvn test`, parsing Surefire reports and JaCoCo coverage before cleanup.
    """
    mvn_exe = get_maven_executable()
    if not mvn_exe:
        return (
            MavenResult(
                success=False, return_code=-1, stdout="", stderr="Maven not found",
                execution_time_ms=0, status="not_available", errors=["Maven not found"]
            ),
            SurefireReport(),
            JaCoCoCoverage(status="not_available"),
        )

    start_time = time.monotonic()
    try:
        proc = subprocess.run(
            [mvn_exe, "test", "jacoco:report", "-Dmaven.test.failure.ignore=true", "-B", "--no-transfer-progress"],
            cwd=workspace_dir,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_get_build_env(),
        )
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        stdout = proc.stdout or ""
        stderr = proc.stderr or ""
        rc = proc.returncode

        target_dir = os.path.join(workspace_dir, "target")
        surefire_report = parse_surefire_reports(target_dir)
        jacoco_coverage = parse_jacoco_report(target_dir)

        # Determine success from JUnit reports and exit code
        execution_ok = (
            rc == 0
            and surefire_report.tests_failed == 0
            and surefire_report.tests_errored == 0
        )

        mvn_res = MavenResult(
            success=execution_ok,
            return_code=rc,
            stdout=stdout[-50_000:],
            stderr=stderr[-10_000:],
            execution_time_ms=elapsed_ms,
            tests_total=surefire_report.tests_total,
            tests_passed=surefire_report.tests_passed,
            tests_failed=surefire_report.tests_failed,
            tests_errored=surefire_report.tests_errored,
            tests_skipped=surefire_report.tests_skipped,
            error_count=surefire_report.tests_errored,
            compilation_success=True,
            working_dir=workspace_dir,
            status="completed" if execution_ok else "failed",
        )
        return mvn_res, surefire_report, jacoco_coverage

    except subprocess.TimeoutExpired:
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        mvn_res = MavenResult(
            success=False, return_code=-1,
            stdout="", stderr=f"Execution timed out after {timeout}s",
            execution_time_ms=elapsed_ms,
            working_dir=workspace_dir,
            status="timeout",
            errors=["Execution timeout"],
        )
        return mvn_res, SurefireReport(), JaCoCoCoverage(status="timeout")
    except Exception as e:
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        mvn_res = MavenResult(
            success=False, return_code=-1,
            stdout="", stderr=str(e),
            execution_time_ms=elapsed_ms,
            working_dir=workspace_dir,
            status="error",
            errors=[str(e)],
        )
        return mvn_res, SurefireReport(), JaCoCoCoverage(status="error")


def execute_test_pipeline(
    source_code: str,
    test_code: str,
    with_jacoco: bool = True,
    timeout: Optional[int] = None,
) -> PipelineExecutionResult:
    """
    Full Phase 4 test execution pipeline:
    1. Check tools availability.
    2. Create isolated workspace.
    3. Run compilation step (`mvn test-compile`).
       - If failed: abort test run, return compilation_failed.
    4. Run JUnit 5 test execution (`mvn test`).
    5. Parse Surefire reports & JaCoCo coverage.
    6. Always clean up workspace in finally block.
    """
    if not maven_available():
        return PipelineExecutionResult(
            status="not_available",
            compile_success=False,
            execution_success=False,
            message="Maven executable not found on server.",
        )
    if not java_available():
        return PipelineExecutionResult(
            status="not_available",
            compile_success=False,
            execution_success=False,
            message="Java 17+ executable not found on server.",
        )

    effective_timeout = timeout or settings.JAVA_EXECUTION_TIMEOUT_SECONDS
    workspace_dir = None

    try:
        workspace_dir = prepare_workspace(source_code, test_code, with_jacoco=with_jacoco)

        # ── Step 1: Compilation ──────────────────────────────────────────────
        compile_res = compile_project(workspace_dir, timeout=effective_timeout)
        if not compile_res.compilation_success:
            return PipelineExecutionResult(
                status="compilation_failed",
                compile_success=False,
                execution_success=False,
                execution_time_ms=compile_res.execution_time_ms,
                stdout=compile_res.stdout,
                stderr=compile_res.stderr,
                message="Compilation failed. JUnit tests were not executed.",
            )

        # ── Step 2: JUnit & JaCoCo execution ─────────────────────────────────
        mvn_res, surefire_rep, coverage = run_tests_in_workspace(workspace_dir, timeout=effective_timeout)

        if mvn_res.status == "timeout":
            return PipelineExecutionResult(
                status="timeout",
                compile_success=True,
                execution_success=False,
                execution_time_ms=mvn_res.execution_time_ms,
                stdout=mvn_res.stdout,
                stderr=mvn_res.stderr,
                message=f"Execution timed out after {effective_timeout} seconds.",
            )

        return PipelineExecutionResult(
            status="completed" if mvn_res.success else "failed",
            compile_success=True,
            execution_success=mvn_res.success,
            total_tests=surefire_rep.tests_total,
            passed_tests=surefire_rep.tests_passed,
            failed_tests=surefire_rep.tests_failed,
            skipped_tests=surefire_rep.tests_skipped,
            error_count=surefire_rep.tests_errored,
            execution_time_ms=mvn_res.execution_time_ms,
            stdout=mvn_res.stdout,
            stderr=mvn_res.stderr,
            surefire_report=surefire_rep,
            coverage=coverage,
        )

    finally:
        if workspace_dir and os.path.isdir(workspace_dir):
            shutil.rmtree(workspace_dir, ignore_errors=True)


# Backwards compatibility helper for existing callers
def run_tests(
    source_code: str,
    test_code: str,
    with_jacoco: bool = False,
    timeout: Optional[int] = None,
) -> MavenResult:
    res = execute_test_pipeline(source_code, test_code, with_jacoco=with_jacoco, timeout=timeout)
    return MavenResult(
        success=res.execution_success,
        return_code=0 if res.execution_success else 1,
        stdout=res.stdout,
        stderr=res.stderr,
        execution_time_ms=res.execution_time_ms,
        tests_total=res.total_tests,
        tests_passed=res.passed_tests,
        tests_failed=res.failed_tests,
        tests_errored=res.error_count,
        tests_skipped=res.skipped_tests,
        error_count=res.error_count,
        compilation_success=res.compile_success,
        status=res.status,
    )

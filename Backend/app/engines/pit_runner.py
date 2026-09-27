"""
PIT Mutation Testing Runner.

Runs PIT (Pitest) via Maven and parses mutation testing results.
PIT requires Maven and Java to be configured.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass

from app.config import get_settings

settings = get_settings()


@dataclass
class PITResult:
    mutation_score: float | None = None
    killed_mutations: int = 0
    survived_mutations: int = 0
    total_mutations: int = 0
    status: str = "not_run"
    error_message: str | None = None


def _build_pit_pom_fragment(package: str, src_class: str, test_class: str) -> str:
    return f"""\
      <plugin>
        <groupId>org.pitest</groupId>
        <artifactId>pitest-maven</artifactId>
        <version>1.15.8</version>
        <dependencies>
          <dependency>
            <groupId>org.pitest</groupId>
            <artifactId>pitest-junit5-plugin</artifactId>
            <version>1.2.1</version>
          </dependency>
        </dependencies>
        <configuration>
          <targetClasses>
            <param>{package}.*</param>
            <param>*.{src_class}</param>
          </targetClasses>
          <targetTests>
            <param>{package}.*</param>
            <param>*.{test_class}</param>
          </targetTests>
          <outputFormats>
            <outputFormat>XML</outputFormat>
          </outputFormats>
        </configuration>
      </plugin>
"""


def run_mutation_testing(source_code: str, test_code: str) -> PITResult:
    """
    Run PIT mutation testing via Maven.

    Returns PITResult with mutation score and statistics.
    """
    import xml.etree.ElementTree as ET
    from app.engines.maven_runner import (
        _POM_TEMPLATE,
        _find_class_name,
        _find_test_class_name,
        _get_build_env,
        get_maven_executable,
        java_available,
        maven_available,
    )
    import time

    if not maven_available():
        return PITResult(
            status="not_available",
            error_message="Maven executable not found. Configure MAVEN_HOME or install Maven to enable mutation testing.",
        )

    if not java_available():
        return PITResult(
            status="not_available",
            error_message="Java executable not found. Configure JAVA_HOME or install Java 17+.",
        )

    mvn_cmd = get_maven_executable()
    if not mvn_cmd:
        return PITResult(
            status="not_available",
            error_message="Maven executable could not be resolved.",
        )

    tmpdir = tempfile.mkdtemp(prefix="testforge_pit_")
    try:
        import re as _re
        pkg_match = _re.search(r'^\s*package\s+([\w.]+)\s*;', source_code, _re.MULTILINE)
        package = pkg_match.group(1) if pkg_match else "testforge.generated"
        pkg_path = package.replace(".", os.sep)

        src_class = _find_class_name(source_code)
        test_class = _find_test_class_name(test_code)

        pit_fragment = _build_pit_pom_fragment(package, src_class, test_class)
        pit_pom = _POM_TEMPLATE.replace(
            "</plugins>",
            f"{pit_fragment}\n    </plugins>",
        )

        src_dir = os.path.join(tmpdir, "src", "main", "java", pkg_path)
        test_dir = os.path.join(tmpdir, "src", "test", "java", pkg_path)
        os.makedirs(src_dir, exist_ok=True)
        os.makedirs(test_dir, exist_ok=True)

        with open(os.path.join(tmpdir, "pom.xml"), "w", encoding="utf-8") as f:
            f.write(pit_pom)

        with open(os.path.join(src_dir, f"{src_class}.java"), "w", encoding="utf-8") as f:
            f.write(source_code if pkg_match else f"package {package};\n\n{source_code}")

        with open(os.path.join(test_dir, f"{test_class}.java"), "w", encoding="utf-8") as f:
            f.write(test_code if _re.search(r'^\s*package\s+', test_code, _re.MULTILINE)
                    else f"package {package};\n\n{test_code}")

        env = _get_build_env()

        start = time.monotonic()
        proc = subprocess.run(
            [mvn_cmd, "test", "org.pitest:pitest-maven:mutationCoverage", "-Dmaven.test.failure.ignore=true", "-B", "--no-transfer-progress"],
            cwd=tmpdir,
            capture_output=True,
            text=True,
            timeout=settings.JAVA_EXECUTION_TIMEOUT_SECONDS,
            env=env,
        )

        output = proc.stdout + proc.stderr

        # First check for XML report (either direct or under timestamp subdir)
        import glob
        xml_candidates = glob.glob(os.path.join(tmpdir, "target", "pit-reports", "**", "mutations.xml"), recursive=True)
        direct_xml = os.path.join(tmpdir, "target", "pit-reports", "mutations.xml")
        if os.path.exists(direct_xml) and direct_xml not in xml_candidates:
            xml_candidates.append(direct_xml)

        for xml_report in xml_candidates:
            try:
                tree = ET.parse(xml_report)
                root = tree.getroot()
                mutations = root.findall("mutation")
                total = len(mutations)
                killed = len([m for m in mutations if m.get("status") == "KILLED"])
                survived = total - killed
                score = round((killed / total) * 100, 2) if total > 0 else 0.0
                return PITResult(
                    mutation_score=score,
                    killed_mutations=killed,
                    survived_mutations=survived,
                    total_mutations=total,
                    status="completed",
                )
            except Exception:
                continue

        # Fallback to output parsing
        m = re.search(r'Generated\s+(\d+)\s+mutations.*?Killed\s+(\d+)', output, re.DOTALL)
        if m:
            total = int(m.group(1))
            killed = int(m.group(2))
            survived = total - killed
            score = round((killed / total) * 100, 2) if total > 0 else 0.0
            return PITResult(
                mutation_score=score,
                killed_mutations=killed,
                survived_mutations=survived,
                total_mutations=total,
                status="completed",
            )

        return PITResult(
            status="no_results",
            error_message="PIT ran but no mutation statistics found in output.",
        )

    except subprocess.TimeoutExpired:
        return PITResult(
            status="timeout",
            error_message=f"PIT timed out after {settings.JAVA_EXECUTION_TIMEOUT_SECONDS}s",
        )
    except Exception as e:
        return PITResult(status="error", error_message=str(e))
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

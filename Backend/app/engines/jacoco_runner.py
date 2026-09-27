"""
JaCoCo Coverage Runner.

Parses JaCoCo XML coverage report from target/site/jacoco/jacoco.xml.
"""
from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import List


@dataclass
class JaCoCoCoverage:
    line_coverage: float | None = None
    branch_coverage: float | None = None
    instruction_coverage: float | None = None
    method_coverage: float | None = None
    class_coverage: float | None = None
    uncovered_lines: List[int] = field(default_factory=list)
    uncovered_branches: List[int] = field(default_factory=list)
    status: str = "not_measured"


def _pct(covered: int, total: int) -> float | None:
    if total == 0:
        return None
    return round((covered / total) * 100, 2)


def parse_jacoco_report(target_dir: str) -> JaCoCoCoverage:
    """
    Parse the JaCoCo XML coverage report.

    Args:
        target_dir: The Maven project target directory.

    Returns:
        JaCoCoCoverage with coverage percentages and uncovered lines/branches.
    """
    report_path = os.path.join(target_dir, "site", "jacoco", "jacoco.xml")

    if not os.path.isfile(report_path):
        return JaCoCoCoverage(status="report_not_found")

    try:
        tree = ET.parse(report_path)
        root = tree.getroot()
    except ET.ParseError:
        return JaCoCoCoverage(status="parse_error")

    counters: dict[str, tuple[int, int]] = {}  # type -> (covered, total)

    for counter in root.findall("counter"):
        ctype = counter.get("type", "")
        covered = int(counter.get("covered", 0))
        missed = int(counter.get("missed", 0))
        total = covered + missed
        counters[ctype] = (covered, total)

    # Fallback to summing package counters if top-level counters are absent
    if not counters:
        for pkg in root.findall("package"):
            for counter in pkg.findall("counter"):
                ctype = counter.get("type", "")
                covered = int(counter.get("covered", 0))
                missed = int(counter.get("missed", 0))
                c_cov, c_tot = counters.get(ctype, (0, 0))
                counters[ctype] = (c_cov + covered, c_tot + covered + missed)

    # Extract uncovered lines and branches from sourcefile/class line elements
    uncovered_lines: list[int] = []
    uncovered_branches: list[int] = []
    for line in root.iter("line"):
        try:
            nr = int(line.get("nr", 0))
            ci = int(line.get("ci", 0))
            mi = int(line.get("mi", 0))
            mb = int(line.get("mb", 0))
            if ci == 0 and mi > 0 and nr > 0:
                if nr not in uncovered_lines:
                    uncovered_lines.append(nr)
            if mb > 0 and nr > 0:
                if nr not in uncovered_branches:
                    uncovered_branches.append(nr)
        except (ValueError, TypeError):
            continue

    def get_pct(ctype: str) -> float | None:
        if ctype not in counters:
            return None
        covered, total = counters[ctype]
        if total == 0:
            # If no branch points exist in the code, branch coverage is 100.0% if lines exist
            return 100.0 if (ctype == "BRANCH" and counters.get("LINE", (0, 0))[1] > 0) else 0.0
        return round((covered / total) * 100, 2)

    return JaCoCoCoverage(
        line_coverage=get_pct("LINE"),
        branch_coverage=get_pct("BRANCH"),
        instruction_coverage=get_pct("INSTRUCTION"),
        method_coverage=get_pct("METHOD"),
        class_coverage=get_pct("CLASS"),
        uncovered_lines=sorted(uncovered_lines),
        uncovered_branches=sorted(uncovered_branches),
        status="measured",
    )


def run_jacoco_coverage(source_code: str, test_code: str) -> JaCoCoCoverage:
    """
    Run Maven with JaCoCo and return coverage results.
    Delegates to maven_runner with with_jacoco=True.
    """
    import tempfile
    import os as _os
    from app.engines.maven_runner import run_tests

    result = run_tests(source_code, test_code, with_jacoco=True)

    if not result.compilation_success:
        return JaCoCoCoverage(
            status="compilation_failed",
        )

    # Working dir is cleaned up, so we need a different approach:
    # Re-run and get coverage from a persistent temp dir
    # This is handled differently — see coverage_service.py
    return JaCoCoCoverage(status="measured" if result.success else "not_measured")

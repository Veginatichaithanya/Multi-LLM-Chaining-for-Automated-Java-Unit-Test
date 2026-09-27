"""
JUnit Result Parser.

Parses Maven Surefire XML test reports to extract structured test results.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List
import xml.etree.ElementTree as ET


@dataclass
class TestCase:
    class_name: str
    name: str
    time_seconds: float = 0.0
    status: str = "passed"  # passed | failed | error | skipped
    failure_message: str | None = None
    error_message: str | None = None


@dataclass
class SurefireReport:
    tests_total: int = 0
    tests_passed: int = 0
    tests_failed: int = 0
    tests_errored: int = 0
    tests_skipped: int = 0
    time_seconds: float = 0.0
    test_cases: List[TestCase] = field(default_factory=list)


def parse_surefire_reports(target_dir: str) -> SurefireReport:
    """
    Parse all Surefire XML reports in target/surefire-reports/.

    Args:
        target_dir: The Maven project target directory.

    Returns:
        Aggregated SurefireReport.
    """
    report_dir = os.path.join(target_dir, "surefire-reports")
    report = SurefireReport()

    if not os.path.isdir(report_dir):
        return report

    for fname in os.listdir(report_dir):
        if not fname.endswith(".xml"):
            continue
        fpath = os.path.join(report_dir, fname)
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
        except ET.ParseError:
            continue

        suites = [root] if root.tag == "testsuite" else root.findall(".//testsuite")
        for suite in suites:
            report.tests_total += int(suite.get("tests", 0))
            report.tests_failed += int(suite.get("failures", 0))
            report.tests_errored += int(suite.get("errors", 0))
            report.tests_skipped += int(suite.get("skipped", 0))
            report.time_seconds += float(suite.get("time", 0.0))

            for tc_elem in suite.findall("testcase"):
                status = "passed"
                fail_msg = err_msg = None

                failure = tc_elem.find("failure")
                error = tc_elem.find("error")
                skipped = tc_elem.find("skipped")

                if failure is not None:
                    status = "failed"
                    fail_msg = failure.get("message") or failure.text
                elif error is not None:
                    status = "error"
                    err_msg = error.get("message") or error.text
                elif skipped is not None:
                    status = "skipped"

                report.test_cases.append(TestCase(
                    class_name=tc_elem.get("classname", ""),
                    name=tc_elem.get("name", ""),
                    time_seconds=float(tc_elem.get("time", 0.0)),
                    status=status,
                    failure_message=fail_msg,
                    error_message=err_msg,
                ))

    report.tests_passed = (
        report.tests_total
        - report.tests_failed
        - report.tests_errored
        - report.tests_skipped
    )
    report.tests_passed = max(0, report.tests_passed)

    return report

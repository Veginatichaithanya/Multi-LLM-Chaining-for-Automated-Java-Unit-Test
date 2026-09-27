import os, sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.test_result import TestResult

db = SessionLocal()
try:
    tr = db.query(TestResult).filter(TestResult.generation_id == '491e782f-c9fe-4da6-9ba9-e94aa7f57526').first()
    if tr:
        print("Total:", tr.tests_total, "Passed:", tr.tests_passed, "Failed:", tr.tests_failed)
        print("Stdout errors:\n")
        for line in tr.stdout.splitlines():
            if "[ERROR]" in line or "Failures:" in line or "expected:" in line:
                print(line)
finally:
    db.close()

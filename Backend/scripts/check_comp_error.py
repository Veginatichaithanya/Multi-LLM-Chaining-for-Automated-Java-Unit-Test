import os, sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.test_result import TestResult

db = SessionLocal()
try:
    tr = db.query(TestResult).filter(TestResult.id == '159ccd87-b973-47d5-9d96-17107b770a95').first()
    if tr and tr.stdout:
        print("Stdout:\n", tr.stdout)
    elif tr and tr.error_message:
        print("Error:", tr.error_message)
finally:
    db.close()

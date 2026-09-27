import os, sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.test_generation import TestGeneration

db = SessionLocal()
try:
    tg = db.query(TestGeneration).filter(TestGeneration.id == '9fbdf14c-b525-430f-95ed-5f032f86b083').first()
    if tg:
        print("Length:", len(tg.test_code))
        print("Tail:\n", tg.test_code[-500:])
finally:
    db.close()

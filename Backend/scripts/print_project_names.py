import os, sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.project import Project

db = SessionLocal()
try:
    for p in db.query(Project).all():
        print(f"'{p.name}' - {p.id}")
finally:
    db.close()

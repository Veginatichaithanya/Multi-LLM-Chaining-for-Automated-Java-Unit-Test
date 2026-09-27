import os, sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.experiment import Experiment

db = SessionLocal()
try:
    p = db.query(Project).filter(Project.name.ilike("%bank%")).first()
    if p:
        print(f"Project: {p.name} ({p.id})")
        files = db.query(SourceFile).filter(SourceFile.project_id == p.id).all()
        for f in files:
            print(f"  Source: {f.file_name} ({f.id})\n{f.source_code[:300]}")
finally:
    db.close()

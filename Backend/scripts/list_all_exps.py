import os, sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.project import Project
from app.models.source_file import SourceFile
from app.models.experiment import Experiment

db = SessionLocal()
try:
    projects = db.query(Project).all()
    for p in projects:
        print(f"Project: {p.name} ({p.id})")
        files = db.query(SourceFile).filter(SourceFile.project_id == p.id).all()
        for f in files:
            print(f"  Source: {f.file_name} ({f.id}) - {len(f.source_code)} chars")
        exps = db.query(Experiment).filter(Experiment.project_id == p.id).all()
        for e in exps:
            print(f"  Exp: {e.name} ({e.id}) - status: {e.status}, cov: {e.line_coverage}/{e.branch_coverage}/{e.mutation_score}")
finally:
    db.close()

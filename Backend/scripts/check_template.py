import os, sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.prompt_template import PromptTemplate

db = SessionLocal()
try:
    pt = db.query(PromptTemplate).filter(PromptTemplate.name == "junit5_generation").first()
    if pt:
        print("Template:\n", pt.template)
finally:
    db.close()

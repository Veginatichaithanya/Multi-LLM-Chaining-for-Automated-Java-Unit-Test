import os, sys, json
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.routers.results import get_comparison
from app.models.user import User

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "demo@testforge.ai").first()
    res = get_comparison(
        project_id="2cd2aedb-2767-49a8-b7a3-6bfb664df6ae",
        experiment_id="42d2da55-a7d8-4775-83bd-17bf2e2c7d2a",
        run_id=None,
        single_experiment_id=None,
        multi_experiment_id=None,
        generation_id=None,
        refinement_id=None,
        db=db,
        current_user=user,
    )
    print(json.dumps(res, indent=2))
finally:
    db.close()

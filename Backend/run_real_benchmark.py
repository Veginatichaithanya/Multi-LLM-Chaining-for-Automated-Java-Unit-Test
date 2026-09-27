import time
from app.database import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.experiment import Experiment
from app.models.experiment_run import ExperimentRun
from app.models.experiment_metric import ExperimentMetric
from app.schemas.experiment import ExperimentCreate
from app.services.experiment_service import ExperimentService
from app.services.experiment_runner import ExperimentRunner

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "demo@testforge.ai").first()
    if not user:
        raise RuntimeError("User demo@testforge.ai not found")

    project = db.query(Project).filter(Project.id == "3af4003c-b109-487e-a824-2ee38b12c7dd").first()
    if not project:
        raise RuntimeError("Calculator Testing project not found")

    print(f"Starting real experiment for project: {project.name} ({project.id})")
    payload = ExperimentCreate(
        project_id=project.id,
        name="Benchmark: Single-LLM vs Multi-LLM (Calculator)",
        description="Empirical comparison between Gemini single-pass generation and OpenRouter GPT-4o refinement with JaCoCo and PIT measurements.",
        configuration="gemini_to_openrouter",
        initial_provider="gemini",
        initial_model="gemini-2.5-flash-lite",
        refinement_provider="openrouter",
        refinement_model="openai/gpt-4o-mini",
        max_iterations=1,
        framework="junit5",
    )

    exp = ExperimentService.create_experiment(db, user.id, payload)
    print(f"Created Experiment ID: {exp.id}, status: {exp.status}")

    print("Executing experiment (Single-LLM generation -> Maven/JaCoCo/PIT -> Refinement -> Maven/JaCoCo/PIT)...")
    start_t = time.time()
    ExperimentRunner.execute_experiment(db, exp.id, user.id)
    elapsed = time.time() - start_t
    print(f"Experiment execution finished in {elapsed:.2f}s")

    db.refresh(exp)
    print(f"\n=== EXPERIMENT SUMMARY ===")
    print(f"ID: {exp.id}")
    print(f"Status: {exp.status}")
    print(f"Final Line Coverage: {exp.line_coverage}%")
    print(f"Final Branch Coverage: {exp.branch_coverage}%")
    print(f"Final Mutation Score: {exp.mutation_score}%")

    runs = (
        db.query(ExperimentRun)
        .filter(ExperimentRun.experiment_id == exp.id)
        .order_by(ExperimentRun.iteration.asc())
        .all()
    )
    for r in runs:
        m = db.query(ExperimentMetric).filter(ExperimentMetric.experiment_run_id == r.id).first()
        print(f"\n--- Run Iteration {r.iteration} ({r.provider}/{r.model}) ---")
        print(f"Status: {r.status}")
        if m:
            print(f"Generated Tests: {m.generated_test_count}")
            print(f"Passed/Total: {m.passed_tests}/{m.total_tests}")
            print(f"Line Coverage: {m.line_coverage}%")
            print(f"Branch Coverage: {m.branch_coverage}%")
            print(f"Mutation Score: {m.mutation_score}%")

finally:
    db.close()

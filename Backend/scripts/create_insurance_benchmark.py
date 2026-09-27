import sys, time
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.source_file import SourceFile
from app.schemas.project import ProjectCreate
from app.schemas.experiment import ExperimentCreate
from app.services.project_service import ProjectService
from app.services.experiment_service import ExperimentService
from app.services.experiment_runner import ExperimentRunner

INSURANCE_CALCULATOR_JAVA = """package com.insurance;

public class InsurancePremiumCalculator {

    public double calculateBasePremium(int driverAge, int drivingExperienceYears) {
        if (driverAge < 18) {
            throw new IllegalArgumentException("Driver must be at least 18 years old");
        }
        if (drivingExperienceYears < 0 || drivingExperienceYears > (driverAge - 16)) {
            throw new IllegalArgumentException("Invalid driving experience years");
        }

        double base = 500.0;
        if (driverAge < 25) {
            base += 400.0;
            if (drivingExperienceYears < 2) {
                base += 200.0;
            }
        } else if (driverAge >= 65) {
            base += 250.0;
            if (driverAge > 75) {
                base += 150.0;
            }
        } else {
            if (drivingExperienceYears >= 10) {
                base -= 75.0;
            }
        }
        return base;
    }

    public double applyRiskMultipliers(double basePremium, int pastAccidentsCount, int violationsCount, String vehicleCategory) {
        if (basePremium <= 0) {
            throw new IllegalArgumentException("Base premium must be positive");
        }
        if (pastAccidentsCount < 0 || violationsCount < 0) {
            throw new IllegalArgumentException("Counts cannot be negative");
        }

        double multiplier = 1.0;

        // Accident penalties
        if (pastAccidentsCount == 1) {
            multiplier += 0.25;
        } else if (pastAccidentsCount == 2) {
            multiplier += 0.60;
        } else if (pastAccidentsCount >= 3) {
            multiplier += 1.20;
        }

        // Violation penalties
        if (violationsCount == 1) {
            multiplier += 0.15;
        } else if (violationsCount == 2) {
            multiplier += 0.35;
        } else if (violationsCount >= 3) {
            multiplier += 0.75;
        }

        // Vehicle category
        if (vehicleCategory != null) {
            String cat = vehicleCategory.trim().toUpperCase();
            switch (cat) {
                case "SPORTS":
                    multiplier += 0.40;
                    break;
                case "LUXURY":
                    multiplier += 0.30;
                    break;
                case "COMMERCIAL":
                    multiplier += 0.20;
                    break;
                case "SEDAN":
                case "SUV":
                    multiplier += 0.05;
                    break;
                default:
                    // standard rate
                    break;
            }
        }

        return Math.round(basePremium * multiplier * 100.0) / 100.0;
    }

    public double calculateAnnualDiscount(double totalPremium, int creditScore, boolean isAnnualPayment, boolean hasHomePolicy) {
        if (totalPremium <= 0) {
            return 0.0;
        }

        double discountPct = 0.0;
        if (creditScore >= 750) {
            discountPct += 0.15;
        } else if (creditScore >= 680) {
            discountPct += 0.08;
        } else if (creditScore < 580 && creditScore > 0) {
            // Surcharge rather than discount
            return Math.round((totalPremium * 1.10) * 100.0) / 100.0;
        }

        if (isAnnualPayment) {
            discountPct += 0.05;
        }
        if (hasHomePolicy) {
            discountPct += 0.10;
        }

        // Maximum discount capped at 30%
        if (discountPct > 0.30) {
            discountPct = 0.30;
        }

        return Math.round((totalPremium * (1.0 - discountPct)) * 100.0) / 100.0;
    }

    public boolean isEligibleForCoverage(int driverAge, int pastAccidents, int violations, int creditScore) {
        if (driverAge < 18 || driverAge > 90) {
            return false;
        }
        if (pastAccidents >= 4 || violations >= 5) {
            return false;
        }
        if (creditScore > 0 && creditScore < 500 && pastAccidents >= 2) {
            return false;
        }
        return true;
    }
}
"""

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "demo@testforge.ai").first()
    if not user:
        raise RuntimeError("User not found")

    # Create project
    proj_in = ProjectCreate(
        name="Insurance Risk Engine",
        description="Complex actuarial risk calculation and underwriting benchmark.",
        language="java",
        java_version="17",
        build_tool="maven",
    )
    project = ProjectService.create_project(db, user.id, proj_in)
    print(f"Created Project: {project.name} ({project.id})")

    # Add source file
    src_file = SourceFile(
        project_id=project.id,
        file_name="InsurancePremiumCalculator.java",
        file_path="src/main/java/com/insurance/InsurancePremiumCalculator.java",
        source_code=INSURANCE_CALCULATOR_JAVA,
        language="java",
        file_size=len(INSURANCE_CALCULATOR_JAVA),
    )
    db.add(src_file)
    db.commit()
    db.refresh(src_file)
    print(f"Created Source File: {src_file.file_name} ({src_file.id})")

    # Create Experiment
    exp_in = ExperimentCreate(
        project_id=project.id,
        name="Benchmark: Single-LLM vs Multi-LLM (Insurance Underwriting)",
        description="Comprehensive evaluation of JUnit 5 test generation and refinement on actuarial logic.",
        configuration="gemini_to_openrouter",
        initial_provider="gemini",
        initial_model="gemini-2.5-flash-lite",
        refinement_provider="openrouter",
        refinement_model="openai/gpt-4o-mini",
        max_iterations=1,
        framework="junit5",
    )
    exp = ExperimentService.create_experiment(db, user.id, exp_in)
    print(f"Created Experiment ID: {exp.id}")

    print("Executing benchmark...")
    start_t = time.time()
    ExperimentRunner.execute_experiment(db, exp.id, user.id, source_id=src_file.id)
    elapsed = time.time() - start_t
    print(f"Execution completed in {elapsed:.2f}s")

    db.refresh(exp)
    print("\n=== BENCHMARK RESULTS ===")
    print(f"Status: {exp.status}")
    print(f"Final Line Coverage: {exp.line_coverage}%")
    print(f"Final Branch Coverage: {exp.branch_coverage}%")
    print(f"Final Mutation Score: {exp.mutation_score}%")
finally:
    db.close()

"""
Test generation API router.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.test_generation import TestGeneration
from app.models.user import User
from app.schemas.generation import ChainRequest, GenerationOut, GenerationRequest
from app.services.generation_service import GenerationService
from app.services.project_service import ProjectService
from app.utils.validators import validate_provider_name

router = APIRouter(prefix="/projects", tags=["Test Generation"])


def _check_project(db: Session, project_id: str, user_id: str) -> None:
    try:
        ProjectService.get_project_or_raise(db, project_id, user_id)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


def _build_generation_out(gen: TestGeneration) -> GenerationOut:
    return GenerationOut(
        generation_id=gen.id,
        project_id=gen.project_id,
        source_id=gen.source_file_id,
        provider=gen.provider,
        model=gen.model,
        framework=gen.framework,
        status=gen.status,
        test_code=gen.test_code,
        iteration=gen.iteration,
        prompt_tokens=gen.prompt_tokens,
        completion_tokens=gen.completion_tokens,
        error_message=gen.error_message,
        created_at=gen.created_at,
        updated_at=getattr(gen, "updated_at", None),
    )


@router.post(
    "/{project_id}/generate-tests",
    response_model=GenerationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate JUnit 5 tests using a single AI provider",
)
async def generate_tests(
    project_id: str,
    payload: GenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerationOut:
    _check_project(db, project_id, current_user.id)
    try:
        validate_provider_name(payload.provider)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    gen = await GenerationService.generate_tests(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        source_id=payload.source_id,
        provider_name=payload.provider,
        model=payload.model,
        framework=payload.framework,
    )
    return _build_generation_out(gen)


@router.post(
    "/{project_id}/generate-tests/chain",
    response_model=GenerationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Multi-LLM chain: generate with one provider, refine with another",
)
async def generate_tests_chain(
    project_id: str,
    payload: ChainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerationOut:
    """
    Multi-LLM chaining pipeline:
    Source → Analysis → Initial Provider (Gemini) → Tests → Refinement Provider (OpenRouter)
    """
    _check_project(db, project_id, current_user.id)

    try:
        validate_provider_name(payload.initial_provider)
        validate_provider_name(payload.refinement_provider)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if payload.max_iterations > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_iterations cannot exceed 5",
        )

    # Phase 1: Initial generation
    initial_gen = await GenerationService.generate_tests(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        source_id=payload.source_id,
        provider_name=payload.initial_provider,
        model=payload.initial_model,
        framework=payload.framework,
    )

    if initial_gen.status not in ("generated", "invalid_generation") or not initial_gen.test_code:
        return _build_generation_out(initial_gen)

    # Phase 2: Refinement
    refined_gen = await GenerationService.refine_tests(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        generation_id=initial_gen.id,
        provider_name=payload.refinement_provider,
        model=payload.refinement_model,
        max_iterations=payload.max_iterations,
    )

    return _build_generation_out(refined_gen)


@router.get(
    "/{project_id}/generations",
    response_model=list[GenerationOut],
    summary="List all test generations for a project (Generation History)",
)
def list_generations(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GenerationOut]:
    """
    Section 17: Generation History.
    Users must only see generations belonging to their projects.
    """
    _check_project(db, project_id, current_user.id)
    generations = (
        db.query(TestGeneration)
        .filter(TestGeneration.project_id == project_id)
        .order_by(TestGeneration.created_at.desc())
        .all()
    )
    return [_build_generation_out(g) for g in generations]


@router.get(
    "/{project_id}/generations/{generation_id}",
    response_model=GenerationOut,
    summary="Get single test generation details",
)
def get_generation(
    project_id: str,
    generation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GenerationOut:
    """
    Section 17: Single Generation Retrieval.
    Users must only see generations belonging to their projects.
    """
    _check_project(db, project_id, current_user.id)
    gen = (
        db.query(TestGeneration)
        .filter(
            TestGeneration.id == generation_id,
            TestGeneration.project_id == project_id,
        )
        .first()
    )
    if not gen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation not found",
        )
    return _build_generation_out(gen)


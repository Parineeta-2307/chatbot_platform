from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_db, get_owned_project

router = APIRouter(prefix="/projects/{project_id}/prompts", tags=["prompts"])


@router.post("", response_model=schemas.PromptOut, status_code=201)
def create_prompt(
    payload: schemas.PromptCreate,
    project: models.Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
):
    # Only one active prompt per project at a time.
    if payload.is_active:
        db.query(models.Prompt).filter(models.Prompt.project_id == project.id).update(
            {"is_active": 0}
        )

    prompt = models.Prompt(
        project_id=project.id,
        title=payload.title,
        content=payload.content,
        is_active=1 if payload.is_active else 0,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get("", response_model=List[schemas.PromptOut])
def list_prompts(
    project: models.Project = Depends(get_owned_project), db: Session = Depends(get_db)
):
    return db.query(models.Prompt).filter(models.Prompt.project_id == project.id).all()

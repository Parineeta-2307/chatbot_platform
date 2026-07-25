from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_db, get_current_user, get_owned_project

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = models.Project(name=payload.name, description=payload.description, owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(
    db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    return db.query(models.Project).filter(models.Project.owner_id == user.id).all()


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(project: models.Project = Depends(get_owned_project)):
    return project

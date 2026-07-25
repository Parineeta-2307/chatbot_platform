import os
import shutil
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_db, get_owned_project
from app.config import settings

router = APIRouter(prefix="/projects/{project_id}/files", tags=["files"])


@router.post("", response_model=schemas.FileOut, status_code=201)
def upload_file(
    file: UploadFile = File(...),
    project: models.Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
):
    project_dir = os.path.join(settings.upload_dir, str(project.id))
    os.makedirs(project_dir, exist_ok=True)
    dest_path = os.path.join(project_dir, file.filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    record = models.UploadedFile(project_id=project.id, filename=file.filename, path=dest_path)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=List[schemas.FileOut])
def list_files(
    project: models.Project = Depends(get_owned_project), db: Session = Depends(get_db)
):
    return db.query(models.UploadedFile).filter(models.UploadedFile.project_id == project.id).all()

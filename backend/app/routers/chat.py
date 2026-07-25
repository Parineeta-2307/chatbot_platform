from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_db, get_owned_project
from app.services.llm_service import get_chat_completion

router = APIRouter(prefix="/projects/{project_id}", tags=["chat"])


@router.post("/chat", response_model=schemas.MessageOut)
def chat(
    payload: schemas.ChatRequest,
    project: models.Project = Depends(get_owned_project),
    db: Session = Depends(get_db),
):
    user_msg = models.Message(project_id=project.id, role="user", content=payload.message)
    db.add(user_msg)
    db.commit()

    active_prompt = (
        db.query(models.Prompt)
        .filter(models.Prompt.project_id == project.id, models.Prompt.is_active == 1)
        .first()
    )
    history = (
        db.query(models.Message)
        .filter(models.Message.project_id == project.id)
        .order_by(models.Message.created_at)
        .all()
    )

    llm_messages = []
    if active_prompt:
        llm_messages.append({"role": "system", "content": active_prompt.content})
    llm_messages.extend({"role": m.role, "content": m.content} for m in history)

    reply_text = get_chat_completion(llm_messages)

    assistant_msg = models.Message(project_id=project.id, role="assistant", content=reply_text)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg


@router.get("/messages", response_model=List[schemas.MessageOut])
def get_messages(
    project: models.Project = Depends(get_owned_project), db: Session = Depends(get_db)
):
    return (
        db.query(models.Message)
        .filter(models.Message.project_id == project.id)
        .order_by(models.Message.created_at)
        .all()
    )

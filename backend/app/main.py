from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, projects, prompts, chat, files

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chatbot Platform", version="0.1.0")

# Wide-open CORS for demo purposes. Restrict to your frontend's origin in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(prompts.router)
app.include_router(chat.router)
app.include_router(files.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}

# Chatbot Platform

A minimal multi-tenant chatbot platform: users register and log in, create projects
("agents"), attach a system prompt to a project, chat with an LLM-backed agent, and
optionally upload files into a project.


## Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite (swap to Postgres by changing one env var)
- **Auth**: JWT (OAuth2 password flow), bcrypt-hashed passwords
- **LLM**: OpenRouter Chat Completions API — OpenAI-compatible, so swapping to the
  OpenAI Responses API or any other provider only touches one file
- **Frontend**: Vanilla HTML/CSS/JS, no build step, no framework

## Project structure

```
chatbot-platform/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, router registration
│   │   ├── config.py         # env-driven settings
│   │   ├── database.py       # SQLAlchemy engine/session
│   │   ├── models.py         # User, Project, Prompt, Message, UploadedFile
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── security.py       # password hashing + JWT
│   │   ├── deps.py           # get_db, get_current_user, get_owned_project
│   │   ├── routers/
│   │   │   ├── auth.py       # POST /auth/register, /auth/login
│   │   │   ├── projects.py   # /projects
│   │   │   ├── prompts.py    # /projects/{id}/prompts
│   │   │   ├── chat.py       # /projects/{id}/chat, /projects/{id}/messages
│   │   │   └── files.py      # /projects/{id}/files
│   │   └── services/
│   │       └── llm_service.py  # the one file that talks to the LLM provider
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── ARCHITECTURE.md
└── README.md
```

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set `OPENROUTER_API_KEY` (free key at https://openrouter.ai/keys).
Without it, the chat endpoint still works end-to-end but returns a placeholder
string instead of a real model reply — useful for testing the rest of the app
without burning API credits.

```bash
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Interactive API docs (Swagger UI) at
`http://localhost:8000/docs` — this is the fastest way to poke every endpoint
without touching the frontend.

### 2. Frontend

```bash
cd frontend
python -m http.server 5500
```

Open `http://localhost:5500` in your browser. By default it calls
`http://localhost:8000`. To point at a deployed backend, add this before the
`app.js` script tag in `index.html`:

```html
<script>window.API_BASE_URL = "https://your-deployed-backend.com";</script>
```

## Using it

1. Register an account, then log in.
2. Create a project — this is your "agent."
3. Type a system prompt and click **Save & Activate** — this becomes the
   agent's persona/instructions for every message in that project.
4. Chat. Every user message and assistant reply is persisted per project, so
   reloading the page keeps your history.
5. *(Optional)* Upload a file into the project via the file picker.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string. Defaults to local SQLite; set to a Postgres URL for production. |
| `JWT_SECRET_KEY` | Secret used to sign JWTs. **Change this before deploying anywhere real.** |
| `JWT_ALGORITHM` | JWT signing algorithm (default `HS256`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes. |
| `OPENROUTER_API_KEY` | Your OpenRouter API key. |
| `OPENROUTER_MODEL` | Model to route to, e.g. `nvidia/nemotron-3-ultra-550b-a55b:free`. |
| `OPENAI_API_KEY` | Only needed if you wire up the OpenAI Files API stretch goal. |
| `UPLOAD_DIR` | Local folder for uploaded files. |


See `ARCHITECTURE.md` for design rationale and known limitations.

# Multi-Tenant AI Chatbot Platform

A production-inspired chatbot platform built with **FastAPI**, **JWT Authentication**, **SQLAlchemy**, and **OpenRouter**.

The platform allows multiple users to create independent AI agents (Projects), assign custom system prompts, maintain conversation history, and optionally upload project documents. The architecture emphasizes modularity, security, and extensibility while remaining lightweight enough for rapid deployment.

---

## Features

- JWT Authentication (OAuth2 Password Flow)
- Multi-user Architecture
- Multi-project AI Agents
- Custom System Prompt Management
- Persistent Conversation History
- File Upload Support
- Provider-Agnostic LLM Integration
- RESTful API Design
- Ownership-Based Authorization
- Modular Service Architecture

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Backend | FastAPI |
| ORM | SQLAlchemy |
| Database | SQLite (Postgres Ready) |
| Authentication | JWT + bcrypt |
| LLM Provider | OpenRouter |
| Frontend | Vanilla HTML, CSS & JavaScript |
| Deployment | Render + Vercel |

---

# System Architecture

```
                Static Client (Vanilla JS)

                       HTTP / REST
                      JWT Authentication

                           │
                           ▼

                  FastAPI Backend (REST API)

        ┌──────────────┬──────────────┬───────────────┐
        │              │              │
        ▼              ▼              ▼

 SQLAlchemy ORM    File Storage    LLM Service Layer
(SQLite/Postgres)  (Uploads)       (Vendor Adapter)

                                      │
                                      ▼

                              OpenRouter API
```

---

## Project Structure

```
chatbot-platform/

├── backend
│   ├── app
│   │   ├── routers
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   ├── files.py
│   │   │   ├── projects.py
│   │   │   └── prompts.py
│   │   │
│   │   ├── services
│   │   │   └── llm_service.py
│   │   │
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── deps.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── frontend
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── ARCHITECTURE.md
└── README.md
```

---

# Core Design

## Authentication

Authentication uses OAuth2 Password Flow with JWT Bearer Tokens.

Passwords are hashed using **bcrypt** before storage.

Every protected endpoint resolves the authenticated user through a shared dependency.

---

## Multi-Tenant Architecture

Each user owns one or more **Projects**.

Each Project represents an independent AI Agent.

Every Project owns:

- Prompts
- Messages
- Uploaded Files

Ownership is enforced centrally using `get_owned_project()`.

This prevents users from accessing resources belonging to other users.

---

## Prompt Management

Instead of storing one prompt directly inside a project, prompts are maintained as a dedicated table.

Benefits include:

- Multiple prompts per project
- Active prompt switching
- Prompt versioning support
- Future A/B testing

Only one prompt is marked active and becomes the system prompt supplied to the LLM.

---

## Chat Flow

1. User submits a message.

2. Backend stores the user message.

3. Active system prompt is retrieved.

4. Previous conversation history is loaded.

5. Prompt + History are assembled.

6. LLM Service calls OpenRouter.

7. Assistant response is stored.

8. Response is returned to the client.

---

## LLM Abstraction

The application never communicates with OpenRouter directly.

All provider-specific logic lives inside:

```

backend/app/services/llm_service.py

```

Every API route simply calls:

```

get_chat_completion()

```

Changing providers (OpenAI, Anthropic, Gemini, etc.) requires modifying only this module.

---

## Authorization

Authorization logic is centralized inside:

```

get_owned_project()

```

Rather than repeating ownership validation across routes, every project-scoped endpoint automatically receives authorization checks through dependency injection.

When a project does not belong to the authenticated user, the API returns **404 Not Found** instead of **403 Forbidden**, preventing information leakage.

---

## File Uploads

Projects support optional file uploads.

Uploaded files are stored locally while metadata is persisted inside the database.

The schema already includes an `openai_file_id` field for future integration with the OpenAI Files API.

---

# Setup

## Backend

```bash
cd backend

python -m venv venv

source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env

uvicorn app.main:app --reload
```

---

## Frontend

```bash
cd frontend

python -m http.server 5500
```

Open

```
http://localhost:5500
```

---

## Environment Variables

| Variable | Purpose |
|------------|----------|
| DATABASE_URL | Database Connection |
| JWT_SECRET_KEY | JWT Signing Secret |
| JWT_ALGORITHM | Signing Algorithm |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token Lifetime |
| OPENROUTER_API_KEY | OpenRouter API Key |
| OPENROUTER_MODEL | Selected Model |
| OPENAI_API_KEY | Future File API Integration |
| UPLOAD_DIR | Upload Storage |

---

# Future Improvements

- Server-Sent Events (Streaming Responses)
- PostgreSQL Production Deployment
- Rate Limiting
- Team Workspaces
- Vector Database Integration
- Retrieval-Augmented Generation (RAG)
- OpenAI Files API Integration
- Automated Testing (Pytest)

---

# Deployment

Backend deployed on **Render**

Frontend deployed on **Vercel**

This separation allows the backend to run as a persistent Python service while the frontend benefits from static CDN hosting.

---

# Engineering Decisions

- Modular LLM Provider Layer
- Stateless JWT Authentication
- Shared Authorization Dependency
- Provider-Agnostic Architecture
- Prompt Version Ready Schema
- PostgreSQL-Compatible Data Layer
- Clear Separation of Presentation, Business Logic and Persistence Layers

---

For detailed implementation decisions and design rationale, see **ARCHITECTURE.md**.

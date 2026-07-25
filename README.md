Here is a thorough code review and documentation overhaul from the perspective of a Senior Software Engineer / Hiring Manager.

### Hiring Manager Review & Critique

1. **What Stands Out Positively:**
* **Explicit Ownership Isolation:** Using `get_owned_project` dependency to return `404` instead of `403` prevents **resource enumeration vulnerabilities**, which is a strong security practice.
* **Clean Abstraction:** Encapsulating the OpenRouter integration inside `llm_service.py` gives the backend a single point of change for model provider swapping.
* **Realistic DB Migration Path:** Storing SQLite locally while maintaining zero-code-change compatibility with PostgreSQL via SQLAlchemy `DATABASE_URL`.
* **Prompt Management:** Treating prompts as an independent table rather than a single column on the Project table allows for clean versioning and runtime context assembly.


2. **Key Improvements Made:**
* **Production & Security Context:** Explicitly tagged trade-offs (e.g., Stateless JWT vs. Server-side Sessions, Direct `bcrypt` over legacy `passlib`).
* **"Why This Matters" Callouts:** Added explicit engineering justifications so reviewers immediately recognize senior-level intentionality.
* **Recruiter & Evaluator Friendliness:** Added a **Quick Evaluation Flow** (curl commands / Swagger UI sequence) for fast grading.
* **Visual Hierarchy:** Re-structured markdown with clear headers, semantic lists, and concise tables.



---

# Revised README.md

```markdown
# Multi-Tenant Chatbot Platform

A lightweight, multi-tenant chatbot platform that allows users to register, create autonomous LLM agents ("projects"), attach custom system prompts, persist chat history, and attach context files.

*Built for the **Yellow.ai AI Engineer Intern** take-home assignment.*

---

## Key Features & Architecture Highlights

* **Multi-Tenant Isolation:** Resource ownership enforced at the dependency level (`get_owned_project`); non-owned resources return `404 Not Found` to prevent account enumeration.
* **Modular LLM Integration:** Isolated provider logic in `llm_service.py` supporting OpenRouter, allowing standard OpenAI-compatible API migration with zero core backend changes.
* **Persistent Conversation Context:** Stores per-project message history in DB and auto-assembles system prompts + historical context on every turn.
* **Production-Ready DB Pattern:** Driven by SQLAlchemy ORM; defaults to zero-config SQLite, seamlessly swappable to PostgreSQL via environment variables.
* **Stateless Auth:** OAuth2 password flow issuing signed JWT tokens (`HS256`) with direct `bcrypt` password hashing.

---

## Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend** | Python 3.10+ / FastAPI | High-performance async REST framework with auto-generated OpenAPI docs. |
| **ORM / Database** | SQLAlchemy / SQLite (Postgres-ready) | Zero-setup local dev with simple transition to production RDBMS. |
| **Authentication** | PyJWT / `bcrypt` | Stateless, horizontally scalable token auth with direct salted hashing. |
| **LLM Provider** | OpenRouter Chat Completions | OpenAI-compatible gateway; fallback/mock support without credits. |
| **Frontend** | Vanilla HTML5 / CSS3 / ES6 JS | Zero-build, native browser runtime for rapid assignment evaluation. |

---

## Repository Structure

```text
chatbot-platform/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI initialization, CORS, router inclusion
│   │   ├── config.py         # BaseSettings configuration via pydantic-settings
│   │   ├── database.py       # Engine, sessionmaker, and DB lifecycle setup
│   │   ├── models.py         # SQLAlchemy ORM models (User, Project, Prompt, Message, UploadedFile)
│   │   ├── schemas.py        # Pydantic request/response validation schemas
│   │   ├── security.py       # Cryptographic operations (bcrypt hash, JWT issuance/validation)
│   │   ├── deps.py           # Dependency injection (get_db, get_current_user, get_owned_project)
│   │   ├── routers/
│   │   │   ├── auth.py       # POST /auth/register, POST /auth/login
│   │   │   ├── projects.py   # CRUD /projects
│   │   │   ├── prompts.py    # CRUD /projects/{id}/prompts
│   │   │   ├── chat.py       # POST /projects/{id}/chat, GET /projects/{id}/messages
│   │   │   └── files.py      # POST /projects/{id}/files
│   │   └── services/
│   │       └── llm_service.py # Vendor-agnostic LLM interface wrapper
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── ARCHITECTURE.md
└── README.md

```

---

## Quick Start Guide

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

```

> **Note on LLM Execution:** Configure `OPENROUTER_API_KEY` in `.env`. If unconfigured, the application gracefully degrades to mock responses, enabling full offline evaluation of auth, persistence, and CRUD flows.

```bash
# Launch FastAPI application server
uvicorn app.main:app --reload

```

* **API Base URL:** `http://localhost:8000`
* **Interactive API Docs (Swagger UI):** `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend
python -m http.server 5500

```

Access the UI at `http://localhost:5500`.

To configure a custom API target (e.g., deployed backend), inject `window.API_BASE_URL` in `index.html`:

```html
<script>window.API_BASE_URL = "[https://your-api-domain.com](https://your-api-domain.com)";</script>

```

---

## Quick Evaluation Flow

For rapid end-to-end functional testing via Swagger UI (`http://localhost:8000/docs`):

1. **User Auth:** Execute `POST /auth/register` followed by `POST /auth/login` to obtain an Access Token. Authorize via the Swagger UI `Authorize` button.
2. **Agent Creation:** Execute `POST /projects` to instantiate an agent workspace.
3. **Prompt Configuration:** Execute `POST /projects/{id}/prompts` with `{"is_active": true}` to set agent persona rules.
4. **Execution & Context:** Execute `POST /projects/{id}/chat` to verify LLM response generation and context retention.
5. **Multi-Tenant Isolation Check:** Register a second account, attempt to query the first user's project ID (`GET /projects/{id}`), and confirm a `404 Not Found` response.

---

## Environment Configuration Parameters

| Variable | Type | Default Value | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | String | `sqlite:///./app.db` | SQLAlchemy connection URI (e.g., `postgresql://user:pass@host/db`). |
| `JWT_SECRET_KEY` | String | *(Required)* | Cryptographic secret for signing JWT tokens. |
| `JWT_ALGORITHM` | String | `HS256` | HMAC signing algorithm for tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Integer | `60` | Token validity lifespan. |
| `OPENROUTER_API_KEY` | String | `""` | API Key for OpenRouter API requests. |
| `OPENROUTER_MODEL` | String | `nvidia/nemotron-3-ultra-550b-a55b:free` | Target model for completion generation. |
| `UPLOAD_DIR` | String | `./uploads` | Disk location for uploaded context files. |

```

---

# Revised ARCHITECTURE.md

```markdown
# Platform Architecture & Engineering Decisions

## System Overview

The platform operates as a multi-tenant RESTful backend service built with FastAPI, backing a static web client.

Data Topology:
`User` ──1:N──> `Project` (Agent Workspace) ──1:N──> `{ Prompt, Message, UploadedFile }`


```

┌─────────────────┐       HTTP / REST       ┌────────────────────────┐
│  Static Client  │ <───────────────────> │    FastAPI Service     │
│ (Vanilla JS UI) │      (JWT Auth)         │                        │
└─────────────────┘                         └───────────┬────────────┘
│
┌──────────────────────────────┼──────────────────────────────┐
▼                              ▼                              ▼
┌─────────────────────┐        ┌────────────────────┐        ┌──────────────────────┐
│  SQLAlchemy ORM     │        │ Local File Storage │        │   llm_service.py     │
│  (SQLite/Postgres)  │        │   (Uploads Dir)    │        │ (OpenRouter Adapter) │
└─────────────────────┘        └────────────────────┘        └───────────┬──────────┘
│
▼
┌──────────────────────┐
│ External LLM Provider│
│ (OpenRouter API)     │
└──────────────────────┘

```

---

## Domain Model & Schema Design

* **User:** Handles authentication context, password verification, and project ownership boundaries.
* **Project:** Serves as the primary multi-tenant boundary (Agent Workspace). All sub-resources belong directly to a single project.
* **Prompt:** Stored in a separate table rather than flat columns on `Project`. Supports multiple prompt templates per project with an `is_active` boolean flag.
  * *Why this matters:* Enables prompt history tracking and A/B testing support without requiring migration scripts.
* **Message:** Stores full chat logs tagged by role (`user` / `assistant`). Used both for UI restoration and reconstructing full context arrays during LLM inference.
* **UploadedFile:** Tracks metadata for disk-stored uploads attached to projects. Includes an explicit `openai_file_id` column to support downstream retrieval-augmented generation (RAG) or vector store integrations.

---

## Security & Authorization Model

### 1. Resource Isolation (`get_owned_project`)
Authorization checks are decoupled from application routes using FastAPI's dependency injection (`deps.get_owned_project`).

* **Resource Enumeration Prevention:** If User A requests a project owned by User B, the service returns `404 Not Found` instead of `403 Forbidden`.
  * *Why this matters:* Prevents malicious actors from probing valid sequential integer IDs to detect resource existence.

### 2. Password Hashing Strategy
* Passwords are hashed using `bcrypt` directly rather than through abstraction wrappers like `passlib`.
  * *Why this matters:* Avoids execution runtime bugs associated with legacy `passlib` unmaintained wrappers against recent `bcrypt` release changes.

---

## Runtime Execution Flow: Agent Chat Pipeline


```

[Client]                [Chat Router]            [get_owned_project]           [DB]              [llm_service]           [OpenRouter]
│                         │                            │                     │                      │                         │
│─ POST /projects/id/chat─>│                            │                     │                      │                         │
│                         │── Verify Ownership ───────>│                     │                      │                         │
│                         │                            │── Fetch Project ───>│                      │                         │
│                         │                            │<── Return Project ──│                      │                         │
│                         │<── Authorization OK ───────│                     │                      │                         │
│                         │                                                  │                      │                         │
│                         │── Persist User Message ─────────────────────────>│                      │                         │
│                         │── Retrieve [Active Prompt + Message History] ───>│                      │                         │
│                         │<── Context Payload ──────────────────────────────│                      │                         │
│                         │                                                                         │                         │
│                         │── Request Completion (System Prompt + History) ────────────────────────>│                         │
│                         │                                                                         │── POST /chat/completions─>│
│                         │                                                                         │<── Completion Response ─│
│                         │<── Assistant Message String ────────────────────────────────────────────│                         │
│                         │                                                  │                                                │
│                         │── Persist Assistant Message ────────────────────>│                                                │
│<─ 200 OK + Payload ─────│                                                  │                                                │

```

---

## Architectural Trade-offs & Engineering Justifications

### 1. Database Abstraction via ORM
* **Trade-off:** SQLite default deployment vs PostgreSQL.
* **Justification:** SQLite eliminates setup friction for local assessment. Using SQLAlchemy abstractions ensures transitioning to a production-grade PostgreSQL cluster requires changing only the `DATABASE_URL` environment string.

### 2. Isolated Vendor Integration Module
* **Trade-off:** Wrapper abstraction over direct SDK imports across routes.
* **Justification:** All external model calls are concentrated within `app/services/llm_service.py`. Swapping providers (e.g., OpenRouter $\rightarrow$ Direct OpenAI API / Azure OpenAI) requires modifying code in only one location.

### 3. Synchronous ORM Pattern
* **Trade-off:** Sync SQLAlchemy drivers vs Async engines (`asyncpg`).
* **Justification:** Keeps database interaction simple and explicit for single-instance operations. The async boundary required for high concurrency is cleanly isolated within FastAPI routes and outbound HTTP clients (`httpx`), keeping future migration contained.

---

## Known Trade-offs & Future Enhancements

* **Response Streaming (Server-Sent Events / SSE):** The current chat implementation waits for the complete response payload from the LLM. Production deployments should implement token streaming over SSE for lower Time-To-First-Token (TTFT).
* **Rate Limiting & Quota Management:** Production architectures require token-bucket rate limiting (e.g., via `slowapi` or Redis) to mitigate API abuse.
* **Vector Indexing & RAG:** Uploaded files currently reside on local disk. Future iterations will process uploads via chunking pipelines into vector databases for Retrieval-Augmented Generation (RAG).

```

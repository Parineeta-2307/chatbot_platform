# Architecture

## Overview

The application follows a **multi-tenant architecture** built around a single FastAPI backend exposing a REST API consumed by a static frontend.

The core data hierarchy is:

```
User
 └── Project (Agent)
      ├── Prompt(s)
      ├── Message History
      └── Uploaded Files
```

Each project belongs to exactly one authenticated user.

Ownership is enforced through the shared `get_owned_project()` dependency, ensuring that every project-scoped request is automatically filtered by `owner_id`.

As an additional security measure, unauthorized access returns **404 Not Found** instead of **403 Forbidden**, preventing attackers from determining whether another user's project exists.

---

## Authentication

Authentication uses **OAuth2 Password Flow** with **JWT (HS256)**.

Authentication flow:

1. User logs in with email and password.
2. The server issues a signed JWT.
3. The frontend stores the token.
4. Every protected request includes the token as a Bearer token.
5. `get_current_user()` resolves the authenticated user before processing the request.

Passwords are hashed using **bcrypt** before storage.

Plaintext passwords are never stored or logged.

---

## Data Model

### User

Represents an authenticated account.

Stores:

- Email
- Password hash
- Owned projects

---

### Project

Represents an independent AI agent.

Each project belongs to exactly one user and owns:

- Prompts
- Chat history
- Uploaded files

---

### Prompt

Projects may contain multiple prompt templates.

Only the prompt marked `is_active` is used as the system prompt for conversations.

Separating prompts into their own table enables future features such as:

- Prompt versioning
- Prompt history
- A/B testing

without requiring database schema changes.

---

### Message

Stores complete conversation history.

Each record contains:

- role (user / assistant)
- content
- timestamp

The stored history is used both for rendering the chat UI and reconstructing conversation context for every LLM request.

---

### UploadedFile

Stores metadata for files attached to a project.

The physical file is stored locally.

The schema already includes an optional `openai_file_id` column for future integration with the OpenAI Files API.

Production deployments can replace local storage with S3 or Google Cloud Storage without changing the database schema.

---

# Chat Flow

```
User Message
      │
      ▼
Persist User Message
      │
      ▼
Load Active System Prompt
      │
      ▼
Load Conversation History
      │
      ▼
Build LLM Context
      │
      ▼
llm_service.py
      │
      ▼
OpenRouter Chat Completions API
      │
      ▼
Persist Assistant Response
      │
      ▼
Return Response
```

---

## Engineering Decisions

### SQLite by Default

SQLite keeps local setup simple while remaining fully compatible with SQLAlchemy.

Migrating to PostgreSQL only requires changing `DATABASE_URL`, making the application production-ready with minimal code changes.

---

### Provider-Agnostic LLM Layer

All LLM communication is isolated inside `llm_service.py`.

No router communicates directly with OpenRouter.

Changing providers (OpenAI, Anthropic, Gemini, etc.) requires modifications in only one module.

---

### Stateless Authentication

JWT authentication eliminates server-side session storage.

This allows the backend to scale horizontally without sticky sessions.

---

### Shared Authorization Dependency

Authorization logic is centralized in `get_owned_project()`.

Instead of repeating ownership validation in every endpoint, every project-scoped route automatically receives the same access-control guarantees.

If authorization requirements change in the future (for example shared workspaces or team projects), only one dependency requires modification.

---

### Synchronous SQLAlchemy

The project intentionally uses synchronous SQLAlchemy.

For a single-service application of this scope, synchronous execution is simpler to understand, debug, and maintain.

The components most likely to become asynchronous under production load are already isolated:

- Database access
- LLM HTTP requests

making future migration straightforward.

---

# Known Limitations

Current limitations include:

- Responses are generated synchronously (no streaming via SSE or WebSockets).
- No rate limiting.
- No per-user usage quotas.
- Uploaded files are stored locally and are not yet forwarded to the OpenAI Files API.
- No automated test suite.

---

## Future Improvements

Potential production enhancements include:

- Streaming LLM responses
- PostgreSQL deployment
- Rate limiting
- Usage quotas
- Team workspaces
- Retrieval-Augmented Generation (RAG)
- OpenAI Files API integration
- Automated testing with `pytest` and `httpx.AsyncClient`

---

## Validation

The application was manually tested end-to-end.

Validated scenarios include:

- User registration
- Login
- Project creation
- Prompt creation
- Prompt activation
- Chat interactions
- Conversation persistence
- File uploads
- Cross-user authorization checks

# Architecture

## Overview

A single FastAPI service exposes a REST API consumed by a static frontend.
Data is modeled as: `User → Project (agent) → {Prompt, Message, UploadedFile}`.
Every project is scoped to its owning user, and every query filters by
`owner_id` (via the `get_owned_project` dependency), so one user can never
read or write another user's data — verified in testing: requesting another
user's project returns 404, not 403, so existence isn't leaked either.

## Auth

OAuth2 password flow issuing a signed JWT (HS256) on login. The token is sent
as a Bearer header on every subsequent request and resolved back to a `User`
row by the `get_current_user` dependency. Passwords are hashed with bcrypt
directly (not through passlib, which has a known compatibility break with
recent bcrypt releases) — plaintext is never stored or logged.

## Data model

- **User** — account + credentials.
- **Project** — a named agent, owned by exactly one user.
- **Prompt** — one or more prompt templates per project; the one flagged
  `is_active` is used as the system prompt for that project's conversations.
  Keeping prompts as their own table (rather than a single field on Project)
  is what "storing and associating multiple prompts with a project" calls
  for, and it leaves room for prompt versioning or A/B testing later without
  a schema change.
- **Message** — full chat history per project (`role`: user/assistant), used
  both to render the chat window and to reconstruct the conversation context
  sent to the LLM on every turn.
- **UploadedFile** — metadata for files attached to a project. The file
  itself is stored on local disk (swap for S3/GCS in production) with an
  optional `openai_file_id` column reserved for wiring up the OpenAI Files
  API.

## Chat flow

1. Client `POST`s a message to `/projects/{id}/chat`.
2. Server persists the user message.
3. Server assembles `[active system prompt] + [full message history]` and
   calls the LLM service.
4. `llm_service.py` hits OpenRouter's OpenAI-compatible `/chat/completions`
   endpoint.
5. Server persists and returns the assistant reply.

## Why these tradeoffs

- **SQLite by default** — zero setup for local dev and the demo. Moving to
  Postgres is a one-line change to `DATABASE_URL` since SQLAlchemy abstracts
  the rest; this is the scalability lever the brief asks about.
- **LLM calls isolated in one module** — `llm_service.py` is the only file
  that knows OpenRouter exists. Switching to the OpenAI Responses API, or
  adding a fallback provider, is a change in one place — this is the
  extensibility point the brief calls out.
- **Stateless JWT auth** — no server-side session store, so the API scales
  horizontally without sticky sessions.
- **Synchronous SQLAlchemy** rather than async — for a single-service demo
  at this scope, this is simpler to reason about and debug. The boundary
  that would need to become async under real load is isolated to
  `database.py` and the LLM HTTP call, so it's a contained change later.
- **Ownership check as a shared dependency** (`get_owned_project`) rather
  than repeated in every route — every project-scoped endpoint gets the
  same access-control guarantee for free, and it's the single place to
  change if the authorization model ever grows (e.g. shared/team projects).

## Known limitations / what I'd add next

- No streaming responses — the LLM call is synchronous. A production version
  would stream tokens over SSE or a WebSocket for lower perceived latency.
- No rate limiting or per-user usage quotas.
- File uploads are stored locally and tracked in the DB, but not yet
  forwarded to the OpenAI Files API (the brief's stretch goal) — the
  `openai_file_id` column is already there for it.
- No automated test suite given the scope of this exercise; every endpoint
  was exercised manually end-to-end (register → login → create project →
  set active prompt → chat → view history → upload file → cross-user
  isolation check). `pytest` + `httpx.AsyncClient` would be the natural next
  addition.

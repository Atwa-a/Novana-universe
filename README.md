# Novana

A calm place to collect and revisit memories with family and friends. Full‑stack app: **Express + MySQL + Chroma + Ollama** (backend) and **React + Vite + Tailwind** (frontend).

---

## Table of Contents

* [Features](#features)
* [Architecture](#architecture)
* [Prerequisites](#prerequisites)
* [Getting Started](#getting-started)

  * [1) Configure environment](#1-configure-environment)
  * [2) Create database schema](#2-create-database-schema)
  * [3) Start services](#3-start-services)
* [Environment variables](#environment-variables)
* [API Overview](#api-overview)
* [Frontend](#frontend)
* [Security & Hardening](#security--hardening)

---

## Features

* User accounts (signup/login), profile with picture
* Loved‑one **Persons** with collaborators (shared access)
* **Memories** (text/photos/videos/audio) with comments & likes
* **AI Chat** per person with short context from saved memories (Chroma)
* Health check, CORS allow‑list, pooled MySQL, static uploads

## Architecture

```
Browser (Vite/React/Tailwind)
   │  Axios → /api (JWT Bearer)
   ▼
Express API (Node 18+)
   ├── MySQL 8 (users/persons/memories/chat/...)
   ├── ChromaDB (RAG: memory chunks)
   └── Ollama (LLM chat + warmup)
```

---

## Prerequisites

* **Node.js** 18+
* **MySQL** 8+
* **Ollama** installed and running

  * Models: `llama3:8b` (chat) and fallbacks `llama3.2:3b,llama3.2:1b`
  * (Optional) Embeddings model: `nomic-embed-text:latest`
* **Chroma** server running (default `http://127.0.0.1:8000`)

---

## Getting Started

### 1) Configure environment

Create/edit `.env` in the project root (see full list below). Minimal local setup:

```ini
# Server
PORT=4000

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=novana

# Auth
JWT_SECRET=CHANGE-ME-TO-A-LONG-RANDOM-STRING

# CORS (comma‑separated origins)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# External services
OLLAMA_URL=http://127.0.0.1:11434
CHROMA_URL=http://127.0.0.1:8000

# AI
AI_CHAT_MODEL=llama3:8b
AI_EMBED_MODEL=nomic-embed-text:latest
AI_FALLBACK_MODELS=llama3.2:3b,llama3.2:1b
AI_DEADLINE_MS=30000
AI_MAX_TOKENS=120
AI_KEEP_ALIVE=15m

# Frontend
VITE_API_BASE=http://127.0.0.1:4000/api
```

### 2) Create database schema

```bash
mysql -u root -p < db.sql
```

### 3) Start services

**Terminal A – Chroma**

# pip install chromadb && chroma run
```

**Terminal B – Ollama**

```bash
ollama serve
ollama pull llama3:8b
ollama pull nomic-embed-text:latest
```

**Terminal C – API**

```bash
# install deps, then
node index.js
```

**Terminal D – Frontend (Vite)**

```bash
# from the web app directory (or project root if unified)
npm install
npm run dev
# App on http://localhost:5173 (VITE_API_BASE must point to the API)
```



## Environment variables

| Key                                                           | Default                                       | Notes                             |
| ------------------------------------------------------------- | --------------------------------------------- | --------------------------------- |
| `PORT`                                                        | `4000`                                        | API port                          |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | —                                             | MySQL connection                  |
| `JWT_SECRET`                                                  | —                                             | **Change in prod** (32+ chars)    |
| `CORS_ORIGINS`                                                | `http://localhost:5173,http://127.0.0.1:5173` | Comma‑separated origins           |
| `OLLAMA_URL`                                                  | `http://127.0.0.1:11434`                      | Ollama server                     |
| `CHROMA_URL`                                                  | `http://127.0.0.1:8000`                       | Chroma server                     |
| `AI_CHAT_MODEL`                                               | `llama3:8b`                                   | Primary chat model                |
| `AI_FALLBACK_MODELS`                                          | `llama3.2:3b,llama3.2:1b`                     | Fallbacks if primary busy/missing |
| `AI_EMBED_MODEL`                                              | `nomic-embed-text:latest`                     | For embeddings (optional)         |
| `AI_DEADLINE_MS`                                              | `30000`                                       | Per‑request LLM timeout           |
| `AI_MAX_TOKENS`                                               | `120`                                         | Max tokens per reply              |
| `AI_KEEP_ALIVE`                                               | `15m`                                         | Keep model loaded in Ollama       |
| `VITE_API_BASE`                                               | `http://127.0.0.1:4000/api`                   | Frontend → API base URL           |

---

## API Overview

All endpoints are prefixed with `/api` and expect **Bearer JWT** in `Authorization` headers (except signup/login).

### Auth (`/api/auth`)

* `POST /signup` – `{ username, email, password }` → `{ token }`
* `POST /login` – `{ email, password }` → `{ token }`
* `GET /me` – current profile
* `PUT /me` – update profile (e.g., `username`)
* `DELETE /me` – delete account

### Persons (`/api/persons`)

* `GET /` – list persons
* `POST /` – create `{ name, birth_date?, death_date? }`
* `GET /:id` – details (+ memories summary)
* `PUT /:id` – update person
* `DELETE /:id` – delete person (cascades)
* `POST /:id/memories` – add memory (supports text/photo/video/audio; multipart for files)
* `PUT /:id/memories/:memoryId` – update memory
* `DELETE /:id/memories/:memoryId` – delete memory
* `GET /:id/memories/:memoryId/comments` – list comments
* `POST /:id/memories/:memoryId/comments` – add comment
* `POST /:id/memories/:memoryId/like` – toggle like
* `GET /:id/messages` / `POST /:id/messages` – legacy journal
* `POST /:id/collaborators` / `GET /:id/collaborators` – manage/view collaborators

### AI (`/api/ai`)

* `GET /history/:personId` – last N chat turns
* `POST /chat` – `{ person_id, message }` → `{ reply, model_used, citations? }`

---

## Frontend

* Built with **React + Vite + Tailwind**.
* Configure `VITE_API_BASE` to point at your API (e.g., `http://127.0.0.1:4000/api`).
* Token is stored in `localStorage` and attached by an Axios interceptor.

**Run dev server**

```bash
npm install
npm run dev
```

**Build**

```bash
npm run build
npm run preview
```

---

## Security & Hardening

* Replace default `JWT_SECRET` and rotate periodically.
* Set strict `CORS_ORIGINS`.
* Add basic **rate limiting** on `/auth/login`, uploads, and `/ai/chat`.
* Avoid logging chat contents in production; log IDs only.
* Scan uploads (clamd or provider) and cap image dims (e.g., 4096×4096); strip EXIF.
* Serve behind HTTPS and secure cookies when deployed.

---



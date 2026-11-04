# AGENTS.md

## Project Structure

This repository is a RAG (Retrieval-Augmented Generation) project with the following layout:

- **Backend:** `src/app/` — the functional backend code (FastAPI app, agents, models, cache, config, security, monitoring).
- **Frontend:** `front/` — the functional frontend code (Vite + React/TS app).

## Non-functional / Reference-Only Directories

- **`lessons/`** — Contains learning material and example scripts (LangGraph, RAG pipelines, agents, embeddings, etc.). These files are **reference only** for learning and context. They are **NOT** part of the functional project. **Do NOT modify** anything under `lessons/`.
- **`advanced/`** — Contains advanced RAG technique examples (long context vs RAG, contextual retrieval, late chunking, agentic RAG, GraphRAG, multimodal RAG). These files are **reference only** for learning and context. They are **NOT** part of the functional project. **Do NOT modify** anything under `advanced/`.

## Rules

1. Never edit, create, delete, or rename files under `lessons/` or `advanced/`.
2. All functional changes belong in `src/app/` (backend) or `front/` (frontend).
3. Treat `lessons/` and `advanced/` as read-only reference material for understanding patterns and context.

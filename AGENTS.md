# AGENTS.md

## Project Structure

This repository is a RAG (Retrieval-Augmented Generation) project with the following layout:

- **Backend:** `src/app/` — the functional backend code (FastAPI app, agents, models, cache, config, security, monitoring).
- **File processor:** `src/processor/main.py` — processes uploaded files and generates chunk embeddings.
- **Frontend:** `front/` — the functional frontend code (Vite + React/TS app).

## Runtime

- This application runs **exclusively in Docker**. Never run, build, or execute it outside of Docker (only `uv run`, `pnpm dev` are allowed on the host). All other commands must be executed inside the appropriate container.

## Dependency Management

- Backend (Python): use `uv add <package>` to add dependencies (updates `pyproject.toml` and lockfile). Use `uv run` to execute Python commands. Do NOT use `pip install` directly.
- Frontend (Node): use `pnpm i` (or `pnpm add <package>`) inside `front/`. Do NOT use `npm install` or `yarn`.

## UI Components

- UI components live in `front/components/ui/`. Before creating any UI component, the agent MUST first check whether it already exists in that directory.
- If the component does not exist there, ask the user to install it from shadcn (e.g. `npx shadcn@latest add <component>`).
- If the component is neither present in `front/components/ui/` nor available in shadcn, the agent may create it manually in that directory.

## Rules

1. All functional changes belong in `src/app/` (backend) or `front/` (frontend).
2. Before creating a UI component, check `front/components/ui/` first; if missing, prompt the user to install it from shadcn; only create it manually if it is unavailable in both.
3. The application runs exclusively in Docker; never run, build, or execute it on the host. All commands must run inside the appropriate container.
4. HTTP client (frontend): use `axios` via the shared client in `front/lib/axios.ts` (`baseURL = VITE_API_URL`). Do not use `fetch` directly in the frontend.
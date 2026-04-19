# Railway deployment (two services)

This repo is a monorepo with **separate containers** for the Next.js frontend and the FastAPI backend. Railway does not run `docker-compose.yml` in production; you create **one Railway project** with **two services** that both connect to the same GitHub repository.

## Option A — Deploy via GitHub (recommended)

1. **Create a repository on GitHub** (empty is fine) and push this project:
   - If this folder is not a git repo yet: `git init`, commit, add the GitHub remote, `git push -u origin main` (or `master`).
   - Do **not** commit secrets. Keep `.env` / `OPENAI_API_KEY` out of git (your root `.gitignore` already ignores `.env`).
2. **Log in to [Railway](https://railway.app)** and **install the GitHub app** when prompted so Railway can see your repositories (you can limit which repos it accesses).
3. **New Project** → **Deploy from GitHub repo** → choose this repository.
4. Railway may create one initial service—configure or delete it as needed. You want **two services** (below). Easiest pattern: add the backend first, then **New** → **GitHub Repo** → same repo again for the frontend.
5. Deploy **backend** (section 1), copy its **public URL**, then deploy **frontend** (section 2) with `NEXT_PUBLIC_API_URL` set to that backend URL.
6. **Update backend** `CORS_ORIGINS` to include the frontend’s public Railway URL, then **redeploy the backend** (or it will pick up variables on next deploy).
7. Open the **frontend** public URL in a browser and send a chat message to confirm the full path works.

If Railway asks for a **watch branch**, use `main` (or whatever branch you push). Each push to that branch can trigger a new build—configure **Settings → Build → Auto-deploy** per service if you want to tune that.

## 1. Backend service

1. **New service** → **GitHub Repo** → select this repository.
2. **Settings → Build**
   - Set **Root Directory** to repo root (`./`) with **Dockerfile Path** `Dockerfile.api`, **or** set **Root Directory** to `api` and use `api/Dockerfile`.
3. **Settings → Variables**
   - `OPENAI_API_KEY` — your OpenAI secret.
   - `CORS_ORIGINS` — include your frontend’s public HTTPS origin, comma-separated if multiple (e.g. `https://your-frontend.up.railway.app`).
4. Deploy and copy the service **public URL** (e.g. `https://backend-production-xxxx.up.railway.app`).

Railway sets `PORT`; the backend image already binds `0.0.0.0` using that variable.

## 2. Frontend service

1. **New service** → **same repository**.
2. **Settings → Build**
   - **Root Directory**: repo root with **Dockerfile Path** `Dockerfile.web`, **or** **Root Directory**: `web` and `web/Dockerfile`.
3. **Variables** (used at **build time** for `NEXT_PUBLIC_*`)
   - `NEXT_PUBLIC_API_URL` — the backend’s **public HTTPS URL** with **no trailing slash** (same value you would use from a browser).

Next.js bakes `NEXT_PUBLIC_API_URL` into the client bundle when the Docker image is built. After you change the backend URL or this variable, **redeploy** the frontend so it rebuilds.

## 3. Private networking (optional)

Services in the same Railway project can reach each other on private URLs, but the chat runs **in the browser**, so the frontend must call the backend using a **public** HTTPS URL (or you would add a same-origin proxy in Next.js, which this template does not use).

## 4. Local development without Docker

- **Backend:** from `backend/`, create `.env` from `backend/.env.example`, then run `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
- **Frontend:** from `frontend/`, create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`, then `npm run dev`.

## 5. Local development with Docker

From the repository root, copy `.env.example` to `.env`, set `OPENAI_API_KEY`, then:

```bash
docker compose up --build
```

Open `http://localhost:3000`. The frontend image is built with `NEXT_PUBLIC_API_URL=http://localhost:8000` so browser calls hit your published backend port on the host.

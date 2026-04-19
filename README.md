# AI chat monorepo (Next.js + FastAPI)

This project is a **two-service** app: a **Next.js** UI in [`web/`](web/) and a **FastAPI + LangChain** API in [`api/`](api/).  
Production is meant to run as **two separate containers** (for example on **Railway**), not as a single `docker-compose` stack in the cloud.

---

## What you need

| Item | Purpose |
|------|--------|
| [Git](https://git-scm.com/) | Push code to GitHub |
| [GitHub](https://github.com) account | Host the repository Railway will build |
| [Railway](https://railway.app) account | Run API + web services |
| [OpenAI API key](https://platform.openai.com/api-keys) | Backend calls the model (stored only in Railway, never in git) |

---

## Repository layout

| Path | Role |
|------|------|
| [`api/`](api/) | FastAPI app, LangChain chain, `POST /chat` |
| [`web/`](web/) | Next.js UI (Assistant UI), talks to the API URL from `NEXT_PUBLIC_API_URL` |
| [`Dockerfile.api`](Dockerfile.api) | Docker build for the **API** (build context = **repo root**) |
| [`Dockerfile.web`](Dockerfile.web) | Docker build for the **web** app (build context = **repo root**) |
| [`docker-compose.yml`](docker-compose.yml) | **Local** multi-container runs only |

Do **not** commit secrets. [`.gitignore`](.gitignore) ignores `.env` files; use [`.env.example`](.env.example) as a template for local Docker Compose.

---

## 1. Put the code on GitHub

1. Create a **new repository** on GitHub (empty is fine).
2. In your project folder:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

3. Confirm **`.env` is not tracked**:

   ```bash
   git status
   ```

   If `.env` appears, remove it from the index (`git rm --cached .env`) and ensure it stays in `.gitignore`.

---

## 2. Railway: connect GitHub

1. Sign in at [railway.app](https://railway.app).
2. **Account settings** → **Connect GitHub** (or approve when Railway asks).
3. Prefer **only the repositories you need**, or allow this repo specifically.

Railway will clone your repo on each deploy. You will create **one project** with **two services**, both attached to the **same** repository.

---

## 3. Railway: API service (backend)

Create the **API first** so you know its public URL before configuring the web app.

### 3.1 Add the service

1. **New project** → **Empty project** (or **Deploy from GitHub** once and add a second service afterward).
2. **Add service** → **GitHub Repo** → select this repository.
3. Open the new service’s **Settings**.

### 3.2 Build configuration (important)

Under **Settings → Build** (or **Build** tab, depending on the UI):

| Field | Value |
|-------|--------|
| **Root Directory** | **`.`** — the repository root (not `api` or `web` alone) |
| **Dockerfile path** | **`Dockerfile.api`** |

The Dockerfiles at the repo root run `COPY api/...` and `COPY web/...`; the build context **must** be the monorepo root. **Do not** point Root Directory only at `api` unless you switch to [`api/Dockerfile`](api/Dockerfile) and understand the narrower context.

**Do not** add a root `railway.json` that forces a single Dockerfile or start command for the whole project; that breaks the second service.

### 3.3 Variables (runtime)

**Settings → Variables** (or **Variables** tab). Add at least:

| Name | Required | Notes |
|------|----------|------|
| `OPENAI_API_KEY` | Yes | Your OpenAI secret |
| `CORS_ORIGINS` | Yes in production | Browser origins allowed to call the API (see §5) |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` in code if unset |

Railway injects **`PORT`** automatically; the API listens on `0.0.0.0` using that variable.

### 3.4 Deploy and get the API URL

1. **Deploy** (or push to the connected branch) and wait until the deployment is healthy.
2. **Settings → Networking → Public networking** → **Generate domain** (or use the default `*.up.railway.app` URL Railway shows for the service).

Copy the **HTTPS** URL, e.g. `https://your-api-service-production-xxxx.up.railway.app` — **no trailing slash**. You will use this for `NEXT_PUBLIC_API_URL` on the web service.

### 3.5 Custom domain (optional)

On the **same** service, under **Networking**:

- To use Railway’s hostname: enable **Public networking** and **Generate domain** if you don’t already have one.
- To use **your own domain**: **Custom domain** → follow DNS instructions (CNAME or A record as Railway shows).

The app itself does not need code changes for a custom domain; only **CORS** and **NEXT_PUBLIC_API_URL** must match the URLs users actually use in the browser.

---

## 4. Railway: Web service (frontend)

### 4.1 Add the second service

1. In the **same Railway project**, **New** → **GitHub Repo** → **same repository** again.

### 4.2 Build configuration

| Field | Value |
|-------|--------|
| **Root Directory** | **`.`** |
| **Dockerfile path** | **`Dockerfile.web`** |

### 4.3 Variables (build time — critical)

**Settings → Variables** for this **web** service:

| Name | Required | Notes |
|------|----------|------|
| `NEXT_PUBLIC_API_URL` | Yes | Exact **public HTTPS URL of the API** from §3.4 (no trailing slash) |

Next.js **bakes** `NEXT_PUBLIC_*` into the client bundle at **image build time**. After you add or change this variable, trigger a **new deployment** so the image rebuilds.

### 4.4 Networking and domains

1. **Deploy** and wait for success.
2. **Settings → Networking** → **Generate domain** (or attach a **custom domain**) for the **web** service so users load the UI over HTTPS.

Copy this **frontend** URL — you need it for `CORS_ORIGINS` on the API.

---

## 5. Finish wiring: CORS

The browser calls the **API from your web origin** (cross-origin). The API must allow that origin.

On the **API** service, set **`CORS_ORIGINS`** to a **comma-separated** list of allowed origins, for example:

```text
https://your-web-service-production-yyyy.up.railway.app
```

If you use a **custom domain** for the site, include that origin too, e.g.:

```text
https://app.example.com,https://your-web-service-production-yyyy.up.railway.app
```

Redeploy the **API** after changing `CORS_ORIGINS`.

---

## 6. End-to-end check

1. Open the **web** URL in a browser (HTTPS).
2. Send a chat message.
3. If something fails: **Network** tab should show `POST …/chat` to your **API** host; **API deploy logs** on Railway show server-side errors.

---

## 7. Local development

### API only (terminal)

From the repository root:

```bash
cd api
python3 -m venv .venv
```

Activate the virtual environment:

- **macOS / Linux:**

  ```bash
  source .venv/bin/activate
  ```

- **Windows (cmd):**

  ```text
  .venv\Scripts\activate.bat
  ```

- **Windows (PowerShell):**

  ```powershell
  .venv\Scripts\Activate.ps1
  ```

Then install dependencies, configure env, and run the server:

```bash
pip install -r requirements.txt
cp .env.example .env   # edit .env and set OPENAI_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

To leave the venv later, run `deactivate`.

### Web only (terminal)

```bash
cd web
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

### Docker Compose (API + web)

From the repository root:

```bash
cp .env.example .env
# Edit .env: set OPENAI_API_KEY
docker compose up --build
```

Then open `http://localhost:3000`.

---

## Troubleshooting (production)

| Symptom | What to check |
|--------|----------------|
| **502** on the web URL | Web service uses **`Dockerfile.web`** with Root **`.`**; deploy logs show `node server.js` / Next started; no stale **`railway.json`** forcing the API image. |
| **400** on `POST /chat` | Request body has `messages`; `CORS_ORIGINS` includes the **exact** web origin; redeploy web after setting **`NEXT_PUBLIC_API_URL`**. |
| **CORS errors** in the browser | `CORS_ORIGINS` on the API includes your **https://** frontend origin (scheme + host, no path). |
| Chat UI calls wrong host | Rebuild web after changing **`NEXT_PUBLIC_API_URL`**; value must match the API’s **public** HTTPS URL. |

Stack: Next.js (App Router), Tailwind, Assistant UI (`@assistant-ui/react`), FastAPI, LangChain LCEL, `langchain-openai`.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Quick reference

[`RAILWAY.md`](RAILWAY.md) lists the Dockerfile table and a warning about `railway.json`; full steps are above.

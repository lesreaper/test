# Railway (quick reference)

**Full instructions** — GitHub setup, per-service **Build** settings (Root Directory, **Dockerfile path**), environment variables, **Generate domain** / custom domains, and CORS — are in the repository **[README.md](README.md)**.

Use **README.md** as the single source of truth for deployment.

### Reminder: build settings

| Service | Root Directory | Dockerfile path   |
|---------|----------------|-------------------|
| API     | `.`           | `Dockerfile.api`  |
| Web     | `.`           | `Dockerfile.web`  |

Do **not** commit a root `railway.json` that applies one Dockerfile or start command to every service in the project.

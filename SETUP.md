# Refract — Setup

## Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.12+

## Quick start (Docker Compose)

```bash
# 1. Copy and configure env
cp backend/.env.example backend/.env
# Edit backend/.env — set ANTHROPIC_API_KEY

# 2. Start all services
docker compose up --build

# 3. Run migrations (first time only)
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser

# Services:
#   Backend  → http://localhost:8000
#   Frontend → run separately (below)
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# → http://localhost:5173
```

## Local backend (without Docker)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Start PostgreSQL and Redis locally, then:
python manage.py migrate
python manage.py runserver
# In another terminal:
celery -A refract worker -l info
```

## Environment variables

### backend/.env
| Key | Description |
|-----|-------------|
| `SECRET_KEY` | Django secret key |
| `DB_*` | PostgreSQL connection |
| `REDIS_URL` | Redis URL |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `DOCKER_SANDBOX_IMAGE` | Image for code sandbox |

### frontend/.env
| Key | Description |
|-----|-------------|
| `VITE_API_BASE_URL` | Backend HTTP URL |
| `VITE_WS_BASE_URL` | Backend WebSocket URL |

## Deploy

### Backend → Render

1. Push the repo to GitHub
2. Go to [render.com](https://render.com) → **New Blueprint** → connect your repo
3. Render reads `render.yaml` and creates the web service, Celery worker, and PostgreSQL database automatically
4. Open the `refract-backend` service → **Environment** → set these manually:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `REDIS_URL` — your Upstash Redis URL (see below)
   - `CORS_ALLOWED_ORIGINS` — your GitHub Pages URL (e.g. `https://yourusername.github.io`)
5. Your backend URL will be `https://refract-backend.onrender.com`

### Redis → Upstash

1. Create a free Redis database at [upstash.com](https://upstash.com)
2. Copy the **Redis URL** (starts with `rediss://`)
3. Paste it as `REDIS_URL` in both the `refract-backend` and `refract-celery` services on Render

### Frontend → GitHub Pages

1. In your GitHub repo → **Settings → Pages** → Source: **GitHub Actions**
2. Add these repository secrets (**Settings → Secrets → Actions**):
   - `VITE_API_BASE_URL` = `https://refract-backend.onrender.com`
   - `VITE_WS_BASE_URL` = `wss://refract-backend.onrender.com`
3. Push to `main` — the workflow in `.github/workflows/deploy-frontend.yml` builds and deploys automatically
4. Your frontend will be live at `https://yourusername.github.io/Refract/`

> **If your repo is named `yourusername.github.io`** the site deploys at the root (`/`).
> For any other repo name add a repository variable `VITE_BASE_PATH` = `/Refract/` so Vite sets the correct asset base.

### Environment variables reference

| Where | Key | Value |
|---|---|---|
| Render env | `ANTHROPIC_API_KEY` | Your Anthropic key |
| Render env | `REDIS_URL` | Upstash Redis URL |
| Render env | `CORS_ALLOWED_ORIGINS` | `https://yourusername.github.io` |
| GitHub secret | `VITE_API_BASE_URL` | `https://refract-backend.onrender.com` |
| GitHub secret | `VITE_WS_BASE_URL` | `wss://refract-backend.onrender.com` |
| GitHub var | `VITE_BASE_PATH` | `/Refract/` (only if repo isn't root pages) |

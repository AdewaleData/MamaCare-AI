# MamaCare AI Deployment Guide

## Services

- `frontend`: Vite app built into static files and served with Nginx
- `backend`: FastAPI API with model loading at startup
- `model`: bundled with the backend container from `ai-development/ml-model/models`

## Environment setup

1. Copy `backend/.env.example` to `backend/.env`
2. Copy `frontend/.env.example` to `frontend/.env`
3. Replace placeholder values, especially:
   - `SECRET_KEY`
   - `CORS_ORIGINS`
   - `ALLOWED_HOSTS`
   - `VITE_API_BASE_URL`
   - `GOOGLE_APPLICATION_CREDENTIALS` if cloud TTS is enabled

## Local production-style run with Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

## Separate deployment

### Backend

- Build with `backend/Dockerfile`
- Mount or copy model files under `/app/ai-development/ml-model/models`
- Set `ENVIRONMENT=production`
- Set a strong `SECRET_KEY`
- Configure `ALLOWED_HOSTS` and `CORS_ORIGINS` explicitly

### Frontend

- Build with `frontend/Dockerfile`
- Set `VITE_API_BASE_URL` to the public backend URL before build
- Ensure your host rewrites unknown routes to `index.html`

## Pre-deployment checklist

- `npm run build` passes in `frontend`
- Backend imports without startup errors
- Model files exist and backend `/health` reports `"model_ready": true`
- No local absolute paths remain in frontend assets or metadata

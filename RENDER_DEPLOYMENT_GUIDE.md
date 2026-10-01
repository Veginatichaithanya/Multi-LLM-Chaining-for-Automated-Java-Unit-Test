# TestForge AI — Render Deployment & Production Guide

This guide details how to deploy the TestForge AI backend and frontend to **Render**, resolve login and timeout issues, and verify connectivity.

---

## 1. Backend Deployment (FastAPI Web Service)

### Service Settings
- **Service Type**: Web Service
- **Environment**: Python
- **Root Directory**: `Backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables
Configure these in the **Environment** tab on Render:

| Variable | Value | Description |
|---|---|---|
| `DATABASE_URL` | `${testforge-postgres.DATABASE_URL}` or internal PostgreSQL connection string | Managed PostgreSQL on Render. `postgres://` and `postgresql://` URLs are automatically converted to `postgresql+psycopg://`. |
| `SECRET_KEY` | *(generate with `python -c "import secrets; print(secrets.token_hex(32))"`)* | JWT signing key. |
| `CORS_ORIGINS` | `https://your-frontend-service.onrender.com` | Allowed frontend origin(s). |
| `FRONTEND_URL` | `https://your-frontend-service.onrender.com` | URL of the frontend app. |
| `APP_ENV` | `production` | Set to production. |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | OpenRouter API Key for GPT-4o / Claude. |
| `GEMINI_API_KEY` | `AIzaSy...` | Google Gemini API key. |
| `AGENTROUTER_API_KEY` | *(optional)* | AgentRouter API key. |

> [!TIP]
> **Database Cold Starts**: The backend includes an automated 5-attempt retry loop on startup with exponential backoff. If your Render PostgreSQL database takes several seconds to wake up, the backend will wait rather than crashing.

---

## 2. Frontend Deployment (Static Site)

### Service Settings
- **Service Type**: Static Site
- **Root Directory**: `Frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

### Environment Variables
| Variable | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://your-backend-service.onrender.com` | Backend URL. *(Trailing slashes are automatically trimmed by the frontend HTTP client).* |

### Rewrite Rule (Single Page App)
In Render Static Site settings under **Redirects/Rewrites**:
- **Source**: `/*`
- **Destination**: `/index.html`
- **Action**: `Rewrite`

---

## 3. Resolving Login & Cold Start Issues

### Render Free Tier Behavior
Render spins down free web services after 15 minutes of inactivity. When a user visits the app after it has been sleeping:
1. **Frontend Warmup Ping**: The login page automatically triggers an asynchronous `/health` probe when loaded, telling Render to start spinning up before the user even finishes typing credentials.
2. **Extended Timeout**: API requests now use a 30-second timeout (instead of 5 seconds), preventing premature request cancellations.
3. **Adaptive UI Status**: If authentication takes longer than 2.5 seconds, the button displays:
   `"Waking up server (Render cold start)..."`
4. **Runtime API URL Switcher**: On the Login page, an interactive connection indicator lets you check backend latency or configure a custom API base URL stored in `localStorage` without rebuilding the frontend.

---

## 4. Default Accounts for Testing

The backend auto-seeds the following test accounts on startup:

| Email | Password | Role |
|---|---|---|
| `demo@testforge.ai` | `TestForge@123` | Lead AI Engineer |
| `student@testforge.ai` | `Student@123` | Research Student |
| `srihariniduddekunta@gmail.com` | `Sriharini@123` | Senior QA Architect |

You can also create a new account anytime on `/signup`. Whitespace in email addresses is automatically trimmed on both frontend and backend.

---

## 5. Performance Optimizations Implemented

1. **Route Code Splitting (`React.lazy` + `Suspense`)**:
   - Initial bundle was reduced from **1,504 kB** to focused route chunks (Login page chunk is now only **12.2 kB**).
2. **Vendor Chunk Separation**:
   - `vendor-react` (React, ReactDOM, React Router)
   - `vendor-icons` (Lucide React)
   - `vendor-canvas` (html2canvas-pro)
3. **Build Time**:
   - Build time reduced from **5.2s** down to **2.7s**.

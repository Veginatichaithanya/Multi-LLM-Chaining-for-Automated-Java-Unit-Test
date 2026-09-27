# TestForge AI — FastAPI Backend

A FastAPI REST API backend for the **TestForge AI** Multi-LLM Unit Test Generation platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.x |
| Migrations | Alembic |
| Auth | JWT (python-jose, HS256) + bcrypt passwords |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Python | 3.11+ |

## Quick Start

### 1. Create virtual environment

```bash
cd Backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env if needed (the defaults work for local SQLite dev)
```

### 4. Run the server

```bash
uvicorn app.main:app --reload
```

The API is now available at **http://localhost:8000**

Interactive Swagger docs: **http://localhost:8000/docs**

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health check |
| `POST` | `/auth/register` | Public | Create new account |
| `POST` | `/auth/login` | Public | Login, returns JWT |
| `GET` | `/users/me` | Bearer | Get current user |

## Switching to PostgreSQL

1. Install PostgreSQL and create a database:
   ```sql
   CREATE DATABASE testforge_db;
   ```

2. Update `.env`:
   ```
   DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/testforge_db
   ```

3. Install psycopg2:
   ```bash
   pip install psycopg2-binary
   ```

4. Run Alembic migrations:
   ```bash
   alembic upgrade head
   ```

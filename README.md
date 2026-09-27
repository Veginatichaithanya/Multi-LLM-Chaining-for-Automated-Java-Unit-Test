# Multi-LLM Chaining for Automated Java Unit Test Generation (TestForge AI)

An advanced research and production platform for automated Java unit test generation, mutation analysis, and iterative test refinement powered by multi-LLM chaining pipelines.

---

## 🚀 Overview

TestForge AI leverages multiple LLMs (e.g. GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) in a coordinated multi-stage chain:
1. **Source Code Analysis**: Parsing AST, public interfaces, branch targets, and dependencies.
2. **Targeted Test Generation**: LLM-driven generation of JUnit 5 test cases and mock specifications.
3. **Execution & Coverage**: Sandboxed execution running JUnit tests, JaCoCo code coverage, and PIT mutation testing.
4. **Iterative Refinement Loop**: Multi-agent feedback loop analyzing failed assertions, compilation errors, and surviving mutants to produce high-coverage, robust test suites.
5. **Empirical Benchmarks & Analytics**: Comparison between Single-LLM and Multi-LLM chaining across coverage, mutation score, and execution overhead.

---

## 🛠 Project Structure

```text
├── Backend/                 # FastAPI REST Backend
│   ├── alembic/             # Database migrations
│   ├── app/                 # Application source
│   │   ├── engines/         # JUnit, JaCoCo, Maven, PIT execution engines
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── routers/         # REST API endpoints
│   │   ├── schemas/         # Pydantic validation schemas
│   │   └── services/        # Business logic & AI chaining services
│   ├── tests/               # Backend test suites
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Backend environment configuration template
│
├── Frontend/                # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/      # UI, landing, visualization & layout components
│   │   ├── context/         # Auth and Theme providers
│   │   ├── pages/           # Application views and dashboards
│   │   └── services/        # Axios API clients
│   ├── package.json         # Node dependencies & scripts
│   └── .env.example         # Frontend environment configuration template
│
└── README.md
```

---

## ⚡ Quick Start

### 1. Backend Setup

```bash
cd Backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your LLM API keys and database configuration

uvicorn app.main:app --reload
```
Backend API will be running at `http://localhost:8000` (Swagger docs at `/docs`).

### 2. Frontend Setup

```bash
cd Frontend
npm install
cp .env.example .env
npm run dev
```
Frontend development server will be available at `http://localhost:5173`.

---

## 🔒 Security & Privacy

- Environment secrets (`.env`) and API keys are strictly excluded from source control.
- Sample configs are maintained in `.env.example` templates.

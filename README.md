# JUSTFACTOR — Invoice Factoring Platform

> A full-stack MVP for an invoice factoring / accounts-receivable financing marketplace connecting SMEs (Small & Medium Enterprises) to Financial Institutions (FIs) in Vietnam.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [User Roles](#user-roles)
- [Invoice Lifecycle](#invoice-lifecycle)
- [Scoring Engine](#scoring-engine)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

**JUSTFACTOR** is a web-based factoring platform that allows SMEs to unlock working capital by selling their invoices to Financial Institutions. Instead of waiting 30–90 days for a buyer to pay, SMEs can submit a verified e-invoice and receive an advance (typically 60–85% of face value) within days.

The platform handles the entire lifecycle:

1. **SME uploads** an e-invoice package (XML + PDF + supporting docs).
2. The system **parses & verifies** the invoice against the tax authority.
3. A **credit scoring engine** rates the invoice risk (Grade A / B / C).
4. **FIs browse** a marketplace and submit competitive funding offers.
5. The **SME accepts** the best offer — a factoring contract is generated.
6. Payments are settled via **VietQR** bank transfer with real-time webhook confirmation.
7. An **AI Chatbot** powered by Google Gemini answers platform questions.

---

## Key Features

| Feature | Description |
|---|---|
| E-Invoice Parsing | Reads Vietnam TCVT-standard XML invoices, extracts all structured fields |
| Invoice Verification | Validates buyer tax code (KYB check), seller-tax-code matching |
| Credit Scoring | 4-factor scoring model: Buyer KYB (400 pts), Invoice Documents (300 pts), SME History (200 pts), CIC (100 pts) |
| FI Matching | Automatically matches scored invoices to FIs based on their risk config |
| Marketplace | FIs browse verified deals with full due-diligence details |
| Offer Management | FIs submit offers; SMEs accept/reject; auto-reject competing offers on acceptance |
| Contract Generation | Jinja2-rendered HTML factoring contract preview |
| Payment QR Codes | VietQR-powered QR codes for disbursement and repayment flows |
| SEPay Webhook | Incoming payment webhook to automate invoice status transitions |
| AI Chatbot | Google Gemini 2.5 Flash with RAG-lite invoice lookup |
| Multi-Role Admin | Admin panel for user approval, invoice audit, and transaction monitoring |
| Email Notifications | Automated emails (FastAPI-Mail / Gmail SMTP) at key lifecycle events |
| File Storage | Supabase Storage for invoice files and supporting documents |

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Framework | [FastAPI](https://fastapi.tiangolo.com/) 0.128 |
| Runtime | Python 3.11+ |
| ORM | SQLAlchemy 2.0 (async) |
| Database driver | asyncpg (PostgreSQL) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + Passlib bcrypt / Argon2 |
| Task Queue | Celery + Redis |
| AI | Google Generative AI (Gemini 2.5 Flash) |
| Email | FastAPI-Mail (Gmail SMTP) |
| Storage | Supabase Storage SDK |
| XML parsing | lxml |
| Data | pandas, openpyxl |
| QR / Payments | VietQR API, SEPay API |
| Templating | Jinja2 (contract rendering) |
| Packaging | Poetry |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 7 |
| UI Components | Radix UI (Dialog, Tabs, Progress, Label…) |
| Styling | Tailwind CSS 3 |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query (React Query) v5 |
| HTTP Client | Axios |
| Icons | Lucide React |
| Notifications | Sonner (toast) |
| Confetti | canvas-confetti |

### Infrastructure / Cloud

| Service | Purpose |
|---|---|
| Supabase (PostgreSQL) | Primary database (via connection pooler) |
| Supabase Storage | File/document storage |
| Render | Backend hosting |
| Vercel | Frontend hosting (`factoring1.vercel.app`) |
| Redis | Celery broker / cache |
| Docker Compose | Local dev database + Redis |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend (Vercel)                   │
│         React 19 + TypeScript + Vite + Tailwind          │
│   Roles: SME Dashboard | FI Marketplace | Admin Panel    │
└──────────────────┬───────────────────────────────────────┘
                   │  HTTPS / REST (JWT Bearer)
                   ▼
┌──────────────────────────────────────────────────────────┐
│                   Backend API (Render)                    │
│              FastAPI + Uvicorn (async)                   │
│                                                          │
│  /api/v1/auth       → JWT login, register, KYC          │
│  /api/v1/invoices   → Upload, parse, verify, score      │
│  /api/v1/scoring    → Credit score calculation          │
│  /api/v1/trading    → Marketplace, offers, contracts    │
│  /api/v1/payment    → QR generation, bank accounts      │
│  /api/v1/sme        → SME profile management            │
│  /api/v1/fi         → FI profile & risk config          │
│  /api/v1/dashboard  → Analytics & KPIs                  │
│  /api/v1/chatbot    → Gemini AI assistant               │
└────────┬─────────────────────┬────────────────────────┬──┘
         │                     │                        │
         ▼                     ▼                        ▼
   Supabase DB           Supabase Storage          Redis / Celery
 (PostgreSQL async)    (XML, PDF, Docs)       (background tasks)
```

---

## Project Structure

```
invoice-trading/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic Settings (env vars)
│   │   │   ├── database.py        # Async SQLAlchemy engine & session
│   │   │   ├── security.py        # JWT helpers, password hashing
│   │   │   ├── email.py           # FastAPI-Mail helper
│   │   │   ├── supabase_storage.py# Supabase file upload/delete
│   │   │   └── utils.py           # File save utilities
│   │   ├── modules/
│   │   │   ├── auth/              # User registration, login, JWT
│   │   │   ├── invoice/           # Upload, XML parser, verification, service
│   │   │   ├── scoring/           # Credit scoring engine, grade matching
│   │   │   ├── trading/           # Marketplace, offers, contracts, QR payment
│   │   │   ├── sme/               # SME profile CRUD
│   │   │   ├── fi/                # Financial Institution profile & risk config
│   │   │   ├── payment/           # Bank accounts, VietQR, SEPay webhook
│   │   │   ├── dashboard/         # Analytics endpoints
│   │   │   └── chatbot/           # Gemini AI chatbot with RAG-lite
│   │   ├── templates/
│   │   │   └── factoring_contract.html
│   │   └── main.py                # FastAPI app, CORS, router registration
│   ├── alembic/                   # Database migration scripts
│   ├── storage/uploads/           # Local file storage (dev)
│   ├── docker-compose.yml         # PostgreSQL + Redis for local dev
│   ├── pyproject.toml             # Poetry dependencies
│   └── .env                       # Environment variables (not committed)
│
└── frontend/
    ├── src/
    │   ├── features/
    │   │   ├── auth/              # Login & SME registration forms
    │   │   ├── dashboard/         # SME Dashboard
    │   │   ├── trading/           # FI Marketplace, portfolio, settings
    │   │   ├── admin/             # Admin panel pages & layout
    │   │   ├── invoices/          # Invoice list & upload
    │   │   └── chatbot/           # AI Chat UI
    │   ├── components/            # Shared UI components
    │   ├── context/               # React context providers
    │   ├── hooks/                 # Custom React hooks
    │   ├── services/              # API client functions (Axios)
    │   ├── types/                 # TypeScript type definitions
    │   ├── lib/                   # Utility helpers
    │   └── App.tsx                # Root component with role-based routing
    ├── package.json
    └── vite.config.ts
```

---

## Getting Started

### Prerequisites

- Python **3.11+** and [Poetry](https://python-poetry.org/)
- Node.js **18+** and npm
- Docker & Docker Compose (for local database)
- A Supabase project (free tier works)
- API keys: Gemini, VietQR, SEPay

---

### Backend Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd invoice-trading/backend

# 2. Install dependencies
poetry install

# 3. Create .env file (see Environment Variables section)
cp .env.example .env
# Edit .env with your actual credentials

# 4. Start local database + Redis
docker compose up -d

# 5. Run migrations
poetry run alembic upgrade head

# 6. Start the development server
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

### Frontend Setup

```bash
cd invoice-trading/frontend

# 1. Install dependencies
npm install

# 2. Set the API base URL
# Edit src/.env or create a .env.local:
# VITE_API_BASE_URL=http://localhost:8000

# 3. Start the dev server
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

## Environment Variables

Create `backend/.env` with the following variables:

```env
# ── Application ─────────────────────────────────────
PROJECT_NAME="Factoring MVP"
API_V1_STR="/api/v1"

# ── Database ─────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/dbname

# ── Security ──────────────────────────────────────────
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ── Supabase ──────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# ── VietQR ────────────────────────────────────────────
VIETQR_API_URL=https://api.vietqr.io
VIETQR_CLIENT_ID=your-client-id
VIETQR_API_KEY=your-api-key

# ── SEPay ─────────────────────────────────────────────
SEPAY_API_URL=https://einvoice-api-sandbox.sepay.vn
SEPAY_ACCESS_TOKEN=your-access-token
SEPAY_WEBHOOK_KEY=your-webhook-secret

# ── Email (Gmail SMTP) ────────────────────────────────
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=admin@your-platform.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com

# ── AI ────────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key

# ── File Upload ───────────────────────────────────────
UPLOAD_DIR=storage/uploads
MAX_FILE_SIZE_MB=10
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## API Overview

All endpoints are prefixed with `/api/v1`.

| Module | Method | Path | Description |
|---|---|---|---|
| **Auth** | POST | `/auth/register/sme` | Register a new SME account |
| | POST | `/auth/register/fi` | Register a new FI account |
| | POST | `/auth/token` | Login, returns JWT |
| | GET | `/auth/me` | Get current user |
| **Invoice** | POST | `/invoices/upload` | Upload invoice package (XML + PDF + docs) |
| | GET | `/invoices/my-invoices` | List invoices for the logged-in SME |
| | GET | `/invoices/admin/all` | Admin: list all invoices |
| **Scoring** | POST | `/scoring/{invoice_id}` | Trigger credit scoring |
| **Trading** | GET | `/trading/marketplace` | FI: browse verified deals |
| | GET | `/trading/deals/{invoice_id}` | FI: full due-diligence detail |
| | POST | `/trading/offers` | FI: submit a funding offer |
| | GET | `/trading/offers` | List offers (role-aware) |
| | POST | `/trading/offers/{id}/accept` | SME: accept an offer |
| | GET | `/trading/offers/{id}/contract-preview` | Preview factoring contract (HTML) |
| | POST | `/trading/deals/{id}/repay` | FI: confirm debtor repayment |
| | GET | `/trading/deals/{id}/payment-kit` | Get VietQR codes for disbursement & repayment |
| **Payment** | POST | `/payment/webhook/sepay` | SEPay payment webhook |
| | GET | `/payment/bank-accounts` | List SME's registered bank accounts |
| **SME** | GET/PUT | `/sme/profile` | Get / update SME profile |
| **FI** | GET/PUT | `/fi/profile` | Get / update FI profile & risk config |
| **Dashboard** | GET | `/dashboard/stats` | Platform-wide KPIs |
| **Chatbot** | POST | `/chatbot/chat` | Send a message to the AI assistant |

Full interactive documentation is available at `/docs` (Swagger UI) or `/redoc`.

---

## User Roles

The platform has three user roles, each with a distinct interface:

### SME (Small & Medium Enterprise)
- Register with company name + tax code + business licence
- Upload invoice packages for factoring
- View credit scores & AI-matched FIs
- Review and accept/reject funding offers
- Access QR payment kit for disbursement tracking

### FI (Financial Institution)
- Browse the verified invoice marketplace
- Perform due-diligence (documents, credit score, SME info)
- Submit competitive offers (interest rate, funding amount, tenor)
- Track active portfolio and confirm repayments
- Configure risk acceptance rules (min score, accepted grades)

### Admin
- Approve or reject SME/FI registration requests
- Audit all invoices and their verification status
- Monitor all platform transactions

---

## Invoice Lifecycle

```
UPLOAD ──► PROCESSING ──► VERIFIED ──► TRADING ──► FINANCED ──► CLOSED
                │                                              
              REJECTED (tax-code mismatch / invalid XML)      
```

| Status | Meaning |
|---|---|
| `PROCESSING` | Invoice uploaded; parser running |
| `VERIFIED` | Buyer KYB passed; credit score calculated |
| `REJECTED` | Verification failed (duplicate, mismatch, invalid data) |
| `TRADING` | At least one FI offer received |
| `FINANCED` | SME accepted an offer; contract locked |
| `CLOSED` | Debtor repaid; deal settled |

---

## Scoring Engine

The credit score (0–1000 pts) is calculated across four dimensions:

| Block | Max Points | Input Signal |
|---|---|---|
| **Buyer KYB** | 400 | Buyer tax code status (ACTIVE / NOT_FOUND) |
| **Invoice Documents** | 300 | Number of supporting docs (contract, delivery note) |
| **SME History** | 200 | Business age / transaction history |
| **CIC (Credit)** | 100 | Credit bureau summary |

**Grades & Advance Rates:**

| Grade | Score Range | Advance Rate |
|---|---|---|
| **A** | ≥ 800 | 85% of invoice face value |
| **B** | 600 – 799 | 75% of invoice face value |
| **C** | < 600 | 60% of invoice face value |

After scoring, the engine automatically matches the invoice to FIs whose risk configuration accepts the achieved grade.

---

## Deployment

### Backend — Render

The backend is deployed to [Render](https://render.com) as a Web Service.

- **Build command:** `poetry install`
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set all environment variables in the Render dashboard.

### Frontend — Vercel

The frontend is deployed to [Vercel](https://vercel.com).

- Root directory: `frontend/`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_BASE_URL` to the Render backend URL.

### Database Migrations (Production)

```bash
# Run from the backend directory with production DATABASE_URL set
poetry run alembic upgrade head
```

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/your-feature`).
2. Follow the existing module structure: `models.py → schemas.py → services.py → router.py`.
3. Use `black` and `isort` for Python formatting (`poetry run black . && poetry run isort .`).
4. Open a Pull Request with a clear description of your changes.

---

*Built with ❤️ by the JUSTFACTOR team · Vietnam 🇻🇳*

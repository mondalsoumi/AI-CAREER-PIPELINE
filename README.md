# AI Career Pipeline

A full-stack, microservices-based job application tracker with AI-powered career insights, a browser extension for one-click job capture, and a Kanban-style pipeline board.

Track every application from "saved" to "offer," get AI feedback on a candidate's resume against a job description, auto-draft follow-up emails, and see analytics on the job searching pipeline.

**Live demo:** [https://ai-career-pipeline.vercel.app](https://ai-career-pipeline.vercel.app)

> The backend runs on free-tier hosting, which sleeps after periods of inactivity. The first request after idle time can take 30–60 seconds to respond while services spin back up — this is a hosting characteristic, not a bug.

<!-- 📸 Add screenshots/GIFs here — see "Screenshots" section below -->

---

## Why this project

Most portfolio projects are a single Express app with a database attached. This one is built as **six independently deployable services communicating over HTTP and Redis pub/sub**, to practice the parts of backend engineering that a monolith doesn't exercise: service boundaries, event-driven data sync, API gateway routing, and containerized multi-service orchestration.

This project also comes from a personal problem, being a candidate eagerly seeking for jobs and applying at multiple sites it becomes very difficult to track everything. I use this as my daily job searching assistant

---

## Architecture

```
                          ┌─────────────────┐
                          │   Frontend       │
                          │  (React + Vite)  │  :5173
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │   API Gateway     │  :8000
                          │ (auth + routing +  │
                          │  rate limiting)    │
                          └────────┬─────────┘
              ┌────────────────────┼────────────────────┬─────────────────┐
              ▼                    ▼                     ▼                 ▼
     ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐
     │  Auth Service    │  │ Application       │  │ Analytics         │  │ AI Service │
     │  :8001           │  │ Service :8002     │  │ Service :8003     │  │ :8004      │
     │                  │  │                   │  │                   │  │            │
     │ JWT issuing +    │  │ Applications,      │  │ Pipeline metrics,  │  │ Gemini-    │
     │ validation       │  │ Interviews,        │  │ conversion rates,  │  │ powered    │
     │                  │  │ Resume uploads      │  │ funnel analysis     │  │ insights   │
     └────────┬─────────┘  └────────┬──────────┘  └─────────▲─────────┘  └───────────┘
              │                     │                        │
              ▼                     ▼                        │ (Redis pub/sub event)
     ┌────────────────┐  ┌──────────────────┐                │
     │  auth_db         │  │ application_db     │───────────────┘
     │  (PostgreSQL)     │  │ (PostgreSQL)        │
     └─────────────────┘  └────────┬──────────┘
                                    │
                          ┌─────────▼──────────┐
                          │  Object storage       │
                          │  Resume file storage  │
                          └───────────────────────┘

                    ┌──────────────────────────┐
                    │  Chrome Extension          │
                    │  Scrapes job postings from  │
                    │  LinkedIn / Indeed / etc.    │
                    │  → saves directly to pipeline │
                    └──────────────────────────┘
```

**Event-driven analytics:** rather than the analytics service polling the application service, `application-service` publishes an event to Redis on every create/update/delete. `analytics-service` subscribes, recomputes the affected user's metrics, and caches the result, so the analytics dashboard stays current without the two services being tightly coupled to each other's database.

---

## Services

| Service | Port | Responsibility | Key tech |
|---|---|---|---|
| **frontend** | 5173 | React SPA — Kanban board, resume manager, AI center, analytics dashboard | React 18, Vite, Tailwind CSS, Recharts, `@hello-pangea/dnd` |
| **api-gateway** | 8000 | Single entry point — JWT verification, request routing, rate limiting | Express, `http-proxy-middleware`, `express-rate-limit` |
| **auth-service** | 8001 | Registration, login, JWT issuing/verification | Express, Prisma, bcryptjs, jsonwebtoken |
| **application-service** | 8002 | CRUD for applications, interviews, and resumes; resume file storage | Express, Prisma, S3-compatible object storage, Multer, `pdfreader`, ioredis |
| **analytics-service** | 8003 | Computes pipeline funnel metrics, conversion rates, source-platform performance | Express, Prisma, ioredis (pub/sub subscriber + cache) |
| **ai-service** | 8004 | Resume ↔ job-description matching, career insight generation, AI-drafted follow-up emails, interview-notes analysis | Express, Google Gemini API |
| **extension** | — | Manifest V3 Chrome extension — detects job postings on LinkedIn, Wellfound, Indeed, Instahyre and saves them to the pipeline in one click | Vanilla JS, `chrome.scripting` |

**Infrastructure:** PostgreSQL (one database per service — `auth_db`, `application_db`, `analytics_db`), Redis (caching + pub/sub event bus), S3-compatible object storage (resume PDFs), Docker for local orchestration.

**Production note:** the deployed version above runs each service as a separate host, backed by managed PostgreSQL, managed Redis, and S3-compatible storage. The local setup below uses Docker Compose with self-hosted Postgres, Redis, and MinIO instead — functionally equivalent, easier to run on one machine.

---

## Features

### Application tracking
- Kanban-style pipeline board with drag-and-drop across 9 stages (Saved → Applied → Online Assessment → Technical Interview → Manager Round → HR Round → Offer / Rejected / Withdrawn)
- Full CRUD on applications, with per-application interview scheduling and notes
- Resume version management — upload multiple resume PDFs, link a specific version to each application, and see which resume led to which interviews

### AI-powered insights (Google Gemini)
- **Resume ↔ job match scoring** — paste a job description, get a match score, missing keywords, and improvement suggestions
- **Career insights** — analyzes application history to surface patterns: which platforms convert best, where candidates are lost in the funnel, overall pipeline health
- **AI-drafted follow-up emails** — generates a follow-up email with appropriate tone based on days since last contact
- **Interview notes analyzer** — summarizes interview notes into topics covered, weak areas, and revision suggestions

### Analytics dashboard
- Funnel visualization (application → interview → offer conversion rates)
- Breakdown by source platform (LinkedIn vs. Indeed vs. referral, etc.)
- Event-driven recomputation via Redis pub/sub — stats update when an application's stage changes, without manual refresh or polling

### Browser extension
- Detects job postings on LinkedIn, Wellfound, Indeed, and Instahyre via DOM scraping (injected at popup-open time to avoid SPA timing issues)
- Auto-fills company, title, location, and platform
- Attach an existing resume or upload a new one, from the popup
- View and delete recently saved applications without leaving the extension

**Note on availability:** the extension is not published on the Chrome Web Store. It is loaded as an unpacked extension for local testing — see "Loading the browser extension" below.

### Security & platform hygiene
- JWT-based auth, verified centrally at the API gateway
- Per-service PostgreSQL databases (no shared-database anti-pattern)
- Rate limiting at the gateway layer
- Multi-stage Docker builds for smaller production images

---

## Tech stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router, Recharts, `@hello-pangea/dnd`, Axios
**Backend:** Node.js, Express, Prisma ORM
**Data layer:** PostgreSQL (3 isolated databases), Redis (cache + pub/sub), S3-compatible object storage
**AI:** Google Gemini API
**Auth:** JWT, bcryptjs
**Infra:** Docker, Docker Compose, multi-stage builds
**Browser extension:** Manifest V3, Chrome Scripting API

---

## Getting started locally

### Prerequisites
- Docker Desktop
- A [Google Gemini API key](https://ai.google.dev/) (free tier available)

### Setup

```bash
git clone https://github.com/mondalsoumi/AI-CAREER-PIPELINE.git
cd AI-CAREER-PIPELINE

cp .env.example .env
# Edit .env — set database passwords, JWT_SECRET, and your GEMINI_API_KEY

docker compose build --no-cache
docker compose up -d

# Run migrations for the three services with their own databases
docker exec ai-career-auth-service npx prisma migrate deploy
docker exec ai-career-application-service npx prisma migrate deploy
docker exec ai-career-analytics-service npx prisma migrate deploy
```

Visit **http://localhost:5173**.

### Loading the browser extension
1. Go to `chrome://extensions`
2. Enable Developer Mode
3. **Load unpacked** → select the `extension/` folder
4. Open a job posting on LinkedIn/Indeed/Wellfound/Instahyre and click the extension icon

By default the extension points at the deployed API gateway. To use it against a local backend instead, change `API_BASE` in `extension/popup.js` to `http://localhost:8000` and update `host_permissions` in `extension/manifest.json` accordingly.

---

## API overview

All routes are proxied through the API gateway.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Authenticate, receive JWT |
| `GET` | `/api/auth/me` | Get current user |
| `GET` / `POST` | `/api/applications` | List / create applications |
| `GET` / `PUT` / `DELETE` | `/api/applications/:id` | Fetch / update / delete an application |
| `GET` / `POST` | `/api/interviews` | List / schedule interviews |
| `PUT` / `DELETE` | `/api/interviews/:id` | Update / delete an interview |
| `GET` / `POST` | `/api/resumes` | List / upload resumes |
| `GET` / `DELETE` | `/api/resumes/:id` | Fetch resume detail (with linked applications) / delete |
| `POST` | `/api/resumes/extract-text` | Extract text from an uploaded PDF |
| `GET` | `/api/analytics` | Pipeline funnel metrics, conversion rates |
| `POST` | `/ai/resume-match` | Score resume against a job description |
| `GET` | `/ai/career-insights` | AI-generated pattern analysis across all applications |
| `POST` | `/ai/follow-up` | Generate a follow-up email draft |
| `POST` | `/ai/analyze-notes` | Summarize interview notes |

---

## Screenshots

<!--
Add screenshots here once you have them, e.g.:
### Login Page
![Login Page](./screenshots/login.png)

### Register Page
![Register Page](./screenshots/register.png)

### Kanban Pipeline Board
![Kanban board](./screenshots/Kanbanboard.png)

### Offer Selection
![Offer Selection](./screenshots/offer_selected.png)

### Offer Rejected
![Offer Rejected](./screenshots/offer_rejected.png)

### Analytics Dashboard
![Analytics](./screenshots/analytics.png)

### Interview Notes
![Interview Notes](./screenshots/interview_notes(ai centre).png)

### AI Follow-up Email
![AI Follow-up Email](./screenshots/follow-up email(ai centre).png)

### AI Resume Match
![AI resume match](./screenshots/resume_match.png)

### Career Insights
![Career Insights](./screenshots/career insights(ai centre).png)

### Chrome Extension
![Chrome Extension](./screenshots/chrome extension.png)

### Resume Dashboard
![Resume Dashboard](./screenshots/resume tracking.png)
-->

## License

MIT
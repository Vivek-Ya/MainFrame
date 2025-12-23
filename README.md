<div align="center">

# ❖ M A I N F R A M E
### Personal Life Operating System & Productivity Cockpit

![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

<br />

**Mainframe is a sci-fi styled telemetry dashboard for your life.**
<br />
Track commits, fitness, study cadence, and content creation in a dual-mode Holo-UI.
Built for high-performance living with real-time signal feeds and gamified goals.

[View Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## ⚡ Mission Briefing

Mainframe isn't just a to-do list; it's a **Command Center**. It combines hard data (GitHub commits, LeetCode stats) with soft goals (meditation, journaling) in a unified, aesthetically pleasing interface.

### Why it's different
| Feature | Description |
| :--- | :--- |
| **🎨 Holo Aesthetic** | Premium dual-mode (Light/Dark) UI with frosted glass cards, subtle motion, and gradients. |
| **📡 Live Signal** | Real-time `STOMP/WebSocket` feed updates your activity stream instantly across devices. |
| **🎯 Goal-First UX** | "Quick Tick" dialogs, streak tracking, and confetti celebrations on milestones. |
| **🌙 Quiet Hours** | Integrated timezone-aware focus system that persists locally to manage your downtime. |
| **⚡ Fast Lanes** | Quick Capture inputs with auto-fill logic and start-date presets for rapid logging. |

---

## 🛠️ The Tech Stack

**The Core (Backend)**
- **Framework:** Spring Boot 3.5 (JPA, Security, Actuator, Scheduling)
- **Real-time:** WebSocket (STOMP)
- **Auth:** Stateless JWT Security
- **DB:** MySQL (Prod) / H2 In-Memory (Dev)

**The View (Frontend)**
- **Library:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS + Framer Motion
- **Viz:** Recharts + Canvas Confetti
- **State:** Axios + LocalStorage persistence

---

## 🚀 Quick Start (local)
```bash
# Backend (dev, H2 in-memory)
cd server
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run

# Frontend
cd ../web
npm install
npm run dev -- --host --port 4173
```
Visit frontend at http://localhost:4173 (uses `VITE_API_BASE` env, default http://localhost:8080).

## One-command checks
```bash
cd web && npm run build -- --clearScreen false --mode production
cd ../server && ./mvnw -DskipTests package
```
Both should complete without errors before pushing.

## Docker (one command)
```bash
docker compose up --build
```
- Backend: http://localhost:8080
- Frontend: http://localhost:4173
- MySQL: localhost:3306 (see compose env for creds)

## Feature tour
- Dashboard: trends, goal velocity, live feed, leaderboards, holo cards.
- Goals: create, view histories, quick “mark today” buttons, start-date presets, streak/milestone badges.
- Reminders: Today’s goals list with completion checkboxes; tick dialog captures value + note; instantly clears completed items.
- Celebrations: Motion overlay + confetti on milestones and goal ticks.
- Quiet Hours: Start/end plus timezone selector; values persisted in `localStorage`.
- Quick Capture: Log activities fast with type presets and goal auto-fill.
- Auth: JWT login/signup; profile theme preference respected (light/dark).
- Live Updates: STOMP client mirrors backend activity stream.

## Architecture (at a glance)
```
[React 19 + Vite + Tailwind]
	| Axios
	v
[Spring Boot 3 API]
  - JWT auth
  - STOMP /ws feed
  - Goal history + badges
	|
	v
[MySQL (prod) / H2 (dev)]
```

## Environment and config
Key backend envs (see `server/src/main/resources/application.properties`):
- `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_DRIVER`, `HIBERNATE_DDL_AUTO`, `HIBERNATE_DIALECT`
- `JWT_SECRET` (base64), `JWT_EXPIRATION_SECONDS`
- `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`
- Integrations (off by default): GitHub (`GITHUB_*`), LeetCode (`LEETCODE_*`), Calendar (`CALENDAR_*`), `INTEGRATION_TARGET_EMAIL`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

Frontend envs (`web`):
- `VITE_API_BASE` (defaults to http://localhost:8080)

## Scripts
- Backend: `./mvnw spring-boot:run` (dev) | `./mvnw -DskipTests package`
- Frontend: `npm run dev` | `npm run build` | `npm run lint`

## API flyover
- `POST /api/auth/signup`, `POST /api/auth/login`
- `GET /api/dashboard` (summary + trends)
- `POST /api/activities`, `GET /api/activities`, `GET /api/activities/feed`
- `POST /api/goals`, `GET /api/goals`, `GET /goals/{id}/history`, `POST /goals/{id}/history`
- WebSocket: `/ws` topic `/topic/activity`

## How to verify locally
1) Start backend with dev profile (H2).
2) Start frontend (`npm run dev -- --host`).
3) Sign up, create a goal, then tick “Today’s goals” → dialog → save. Expect reminder to clear and celebration overlay to fire.
4) Adjust Quiet Hours timezone/start/end; refresh to confirm persistence.

## Badges to add (optional)
- CI: add GitHub Actions badge after enabling a workflow.
- Deploy: add Render/Vercel badges when deployed.

## Deployment notes
- Backend (Render/Heroku): build `./mvnw -DskipTests package`, run `java -jar target/server-0.0.1-SNAPSHOT.jar`; set DB, JWT, CORS, FRONTEND_URL.
- Frontend (Vercel/Netlify): set `VITE_API_BASE` to backend URL; run `npm run build`.
- Security: replace default JWT secret; enable HTTPS; set CORS allowlist; consider Redis cache/rate limiting before production.

## Architecture snapshot
- `server/` — Spring Boot API, JWT auth, STOMP messaging, integrations scheduler.
- `web/` — Vite React app (HMR), sci‑fi theming, celebration overlay, reminders, charts.
- `docker-compose.yml` — local orchestration for backend, frontend, and MySQL.

## Roadmap ideas
- Wire GitHub/LeetCode/Calendar ingestion with real clients.
- Add CI (GitHub Actions) for `mvn test` + `npm run build` and deploy to Render/Vercel.
- Add Redis cache + rate limiting; expand test coverage.


<div align="center"> <sub>Built with 💜 for High Performance Living</sub> </div>

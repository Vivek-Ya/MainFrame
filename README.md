# Mainframe (Life Data Dashboard)

![status](https://img.shields.io/badge/state-ready_to_ship-brightgreen) ![stack](https://img.shields.io/badge/stack-Spring_Boot_3_|_React_19_|_Vite-blue) ![license](https://img.shields.io/badge/license-MIT-lightgrey)

Mainframe is a sci-fi styled productivity cockpit for commits, study, fitness, and content cadence. Spring Boot backend + React/Vite/Tailwind frontend with live feed, goals, reminders, celebrations, and a quiet-hours timezone system.

## Why it’s different
- **Goal-first UX**: Today’s reminders, quick tick dialog with notes, milestone celebrations (motion + confetti).
- **Live signal stream**: STOMP/WebSocket feed for real-time activity updates.
- **Quiet Hours with TZ**: Start/end plus timezone picker; persists locally.
- **Holo aesthetic**: Dual-mode (dark/light) holo cards, gradients, subtle motion.
- **Fast lanes**: Quick Capture auto-fills goals; start-date presets; celebration overlay built in.

## Stack at a glance
- Backend: Spring Boot 3.5, JPA, Security (JWT), WebSocket (STOMP), Scheduling, Actuator.
- Frontend: React 19, Vite, TypeScript, Tailwind, Recharts, framer-motion, canvas-confetti.
- DB: MySQL by default; H2 for dev profile; Postgres compatible via env overrides.
- Packaging: Docker Compose for local full-stack; Vercel/Render ready.

## Quickstart (local)
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

## License
MIT (set your preferred license if different).

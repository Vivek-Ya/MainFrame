# Frontend (Vite + React + TS)

This package is the UI for the Life Data Dashboard. It ships a sci‑fi themed dashboard with goals, streaks, reminders, live activity feed, and a celebration overlay.

## Quick start

```bash
cd web
npm install
npm run dev -- --host --port 4173  # dev server
npm run build                       # type-check + production build
```

The frontend reads `VITE_API_BASE` (defaults to `http://localhost:8080`) to reach the Spring Boot backend.

## Key features
- Dashboard with trends, live feed (STOMP), and quick capture for activities
- Goal management with streak/milestone celebrations (canvas-confetti + framer-motion)
- Daily reminders card with tick dialog and note capture
- Quiet hours with timezone picker (values persisted in `localStorage`)
- Dual-theme styling (light/dark) with holo cards

## Paths to know
- `src/App.tsx` — main UI, reminders, quiet hours, celebrations
- `src/components/CelebrationOverlay.tsx` — confetti overlay
- `src/api/client.ts` — Axios client for backend API

## Linting & build
- `npm run lint` — ESLint
- `npm run build` — TypeScript project refs + Vite build

## Testing the flow
1) Start backend (`SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run`).
2) Start frontend (`npm run dev -- --host`).
3) Sign up/login, create a goal, tick it via Today’s goals → confirm tick dialog → see reminder clear and celebration overlay.
4) Adjust Quiet Hours timezone/start/end to pause reminder emails locally.

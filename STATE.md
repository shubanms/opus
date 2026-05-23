# OPUS — Project State

Last updated: 2026-05-23
Current sprint: 1 (Scaffold & Foundation)
Current version: v0.1.0

## What's working
- Vite + React 18 + Tailwind v3 project scaffolded
- Design tokens (`src/styles/tokens.css`) + animation keyframes (`src/styles/animations.css`)
- Tailwind config with full OPUS colour + font tokens
- `index.html` with Google Fonts (Cormorant Garamond, DM Sans, DM Mono), PWA + iOS meta
- `vite.config.js` with base `/opus/` and `vite-plugin-pwa` (manifest + service worker → installable)
- React Router v6 with all routes stubbed (Home, Workout, History, Exercises, Progress, Profile, Settings)
- `BottomNav` — 5 tabs, gold centre workout button (renders + navigates)
- `LoadingScreen` — full 3.8s intro sequence (ring draw → logo fade → wordmark → tagline → fade out)
- `OpusMark` — circular gold ring + lifter.png, optional draw animation
- GitHub Actions deploy workflow → GitHub Pages

## What's in progress
- Nothing — Sprint 1 deliverables complete

## What's not started
- Sprint 2: DB schema (Dexie), Wger API client, hooks, Zustand stores, seed data
- Sprint 3–10: see OPUS_PRD.md sprint plan

## Known issues / deviations
- **Local builds blocked**: the web session's network policy blocks the npm
  registry, so dependencies cannot be installed or built inside the session.
  Builds run in GitHub Actions (which has internet) on push to `main`.
- **No committed `package-lock.json`**: cannot be generated without a local
  install, so the deploy workflow uses `npm install` instead of `npm ci`.
- **PWA icons** reuse `lifter.png` for 192/512 (per PRD). May not be perfectly
  square; proper icon set is a Sprint 10 polish item.
- Deeper per-feature stub files (components/ subfolders, hooks/, utils/, db/,
  store/) are created in their respective sprints rather than pre-stubbed as
  empty files, to avoid clutter.

## File tree (current src/)
```
src/
├── assets/lifter.png
├── components/
│   ├── layout/{AppLayout,BottomNav,TopBar,PageWrapper}.jsx
│   └── logo/{OpusMark,LoadingScreen}.jsx
├── pages/{Loading,Home,Workout,History,Exercise,Progress,Profile,Settings}Page.jsx
├── styles/{tokens,animations}.css
├── index.css
├── main.jsx
└── router.jsx
```

## Next session — start here
Begin **Sprint 2 — Database & Data Layer**:
1. `src/db/db.js` — full Dexie schema (all tables from PRD Section 6)
2. `src/db/migrations.js` — version 1 migration
3. `src/utils/wger.js` — Wger API client (fetch + cache exercises)
4. Exercise seed fallback list (60+ exercises across all muscle groups)
5. Stub hooks: useWorkout, useExercises, useProgress, useRPG, useNotifications, useOverload
6. `useExercises` fully working (fetch from Wger → cache in DB → return list)
7. Zustand stores: workoutStore, uiStore, userStore
8. Initialise userProfile on first run (level 1, 0 XP, streak 0)
Then update this file and tag v0.2.0.

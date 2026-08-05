# OPUS

> Build your masterpiece.

A free, offline-first Progressive Web App for gym tracking with RPG progression. Every rep earns XP, every milestone unlocks a title, and your stats grow like a character sheet. No subscriptions, no ads, no cloud — everything lives on your device.

**Live:** https://shubanms.github.io/opus/

## Features

- **Workout logging** — sets, reps, RPE, warmups, rest timer, plate calculator, **supersets**, **reorder**, **resume-after-reload**
- **Bodyweight support** — reps-only logging with optional added weight (counts toward volume)
- **Exercise library** — curated across all muscle groups, difficulty tags, body-map filter, notes & colour labels, how-to videos
- **Routines & planning** — reusable templates with targets, weekly planner, today's-workout suggestion
- **Progressive overload** — three-lever coaching (reps → sets → weight) + deload signal
- **RPG system** — XP, levels, titles, prestige tiers, a five-axis radar with month-over-month overlay, an evolving emblem, achievements & weekly quests
- **Progress & insight** — weekly volume, muscle focus, training heatmap, recovery body-map, per-exercise trends, **estimated 1RM**, **Hall of Records**
- **Health tracking** — body weight, measurements, sleep, pre-workout energy, daily **steps & water**
- **Wrapped** — Spotify-style monthly & yearly recap, shareable
- **Shareable cards** — customizable workout, profile, recap & challenge cards via the native share sheet
- **Personal records** — auto-detected, with full revert when a workout is deleted
- **Comfort & polish** — light/dark themes, kg/lbs, equipment/plate inventory (gym/home), synthesized cues, guided tour & coach marks, in-app reminders
- **Your data, yours** — JSON / CSV / PDF export, import, full local reset, installable PWA

## Tech stack

Vite · React 18 · Tailwind CSS v4 (CSS-first) · Dexie.js (IndexedDB) · Zustand · React Router · Motion · visx (charts) · Paper Shaders · react-body-highlighter · lucide-react · vite-plugin-pwa

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint     # Biome
npm test         # Vitest unit tests
npm run build    # production build → dist/
npm run preview  # preview the build
npm run test:e2e # Playwright end-to-end
```

CI runs `lint`, `test` and `build` on every pull request.

## Deployment

Pushes to `main` build and deploy to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). The app is served under the `/opus/` base path.

## Data & privacy

All data is stored locally in IndexedDB. Nothing is sent to a server. Back up or move your data anytime via Settings → Data → Export / Import, or wipe it via Settings → Danger zone.

## Documentation

Plans, references, and project memory live in [`docs/`](./docs/):

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — codebase map (routes, DB, utils/hooks/stores, patterns)
- [`docs/GUIDELINES.md`](./docs/GUIDELINES.md) — engineering, UX, data-integrity & testing rules
- [`docs/RELEASES.md`](./docs/RELEASES.md) — what shipped in v1.0.0 / v2.0.0 / v3.0.0
- [`docs/STATE.md`](./docs/STATE.md) — live status + build log
- [`docs/PRD.md`](./docs/PRD.md), [`docs/ROADMAP_V2.md`](./docs/ROADMAP_V2.md), [`docs/ROADMAP_V3.md`](./docs/ROADMAP_V3.md) — the plans

---

Built by [shubanms](https://github.com/shubanms) with Claude.

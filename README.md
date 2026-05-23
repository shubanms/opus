# OPUS

> Build your masterpiece.

A free, offline-first Progressive Web App for gym tracking with RPG progression. Every rep earns XP, every milestone unlocks a title, and your stats grow like a character sheet. No subscriptions, no ads, no cloud — everything lives on your device.

**Live:** https://shubanms.github.io/opus/

## Features

- **Workout logging** — sets, reps, RPE, warmups, rest timer, plate calculator
- **Bodyweight support** — reps-only logging with optional added weight
- **Exercise library** — curated across all muscle groups, difficulty tags, body-map filter, how-to videos
- **Routines & planning** — reusable templates with targets, weekly planner, today's-workout suggestion
- **Progressive overload** — three-lever coaching (reps → sets → weight) + deload signal
- **RPG system** — XP, levels, titles, a five-axis character radar, and level-up celebrations
- **Progress charts** — weekly volume, muscle focus, training heatmap, per-exercise trends
- **Health tracking** — body weight, measurements, sleep, pre-workout energy
- **Shareable cards** — customizable workout & profile cards via the native share sheet
- **Personal records** — auto-detected, with full revert when a workout is deleted
- **Your data, yours** — JSON export/import, full local reset, installable PWA

## Tech stack

Vite · React 18 · Tailwind CSS v3 · Dexie.js (IndexedDB) · Zustand · React Router · Recharts · react-body-highlighter · lucide-react · vite-plugin-pwa · html2canvas

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the build
```

## Deployment

Pushes to `main` build and deploy to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). The app is served under the `/opus/` base path.

## Data & privacy

All data is stored locally in IndexedDB. Nothing is sent to a server. Back up or move your data anytime via Settings → Data → Export / Import, or wipe it via Settings → Danger zone.

---

Built by [shubanms](https://github.com/shubanms) with Claude.

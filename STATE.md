# OPUS — Project State

Last updated: 2026-05-23
Current sprint: 2 (Database & Data Layer)
Current version: v0.2.0

## What's working
- Vite + React 18 + Tailwind v3 scaffolded, PWA installable
- Design tokens, animation keyframes, Google Fonts
- React Router v6 with all routes stubbed + BottomNav
- LoadingScreen + OpusMark (transparent gold logo fixed)
- GitHub Actions deploy → GitHub Pages

**Sprint 2 additions:**
- `src/db/db.js` — Dexie schema v1 (all 11 tables)
- `src/utils/wger.js` — fetches exerciseinfo from Wger API, caches in IndexedDB, falls back to seed data; re-syncs weekly
- `src/utils/seedExercises.js` — 70 fallback exercises covering all 15 muscle groups
- `src/store/workoutStore.js` — full active-workout state (start, logSet, complete, discard)
- `src/store/uiStore.js` — toast + modal state
- `src/store/userStore.js` — user profile init + XP helpers
- `src/hooks/useExercises.js` — fully working (seeds DB, triggers Wger sync, live query)
- `src/hooks/useWorkout.js`, `useProgress.js`, `useRPG.js`, `useNotifications.js`, `useOverload.js` — stubbed

## What's in progress
- Nothing — Sprint 2 deliverables complete

## What's not started
- Sprint 3: BodyPicker, ExerciseCard, ExerciseSearch, ExerciseList, full Exercise Library page
- Sprint 4–10: see OPUS_PRD.md sprint plan

## Known issues / deviations
- Local builds blocked (web session blocks npm registry); CI builds on GitHub Actions
- No committed package-lock.json; workflow uses `npm install`
- PWA icons reuse lifter.png (Sprint 10 polish item)

## File tree (current src/)
```
src/
├── assets/lifter.png
├── components/
│   └── layout/{AppLayout,BottomNav,TopBar,PageWrapper}.jsx
│   └── logo/{OpusMark,LoadingScreen}.jsx
├── db/{db,migrations}.js
├── hooks/{useExercises,useWorkout,useProgress,useRPG,useNotifications,useOverload}.js
├── pages/{Loading,Home,Workout,History,Exercise,Progress,Profile,Settings}Page.jsx
├── store/{workoutStore,uiStore,userStore}.js
├── styles/{tokens,animations}.css
├── utils/{wger,seedExercises}.js
├── index.css
├── main.jsx
└── router.jsx
```

## Next session — start here
Begin **Sprint 3 — Exercise Picker & Library**:
1. `BodyPicker.jsx` — react-body-highlighter front/back toggle, muscle tap → filter
2. `ExerciseCard.jsx` — name, muscle badge, equipment icon
3. `ExerciseSearch.jsx` — debounced search
4. `ExerciseList.jsx` — filtered list
5. Exercise Library page fully functional (search + body picker + filter)
6. Custom exercise creation form
7. Exercise detail view (PR placeholder, volume chart placeholder)
Then update this file and tag v0.3.0.

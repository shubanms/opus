# OPUS — Project State

Last updated: 2026-05-23
Current sprint: 4 (Workout Logging Core)
Current version: v0.4.0

## What's working
- Vite + React 18 + Tailwind v3, PWA installable, transparent gold logo
- Design tokens, animations, Google Fonts, loading screen
- React Router v6, BottomNav, all routes
- Dexie DB schema v1 (11 tables), Zustand stores
- Wger API sync + 70-exercise seed data
- useExercises fully wired (live query, search, filter)
- Full exercise library (Sprint 3)

**Sprint 4 additions:**
- `utils/rpg.js` — XP thresholds, titles, calcSetXP, calcWorkoutXP, getLevelFromTotalXP, getXPProgress
- `utils/plateCalc.js` — calcPlates, nearestLoadable
- `workoutStore.js` updated — toggleWarmup, removeExercise, completeWorkout (persists to DB)
- `hooks/useWorkout.js` updated — useWorkouts, useLastSets, useWorkoutSets
- `PlateCalculator.jsx` — colored plate rings per side, target/loaded weight display
- `SetLogger.jsx` — last-session ghost text, warmup toggle, RPE toggle, plate calculator, add set
- `RestTimer.jsx` — SVG circular countdown, vibrate on complete, skip button
- `ExerciseSection.jsx` — exercise card with muscle badge, SetLogger, remove button
- `ExercisePicker.jsx` — modal wrapper around ExerciseSearch + ExerciseList
- `EndWorkoutModal.jsx` — 2×2 stats grid (duration/sets/volume/XP), save & finish
- `WorkoutCard.jsx` — history card: name, date, duration, sets, volume, XP
- `WorkoutPage.jsx` — full active workout: start screen → session with timer, rest timer, exercises, end modal
- `HistoryPage.jsx` — completed workouts list

## What's in progress
- Nothing — Sprint 4 deliverables complete

## What's not started
- Sprint 5–10: see OPUS_PRD.md sprint plan

## Known issues / deviations
- Local builds blocked (web session network policy); CI builds on GitHub Actions
- No package-lock.json; workflow uses `npm install`
- Exercise virtual scrolling deferred (Wger sync loads 700+; sprint 5 concern)
- Wger exercise names are verbose/scientific; curated seed list covers main compound movements

## File tree (current src/)
```
src/
├── assets/lifter.png
├── components/
│   ├── exercise/{BodyPicker,ExerciseCard,ExerciseSearch,ExerciseList,ExerciseForm}.jsx
│   ├── layout/{AppLayout,BottomNav,TopBar,PageWrapper}.jsx
│   ├── logo/{OpusMark,LoadingScreen}.jsx
│   ├── ui/Modal.jsx
│   └── workout/{PlateCalculator,SetLogger,RestTimer,ExerciseSection,ExercisePicker,EndWorkoutModal,WorkoutCard}.jsx
├── db/{db,migrations}.js
├── hooks/{useExercises,useWorkout,useProgress,useRPG,useNotifications,useOverload}.js
├── pages/{Loading,Home,Workout,History,Exercise,ExerciseDetail,Progress,Profile,Settings}Page.jsx
├── store/{workoutStore,uiStore,userStore}.js
├── styles/{tokens,animations}.css
├── utils/{wger,seedExercises,rpg,plateCalc}.js
├── index.css, main.jsx, router.jsx
```

## Next session — Sprint 5
- RPG profile page: level ring, XP bar, title, streak display
- HomePage: recent workouts, quick-start, streak banner
- PR detection: compare new set against historical bests, award PR_BONUS XP

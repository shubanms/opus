# OPUS — Project State

Last updated: 2026-05-23
Current sprint: 3 (Exercise Picker & Library)
Current version: v0.3.0

## What's working
- Vite + React 18 + Tailwind v3, PWA installable, transparent gold logo
- Design tokens, animations, Google Fonts, loading screen
- React Router v6, BottomNav, all routes
- Dexie DB schema v1 (11 tables), Zustand stores
- Wger API sync + 70-exercise seed data
- useExercises fully wired (live query, search, filter)

**Sprint 3 additions:**
- `BodyPicker.jsx` — muscle pills (horizontal scroll) + expandable anatomy model (react-body-highlighter, front/back toggle)
- `ExerciseCard.jsx` — name, muscle-tinted icon, equipment label, optional arrow
- `ExerciseSearch.jsx` — debounced (300ms) search input with clear button
- `ExerciseList.jsx` — renders cards, skeleton loading state, empty state
- `ExercisePage.jsx` — fully functional: search, muscle filter, body picker, exercise list
- `ExerciseDetailPage.jsx` — name/muscle/equipment, PR display, volume placeholder
- `ExerciseForm.jsx` — custom exercise creation (name, muscle, equipment)
- `Modal.jsx` — reusable bottom-sheet modal
- `/exercises/:id` route added

## What's in progress
- Nothing — Sprint 3 deliverables complete

## What's not started
- Sprint 4: Active workout logging (SetLogger, RestTimer, PlateCalculator, end-workout flow)
- Sprint 5–10: see OPUS_PRD.md sprint plan

## Known issues / deviations
- Local builds blocked (web session network policy); CI builds on GitHub Actions
- No package-lock.json; workflow uses `npm install`
- Exercise virtual scrolling deferred (70 seed items renders fine; needed when Wger loads 700+)

## File tree (current src/)
```
src/
├── assets/lifter.png
├── components/
│   ├── exercise/{BodyPicker,ExerciseCard,ExerciseSearch,ExerciseList,ExerciseForm}.jsx
│   ├── layout/{AppLayout,BottomNav,TopBar,PageWrapper}.jsx
│   ├── logo/{OpusMark,LoadingScreen}.jsx
│   └── ui/Modal.jsx
├── db/{db,migrations}.js
├── hooks/{useExercises,useWorkout,useProgress,useRPG,useNotifications,useOverload}.js
├── pages/{Loading,Home,Workout,History,Exercise,ExerciseDetail,Progress,Profile,Settings}Page.jsx
├── store/{workoutStore,uiStore,userStore}.js
├── styles/{tokens,animations}.css
├── utils/{wger,seedExercises}.js
├── index.css, main.jsx, router.jsx
```

## Next session — start here
Begin **Sprint 4 — Workout Logging Core**:
1. Start workout flow (from blank or template)
2. Active WorkoutPage: exercise list, set rows, add exercise (opens BodyPicker in selection mode)
3. `SetLogger.jsx` — weight/reps/RPE input, previous session ghost text, warmup toggle
4. `RestTimer.jsx` — circular countdown, auto-start after set log, vibration on complete
5. `PlateCalculator.jsx` — tap weight → shows plate breakdown
6. End workout modal: summary (duration, sets, volume), XP animation, save to DB
7. Wire `workoutStore` fully to DB saves
8. HistoryPage: list of completed workouts
Then update this file and tag v0.4.0.

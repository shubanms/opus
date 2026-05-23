# OPUS — Project State

Last updated: 2026-05-23
Current sprint: 6 (Templates & Routines)
Current version: v0.6.0

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

**Sprint 5 additions:**
- DB version 2: adds `difficulty` index, clears exercises on upgrade for clean re-seed
- `seedExercises.js` rebuilt: all exercises have `difficulty` (beginner/intermediate/advanced); Wger auto-sync disabled
- `ExerciseCard.jsx`: difficulty badge (color-coded: sage/gold/ember)
- `ExerciseDetailPage.jsx`: live Wger demo image fetched by exercise name; difficulty badge
- `HomePage.jsx`: level/XP strip, streak badge, quick-start CTA, last 3 workouts
- `ProfilePage.jsx`: SVG level ring, XP progress bar, title chip, stats grid (workouts / streak / XP)
- `workoutStore.js`: PR detection on complete (weight/reps/volume per exercise), streak tracking, XP award all happen inside `completeWorkout`
- Bug fix: `muscleGroup` (singular) used correctly in WorkoutPage

**Sprint 6 additions:**
- DB v3: indexes `workouts.createdAt` (fixed SchemaError)
- `useTemplates.js` — `useTemplatesWithExercises()` joins templates + exercise details
- `utils/templateActions.js` — createTemplate / updateTemplate / deleteTemplate
- `TemplateCard.jsx` — routine card: name, day badge, exercise count, muscle tags, start/edit/delete
- `TemplateBuilder.jsx` — modal: name, day picker, multi-add exercises, save
- `TemplatesPage.jsx` (/templates) — list + create + edit + delete routines
- `ExercisePicker.jsx` — added `multi` mode (stays open, "Done" button) for routine building
- `workoutStore.startFromTemplate(template)` — pre-loads exercises into active workout
- WorkoutPage start screen: Quick start + routine list (one-tap start) + Manage link

## What's in progress
- Nothing — Sprint 6 deliverables complete

## What's not started
- Sprint 7–10: see OPUS_PRD.md sprint plan (Progress charts ~Sprint 8)

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

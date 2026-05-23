# OPUS — Project State

Last updated: 2026-05-23
Current sprint: 11 (Personal Profile, Body Metrics & Central Units) — Roadmap v2
Current version: v1.1.0 (post-MVP)

## Roadmap v2
See OPUS_ROADMAP.md for Sprints 11–20.

**Sprint 11 done:**
- Central units: `store/settingsStore.js` (unit kg/lbs) + `utils/units.js` (toDisplay/toKg/unitLabel/fmtWeight/fmtVolume); threaded through SetLogger, PlateCalculator (lb plates), WorkoutCard, EndWorkoutModal, ExerciseDetail PRs+chart, Progress charts/body, share cards, overload nudge text, template targets.
- Profile identity: name/height/sex/birthYear on userProfile (unindexed, no migration); bodyweight = latest bodyStats (`useCurrentBodyweight`); shown on Profile, editable in Settings.
- Onboarding revamp: name, bodyweight, height, age, sex, units, barbell weight (clarified separate from bodyweight).
- Bodyweight counts toward volume: `utils/volume.js` (computeVolume) + `workouts.bodyweightKg` snapshot; applied in completeWorkout, recomputeWorkoutTotals, useExerciseVolume.
- Name on share cards (ShareableCard athlete, ProfileCard name).

## ⚠️ PRD alignment note
Earlier work got ahead of the PRD sprint order. Actual mapping:
- PRD Sprint 5 (Progressive Overload) — **done**
- PRD Sprint 6 (RPG System) — **done** (radar CharacterCard, level-up celebration, XP animation, XPBar/LevelBadge/TitleBadge)
- PRD Sprint 7 (Templates & Planning) — **done** (targets, weekly planner, today's recommendation, rest-day, repeat-workout, duplication)
Bonus (user-requested, not in PRD): exercise difficulty tags, Wger demo images, disabled Wger auto-sync in favor of curated seed.

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

**PRD Sprint 5 — Progressive Overload Engine (this commit):**
- `utils/overload.js` — getOverloadSuggestion (three-lever logic), isDeloadDue (5+ day detector)
- `hooks/useOverload.js` — useOverload(exerciseId) from last 3 sessions; useDeloadDue()
- `hooks/useProgress.js` — useExerciseVolume(id) per-session volume aggregation
- `components/workout/OverloadNudge.jsx` — gold coaching nudge above each exercise in active workout
- `components/progress/VolumeChart.jsx` — Recharts bar chart, last 10 sessions
- `components/progress/PRBadge.jsx` — gold-pulse PR badge
- ExerciseDetailPage: real volume chart + PR badges (replaced placeholders)

**PRD Sprint 6 — RPG System (completed):**
- `utils/rpg.js` — getCharacterStats (5-axis radar normalization)
- `userStore.addXP` — recomputes level + title on every gain
- `workoutStore.completeWorkout` — streak bonus XP, returns level-up info
- `hooks/useRPG.js` — useCharacterStats (live radar data from history)
- `components/rpg/` — XPBar (animated), LevelBadge, TitleBadge, CharacterCard (Recharts radar), LevelUpScreen (full-screen celebration)
- EndWorkoutModal — animated XP bar showing the gain
- ProfilePage — CharacterCard radar; HomePage — LevelBadge + XPBar

**PRD Sprint 7 — Templates & Planning (completed):**
- DB v4: templateExercises gains targetSets/targetReps/targetWeight
- templateActions: targets in create/update, duplicateTemplate, assignTemplateToDay, clearDay
- TemplateBuilder: per-exercise target inputs (sets × reps @ kg)
- useTemplates: targets joined in; `useToday()` recommendation (template / rest / fresh)
- WeeklyPlanner: 7-day grid to assign routines to weekdays
- HomePage: today's-workout card (assigned routine, rest-day, or fresh start)
- workoutStore.repeatWorkout + WorkoutCard expandable detail with "Repeat this workout"
- ExerciseSection shows template target hint during active workout

**PRD Sprint 8 — Body Stats, Health & Progress Charts (completed):**
- `utils/healthActions.js` — logBodyStat (upsert by date), logSleep
- `hooks/useProgress.js` — useWeeklyVolume, useMuscleFrequency, useWorkoutDays, useExerciseMaxWeight, useSleepLogs
- `components/progress/` — TrendChart (line), MuscleFrequency (bars), Heatmap (12-week grid), BodyStatsForm, SleepForm
- ProgressPage: 3 tabs — Overview (weekly volume / muscle focus / training calendar), By Exercise (max weight + volume), Body (weight trend / measurements / sleep)
- Energy check-in (1-5) at workout start → saved to energyLogs on complete
- UX bonus: modal height cap + scrollable body; delete workouts from cards

**PRD Sprint 9 — Notifications & Shareable Card (completed):**
- `utils/share.js` — html2canvas capture → Web Share API (files) with download fallback
- `components/share/ShareableCard.jsx` — 1080×1080 card (name, muscles, volume/sets/duration, PR, level, XP)
- `components/share/ShareButton.jsx` — button + off-screen capture card; share from end-of-workout modal AND expanded history/recent cards
- `hooks/useWorkout.js` — useShareData(workoutId)
- `utils/notifications.js` + `hooks/useNotifications.js` — permission flow, per-type toggles, quiet hours (DND), PR celebration fires on finish; one-time prompt after first workout
- Settings: Notifications section (master + types + quiet hours)

**Critical fix — modals/overlays portaled:**
- `.anim-fade-slide-up` uses `both` fill, leaving `transform: translateY(0)` on page
  wrappers permanently → that made the wrapper the containing block for any
  `position: fixed` child, so modals rendered trapped at the top of the page
  (seen on Progress → By Exercise picker). Fixed by rendering Modal + LevelUpScreen
  via `createPortal(..., document.body)`. RULE: any full-screen fixed overlay MUST
  portal to body.

**Sprint 9 extension:**
- Bodyweight exercises: SetLogger detects `equipment === 'bodyweight'` → reps-only
  (no forced weight), optional "+ Add weight" for weighted variations; bodyweight
  sets earn XP from reps (calcSetXP) and record rep PRs
- Profile sharing: ProfileCard (level, title, character-stat bars, totals)
- Customize-before-share: ShareSheet modal with live preview + theme (Slate/Black/
  Light) + accent (gold/ember/sage) pickers; cards accept a `theme` prop
- ShareButton now opens the customizer; works for workout + profile cards

**PRD Sprint 10 — Polish, PWA & Launch (completed):**
- ErrorBoundary wrapping the app (friendly crash screen instead of white screen)
- First-run Onboarding (name + barbell weight); Home greets by name
- Settings completed: Profile (name, bar weight), Data (JSON export/import), plus
  existing Notifications + Danger zone
- `settingsStore` (bar weight + onboarded flag); PlateCalculator uses it
- README.md written
- DEFERRED: kg/lbs unit conversion — needs threading through every weight display
  to stay consistent (the user dislikes partial/inconsistent UI), so left as a
  dedicated follow-up rather than half-done. Bar weight + all data are in kg.

## What's in progress
- Nothing — PRD Sprints 1–10 complete. MVP shipped (v1.0.0).

## What's not started
- PRD Sprint 10 (Polish, PWA, onboarding, data export/import, launch)

## Note on scheduled notifications
A static GitHub Pages PWA can't deliver true background notifications (no push
server). PR celebrations fire while the app is open; gym-nudge/streak/weekly are
preference-ready and would need push infra (or periodic background sync) to deliver.

## UX standard (keep for all future work)
- Bottom-sheet modals cap at 90vh with fixed header + scrollable body (never push off-screen top)
- All pages render inside AppLayout main with pb-24 for BottomNav clearance
- Destructive actions (delete) require confirm; full data wipe requires typing "DELETE"
- Design for an Android phone screen first: compact filters, generous tap targets,
  give content (lists) vertical priority over chrome. Settings reachable via gear on Profile.
- Full reset: Settings → Danger zone → type DELETE → wipeAllData() clears all tables +
  localStorage, then reloads to BASE_URL for a clean start.

## Data-integrity principle (keep for all future work)
Anything addable must be removable/editable/deletable, and deletes must revert
ALL derived data. Reference: `deleteWorkout` reverses sets, energy logs, PRs
(recomputed), and XP/level/title/streak (recomputed from remaining workouts).
- Workout XP is stored as the full gained amount per workout (`xpEarned`), so the
  profile can be rebuilt by summing remaining workouts.
- `recomputeProfile()` / `recomputePRs()` in utils/workoutActions.js are the
  canonical rebuilders — reuse them after any deletion that affects history.
- Custom exercises: deletable (cascades sets/PRs/template refs + refreshes
  workout totals). Body-stat & sleep entries: deletable. Built-in seed
  exercises are intentionally not deletable.

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

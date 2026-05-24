# OPUS — Roadmap v2 (Sprints 11–20)

## Context
OPUS shipped its MVP at **v1.0.0** (PRD Sprints 1–10): logging, templates, progressive
overload, RPG (XP/levels/titles/radar), progress charts, health tracking, notifications,
shareable cards, PWA. This roadmap covers the **next 10 sprints (11–20)**, focused on:

1. **A real personal profile** (identity + body metrics, central units) and **deeper RPG progression**
2. **Animation / motion / "wow" moments** (liveliness, friendliness, come-back factor)
3. **Notes & color-coding / marking as a CORE feature**

**Decided with the user:**
- Onboarding/profile captures **name, bodyweight, height, sex, age/birth year, units** (all local, never uploaded).
- **Bodyweight counts toward volume** for bodyweight exercises (e.g. a dip = bodyweight × reps).
- **Units (kg/lbs) is a single central config** used everywhere.
- Share cards include the user's **name**.
- Clarified: onboarding "barbell weight" = the empty bar for plate math (default 20kg), **not** bodyweight — these become two distinct fields.

**Constraints (hard):** 100% **local-first PWA** — no backend/accounts/sync. Exclude leaderboards,
friend graphs, multiplayer. Social stays offline (shareable/challenge cards only).

## Carry-over conventions (unchanged from v1)
- **One PR per sprint**, squash-merged to `main`; author `shubanms`, co-author Claude; no secrets.
- All weights/volume stored in **kg internally**; convert only at display via the central units helper.
- **Modals/overlays MUST `createPortal` to `document.body`**.
- **Deletes must revert derived data** — reuse `recomputeProfile()` / `recomputePRs()` in `utils/workoutActions.js`.
- **Android-first UX**: compact chrome, big tap targets, content over chrome, modals capped at 90vh.
- **Anything addable is editable/deletable.**
- DB migrations: new `db.version(n)` block in `src/db/db.js`; never edit a shipped version; index only fields you query.
- Best hook point for RPG/achievement/quest detection: `workoutStore.completeWorkout()` → returns `{ workoutId, prCount, xpEarned, leveledUp, newLevel, newTitle }`.

---

## Sprint 11 — Personal Profile, Body Metrics & Central Units (foundational)
**Goal:** A real "character sheet" identity + a single units source of truth (everything downstream depends on it).

**Deliverables:**
- **Central units** (`settingsStore.unit` = 'kg'|'lbs') + `utils/units.js` (`toDisplay`/`toKg`/`unitLabel`). Route weight/barbell/bodyweight displays through it. Storage stays kg. (Full display threading across charts/cards completes here so it's consistent from the start.)
- **Profile identity:** name, height, sex, birth year (age derived) on `userProfile`; **bodyweight** lives in `bodyStats` (latest entry = current) so it stays in sync when metrics are logged. Onboarding writes the first `bodyStats` weight + identity fields.
- **Onboarding revamp** (`Onboarding.jsx`): name, bodyweight, height, sex, age, units, and barbell weight (clearly relabeled "Empty barbell weight — for plate math").
- **Profile page** shows identity + current bodyweight + age; editable in Settings (extend Profile section).
- **Bodyweight counts toward volume:** snapshot `bodyweightKg` on each `workouts` record at `completeWorkout`; volume math (in `completeWorkout`, `recompute*`, `useProgress`/`useExerciseVolume`) adds `bodyweight × reps` for `equipment === 'bodyweight'` sets. Keep set.weight = added weight only.
- **Name on share cards** (`ShareableCard`, `ProfileCard`).
- **DB v5:** `userProfile` gains height/sex/birthYear (unindexed); `workouts` gains `bodyweightKg` (unindexed).

**Key files:** `store/settingsStore.js`, new `utils/units.js`, `components/onboarding/Onboarding.jsx`, `pages/SettingsPage.jsx`, `pages/ProfilePage.jsx`, `store/workoutStore.js`, `utils/workoutActions.js`, `hooks/useProgress.js`, `components/share/{ShareableCard,ProfileCard}.jsx`, plus all weight-display components, `db/db.js` (v5), `PlateCalculator.jsx` (+lb plate set).

---

## Sprint 12 — Notes & Color-Coding & Marking (CORE)
**Goal:** First-class notes + visual organization everywhere.

**Deliverables:**
- **Notes at every level:** workout notes (reuse `workouts.notes`), per-set note (`sets.note`), and **sticky per-exercise coaching notes** (new `exerciseNotes` table) shown in `SetLogger`/`ExerciseSection` and `ExerciseDetailPage`.
- **Color labels + marking:** `color` + `favorite` on exercises; `color` on templates & workouts; color dots on `ExerciseCard`/`TemplateCard`/`WorkoutCard`; **favorite/star** + **filter by favorite/color** in `ExercisePage`.
- New `components/ui/ColorPicker.jsx` (8 brand tokens), `utils/noteActions.js`.
- **DB v6:** `exercises` add `favorite,color`; `sets` add `note`; new `exerciseNotes` (`++id, exerciseId, text, updatedAt`).

**Key files:** `db/db.js` (v6), `utils/exerciseActions.js`, new `utils/noteActions.js`, new `components/ui/ColorPicker.jsx`, `SetLogger.jsx`, `ExerciseSection.jsx`, `WorkoutCard.jsx`, `EndWorkoutModal.jsx`, `ExerciseCard.jsx`, `TemplateCard.jsx`, `ExercisePage.jsx`, `ExerciseDetailPage.jsx`.

---

## Sprint 13 — Celebration & Motion Engine (wow foundation)
**Goal:** Reusable animation toolkit + upgrade core moments. Dependency for 14/16/18.

**Deliverables:**
- `components/fx/Particles.jsx` (gold burst), `components/fx/CountUp.jsx` (odometer, reuse `tickUp`), `hooks/useHaptics.js` (vibrate patterns).
- **"+XP flies to the bar"** on set log; XP bar fills with shimmer.
- Upgrade `LevelUpScreen` + PR moments with particles/haptics/optional sound (Settings effects+sound toggle).
- **Rest-timer drama:** `RestTimer` ring pulses + gold→ember near zero + completion cue.
- New keyframes in `animations.css` as needed.

**Key files:** new `components/fx/*`, `hooks/useHaptics.js`, `styles/animations.css`, `LevelUpScreen.jsx`, `SetLogger.jsx`/`WorkoutPage.jsx`, `XPBar.jsx`, `EndWorkoutModal.jsx`, `RestTimer.jsx`, `settingsStore.js`.

---

## Sprint 14 — Achievements & Trophy Case
**Goal:** Unlockable milestones — top retention lever.

**Deliverables:**
- Data-driven defs (`utils/achievements.js`): volume lifted, workout count, streaks, per-lift PRs, muscle variety, etc.
- Detection after `completeWorkout`; unlock awards XP + notification + Particles.
- **DB v7:** `achievements` (`++id, key, unlockedAt`).
- **Trophy case** grid on `ProfilePage` with locked/unlocked medallions + progress hints + unlock animation.

**Key files:** new `utils/achievements.js`, `hooks/useAchievements.js`, `components/rpg/{TrophyCase,AchievementBadge}.jsx`, `store/workoutStore.js`, `ProfilePage.jsx`, `db/db.js` (v7).

---

## Sprint 15 — Quests & Weekly Goals
**Goal:** Always a fresh short-term objective.

**Deliverables:**
- Deterministic weekly quests (`utils/quests.js`, seeded by ISO week — no backend): "3 sessions", "set a PR", "train legs 2×", "5,000kg volume".
- Progress from existing data; XP bounty + celebration on completion; claimed-state in localStorage by week.
- **Quest board** card on `HomePage`.

**Key files:** new `utils/quests.js`, `hooks/useQuests.js`, `components/rpg/QuestBoard.jsx`, `HomePage.jsx`.

---

## Sprint 16 — Prestige & Evolving Character Mark
**Goal:** Progression beyond Level 10; the character visibly grows.

**Deliverables:**
- Prestige/ascension tiers past L10 in `utils/rpg.js` (titles cycle with a tier marker); extend `XP_THRESHOLDS` formula.
- **Evolving `OpusMark`**: ring embellishments / halo / deeper gold by level & prestige (prop-driven; reuse Sprint 13 motion).
- Prestige shown on `ProfilePage`, `CharacterCard`, `LevelBadge`, share cards.

**Key files:** `utils/rpg.js`, `components/logo/OpusMark.jsx`, `components/rpg/{CharacterCard,LevelBadge,TitleBadge}.jsx`, `ProfilePage.jsx`, `components/share/{ShareableCard,ProfileCard}.jsx`.

---

## Sprint 17 — Recovery Body-Map & Muscle Insights
**Goal:** Signature visual that's also useful.

**Deliverables:**
- `react-body-highlighter` (as in `BodyPicker`) on Home/Profile showing **muscle freshness/fatigue**: recently trained muscles glow, fading over ~3–4 days by sets logged.
- Tap a muscle → last-trained + recent volume; **neglected-muscle nudge**.

**Key files:** new `components/progress/RecoveryMap.jsx`, `hooks/useRecovery.js`, `HomePage.jsx`/`ProgressPage.jsx`.

---

## Sprint 18 — Dark Mode & Theming + Transitions
**Goal:** Comfort + polish; full theme pass.

**Deliverables:**
- **Dark (obsidian) theme** via `tokens.css` CSS variables + `settingsStore.theme` (light/dark/system); Settings toggle; audit every screen for both themes.
- Motion polish: page/tab transitions, breathing Home logo, subtle card parallax (reuse Sprint 13).

**Key files:** `styles/tokens.css`, `settingsStore.js`, `SettingsPage.jsx`, `router.jsx`/`AppLayout.jsx`, broad theme audit.

---

## Sprint 19 — Estimated 1RM, Hall of Records & Supersets
**Goal:** Satisfying stats + power-user flow.

**Deliverables:**
- **Estimated 1RM** (Epley) per exercise on `ExerciseDetailPage` + trend (reuse `TrendChart`).
- **Hall of Records:** chronological PR timeline (reuse `prs` + `PRBadge`) on Profile/exercise detail.
- **Supersets/circuits:** group exercises in an active workout (grouping field on active-workout exercises; visual bracket; shared rest).

**Key files:** new `utils/oneRepMax.js`, `components/progress/PRTimeline.jsx`, `ExerciseDetailPage.jsx`, `ProfilePage.jsx`, `store/workoutStore.js`, `WorkoutPage.jsx`, `ExerciseSection.jsx`.

---

## Sprint 20 — Weekly Recap, Social Cards, Radar History, Coach Marks & Final Polish
**Goal:** Reflective + offline-social hooks + finish.

**Deliverables:**
- **Weekly recap** auto-card (sessions/volume/XP/PRs/top lift), shareable, surfaced on Home weekly (reuse `ShareSheet`).
- **Challenge card** ("beat my numbers") + **profile collectible/QR** card variants.
- **Radar history**: overlay last-month vs now on `CharacterCard` (persist monthly snapshots locally).
- **Coach marks / first-use tips** per tab (localStorage seen-state).
- Final polish: empty/loading states, a11y labels, perf pass, `STATE.md` + roadmap status update → tag intent v2.0.0.

**Key files:** new `components/share/{RecapCard,ChallengeCard}.jsx`, `hooks/{useWeeklyRecap,useRadarHistory}.js`, `components/rpg/CharacterCard.jsx`, new `components/ui/CoachMark.jsx`, broad polish.

---

## Cross-cutting notes
- **Exercise demos**: settled (hybrid YouTube + opportunistic Wger image) — not revisited unless requested.
- **Bodyweight-volume** depends on the Sprint 11 `workouts.bodyweightKg` snapshot; every volume computation (live, recompute-on-delete, charts, recap) must apply it uniformly.
- New DB fields default **unindexed** unless filtered/sorted.

## Verification (per sprint)
- Container can't run the built app or reach external hosts; verify via: code review, import/reference scan (missing React-hook imports + dangling refs), and confirming the Pages deploy builds after merge.
- After each merge, give the user a concrete **on-device checklist** (live URL + exact taps), since haptics, share sheet, notifications, IndexedDB, and html2canvas are browser-only.
- Update `STATE.md` at the end of every sprint.

# OPUS — Committed build queue (next 7)

> Selected with the user from the 15-idea ideation pass (competitive scan + building-block
> audit). These 7 are greenlit to **build**; each ships as its own one-PR-per-feature,
> squash-merged to `main` behind the CI `test` job (per `docs/GUIDELINES.md`). The broader
> RPG-expansion ideas are parked for a design/prototype pass first (see bottom).

Ground rules (unchanged): pure logic → `src/utils/*.js` + co-located `*.test.js`; DB migrations
= append-only `db.version(n)` (**current is v8**); anything addable is editable + deletable with
derived data reverted; **wow in every feature** (`playChime`/`useHaptics`/`<Particles/>`/
`<CountUp/>`, all pre-gated by `effects`/`sound`/`prefers-reduced-motion`); mirror to the native
port (`apps/mobile` + `packages/core`) where it applies.

Suggested build order (self-contained, ascending effort): **#2 → #14 → #15 → #7 → #13 → #8 → #11**.

---

## 1. "vs last time" set diff  — #2 · Low
**What:** each logged set shows ↑/↓/= vs the matching set from the previous session (weight, reps).
- **Reuse:** `useLastSets(exerciseId)` is *already* imported in `SetLogger.jsx` (line 6/21) and drives
  the last-session ghost — the data is in hand.
- **Pure:** `utils/setDiff.js` — `matchLastSets(current, last)` (align by `setNumber`) +
  `diffSet(cur, prev)` → `{weightDelta, repsDelta, volumeDelta, dir}`. Co-located test.
- **Wire:** `SetLogger` renders a small delta chip per logged set (green up / muted down / neutral);
  on an improvement, fire a subtle `useHaptics()('success')` + optional `<CountUp/>`.
- **Data:** none. **Delete-revert:** n/a (display-only).
- **Native:** mirror in `apps/mobile` `SetLogger` using its last-session data.
- **Verify:** unit tests for alignment + deltas; on-device chips read correctly.

## 2. Crit sets + combo meter — #14 · Low
**What:** a working set can randomly "crit" (burst + bonus XP); the day's first working set is
crit-buffed; chaining sets without an overlong rest builds a combo multiplier.
- **Reuse:** `makeRng` (mulberry32) from `routineGenerator.js`; `calcSetXP` in `rpg.js`; Particles/
  CountUp/sound/haptics.
- **Pure:** `utils/crit.js` — `rollCrit({workoutId, setNumber, dailyFirst, seed})` → `{isCrit, mult}`
  (deterministic per `(workoutId,setNumber)` so it can't be re-rolled/exploited) + `combo(setTimes,
  restCapSec)` → current multiplier. Co-located test.
- **Wire:** fold crit+combo multipliers into per-set XP at `completeWorkout` so the total lands in the
  stored `xpEarned`; SetLogger shows a crit Particles burst + "CRIT! +N XP" float and a growing combo
  chip that resets on a long rest.
- **Delete-revert:** automatic — bonus is baked into `workouts.xpEarned`, which `recomputeProfile`
  already sums; deterministic seed reproduces the same value.
- **Native:** mirror in native `SetLogger` + `commitWorkout`.
- **Verify:** unit tests (deterministic crit, combo windows); on-device see crits + combo grow.

## 3. Calendar month view — #15 · Low–Med
**What:** a tappable month grid (richer than the 12-week heatmap); tap a day → that day's sessions.
- **Reuse:** `dateKey` (`todayKey/parseKey/daysBetween`), `useWorkoutDays`, the `Heatmap` color scale,
  `WorkoutCard` for the day detail.
- **Pure:** `utils/calendar.js` — `monthGrid(year, month, workoutDays, firstDayOfWeek)` → weeks×days
  `{dateKey, inMonth, count, isToday}`. Co-located test (month boundaries, leap year, week alignment).
- **Wire:** new `/calendar` route (or a tab on History); ◀▸ month stepper; cells colored by training
  intensity; tap a day → sessions list. Cell pop-in stagger + tap haptic.
- **Data:** none.
- **Native:** native calendar screen as a follow-up (note).
- **Verify:** unit tests for the grid; on-device month navigation + day detail.

## 4. Auto progressive-overload — #7 · Med
**What:** following a routine, hitting all targets auto-bumps next session's target (e.g. +2.5 kg);
missing twice auto-suggests a deload.
- **Reuse:** `overload.js` `getOverloadSuggestion` (the 3-lever logic) + `isDeloadDue`; `templateActions`
  already rewrites `templateExercises` targets in place; `templates` store **unindexed** fields freely
  (the `autoKey` precedent) → **no migration**.
- **Pure:** `utils/progression.js` — `nextTargets(exerciseHistory, scheme)` and
  `decideProgression(sessionResult, scheme)` → `bump | hold | deload`. Co-located test for each
  transition. Scheme shape: `{ mode:'linear'|'double'|'off', weightStep, targetReps, targetSets,
  deloadAfterMisses }` stored on the template.
- **Wire:** on workout finish (session came from a template), compute per-exercise next targets and
  `templateActions.advanceProgression(templateId, workout)` updates `targetWeight/Reps`; a toast
  "Squat → 62.5 kg next time ↑" + chime. Progression picker (Off / Linear / Double) in `TemplateBuilder`.
- **Delete-revert:** targets are forward-only *suggestions* and remain user-editable; we do **not**
  rewrite history — document that deleting a past workout doesn't un-bump a target (the user can edit it).
- **Native:** mirror in native `TemplateEditor` + `commitWorkout`.
- **Verify:** unit tests for bump/hold/deload; on-device follow a routine 2 sessions → target advances.

## 5. Streak shield / rest token — #13 · Med
**What:** earn tokens from streak milestones / quest claims; spend one to protect the streak on a
missed day (softens `decay.js`'s streak-break penalty).
- **Reuse:** `decay.js` `decayInfo`/`streakBreakPenalty`; settingsStore localStorage pattern; Particles/
  haptics.
- **Pure:** `utils/streakShield.js` — `tokensEarned(stats)` (rule: +1 per 7-day streak milestone, +1 per
  quest claim — final rule TBD in build), `canShield(decayInfo)`, `applyShield(decayInfo, protectedDates,
  lastWorkoutDate)` → neutralizes the streak-break penalty (and optionally freezes one rest day of
  inactivity decay) for a protected lapse. Co-located test.
- **State:** `settingsStore` gains `streakTokens` + `protectedDates[]` (+ setters, persisted).
- **Wire:** Home decay indicator gains a "Streak slipping — use a shield?" action + token count;
  earned-token toast + Particles; count shown in Settings.
- **Delete-revert:** tokens are derived from streak/quest milestones — recompute `tokensEarned(stats)`
  minus spent on the relevant events; deleting workouts that undo a milestone reconciles the count.
- **Native:** mirror in native settings + Home.
- **Verify:** unit tests for earn/shield math; on-device miss a day with a token → streak preserved.

## 6. Classic program library — #8 · Med
**What:** bundle canonical offline programs (5×5 / 5·3·1 / GZCLP / PPL / Upper·Lower) as installable
routines with built-in progression (ties to #7).
- **Reuse:** `weekPlanner`/`routineGenerator` install path; `createTemplate`/`createWeek`; the
  name→catalog-id remap pattern (used in `wrapped`/native `getWrappedInputs`); Modal.
- **Pure data:** `utils/programs.js` — `PROGRAMS = [{ id, name, desc, daysPerWeek, level, schedule:
  [{ day, name, exercises:[{ name, sets, reps, scheme }] }], progression }]`. Co-located test asserting
  every program's exercise names resolve to the seed catalog + schedule integrity.
- **Wire:** `installProgram(programId)` (extend `templateActions`) creates the week of templates with the
  progression scheme attached; a "Programs" section on `TemplatesPage` → preview modal (schedule/level/
  progression) → "Add to my routines". Install → Particles + chime + toast.
- **Delete-revert:** installs are normal templates (already deletable).
- **Native:** same `PROGRAMS` data in `@opus/core`; native installs via `createWeek`.
- **Verify:** unit tests (name resolution + integrity); on-device install → routines appear + progress.

## 7. Progress photos (private, local) — #11 · Med
**What:** private local progress photos with a side-by-side compare slider. "Photos never leave your
device" — the privacy selling point of an offline app.
- **Data — DB v9:** `photos: '++id, date, category'` storing `{ id, date, category:'front'|'side'|'back',
  blob, note, weightKg? }` (Dexie stores Blobs natively).
- **Actions:** `utils/photoActions.js` — `addPhoto`/`deletePhoto`/`getPhotos`; client-side downscale via
  canvas (cap ~1080 px, JPEG q0.8) in `utils/imageResize.js` (canvas isn't node-testable — extract any
  pure math and test that).
- **Wire:** a "Photos" section under Progress → Body: capture/upload (`<input type=file accept=image
  capture>`), date-grouped grid, tap → full view, **compare slider** between two dates. Delete confirm
  (reuse `uiStore.confirm`). Privacy copy shown.
- **Export/import:** blobs are heavy — **exclude photos from the default JSON backup** (document the
  tradeoff; optional base64 opt-in later).
- **Delete-revert:** photos are standalone (no derived data) — plain delete.
- **Native:** `expo-image-picker` + `FileSystem` — separate follow-up PR (note).
- **Verify:** on-device add/compare/delete; unit test the resize math if extracted.

---

## Parked for a design/prototype pass (RPG expansion)
The user wants **mockups/prototype images** and these grouped into small self-complete chunks (2+
ideas) before committing. Candidates (full detail lives in chat + `docs/ROADMAP_V4.md`): character
classes + skill tree, attribute stat sheet, currency + cosmetics shop, loot chests, gear loadout,
companion evolution, daily dungeon, boss raids (HP bar), session affixes, seasonal battle pass,
HP/vitality stakes (gentle vs hardcore), rank-up promotion trials, story/lore campaign. Next step:
propose 2–3 self-contained bundles + visual prototypes for the user to pick from.

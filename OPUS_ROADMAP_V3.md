# OPUS — Roadmap v3

Living plan for the post-v2.0.0 feature wave. Like `OPUS_ROADMAP.md`, this is
committed so it survives session refreshes; `STATE.md` tracks live status.

## Context
OPUS shipped **v2.0.0** (Roadmap v2, Sprints 11–20). v3 makes the app more
**seamless, intuitive, flexible**, and adds **wow factor**. Chosen with the user.

## Hard constraints (unchanged)
- 100% **local-first** PWA — no backend/accounts/sync; no leaderboards/multiplayer.
- Weights stored in **kg**; convert at display via `src/utils/units.js`.
- Modals via `createPortal` to `document.body` (reuse `components/ui/Modal.jsx`, cap 90vh).
- Deletes revert derived data (`recomputeProfile`/`recomputePRs` in `utils/workoutActions.js`).
- Android-first compact UX. Anything addable is editable/deletable.
- DB migrations = new append-only `db.version(n)` in `src/db/db.js`.
- One PR per sprint, squash-merged; CI `test` job gates each.
- Pure logic in `src/utils/*.js` with co-located `*.test.js` (vitest node env).

## Standing principle — wow in every sprint
Every sprint weaves in **subtle animation, moving parts, and sound** where it
fits — never gratuitous, always gated by `settingsStore.effects`/`sound` and
`prefers-reduced-motion`. Reuse `components/fx/Particles.jsx`, `fx/CountUp.jsx`,
`hooks/useHaptics.js`, `utils/sound.js` (`playChime`), `styles/animations.css`.

## Sprints (independent — buildable in any order; S1 first by value)

- **S1 — Resume in-progress workout** ✅ *(done)*: `activeWorkout` mirrored to
  localStorage (write-through subscribe + boot hydrate; clears on complete/discard).
  Pure `utils/workoutSession.js` (`serialize`/`deserialize`/`isStale`, tested).
  "Picked up your workout" affordance + restore chime.
- **S2 — On-open reminders**: fire streakRisk/gymNudge/weeklySummary as in-app
  toasts on app open (offline-safe). Pure `utils/reminders.js`; export quiet-hours
  helper from `notifications.js`; `hooks/useOnOpenReminders.js` mounted in AppLayout.
- **S3 — Reorder exercises**: up/down controls in active workout + routine builder.
  Pure `utils/reorder.js`; `workoutStore.moveExercise`; `templateExercises.orderIndex`
  already persists order.
- **S4 — Equipment / plate inventory**: owned plates/dumbbells, home-vs-gym profile
  feeding `plateCalc.js` (already takes a plates arg) + `PlateCalculator`. Stored in
  `settingsStore` (kg), back-compat shim for flat `barWeight`. New `EquipmentModal`.
- **S5 — Export CSV / PDF**: pure `utils/csv.js`; `dataActions` CSV exports; PDF via
  `window.print()` + print CSS (no new dep).
- **S6 — Milestone certificates**: pure `utils/milestones.js` (mirrors achievements,
  reuses `computeStats`); `CertificateCard` via generic ShareSheet; live-derived
  (celebrated keys in localStorage) — no migration.
- **S7 — 'Wrapped' (Spotify-style)**: browsable period recap — current month "so far",
  any previous month, and year-end. Pure `utils/wrapped.js` (`buildWrapped` +
  `monthRange`/`yearRange`/`availablePeriods`, replaces the `useVolumeByWeek` stub);
  `hooks/useWrapped.js`; period selector + shareable `WrappedCard`.
- **S8 — Living home scene + animated stat reveals**: pure `utils/ambient.js`
  (`sceneParams({streak,level,prestige})`, tested); Home aura/motion gated by
  effects + reduced-motion; wire `CountUp` into profile/recap/progress + radar.

## Verification (per sprint)
Container can't run the app/network — verify via code review, import scans,
`node --check`, and the CI `test` job (each pure util has a co-located test).
Give the user an on-device checklist after each merge. Update `STATE.md` each
sprint; bump toward **v3.0.0** at close.

# OPUS — Roadmap v4 (RPG-forward)

Living plan for the next wave. Committed so it survives session refreshes;
`STATE.md` tracks live status. This wave leans hard into the **RPG factor**
(user's steer), with normal-feature candidates kept alongside.

## Hard constraints (unchanged)
- 100% **local-first** PWA — no backend/accounts/sync; no leaderboards/multiplayer.
- Weights stored in **kg**; convert at display via `src/utils/units.js`.
- Modals via `createPortal` to `document.body` (reuse `components/ui/Modal.jsx`, cap 90vh).
- Deletes revert derived data (`recomputeProfile`/`recomputePRs` in `utils/workoutActions.js`).
- Android-first compact UX. Anything addable is editable/deletable.
- DB migrations = new append-only `db.version(n)` in `src/db/db.js`.
- One PR per feature, squash-merged; CI `test` job gates each.
- Pure logic in `src/utils/*.js` with co-located `*.test.js` (vitest node env).
- **Wow in every feature** — animation + motion + sound, gated by `effects`/`sound`
  and `prefers-reduced-motion` (reuse `fx/Particles`, `fx/CountUp`, `useHaptics`,
  `utils/sound.js`, `styles/animations.css`).

## ★ Pinned — greenlit for design (user loved these)

| # | Feature | Type | Sketch |
|---|---|---|---|
| P1 | **Streak shield / rest token** | RPG | Earn tokens from streaks/quests that protect the streak on a missed day; softens existing decay penalty. Tokens are spendable, visible, editable. |
| P2 | **Daily dungeon** | RPG | A generated themed session ("Leg Day Labyrinth") with modifiers + bonus XP. Extends quests + boss gates. |
| P3 | **Loot drops** | RPG | Milestones randomly unlock cosmetics (card themes, logo skins, title flairs) into the existing inventory. |
| P4 | **QR device transfer** | Normal | Export → QR → scan on another device. Cross-device move with zero backend; reuses `dataActions` export/import. |
| P5 | **Readiness score** | Normal | Daily gauge blending recent volume + sleep + days rest (uses `sleepLogs`, recovery map). |
| P6 | **"vs last time" inline diff** | Normal | Each set shows ↑/↓ vs the previous session (already store last-session sets). |
| P7 | **Shake-to-undo last set** | Normal | `DeviceMotion` shake gesture undoes the last logged set, with haptic confirm. |
| P8 | **Backup nudge** | Normal | Periodic "export your data" reminder — the one safeguard against local-only data loss. |

## Parking lot (raised, not yet pinned)
- **Character class / skill tree** — Powerlifter / Bodybuilder / Athlete weight XP, quests, radar differently.
- **Strength standards** — offline benchmark tables (untrained→elite by bodyweight); gives radar/PRs meaning.
- **Shadow of your past self** — race stats from 30/90 days ago.
- **Seasonal events** — calendar-driven themed quests, no server.
- **Mesocycle planner** — multi-week block with auto progressive-overload + scheduled deload.
- **Plateau detector** — flag stalled lifts from 1RM/volume; suggest deload/variation.
- **Progress photos + measurements** — local IndexedDB blobs, side-by-side timeline.
- **Interval modes** — EMOM / AMRAP / Tabata timers (new conditioning workout type).
- **Smart rest** — auto-suggest rest length from set RPE/intensity.
- **Accelerometer rep counter** — count reps + flag bar-speed drop (accuracy risk).
- **Tempo metronome** — eccentric/concentric audio cues per set.
- **Combo meter** — chaining sets without overlong rests builds a session combo for bonus XP.
- **Live ghost race** — bar fills as you out-lift last session's volume in real time.
- **Muscle-balance warnings** — push/pull, quad/hamstring volume-ratio flags (injury angle).
- **Auto-insight cards** — weekly "bench stalled 3 weeks; squat volume +18%."

_Brainstorm is open — this list grows as we go._

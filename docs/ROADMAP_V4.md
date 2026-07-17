# OPUS — Roadmap v4 (RPG-forward)

Living plan for the next wave. Committed so it survives session refreshes;
`STATE.md` tracks live status. This wave leans hard into the **RPG factor**
(user's steer), with normal-feature candidates kept alongside.

> **Committed build queue (next 7)** lives in `docs/PLAN_NEXT.md` — the user picked
> vs-last-time diff, crit sets + combo, calendar month view, auto progressive-overload,
> streak shield / rest token, classic program library, and progress photos (one PR each).
> The RPG-expansion ideas below are parked for a **design/prototype pass** first.

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
| P9 | **Multi-session boss raids** | RPG | Bosses get an HP bar chipped down across workouts; victory screen on kill. Upgrades static boss *gates* into a *fight*. |
| P10 | **Prestige rebirth perks** | RPG | Each prestige, choose one permanent perk (+quest XP, slower decay, extra rest token). Makes prestige a choice. |
| P11 | **Gear loadout** | RPG | Earn cosmetic gear (belt, straps, chalk) granting themed XP buffs for matching lifts. Pairs with loot drops (P3). |
| P12 | **Crit sets** | RPG | A set can randomly "crit" with a burst + bonus XP; daily first-set is crit-buffed. Reuses Particles/sound. |
| P13 | **XP wager** | RPG | Stake XP on hitting next session's target — win a bonus, lose the stake. Opt-in risk/reward. |
| P14 | **Companion — "Magnus"** ✅ *(shipped v1)* | RPG | Real **3D** gold robot on Home: greeting + tap dialogue, reactive animations, chimes. Lazy-loaded, gated by `effects`/reduced-motion. Evolution (gear/level skins) is the next iteration. |
| P15 | **Calendar view** | Normal | Month grid of sessions (richer than heatmap); tap a day for detail. |
| P16 | **PWA shortcuts** | Normal | Manifest jump-list quick actions ("Start workout"/"Log water") on long-press. NB: jump list, **not** home-screen widgets (see note). |

## P14 — Companion mascot: SHIPPED (v1) + roadmap
**Built:** "Magnus" — the gold `RobotExpressive` (CC0) rendered with `@react-three/fiber`
+ three.js. Lives on Home (`components/mascot/Companion.jsx` + `RobotModel.jsx`), with
contextual dialogue + clip mapping in pure, tested `utils/mascot.js`. Greets on load
(intro the first time), reacts to taps with a hype line + animation + `playChime`.
Code-split into its own chunk (~236 KB gz, lazy), model precached for offline,
gated by `settingsStore.effects` + `prefers-reduced-motion` (static idle frame otherwise).

**v1.1:** appears on **Home + Profile**; plays **ambient idle-break gestures** every 9–15s;
fixed the navigate-away/return clip (clone the cached GLTF per mount via SkeletonUtils
instead of mutating the shared scene).

**Next iterations:** wire to real events (level-up → Dance, PR → ThumbsUp, streak break →
No), evolution via tints/accessories per level & prestige (ties Gear P11 + Loot P3),
a name/rename setting, and Draco-compressing the GLB.

### Original investigation (kept for context)
Goal: a genuinely 3D-looking, polished mascot — no static SVG, no AI slop. Two real paths:

- **True 3D (recommended for the "3D" ask):** `@react-three/fiber` + `@react-three/drei`
  over Three.js, rendering a **CC0 low-poly rigged character** from **Quaternius**
  (browse on poly.pizza; GLB/glTF, public domain — zero attribution, zero legal risk).
  Convert GLB → component with `gltfjsx` (gltf.pmnd.rs). Idle/celebrate animations via
  the model's clips; **evolution = swap model / stack accessories / tint** per level &
  prestige (ties into Gear P11 + Loot P3).
  - *Cost:* three.js + r3f ≈ 150–600 KB gz + the model. Current app bundle is ~330 KB gz,
    so this must be **code-split / lazy-loaded** (only on Profile/Home), GLB compressed
    with Draco or meshopt, and gated behind `effects` + `prefers-reduced-motion`.
- **Lighter alt (if bundle is the priority):** **Rive** — a rigged vector mascot driven by
  a state machine, ~2 KB asset + ~100 KB runtime, reacts to app state (level/streak) live.
  Polished and cheap, but it's vector — may read closer to the "SVG" feel the user wants to avoid.

Decision pending: 3D fidelity (r3f + Quaternius) vs bundle/perf (Rive). Leaning r3f + Quaternius,
lazy-loaded, since the explicit ask is "3D-looking with real free assets."

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

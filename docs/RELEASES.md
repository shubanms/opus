# OPUS — Releases

What shipped in each version. (Detailed build log: `STATE.md`. Plans: `PRD.md`, `ROADMAP_V2.md`, `ROADMAP_V3.md`.)

## v1.0.0 — MVP (PRD Sprints 1–10)
Foundations of the app.
- **Workout logging**: exercises, sets, reps, weight, warmups, RPE, rest timer, plate calculator; bodyweight exercises (reps-only + optional added weight, earn XP from reps).
- **Exercise library**: ~70 curated exercises across all muscle groups, difficulty tags, body-map filter, Wger demo image + how-to video; custom exercises.
- **Routines & planning**: reusable templates with targets (sets×reps@weight), weekly planner, today's-workout recommendation (routine / rest / fresh), repeat workout.
- **Progressive overload**: three-lever coaching (reps→sets→weight) + deload signal.
- **RPG**: XP per set/workout, levels 1–10 + titles, five-axis character radar, level-up celebration, streaks, PR detection (weight/reps/volume).
- **Progress**: weekly volume, muscle focus, training heatmap, per-exercise trends; body weight/measurements, sleep, pre-workout energy.
- **Notifications** (in-app PR celebration + preference scaffolding), **shareable cards** (workout + profile, customizable theme), PWA installable, onboarding, JSON export/import + full wipe, ErrorBoundary.

## v2.0.0 — Roadmap v2 (Sprints 11–20) + detours
Identity, organization, game feel, insight, polish.
- **S11 Profile & units**: name/height/sex/age, bodyweight, **central kg/lbs** (`utils/units.js`), bodyweight counts toward volume, name on share cards.
- **S12 Notes & colour**: sticky per-exercise coaching notes, per-set + session notes, favourite★ + colour labels on exercises/templates/workouts, filters.
- **S13 Motion engine**: Particles, CountUp, useHaptics, WebAudio sound; PR/level-up/rest-timer moments.
- **S14 Achievements**: 19 data-driven unlocks (incl. hidden), Trophy Case, unlock celebration, achievement XP.
- **S15 Quests**: deterministic weekly quests (rotate Mondays) with XP bounties (DB v8 `questClaims`); claimed XP reverts on workout delete.
- **S16 Prestige + evolving mark**: prestige tiers beyond L10; `OpusMark` evolves (studs/halo/sweep/gems) by level & prestige.
- **S17 Dark mode + motion polish**; **in-app themed dialogs** (uiStore/UiHost) replacing native dialogs; RPE chips + help.
- **S18-equiv Recovery map**: muscle freshness body-map.
- **S19 Estimated 1RM** (Epley) + **Hall of Records** (PR timeline) + **supersets/circuits** (shared rest).
- **S20 Weekly recap** card + **challenge/profile share cards** + **radar history** overlay + **per-tab coach marks**; v2.0.0.
- **Detours**: guided tour (replayable, ends in Settings), configurable rest timer + rest stats, daily **steps + water** tracking with editable history, **majestic synthesized sound** cues, DatabaseClosedError recovery.

## v3.0.0 — Roadmap v3 (S1–S5, S7, S8; S6 dropped)
Seamless, flexible, more wow.
- **S1 Resume in-progress workout**: active session mirrored to localStorage (write-through + boot hydrate), restores after lock/reload unless stale; "picked up" banner + chime.
- **S2 On-open reminders**: in-app weekly-summary + daily nudge (streak-risk evening / gym nudge), quiet-hours + toggle aware, offline-safe.
- **S3 Reorder exercises**: up/down controls in active workout + routine builder.
- **S4 Equipment / plate inventory**: gym/home profiles with owned plates + bar feeding the plate calculator.
- **S5 Export CSV / PDF**: per-set CSV + dependency-free printable PDF report, alongside JSON.
- **S7 'Wrapped'**: Spotify-style browsable recap — current month (so far), any previous month, and year-end — with sparkline + shareable card.
- **S8 Living home scene + animated reveals**: Home aura that warms/breathes with progression; CountUp stat reveals.
- **Dropped**: S6 milestone certificates (user decision).

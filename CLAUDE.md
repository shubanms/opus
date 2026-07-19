# CLAUDE.md — OPUS project memory

> OPUS is a **free, offline-first gym-tracking PWA with RPG progression**.
> React 18 + Vite + Tailwind v3 · Dexie/IndexedDB · Zustand · React Router · Recharts ·
> html2canvas · vite-plugin-pwa. 100% local, no backend. Live: https://shubanms.github.io/opus/

## ⛔ FOCUS: PWA ONLY — native app is ON HOLD (set 2026-07-19)
**Work exclusively in the web/PWA app (`src/`, `docs/`, root config). The native app is paused by the user's explicit instruction.**
- **Do NOT touch, edit, create, build, or test anything under `apps/mobile/`** (the Expo/React Native app) — no code, no config, no docs, no PRs.
- **Native parity is paused** — do not port web features to native or add native counterparts right now.
- `packages/core/` (`@opus/core`, shared logic) is native-facing too — leave it alone unless the web genuinely needs it; the web uses its own `src/utils/*` copies, so PWA work does not require `packages/core` edits.
- The user will set up a proper native environment later (their laptop/phone + Android Studio); native work resumes only when they explicitly say so.

## Start here (don't re-read the whole codebase)
The `docs/` folder is the source of truth — read these first each session:
- **`docs/ARCHITECTURE.md`** — codebase map: routes, DB tables (v1–v8), localStorage keys, every util/hook/store/component, and the reusable patterns. **This is the efficiency reference — check it before grepping.**
- **`docs/GUIDELINES.md`** — engineering rules, UX standards, data-integrity, testing, and the "wow in every feature" rule. Follow these.
- **`docs/STATE.md`** — live status + reverse-chronological build log (what was done, where).
- **`docs/RELEASES.md`** — what shipped in v1.0.0 / v2.0.0 / v3.0.0.
- **`docs/PRD.md`** (Sprints 1–10), **`docs/ROADMAP_V2.md`** (11–20), **`docs/ROADMAP_V3.md`** — the plans.

Keep `docs/STATE.md` updated at the end of every sprint, and update `docs/ARCHITECTURE.md` when you add a table, store field, util, hook, route, or localStorage key.

## Workflow (how we ship)
- Develop on branch **`claude/initial-repo-access-test-7Qz54`**; **one PR per sprint/feature**, squash-merged to `main`.
- CI `test` job (vitest, node env) gates every PR — wait for green, then merge. PRs that touch only build-and-deploy show `skipped` (expected).
- After a merge: `git fetch origin main && git reset --hard origin/main` before the next sprint; push feature branch with `--force-with-lease`.
- Commits: author **shubanms**, co-author Claude. **Never** commit the model identifier in any artifact.
- Verify without running the app (sandbox can't build/network): code review + import scans + `node --check` on new pure `.js` + the CI test job. Give the user an on-device checklist after each merge.
- Don't create a git tag or open extra PRs unless asked.

## Engineering rules (full list in docs/GUIDELINES.md)
- Local-first only — no backend/accounts/sync, no leaderboards/multiplayer.
- Store weights in **kg**; convert at display via `utils/units.js`.
- Pure logic → `src/utils/*.js` with a co-located `*.test.js`. UI/DB code isn't node-tested.
- Modals/overlays → `createPortal` to `document.body`, cap 90vh (reuse `components/ui/Modal.jsx`).
- **Deletes revert ALL derived data** — reuse `recomputeProfile`/`recomputePRs` + `reconcile*` in `utils/workoutActions.js`/`achievements.js`/`questActions.js`.
- DB migrations = new append-only `db.version(n)` in `src/db/db.js`; index only queried fields.
- **Wow in every feature**: subtle animation + motion + sound where it fits, gated by `settingsStore.effects`/`sound` and `prefers-reduced-motion`. Reuse `fx/Particles`, `fx/CountUp`, `useHaptics`, `utils/sound.js` (`playChime`), `styles/animations.css`.

## User preferences (the human)
- **Android-first**, compact UX, big tap targets, content over chrome.
- Loves **liveliness / wow factor** — animations, moving parts, sounds — across the whole app.
- Wants **real tests** for new pure logic; cares about correctness over speed.
- **Anything addable must be editable & deletable**, with derived data reverted.
- Dislikes partial/inconsistent UI — finish features fully (no half-threaded changes).
- Sprint order is **flexible** — build whichever they pick next; default to value order.
- Likes concise progress updates and one-feature-per-PR-merged-green cadence.
- Detours are welcome and explicitly fine — capture them in STATE.md.

## Current state
**v3.0.0** shipped. Roadmaps v1 (PRD 1–10), v2 (11–20), v3 (S1–S5, S7, S8; S6 dropped) all complete.
See `docs/STATE.md` for the latest and `docs/RELEASES.md` for per-version detail.

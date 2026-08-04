# OPUS — Guidelines

Standing rules for all current and future work. (See `../CLAUDE.md` for the quick version.)

## Hard constraints
- **100% local-first PWA** — no backend, accounts, sync, or cloud. No leaderboards/multiplayer. Social = offline shareable cards only.
- **Web only.** The native app, `@opus/core`, and the Capacitor project were deleted on 2026-08-04. Don't re-add native code, and don't split pure logic into a shared package — `src/utils/*` is the one source of truth.
- **Local-only means storage is the app's weakest point.** `utils/storage.js` asks the browser to make IndexedDB persistent; keep that call on any new first-run path, and never weaken export/import.
- **Weights stored in kg internally**; convert only at display via `utils/units.js` (`toDisplay`/`toKg`/`unitLabel`).
- **DB migrations** = a new append-only `db.version(n)` block in `src/db/db.js`. Never edit a shipped version. Index only fields you query; everything else is unindexed.

## Data integrity
- **Anything addable must be editable and deletable**, and deletes must revert ALL derived data.
- Canonical rebuilders live in `utils/workoutActions.js`: `recomputeProfile()`, `recomputePRs()`. Reconcilers: `reconcileAchievements()` (achievements.js), `reconcileQuests()` (questActions.js). `deleteWorkout` chains them.
- Workout XP is stored as the full gained amount per workout (`xpEarned`); profile rebuilds by summing remaining workouts + unlocked achievement XP + claimed-quest XP.
- Built-in seed exercises are intentionally not deletable; custom ones cascade (sets/PRs/template refs + totals).

## UX standards (Android-first)
- Design for a phone screen first: compact chrome, big tap targets, content (lists) over chrome.
- Modals/overlays: **`createPortal` to `document.body`**, cap at 90vh with a fixed header + scrollable body (reuse `components/ui/Modal.jsx`). Any full-screen fixed overlay MUST portal to body (a page wrapper with a lingering transform becomes a containing block and traps fixed children).
- Use the themed in-app dialogs (`uiStore` confirm/prompt/toast via `UiHost`) — never native `window.confirm/prompt/alert`.
- Destructive actions confirm; full wipe requires typing "DELETE" (Settings → Danger zone).
- Pages render inside `AppLayout main` with `pb-24` for BottomNav clearance. Settings reached via the gear on Profile.

## Wow in every feature (standing rule)
Weave in **subtle animation, moving parts, and sound** where it fits — never gratuitous. Always gated by `settingsStore.effects`/`sound` and `prefers-reduced-motion`; keep motion GPU-friendly (opacity/transform). Reuse: `fx/Particles`, `fx/CountUp`, `useHaptics`, `utils/sound.js` `playChime`, `styles/animations.css`. Add new chimes/keyframes as needed.

## Testing & quality gates
- CI's `test` job runs **`npm run lint` → `npm test` → `npm run build`**, and gates every PR. All three must pass.
- **Lint:** Biome, configured in `biome.jsonc`. Linter on, **formatter off** (turning it on reformats all 199 files — that belongs in its own PR). Errors block the build; the ~234 existing warnings (`useButtonType`, `useExhaustiveDependencies`, `noArrayIndexKey`, label/keyboard a11y) are tracked debt. Don't add new ones.
- **Build in CI matters:** vitest runs in a node env and never parses JSX, so a broken component passes the unit tests. The build step is what catches it — on the PR, not on main.
- New **pure logic → `src/utils/*.js` with a co-located `*.test.js`** (Vitest, node env).
- DOM/DB/React code is not node-testable here — extract the pure core and test that; verify the rest by code review + on-device checklist. Playwright E2E lives in `tests/e2e/` and runs locally via `npm run test:e2e` (adding it to CI is an open follow-up).
- When a feature has real logic (math, selection, formatting, state transitions), pull it into a pure function so it can be tested.

## Workflow
- Branch `claude/initial-repo-access-test-7Qz54`; **one PR per sprint/feature**, squash-merged to `main`. Author shubanms, co-author Claude.
- Wait for the CI `test` job green, then merge. After merge: `git reset --hard origin/main` before the next sprint. Push with `--force-with-lease`.
- Sprint order is flexible — build what the user picks next.
- Verify in-sandbox via: code review, import/reference scans, `node --check` on new pure JS, CI. The container can't build or reach the network.
- **Never** commit the model identifier anywhere. Don't tag releases or open extra PRs unless asked.

## PWA / platform notes
- Background push isn't possible on a static PWA — reminders fire **in-app on open** (`useOnOpenReminders`), PR celebrations fire while open.
- iOS WebAudio needs a user gesture — `sound.js` resumes the context on play.
- Bundled audio samples (Howler.js + CC0) is a deferred option; the sandbox can't fetch audio.

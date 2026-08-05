# OPUS — Roadmap v5 (feedback loop)

The wave after the Aurora redesign. Committed so it survives session refreshes;
`STATE.md` tracks live status.

**The thesis for this wave:** OPUS is an excellent ledger with a reward layer
bolted on, and the user named the gap exactly — *"it's all input, I'm feeding it
a lot of data but not getting any feedback from that."* XP, Iron and badges
reward the **act of logging**; nothing yet says anything true about **what was
logged**. This wave closes that loop, and fixes a streak system that has been
quietly displaying a wrong number.

## Hard constraints (unchanged)
- 100% **local-first** PWA — no backend/accounts/sync; no leaderboards/multiplayer.
- Weights stored in **kg**; convert at display via `src/utils/units.js`.
- Modals via `createPortal` to `document.body` (reuse `components/ui/Modal.jsx`, cap 90vh).
- Deletes revert derived data (`recomputeProfile`/`recomputePRs` in `utils/workoutActions.js`).
- Android-first compact UX. Anything addable is editable/deletable.
- DB migrations = new append-only `db.version(n)` in `src/db/db.js`.
- One PR per feature, squash-merged; CI gates each (lint + unit + build + E2E).
- Pure logic in `src/utils/*.js` with a co-located `*.test.js`.

---

## Wave 1 — Stop lying, and fix the loop you're in every session

**1. Streak truth** · M · *bug fix*
`profile.streak` is written in exactly one place — `completeWorkout` — so nothing
recomputes it as days pass. Home shows "Streak: 7" three weeks later; it only
corrects itself, silently, on the next session. Derive the live state from the
stored value plus the calendar, and surface *safe / at risk / broken* instead of
a frozen number.

**2. Effort rating (RIR)** · S · *foundation*
Two taps after a set: easy / hard / to failure. Small alone, but it is the input
that PRs 7, 8, 5 and 9 need, so it lands early.

**3. Faster logging** · M
"Same again" repeat button, weight steppers snapped to loadable plates, prefill
from last session. The interaction performed 20–30× per session.

**4. Session-live indicator** · S
A pulsing dot and running timer on the Workout tab, tappable to return. Today
nothing on the other tabs suggests a session is open.

## Wave 2 — The app starts talking back

**5. Post-session verdict** · M
One honest sentence on finish: what was good, what is stalling. Praise *and* a
problem, every time.

**6. Weekly muscle targets** · M
Sets-per-muscle quota with a gauge, plus the push/pull imbalance nudge.

**7. Smart rest timer** · S · *needs 2*
Rest length adapts to the set and the effort rating instead of one fixed number.

**8. Quality-weighted XP** · M · *needs 2*
Hard and progressive sets earn more than junk volume, so the game layer stops
rewarding filler and starts pulling in the same direction as training.

## Wave 3 — Close the loop

**9. Loop-closer** · L · *needs 5*
The app remembers the advice it gave and reports back when you act on it. This
is the beat almost no fitness app has, and the one the user asked for.

**10. Streak rescue** · M · *needs 1*
Retroactive token spend, prompted at the moment of risk rather than buried on
Home. Works whether or not any notification was delivered.

**11. Schedule-aware streaks** · L · *needs 1*
Count scheduled sessions hit, not consecutive days, so planned rest days stop
being a threat. Bigger design call — deferrable.

**12. Swap this exercise** · M
Equipment taken → instant alternatives for the same muscle with the equipment
actually available.

## Wave 4 — Polish and platform

**13. Undo instead of confirm** · M
App-wide. A confirm dialog punishes the 99% of correct actions to protect the
1%. Touches the delete-revert paths, so it gets its own PR.

**14. Small UX sweep** · M
Empty states as doors, Settings search, onboarding order (log first, teach
after), thumb-zone actions.

**15. App shortcuts** · XS
Manifest only. Long-press the icon → start a session.

**16. Calendar export (.ics)** · S
The only notification path with no platform gaps, no permissions and no server.

**17. Periodic background sync** · M
Best-effort nudge on installed Android. Built to fail silently — PR 10 is what
actually catches a lapse.

---

## Notification research (2026-08-05, verified)

Checked before planning, because the constraint shapes PRs 10, 15–17.

- **Badging API does not work on Android.** Chrome's docs: *"On Android, the
  Badging API is not supported."* It works on desktop Chrome/Edge 81+ and iOS
  Safari 16.4+. **Silver lining:** Android badges an installed PWA's icon
  automatically when there is an unread notification, so on Android the badge is
  free with a notification rather than a feature to build.
- **Notification Triggers (`TimestampTrigger`) is dead.** Two origin trials
  (Chrome 80–83, 86–88), never shipped, no longer pursued.
- **No scheduled-local-notification API exists on the web.** A standards gap,
  not a Chrome gap; the Web Alarms draft died in 2013.
- **Periodic Background Sync** is Chromium-only, installed-PWA-only, gated on an
  undisclosed engagement score, browser-controlled timing, and only fires on
  previously-seen networks. Its frequency *"aligns with how often the app is
  used"* — which means it is least likely to fire exactly when a streak nudge
  matters most. Treat as a bonus, never as a dependency.
- **Web Push works on Android and iOS 16.4+** but needs something holding the
  subscription and VAPID private key. That is the only reliable path, and it
  crosses the no-backend line. **Blocked on a product decision.**

## Backlog (proposed, not picked)

Warm-up ladder · stall alerts · niggle tracker · readiness score · record
forecast · Magnus as the voice of the feedback layer · compare-you-to-you stats
("today's warm-up is heavier than your working sets in March").

## Standing debt (not sequenced)

Biome formatter pass · jsdom + RTL component tests · React 19 / Vite 7 / Dexie 4
/ react-router 7 upgrades · the 237 KB gz Companion chunk · unmaintained
`react-body-highlighter`.

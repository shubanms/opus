# OPUS — Roadmap v6 (the app talks back)

> **Status: complete (2026-08-06).** All nine shipped. See `docs/STATE.md` for
> what each one actually turned out to be, and for the two design calls that
> moved during the build: the streak rescue had to become schedule-aware (PR 5
> reached back into PR 4), and undo had to snapshot badges and quest claims
> rather than re-derive them.

Everything left over from `docs/ROADMAP_V5.md`, sequenced. `STATE.md` tracks
live status.

**The thesis:** v5 built the *inputs* — effort ratings on every set, weekly
muscle volume, a streak that tells the truth. None of it says anything yet. v6
is the half that speaks: a verdict after every session, advice the app
remembers giving, and the acknowledgement when you act on it. Plus the platform
work the notification research settled, and the undo pass.

## Hard constraints (unchanged)
- 100% **local-first** PWA — no backend/accounts/sync.
- Weights in **kg**; convert at display via `utils/units.js`.
- Deletes revert derived data (`recomputeProfile`/`recomputePRs`).
- Unindexed fields need no migration; new indexes = append-only `db.version(n)`.
- One PR per feature, squash-merged; CI gates each (lint + unit + build + E2E).
- Pure logic in `src/utils/*.js` with a co-located `*.test.js`.

---

## Wave 1 — Say something true

**1. Post-session verdict** · M
One honest paragraph when a session ends: what was good, and what is not. Both,
every time — praise alone is a slot machine, criticism alone is a nag. Computed
at completion from volume-vs-average, records, effort ratings and set count,
then stored on the workout row so it survives and can be re-read in History.

**2. Loop-closer** · L · *needs 1*
When the verdict raises a concern it records what it asked for. The next
session checks whether that specific thing moved and says so. This is the beat
the user asked for — *"a positive loop, reinforcement"* — and the one almost no
fitness app has.

**3. Quality-weighted XP** · M
Right now more sets means more XP, so the game rewards junk volume. With effort
ratings in place, hard and record-setting sets can be worth more than filler,
which puts the game layer and actual training on the same side.

## Wave 2 — Finish the streak

**4. Streak rescue** · M
The lapse is caught whenever you next open the app, and the rest token is
offered *there* rather than sitting unexplained on Home. Retroactive by design,
because a PWA cannot rely on waking you (see the v5 research).

**5. Schedule-aware streaks** · L
Count scheduled sessions hit, not consecutive days, so planned rest days stop
being a threat. The bigger design call of the two; keep the day-streak as the
fallback for anyone without a weekly plan.

## Wave 3 — Platform and polish

**6. Undo instead of confirm** · M
A confirm dialog punishes the 99% of correct actions to protect the 1%. Deletes
should happen, with a few seconds to take them back. Touches the delete-revert
paths, so it gets its own PR.

**7. App shortcuts** · XS
Manifest only. Long-press the icon → start a session.

**8. Calendar export (.ics)** · S
The only reminder path with no platform gaps, no permissions and no server.

**9. Periodic background sync** · M
Best-effort nudge on installed Android, built to fail silently. PR 4 is what
actually catches a lapse.

---

## Carried forward

**Backlog:** warm-up ladder · stall alerts · niggle tracker · readiness score ·
record forecast · compare-you-to-you stats.

**Blocked on a product decision:** the tiny push relay — the only reliable
notification path on Android *and* iOS, and the only thing here that crosses the
no-backend line.

**Standing debt:** Biome formatter pass · jsdom + RTL component tests · React 19
/ Vite 7 / Dexie 4 upgrades · the 237 KB gz Companion chunk · unmaintained
`react-body-highlighter`.

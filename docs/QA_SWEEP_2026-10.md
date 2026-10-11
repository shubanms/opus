# QA sweep — October 2026

A full pass over the app, both visual and functional:

- every route, tab, sheet and modal;
- light and dark themes;
- 412px and 360px phone widths;
- reduced motion;
- an India (UTC+5:30) timezone;
- an automated audit for overflow, small tap targets and `NaN`/`undefined` text.

That pass was followed by a code review of every area and a fix for each verified bug.

**Gates:**

| Gate | Before | After |
|---|---|---|
| Lint warnings (0 errors) | 214 | 11 |
| Unit tests | 661 | 1,215 |
| E2E tests | 21 | 31 (10 are new regression tests for the bugs below) |
| Build | — | OK |

## Bugs found and fixed

### Data loss and data integrity
- **Restoring a backup wiped the exercise catalogue.** Backups dropped stock and cardio exercises, and the app only re-seeded into an empty table. A restore therefore left sets pointing at exercises that no longer existed.
  - Backups now carry every exercise a set uses.
  - The catalogue heals itself on boot and after an import.
  - E2E: a full export → fresh profile → restore round trip.
- **Import wiped first and validated second.** A broken file now gets refused with the reason. A good file shows a preview ("Restore this backup? … replaces 12 workouts") before anything is touched, and the restore runs in one transaction.
- **Records were re-dated to today** whenever records were recomputed, including after an Undo. Records now keep their original dates.
- **Deletes didn't revert everything:**
  - quest claims;
  - dungeon clears (the dungeon now reopens);
  - Iron;
  - custom-exercise data.
- **Undo restored too much.** It now restores only the rows that were removed.
- **Saving a workout twice.** A double tap on "Save & finish" created two workouts. It's now guarded and saves inside a single transaction.
- **"Save as routine" overwrote a hand-built routine.** It no longer does.
- **Reset race.** A late settings write could survive "Reset all data".

### Dates and streaks
- **UTC date keys.** In India the heatmap was a day late, and body, sleep and activity entries were filed on the wrong day. Everything now uses local calendar dates, rolls over at midnight, and is DST-safe.
- **Mon/Wed/Fri lifters were stuck.** Streak-based level caps and achievements ignored the weekly plan, so they were capped at level 20 forever. Best streak, level and reminders are now all schedule-aware.
- **"−100% vs last week" every Monday.** Comparisons are now week-to-date.
- A session that ran past midnight was dated by its end time, not its start day.
- The streak bonus could be paid more than once a day.

### Live workout
- **Set numbering.** Deleting set 2 duplicated a number, and "Remove set 3" removed every set 3. Sets now renumber.
- **Losing a session.** "Repeat workout" or entering the dungeon silently replaced a session with logged sets. It now asks first.
- Prefill ignored routine targets. "Repeat" dropped them too.
- **Phantom PRs.** Switching kg ↔ lb minted records from rounding. There's now a tolerance.
- **Rest timer drift.** The timer drifted when the screen locked. It's now deadline-based.
- **Swap lost sets.** Swapping an exercise threw away the sets already logged.
- **Level-up order.** The level-up landed before the badges that caused it, and could pass the boss cap.

### Visual and accessibility
- **Reduced motion broke charts.** The radar chart, axes, rings and diamonds collapsed because a CSS rule removed every transform.
- **Missing outlines.** The active-exercise and crit outlines never drew because a colour token (`--accent-line`) was undefined.
- **Share cards.** The muscle line overflowed the card, and several buttons were all named just "Share".
- **Tap targets.** Many were under 40px: Back, set remove, chips, rename and search clear.
- **Formatting.** Date formats were inconsistent, and body fat was shown without a unit.
- **Vault.** It flashed "0 Iron" while loading.

### First launch
- **Splash.** It took 4.2s and couldn't be skipped.
- **Units at onboarding.** Picking lbs still set a 20 lb bar.
- **Clutter.** Reminder toasts landed on top of the tour, and a brand-new account was greeted with a "Never backed up" warning.
- **Unknown links.** An unknown link, or a render error, showed a blank screen. It now shows a recovery screen or redirects to Home.

## Quality-of-life improvements
- **Install button.** Shown in Settings and as a dismissible card on Home.
- **Edit the past:**
  - edit, add or delete sets on any finished workout;
  - rename and re-date workouts;
  - edit body, sleep and activity entries, with undo;
  - edit custom exercises (duplicate names are blocked).
- **History:**
  - search and tag filter;
  - exercises shown in the order performed;
  - trophies and verdict on each card;
  - "Save as routine" from any session.
- **Live session:**
  - edit sets in place, with a warm-up toggle;
  - sticky header, and the rest countdown shown in the nav;
  - ⋯ menu per exercise;
  - undo for discard and remove;
  - plate-aware overload suggestions.
- **Picker and routines:**
  - today's routine first;
  - recent exercises at the top;
  - "Fill from last session";
  - start a routine straight from the Routines page;
  - one routine per weekday, with a confirm before replacing the week.
- **Programmes:**
  - Full Body days now include legs;
  - PPL is a real 6-day split;
  - honest names and descriptions.
- **Progress:**
  - weight trend and 7-day average;
  - remembers your last tab;
  - photo compare by pose;
  - records link to their exercise.
- **Exercise page:**
  - history per session;
  - all-time best estimated 1RM;
  - a "not found" page instead of a blank one.
- **Android Back:** closes sheets instead of leaving the page.
- **Settings:**
  - default rest;
  - profile edit, and "Member since";
  - reminders work without notification permission;
  - Danger zone moved last.
- **Stale sessions:** an old unfinished session is parked instead of hijacking the Workout tab.

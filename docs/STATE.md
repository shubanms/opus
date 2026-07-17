# OPUS — Project State

Last updated: 2026-07-17
Current sprint: Roadmap v3 COMPLETE (S1–S5, S7, S8; S6 dropped). App at v3.0.0. + Native app → PWA parity program (Phases 1–6 + icon fix in progress).

**On-device fix — icons were BLANK in the release APK (critical):** the user's installed build showed no bottom-nav icons and no in-screen icons at all. Root cause: the **Ionicons glyph font does not render in our Expo SDK 52 release APK** even with the font preloaded — but `react-native-svg` renders reliably (the OpusMark ring/XP bars showed). Fix: replaced `@expo/vector-icons` entirely with a **stroke-based SVG `Icon` component** (`components/Icon.jsx`, ~35 lucide-style glyphs on react-native-svg) — a drop-in (`<Icon name=... size=... color=... />`) swapped across App.js + all screens/components. This GUARANTEES rendering and better matches the web's lucide look. Validated: jest 23/23 + full `expo export` (Metro/Hermes) bundles clean (2.86 MB). Also polished: compact empty-chart states (44px vs 130), `StatTile compact` volume formatting (no more "0k"), higher-contrast Exercises filter chips, toned-down Wrapped button.

**On-device bug fixes + dark mode (post icon-fix, from user screenshots):**
- **Segmented controls were crammed** ("KilogramsPounds", "BeginnerIntermediateAdvanced") — root cause: `PressScale` put the incoming `style` (incl. `flex:1`) on an inner Animated.View, so the Pressable sized to its text. Fixed by using `Animated.createAnimatedComponent(Pressable)` and putting `style` on the Pressable itself → flex works for every button/segment.
- **Runtime dark mode DONE**: `theme.js` now exports `lightColors`/`darkColors` (surfaces + on-surface text flip, canvas/gold/status constant, mirrors web `[data-theme='dark']`); `native/ThemeProvider.jsx` resolves the active palette from the `theme` setting (light/dark/**system** via `useColorScheme`) and exposes `useColors()` + `useThemedStyles(makeStyles)`. Converted all 32 screens/components + `ui.js` to `makeStyles`/hooks (StyleSheets are now `(colors) => StyleSheet.create(...)`), wrapped the app in `ThemeProvider`, set `app.json userInterfaceStyle:"automatic"`, and re-added the Settings Theme selector (now functional). Theme-constant spots left static on purpose: `ErrorBoundary` (class, crash screen) and the App nav-chrome (obsidian tab bar). Verified: jest 25/25 + full `expo export` bundle clean.

**Parity program — full audit (3 code sweeps) + phased plan:** documented every remaining native↔web gap (workout depth, exercise detail, progress tabs/body logging, settings depth, home richness, tour/coach marks, companion, feel/sound, data-model divergences). Confirmed sequencing with the user: build **everything A→H, one merged-green PR per phase**. Plan lives in the plan file; this log tracks each phase as it ships.

**Parity Phase C1 (Progress tabs + Overview + By-Exercise) DONE:** split the flat `ProgressScreen` into **Overview / By-Exercise / Body** tabs via a new shared `components/Segmented.jsx` (lifted from SettingsScreen). New `db.js` helpers: `getMuscleFrequency` (working sets per muscle group), `getWorkoutDays` (finished dateKeys set), `getTopExercises({by,limit})`; extended `getTotals` with `prCount` + `hours`. **Overview**: 6 KPI tiles (Workouts/Volume/PRs/Streak/Hours/Sets), weekly-volume `LineChart` + **week-over-week Δ**, per-session `BarChart`, new `components/progress/MuscleFrequency.jsx` (region-coloured bars) + `components/progress/Heatmap.jsx` (12-week×7-day training calendar), Recent PRs. **By-Exercise**: `getTopExercises` list + best-1RM list — both tap through to the reused Phase-B **`ExerciseDetailSheet`** (PR card + 1RM/volume charts) — plus RecoveryCard. **Body** (seeded here, expanded in C2): ActivityRings + BodyWeightCard + RecoveryCard. Charts convert kg→display unit at the call site. Muscle body-map deferred (web lib is DOM-only). Jest **40/40** (+3). No `@opus/core` changes.

**Parity Phase B (exercise detail + custom CRUD) DONE:** the native Exercises tab gained the web's whole detail surface. Widened the `exercises` table (`isCustom`/`favorite`/`color`/`secondaryMuscles`/`description` via `ensureColumn`). New `db.js` helpers: `getExercise`, `addCustomExercise` (isCustom=1), `toggleFavorite`, `setExerciseColor`, **`deleteCustomExercise`** (delete-reverts derived data — sets/PRs/templateExercises/notes + recomputes affected workout totals + `reconcileAchievements`/`reconcileQuests`, guarded to custom only), `getExerciseNote`/`setExerciseNote` (upsert into the existing `exerciseNotes` table), and per-session `getExerciseVolumeSeries`/`getExerciseE1rmSeries` (Epley via `@opus/core/oneRepMax`). New `components/exercise/ExerciseDetailSheet.jsx` (Modal-sheet, mirrors HallOfRecords): favorite star, muscle/equipment/difficulty + Custom badges, coaching-note input, 8-swatch label-color row, **PR card** (weight/reps/volume, type+unit aware), **1RM `LineChart`** + best, **volume `BarChart`** (reuses `progress/{LineChart,BarChart}`), **YouTube how-to** link (`Linking`), **Add to workout** (→ session store), and **Delete** for custom. New `components/exercise/ExerciseFormSheet.jsx` (name + 15 muscle groups + 5 equipment → `addCustomExercise`). Rewrote `ExercisesScreen` on `useDbQuery` (live): **+ Add** button, **favorites-only** toggle, **equipment filter**, favorite star / color dot / difficulty badge in rows, row tap → detail sheet, gold add-circle → quick-add-to-workout. wger demo image deferred (YouTube link only). Jest **37/37** (+2). No `@opus/core` changes.

**Parity Phase A (workout logging depth) DONE:** rebuilt the native Workout tab from a flat single-input logger into the web's **per-exercise section** model. New in-memory session store `native/workoutSession.js` (mirrors the web `workoutStore` + the `settings.js` store pattern; no zustand) — the in-progress session (exercises→sets, supersets, targets, energy, notes, name) lives in memory and is snapshotted to the `settings` table for crash/reload resume (via `@opus/core/workoutSession` serialize/deserialize/isStale); persisted to SQLite only at finish. New `db.commitWorkout(session)` writes the workout+sets+energy in one transaction, detects **weight/reps/volume PRs** (upsert one row per exercise+type — replaces the old single `e1rm` PR), and reports the true XP gain + level-up + new achievements. New shared pure `@opus/core/prs` (`bestOfSession`/`detectPRs`/`prTypeLabel`, +8 tests → core **203**). Components: `components/workout/{SetLogger,ExerciseSection,OverloadNudge}.jsx` (warmup toggle, RPE chips + info, per-set notes, rep ± steppers, bodyweight "+ add weight", live PR-beat + "+XP/PR!" float, best-PR/last-session reference line, overload nudge from `@opus/core/overload`, live tally + target progress) and `components/rpg/LevelUpScreen.jsx` (full-screen celebration). Rewrote `WorkoutScreen` (editable name, live elapsed timer, energy check-in, superset brackets via `supersets.supersetRuns`/`noRestIds`, reorder, session notes, add-from-picker/free-text, rest-after-set except non-last superset move). `deleteWorkout` now also `reconcileQuests` (un-claims no-longer-met quests → reverts their XP). Home resume indicator + App boot now read the session store. PR displays (EndWorkoutModal, HallOfRecords, Progress) are type + unit aware. Jest **35/35** (+4). **Deferred to a small follow-up:** template target-seeding/progress bars (native templates store no target columns yet) and save-ad-hoc-as-routine.

**Parity Phase 9a (share cards) DONE:** the web's exportable stat/PR/Wrapped images now exist on native. New shared-pure module `@opus/core/shareCard` (`THEMES`/`ACCENTS`/`DEFAULT_THEME` + locale-free `formatDuration`/`formatShareDate`/`resolveTheme`) with a co-located test (+10 → core at **195 tests**). Native capture layer `apps/mobile/native/share.js` (`captureAndShare` = `react-native-view-shot` `captureRef` → `expo-sharing` share sheet, normalises to a `file://` URI, never throws). Five parametric RN card renderers in `components/share/cards.jsx` (ShareableCard/ProfileCard/ChallengeCard/WrappedCard/RecapCard) — one component per web card, every dimension × a `scale` prop so the same view renders the small live preview AND the full-size 1080² capture. `components/share/ShareSheet.jsx` (bottom sheet: live preview + Background/Accent pickers mirroring web, off-screen 1080² `<ViewShot>` capture target) and `ShareButton.jsx` (self-contained opener, pill/chip variants). Wired into **EndWorkoutModal** (workout card — WorkoutScreen builds the payload: name/athlete/date/duration/volume/sets/xp/muscles-from-catalog/top-PR/level/unit), **ProfileScreen** (Profile card via `rpg.getCharacterStats` radar axes + Challenge "beat my numbers" card), and **WrappedModal** (Wrapped card from `buildWrapped` output). New deps `react-native-view-shot@~4.0.3` + `expo-sharing@~13.0.1` (no config plugin needed; autolinked in prebuild). Added a `share` glyph to `Icon.jsx`. jest.setup mocks both native deps as **virtual** (not installed in the Node test env). Jest smoke → **31/31 green** (+6: sheet + all 5 cards render at full scale). Remaining optional: guided tour/coach marks, 3D companion.

**Parity Phase 7–8 (Templates + onboarding):** `components/workout/TemplatesModal.jsx` — auto-generate a balanced routine (`@opus/core routineGenerator` + `routineName.deriveRoutineName`), list/start/delete saved routines (templates tables); opened from a "Routines" button on the Workout start screen; Start pre-fills the logger. `components/Onboarding.jsx` — first-run name + units, gated on the new `onboarded` setting (App.js now wraps everything in SafeAreaProvider and shows Onboarding until done). db helpers `createTemplate/getTemplates/deleteTemplate`. Jest smoke → **25/25 green**; full `expo export` bundles clean. Remaining: runtime dark mode (dedicated on-device pass), share cards (view-shot), 3D companion.
Current version: v3.0.0

> Docs reorganized into `docs/` (this file moved here). Index: `docs/README.md`. Map: `docs/ARCHITECTURE.md`.
> Rules: `docs/GUIDELINES.md`. Per-version features: `docs/RELEASES.md`. Entry point: root `CLAUDE.md`.

**Native app → PWA parity program (in progress):** goal is full 1:1 parity between the Expo native app (`apps/mobile`) and the web PWA, delivered in phases (one PR each). Plan: 9 phases — (1) fix the broken look, (2) data + core foundation, (3) workout flow, (4) progress/charts, (5) RPG/profile, (6) home, (7) templates, (8) settings+onboarding, (9) extras/polish.
- **Phase 1 (fix the broken look) DONE**: root-caused two on-device bugs — (a) `@expo/vector-icons` was imported for every tab/in-screen icon but **absent from `apps/mobile/package.json`** and its glyph font never preloaded → blank tofu in release APKs; fixed by adding the dep + spreading `Ionicons.font` into `App.js` `useFonts`. (b) `app.json` had **no launcher icon / adaptive icon / splash** (and `apps/mobile/assets` had no icon PNG) → default blank Expo identity; fixed by copying the prepared 1024² `/assets/icon-*.png` into `apps/mobile/assets` and wiring `expo.icon` (icon-only), `android.adaptiveIcon` (foreground + obsidian bg), and the `expo-splash-screen` plugin (icon-only on `#111010`). Jest smoke stays green (mocks expo-font/vector-icons; `{...undefined}` spreads harmlessly). On-device: tab icons visible, themed launcher + obsidian splash.
- **Dark mode**: deferred to its own PR — a real runtime toggle needs a ThemeProvider/`useColors()` refactor across 17 files that build `StyleSheet.create` at module load; folding that into the icon/splash fix risked a half-threaded result. In-app palette already matches web 1:1.
- **Phase 2 (data + core foundation) IN PROGRESS**: extracted the pure halves of 4 web utils into `@opus/core` so native can reuse the exact web math — `volume` (`setLoad`/`computeVolume` with an `isBodyweight` predicate instead of a Dexie lookup), `snapshots` (`monthKeyOf`/`previousSnapshot`/`mergeRadarSeries`), `wrapped` (verbatim), `achievements` (`ACHIEVEMENTS` + pure `computeStats`/`earned`/`newlyUnlocked`/`staleKeys`/`xpFor` over already-loaded rows). Each with a co-located `*.test.js`. Added `packages/core/vitest.config.js` (self-contained; inlines empty PostCSS so Vite doesn't walk up to the web app's tailwind config) → `cd packages/core && npm test` green at **185 tests** (+27). Additive only; web build/tests untouched.
- **Phase 2 native DB (SQLite schema + reactive layer) DONE**: `apps/mobile/native/db.js` now mirrors the web Dexie v1–v8 — added tables `prs, templates, templateExercises, achievements, questClaims, dailyLogs, bodyStats, sleepLogs, energyLogs, exerciseNotes, userProfile`, and widened `sets` (exerciseId/setNumber/isWarmup/rpe/note) + `workouts` (status/duration/totalVolume/totalSets/xpEarned/templateId/energy/notes/color/bodyweightKg/createdAt) via an idempotent `ensureColumn` guard (no destructive migration; existing rows keep working). `finishWorkout` now snapshots status/totals/duration onto the row; `discardWorkout` cascades energyLogs/prs. New accessors: `setWater/getWater`, `logBodyStat/getBodyStats/currentBodyweight`, `addPR/getAllPRs`. **Reactive layer**: a version-counter notifier (`subscribeDb`/`dbVersion`, internal `touch()` after every write) + `native/useDbQuery.js` hook = the native equivalent of Dexie `useLiveQuery`, so screens refresh live on any write. Verified: db.js/useDbQuery.js parse clean; mobile jest smoke green (7/7). STILL TODO in Phase 2: web→mobile JSON import (needs exercise-id→name mapping) — deferred to when data migration is wired.
- **Phase 3a (workout flow — rest timer + PR persistence + end summary) DONE**: `components/workout/RestTimer.jsx` (react-native-svg ring countdown, 1:00/1:30/2:00/3:00 presets + ±15s, warms gold→ember in the final 10s, chime + haptic on complete; chosen preset persists as the new `restDuration` setting) auto-starts after each logged set. `components/workout/EndWorkoutModal.jsx` (bottom-sheet summary: CountUp XP/volume/sets/PRs + Particles + per-PR list). `WorkoutScreen` finish now **persists PRs** (best e1rm per exercise vs `priorBestE1rm` → `addPR` into the new `prs` table) and shows the summary modal instead of a plain Alert. `finishWorkout` stores `xpEarned` (via `rpg.calcSetXP` + `COMPLETE_BONUS`); new `getWorkoutSummary` accessor. `settingsStore` coerce handles numbers; `restDuration` default 90. Jest smoke extended to render RestTimer + EndWorkoutModal → **9/9 green**.
- **Phase 3b (exercise picker + plate calculator) DONE**: `components/workout/ExercisePicker.jsx` (searchable bottom-sheet over the seeded catalog via `getExercises(query)`; tap fills the exact exercise name so PR/1RM tracking stays consistent) opened from a new browse button on the exercise field. `components/workout/PlateCalculator.jsx` (per-side colored plate chips via `@opus/core plateCalc.calcPlates`/`nearestLoadable`, using the new `barWeight` setting; shows nearest-loadable when the exact target can't be made) appears under the weight input. Jest smoke → **11/11 green**. STILL TODO in Phase 3: per-exercise sections/grouping, supersets, overload nudge, warmup/RPE inputs, templates-driven sessions.
- **Phase 4a (Progress charts + PR history) DONE**: dependency-free SVG charts on the existing `react-native-svg` (no chart lib → can't destabilize the APK build) — `components/progress/LineChart.jsx` (gold line + area, graceful <2-point fallback) and `BarChart.jsx` (per-session bars, latest highlighted). New `getWeeklyVolume(weeks)` DB helper (Monday-aligned buckets computed from working sets, robust to pre-schema rows). `ProgressScreen` rebuilt on `useDbQuery` (live-refreshes on any write) showing weekly-volume trend, per-session volume, best 1RM, and a **Recent PRs** list from the `prs` table (`getAllPRs`) — replaces the "trend charts land next update" stub. jest.setup mock extended with the reactive/parity accessors (`subscribeDb`, `getWeeklyVolume`, `getAllPRs`, `addPR`, `getWorkoutSummary`, water/body accessors). Jest smoke → **14/14 green**. STILL TODO in Phase 4: muscle recovery map, Wrapped screen, activity rings/heatmap.
- **Phase 5a (Achievements engine + trophy case) DONE**: native now runs the shared `@opus/core/achievements` engine. `db.js` gained `computeAchievementStats()` (assembles workouts/sets/prs/exercises/level rows → `achievements.computeStats`), `syncAchievements()` (detects `newlyUnlocked`, persists to the `achievements` table, returns new defs), `unlockedAchievements()/unlockedAchievementKeys()/achievementXP()`; `getTotals().totalXP` now **includes achievement XP** (parity with web — counts toward level/rank; the detection gate uses a base-XP level to avoid self-reference). `WorkoutScreen` finish calls `syncAchievements()` and the `EndWorkoutModal` shows any freshly-unlocked badges (title/desc/+XP). `ProfileScreen` gained a full **trophy case** (all 19 achievements, earned vs locked, hidden ones masked until earned, earned-count) on `useDbQuery`. Jest smoke → **14/14 green**.
- **Phase 5b (Hall of Records + Progression/boss gates) DONE**: two bottom-sheet modals off Profile (no nav refactor needed). `components/profile/ProgressionModal.jsx` — rank ladder (`rpg.RANKS`, current band highlighted) + the 5 boss gates (`bosses.bossList(stats)` cleared/active/locked). `components/profile/HallOfRecordsModal.jsx` — every PR grouped by day (from the `prs` table). Profile now **caps the displayed level at the first uncleared boss gate** (`bosses.cappedLevel`, parity with web) and shows an active-boss callout; two entry buttons open the sheets; `computeAchievementStats`/`getAllPRs` fed via `useDbQuery`. Jest smoke → **16/16 green**. STILL TODO in Phase 5: radar CharacterCard, share cards, Wrapped screen.
- **Exercises filters DONE**: `ExercisesScreen` gained horizontal muscle-group filter chips (derived from the catalog, "All" + each group) composed with the existing search — closes the web's muscle/equipment-filter gap. Jest smoke → **16/16 green**. STILL TODO: exercise detail (history/notes), custom-exercise creation.
- **Phase 6a (Home quest board) DONE**: `components/home/QuestBoard.jsx` — 3 deterministic weekly quests (`@opus/core quests.weeklyQuests`, rotates each Monday) with live progress bars and a claim button when a target is met; self-contained over the `questClaims` table. New db helpers `getWeekQuestStats` (this-week window → `quests.computeQuestStats`), `getQuestClaims`, `claimQuest` (once/week), `questClaimXP`; `getTotals().totalXP` now also adds **claimed-quest XP** (parity — counts toward level/rank). Wired into `HomeScreen` between Today and Recent; claim fires haptic + chime + particles. Jest smoke → **17/17 green**. STILL TODO in Phase 6: recovery card, weekly recap, companion/mascot.
- **Phase 5c (Wrapped) DONE**: `components/profile/WrappedModal.jsx` — Spotify-style month/year recap (period toggle + ◀▸ stepper, headline volume CountUp, weekly sparkline via LineChart, sessions/sets/PRs/XP grid, top-lift/busiest-day/hours chips) over `@opus/core/wrapped`. New `getWrappedInputs()` db helper shapes finished-workout rows and **remaps name-keyed exercises to synthetic numeric ids** (so `buildWrapped`'s top-lift resolves). Opened via a "Your Wrapped" button on Profile. Jest smoke → **18/18 green**.
- **Build validation**: ran a full `expo export` (Metro + Hermes) — the entire app, incl. the *real* `native/db.js` and every new component/chart, bundles to a 3.17 MB `.hbc` with `Ionicons.ttf` in assets. Confirms the JS layer of the release build compiles (native Gradle step still only runs in CI on a PR).

**Native port — React Native + Expo (monorepo scaffold):** Capacitor abandoned (notifications + Health Connect never worked; the WebView/service-worker bridge was the wall). Real native app under `apps/mobile` (Expo SDK 52, RN 0.76), sharing pure logic via `packages/core` (`@opus/core`, 22 utils, 158 tests). Blueprint: `docs/NATIVE_PORT.md`.
- **APK pipeline**: `.github/workflows/mobile-apk.yml` builds a debug APK without EAS (prebuild + `gradlew assembleDebug`), uploaded as artifact. Kotlin pinned 1.9.25 + minSdk 26 via `expo-build-properties` (fixed a Compose-compiler mismatch). Web CI stays isolated (mobile work under `apps/mobile`/`packages/core`).
- **App**: React Navigation bottom-tabs (Home/Progress/Workout/Exercises/Profile/Settings), theme tokens ported from the web CSS vars, StyleSheet UI primitives.
- **Data layer** (`apps/mobile/native/db.js`): persistent `expo-sqlite` (sync API) — `exercises`/`workouts`/`sets` tables, seeded from `@opus/core/seedExercises`. Repo: active-workout get/create, add/delete set, finish (discards empty), discard; derived **from rows** via `@opus/core` — streak, totals, XP (`rpg.calcSetXP` + COMPLETE_BONUS), best est-1RM per exercise (`oneRepMax.epley1RM`). Deletable per data-integrity rule.
- **Screens wired to real data**: Home (streak/workouts/volume + recent + resume active), Workout (persisted set logger w/ exercise name + delete + finish/discard), Progress (totals + best 1RMs), Profile (rank/level/XP bar via `rpg.getRankLabel`/`getXPProgress`), Exercises (DB catalog, tap-to-log → Workout).
- **Native features**: notifications (`expo-notifications` — channel, permission, daily reminder, test), Health Connect (`react-native-health-connect` — availability, connect, read today's steps).
- **Widgets** (`react-native-android-widget`, 2): **Quick Start** (opens app) + **Today/Streak** (live streak + workout count, pushed via `requestWidgetUpdate` on Home focus / workout finish; headless task reads DB as fallback).
- **Verification honesty**: sandbox can't run/emulate RN — verified by driving the APK build to GREEN; on-device runtime behaviour is the user's to confirm.

**UX redesign pass + auto-routine (post-v3, grouped PRs on one branch):**
- **Recovery bugfix**: muscle recovery lagged a full day for non-UTC users — `completeWorkout` wrote `workout.date` as a UTC calendar date but `useRecovery` compared it to *local* midnight (bare `YYYY-MM-DD` parses as UTC). Added pure `utils/dateKey.js` (`todayKey`/`parseKey`/`daysBetween`, local-calendar, +test); `useRecovery` now parses via it and keys the live query on `todayKey()` so counts advance across midnight without a DB write; `completeWorkout` writes date + streak via `todayKey()`.
- **Home declutter** (`HomePage.jsx`): greeting + level/XP merged into one compact hero card; the three heavy widgets (Activity/Recovery/Quests) collapsed into a single tabbed `SecondaryDeck` (recovery tab only once there's history); WeeklyRecap kept compact; Recent trimmed to 2. All widgets/Companion/theme preserved.
- **Progress redesign** (`ProgressPage.jsx`): Overview gained a lifetime KPI bento (CountUp), a week-over-week volume delta, and a Recent PRs list (`useLifetimeStats`/`useAllPRs`, previously unused here). By-Exercise replaced the blank "pick an exercise" gate with a default view — interactive muscle map (tap to filter), Top exercises list, recent PRs; selecting any opens per-exercise detail (PR badges + 1RM/max-weight/volume charts). `RecoveryMap` made prop-driven (`data/onSelect/legend/title/icon`; falls back to `useRecovery`). New hook `useTopExercises`.
- **Auto-routine on finish**: pure `utils/routineName.js` (`deriveRoutineName` → Chest/Push/Pull/Leg/Upper/Full/Core Day + stable `autoKey`, +test). `EndWorkoutModal` offers a default-on "Save as routine" (auto name, editable) for ad-hoc sessions (no template, ≥2 exercises). `templateActions`: templates carry unindexed `autoKey` (**no migration**); `saveWorkoutAsRoutine` derives targets from logged working sets and **updates the autoKey-matched routine in place** instead of duplicating; `renameTemplate` (name-only) + tap-to-rename on `TemplateCard`.
- **Logging polish** (`SetLogger`/`ExerciseSection`): per-exercise session tally + progress-vs-target bar; best-PR reference instead of last-session when following a routine; live PR-beat (haptic/chime + "PR!" float) on a record-topping set; rep ± steppers. All prior behaviour intact.
- **Profile polish** (`ProfilePage.jsx`): name+identity+level/rank+XP condensed into one hero card; ranks/records/wrapped grouped into a single divided card.
- New tested utils: `dateKey`, `routineName`. Full suite green (191 tests).

**Bug fixes (post-wave):**
- Build break: `ActivityRings.jsx` had `{burst && <Particles/>` missing `}` → fixed (#65). (node-env tests + node --check don't parse JSX, so JSX errors only fail the production build; consider adding a build step to the CI test job.)
- Empty-workout XP exploit: `calcWorkoutXP([])` returns COMPLETE_BONUS, so finishing a session with **zero working sets** saved a workout + granted XP/streak (farmable). Fixed: EndWorkoutModal "Save & finish" disabled at 0 sets + `completeWorkout` discards empty sessions (`{discarded:true}`, clears activeWorkout, no save/XP); WorkoutPage skips celebration on discard.

**New-ideas wave (post-v3) — auto-routines / shuffle / stale-nudge (4 PRs):**
- **PR 1 (auto-generate) DONE**: pure `utils/routineGenerator.js` — `makeRng` (mulberry32), `LEVEL_DEFAULTS` (count+targets: beg 4/3×10, int 6/4×8, adv 7/4×6), `pickForGroup` (difficulty-proximity ranking = thin-advanced fallback), `defaultCount`, `generateRoutine({exercises,groups,level,count,rng})` (round-robin, no dupes) + tests. `RoutineGeneratorModal.jsx` (group chips from ALL_MUSCLES, level segmented, auto name, day, preview, Particles+chime) → `createTemplate`. "Auto" button + empty-state CTA on TemplatesPage. Assume full gym (no equipment UI).
- **PR 2 (shuffle/re-roll) DONE**: pure `reshuffleRoutine({slots,intensity,pinnedIds,pool,rng})` (light=1/medium≈half/full=all; same-group same-difficulty swaps; pinned + targets preserved; no dupes) + tests. TemplateCard: one-tap **medium** shuffle button → updateTemplate. TemplateBuilder: light/medium/full shuffle control + per-row **pin** toggle (rows now carry muscleGroup/difficulty/pinned). Gated chime.
- **PR 3+4 (stale nudge + sound/notif polish) DONE** — wave complete: pure `utils/staleRoutine.js` (`isStaleRoutine` ≥4wk AND ≥8 sessions, `sessionCounts`, `pickStalest`) + `utils/goals.js` (`crossedGoal`) + tests. `reminders.js` staleRoutine branch (once/week) + toggle in NOTIF_TYPES/DEFAULTS; `useOnOpenReminders` feeds templates+workouts→pickStalest; stale chip on TemplateCard → one-tap shuffle. `sound.js` `goal` (~1s) + `anthem` (~5s i–VI–VII–I "calling back") cues + `playChime(kind,{force})`; ActivityRings fires goal+Particles on goal crossing; streakRisk reminder plays the anthem. Settings → Notifications: Test-notification + Preview-sounds buttons + PWA-background caveat.

**More sound cues (post-v3):**
- `sound.js` added cues: `tick` (set logged), `tap` (add exercise), `start` (workout start), `delete` (soft descending — deletions). All gated by settingsStore.sound.
- Wired: SetLogger (tick), WorkoutPage start/add (start/tap), HomePage start template (start), WorkoutCard delete / ExerciseDetail delete / ResetDataModal wipe / ProgressPage body+sleep+activity deletes (delete).

**RPG expansion (phased — decided with user):**
- **Phase 1 (50-level curve) DONE**: `rpg.js` now `xpForLevel(L)=300·(L-1)²`, `LEVEL_COUNT=50`, closed-form `getLevelFromTotalXP` (inverse sqrt). 10 named titles spread across 50 in bands of 5 (`getTitle`); `RANKS` = 10 milestone ranks at levels 1/6/11/…/46. Prestige after level 50, `PRESTIGE_STEP=30000`. Curve closely matches old thresholds → no one drops a level. ProgressionPage shows band ranges + band-based "current". Tests updated.
- **Phase 2 (demotion) DONE**: pure `utils/decay.js` — `inactivityDecay` (grace 4d, 2.5%/day, cap 40%), `streakBreakPenalty` (gated past grace, 20 XP/streak-day, cap 1000), `decayInfo(profile,now)→{effectiveXp,lost,decaying,days}`. Display-derived only (stored totalXp never mutated → training recovers it; no recompute changes). Threaded into Home/Profile/CharacterCard/Progression level+rank+XPBar (lifetime "Total XP" stat stays earned). "Rank slipping" indicator on Home + Profile. Tests.
- **Phase 3 (boss gates) DONE** — RPG expansion complete: pure `utils/bosses.js` — `BOSSES` (gates 10/20/30/40/50, escalating feats tested against computeStats), `levelCap`/`cappedLevel`/`activeBoss`/`bossList`. `hooks/useBosses.js` (live computeStats). Displayed level is capped at the first uncleared gate (Home/Profile/CharacterCard via `cappedLevel`); a "Boss gate" callout on Home + Profile shows the blocking challenge; ProgressionPage lists the 5 gates (cleared/active/locked). Live-derived from stats (no DB/migration) so deletes naturally re-gate. Tests.
- Known minor: `completeWorkout` level-up celebration uses raw XP level (not boss-capped) — transient; persistent displays respect the gate.

**RPG polish/bugfix (post-v3):**
- `getXPProgress` now prestige-aware at/after max level — tracks the prestige band so "XP to next" is never negative (fixed underflow at Lv.10 / huge XP). +tests.
- `OpusMark` halo clamped (prestige→0..5, smaller blur/alpha) so it no longer balloons into a giant gold smear at high prestige.
- PENDING (design with user): more levels (extend curve), XP demotion/decay, boss-fight gates past milestone levels.

**Roadmap v3 S5 (Export CSV / PDF) done:**
- Pure `utils/csv.js` (`escapeCsv`/`toCsv`/`setsToCsv`, unit-aware) + test.
- `dataActions.exportSetsCsv(unit)` (every set joined w/ workout+exercise names) and `exportPdf(unit)` (dependency-free printable report via window.open + print CSS → Save as PDF).
- Settings → Data: CSV + PDF buttons alongside JSON export/import.
- Version bumped to **v3.0.0** (package.json + Settings About). Roadmap v3 complete.

**Roadmap v3 S4 (Equipment / plate inventory) done:**
- `settingsStore.inventory` { active, gym/home: { barKg, plates, unit } } + setters (setInventoryActive/Bar/Plates). Plates are display-unit numbers stamped with `unit`; barKg null → global barWeight; plates null → standard set.
- Pure `utils/inventory.js` `togglePlate` + `effectivePlates(locData,unit,standard)` (custom only applies in its unit, else standard) — tested. plateCalc.test extended (sparse owned sets, empty → bar only).
- `EquipmentModal` (Settings → Profile → "Equipment & plates"): Gym/Home toggle, per-location bar + owned-plate chips + add-custom. `PlateCalculator` uses the active location's bar + plates. Existing behavior preserved (defaults null → standard set).

**Roadmap v3 S3 (Reorder exercises) done:**
- Pure `utils/reorder.js` `moveItem(arr,index,dir)` (swap neighbour; same-ref no-op at bounds) + test.
- `workoutStore.moveExercise(id,dir)` (supersets re-derive from new order → moving a member out breaks the link). Up/down chevrons in `ExerciseSection` header; threaded via WorkoutPage renderEx (canMoveUp/Down by index).
- Routine builder `TemplateBuilder`: per-row up/down via `moveItem`; `updateTemplate` already rewrites `orderIndex` from array order (no migration).

**Roadmap v3 S2 (On-open reminders) done:**
- Pure `utils/reminders.js` `pickReminders({settings,now,today,weekKey,lastWorkoutDate,streak,markers})` → in-app toasts: weeklySummary (once/ISO week), one daily nudge (streakRisk in evening if streak>0 else gymNudge), suppressed in quiet hours / when trained today / already shown. Tested.
- `notifications.js` exports `inQuietHours` (inDND delegates).
- `hooks/useOnOpenReminders.js`: fires once per app session via `uiStore.showToast`, dedupe markers in `opus_reminder_markers`, gated on loaded+profile+onboarded. Mounted in AppLayout. (Offline-safe; no OS push.)

**S6 (Milestone certificates) dropped** per user.

**Roadmap v3 S7 (Spotify-style Wrapped) done:**
- Pure `utils/wrapped.js`: `buildWrapped(workouts,sets,prs,range,exName)` (sessions/volume/sets/PRs/XP/hours/top-lift/busiest-day/weekly series) + `monthRange`/`yearRange`/`rangeOf`/`availablePeriods` (months newest-first + years from first workout). Tested.
- `hooks/useWrapped.js` (period → live data + selectable periods; defaults to current month).
- `pages/WrappedPage.jsx` (/wrapped): Month/Year toggle + ◀▸ period stepper, headline volume CountUp + weekly sparkline, stat grid, top-lift/busiest/XP chips, share. Linked from ProfilePage.
- `components/share/WrappedCard.jsx` (1080×1080, sparkline + stats) via generic ShareSheet.

**Roadmap v3 S8 (Living home scene + animated reveals) done:**
- Pure `utils/ambient.js` `sceneParams({streak,level,prestige,reducedMotion})` → {intensity, glowAlpha, goldShade, glowBlur, motionSpeed} (monotonic, clamped, motionSpeed 0 when reduced/effects-off). Tested.
- HomePage greeting gets a radial gold aura that warms/brightens with progression + a slow `breathe` pulse (`animations.css`), gated by `settingsStore.effects` + `prefers-reduced-motion`.
- Animated stat reveals: `CountUp` wired into ProfilePage lifetime tiles (workouts/sets/PRs/best+current streak/total XP) and WeeklyRecap (sessions/PRs/XP), gated by effects.

**Roadmap v3 S1 (Resume in-progress workout) done:**
- `activeWorkout` mirrored to localStorage (`opus_active_workout`): boot-hydrate via `loadActive()` in `workoutStore.js`, write-through via `useWorkoutStore.subscribe`, cleared on complete/discard.
- Pure `utils/workoutSession.js` (`serialize`/`deserialize`/`isStale` — 18h/clock-skew/shape-validated) + test.
- `resumed` store flag + `dismissResumed`; WorkoutPage shows a "Picked up your workout" banner + a one-time success chime/haptic on restore.
- Order note: doing S1 → S8 next (per user); rest of v3 flexible.

**Post-v2 fix:** WeeklyRecap now takes `dismissible` — Home stays dismissible (per-week), and Progress → Overview shows an always-visible copy so "Share my week" is reachable after the Home card is dismissed.

**Sprint 20 part C (Coach marks + final polish + v2.0.0) done:**
- `components/coach/CoachMark.jsx` — per-tab first-use tip (home/progress/workout/exercises/profile), portaled above the bottom nav, "Got it" to dismiss. Gated in AppLayout to after onboarding + tour.
- `settingsStore.coachMarksSeen` (per-route seen-state) + `markCoachSeen`/`resetCoachMarks`. Settings → Experience adds "Show tips again".
- Version bumped to **v2.0.0** (package.json + Settings → About). Roadmap v2 (Sprints 11–20) complete.
- (Optional next: create a git tag v2.0.0 — not done automatically; ask the user.)

**Sprint 20 part B (Challenge card + radar history) done:**
- `utils/snapshots.js` (pure bits tested): monthly character-stat snapshots in localStorage; `monthKeyOf`, `previousSnapshot`, `mergeRadarSeries`, save/get.
- CharacterCard: saves this month's snapshot, overlays the latest prior month as a dashed muted radar series + a Now/Last-month legend.
- `components/share/ChallengeCard.jsx` ("Beat my numbers": workouts/volume/best-streak + level) + "Challenge a friend" share button on ProfilePage.

**Sprint 20 part A (Weekly Recap) done:**
- `hooks/useWeeklyRecap.js` — this week's sessions/volume/sets/PRs/XP/top-lift (Monday-aligned, reuses quests week helpers).
- `components/share/RecapCard.jsx` — 1080×1080 shareable recap (same forwardRef/theme pattern as ShareableCard).
- `components/progress/WeeklyRecap.jsx` — Home card (after Today's card) with stats + "Share my week" (ShareButton+RecapCard) + per-week dismiss.
- `settingsStore.recapDismissedWeek` (+ setter) hides it once dismissed for the current week.
- TODO Sprint 20: B = challenge card + radar-history overlay; C = coach marks + final polish + v2.0.0 bump.

**Quest claims now revert on workout delete (fix):**
- Quest *progress* was already live (useLiveQuery); the gap was claimed-quest XP not reverting on delete (inconsistent w/ achievements).
- `quests.js`: extracted pure `computeQuestStats({workouts,sets,prs,exMuscle})` (reused by useQuests) + `QUEST_BY_ID` + `weekStartMsFromKey`.
- `questActions.reconcileQuests()` re-checks every claim against its week's current data and deletes claims that no longer meet target; wired into `deleteWorkout` before `recomputeProfile` (which sums questClaims XP → XP reverts). Tests added.

**Sprint 19 part 2 (Supersets/circuits) done:**
- In-memory `supersetId` on active-workout exercises (completeWorkout ignores unknown fields → safe; grouping not persisted to history). `workoutStore.toggleSuperset(id)` chains an exercise with the one above (shared groupId) or unlinks it.
- `utils/supersets.js` (tested): `supersetRuns(exercises)` groups contiguous shared-id runs (length-1 = standalone, robust to link/unlink/remove); `noRestIds(exercises)` = members that skip rest (all but the last).
- WorkoutPage renders multi-runs inside a gold left-bracket with a "Superset · N moves · rest after the last" label; ExerciseSection header has a Link/Superset toggle (non-first exercises). Shared rest: `handleSetLogged(exerciseId)` skips the rest timer for non-final superset members.

**Sprint 19 part 1 (Estimated 1RM + Hall of Records) done:**
- `utils/oneRepMax.js` Epley `epley1RM(weight,reps)` (+ test). `useExerciseOneRepMax(id)` (best e1RM per session, oldest→newest) + `useAllPRs()` (all prs newest-first with exercise names).
- ExerciseDetailPage: "Estimated 1RM" card (best value + TrendChart trend, unit-aware).
- New `HallOfRecordsPage` (/records): all PRs grouped by date, newest first; linked from ProfilePage ("Hall of Records" button).
- TODO Sprint 19 part 2: supersets/circuits in the active workout (separate PR — touches core workout flow).

**Sound + activity-history (detour) done:**
- `utils/sound.js` rewritten into a small WebAudio synth (no samples, offline): detuned saw+triangle voices through a lowpass + ADSR + light feedback-delay space. Cues: success, rest, pr (triumphant), achievement (sparkle), quest (IV→I lift), levelup (grand fanfare). Still gated by settingsStore.sound; resumes ctx on gesture (iOS).
- Sound wired to more moments: RestTimer complete (`rest`), QuestBoard claim (`quest`), AchievementToast (`achievement`), workout saved (`success`); pr/levelup unchanged keys, richer output.
- Activity history now fully viewable/editable: `healthActions.logActivity({date,steps,water})` (date-aware upsert) + `deleteActivity`. New `components/progress/ActivityForm.jsx` (add for any past date / edit a day; date locked when editing). Progress → Body "Activity log" section lists recent days with steps+water + edit/delete (closes the addable=editable/deletable gap). Rings still drive today.
- NOTE: future cinematic option = bundle CC0 samples + Howler.js; deferred (sandbox can't fetch audio).

**Evolving Character Mark (Roadmap Sprint 16 visual) done:**
- `components/logo/OpusMark.jsx` now prop-driven by `level` (1–10) + `prestige`: ring thickens, gains one stud per level, a brightening gold halo (boxShadow), and — once prestiging — a slow rotating bright sweep (`.anim-spin-slow`, reduced-motion off) + a crown of gem pips. `level=0` default keeps the plain branding mark (LoadingScreen/Onboarding unchanged).
- `animations.css`: `spin` keyframe + `.anim-spin-slow` (9s linear) with reduced-motion guard.
- `CharacterCard` renders the evolving mark; `LevelBadge` gains optional bright halo ring at prestige; Home strip + Profile now show the prestige rank label (getRankLabel) and pass prestige.
- Share `ProfileCard`: prestige gems beside the OPUS logo + rank label (incl. tier) in share data.
- (Prestige logic getPrestige/prestigeXp/getRankLabel was already shipped + tested.)

**Quests & Weekly Goals (Roadmap Sprint 15) done:**
- `utils/quests.js` (pure, tested): QUEST_POOL (8 defs across 6 metrics), Monday-aligned `weekKeyOf`/`weekStartMs`/`weekIndex`, deterministic `weeklyQuests()` picking 3 distinct-metric quests per week (rotates Mondays, no backend). `quests.test.js`.
- `hooks/useQuests.js`: live progress from this-week's workouts/sets/PRs (sessions, volumeKg, sets, muscleVariety, legsSessions, prs) + claimed state.
- `utils/questActions.js` `claimQuest`: one claim per quest per week → DB `questClaims` + `addXP`.
- DB v8 `questClaims` (`++id, weekKey`). XP is permanent: `recomputeProfile` now sums questClaims XP (survives workout deletes). Auto-covered by export/import/wipe.
- `components/rpg/QuestBoard.jsx` on Home: progress bars, "+XP" claim button (goldPulse) → Particles + haptic + chime; volume targets unit-aware.

**Daily activity (steps + water) (detour) done:**
- DB v7 `dailyLogs` (`++id, date, steps, water`), one row per date. `utils/healthActions.js` setSteps/addWater (upsert today).
- `hooks/useProgress.js` useDailyActivity (today) + useActivityHistory (trends).
- `components/progress/ActivityRings.jsx` — two animated SVG rings (steps=gold, water=sage) on Home: "Add steps" prompt + −/+ glass buttons.
- `settingsStore` stepGoal (8000) / waterGoal (8) + setters; goal inputs in Settings → Profile.
- Progress → Body: Daily steps + Water intake trend charts (last 14 logged days).
- (Water was only ever PRD'd as a reminder type — now a real tracker.)

**Rest timer & tracking (detour) done:**
- RestTimer: presets (1:00/1:30/2:00/3:00) + ±15s adjust; chosen preset persists as `settingsStore.restDuration`. Keyed per set so it resets each rest.
- `utils/restStats.js` (restGaps/avgRest/avgRestAcross/formatRest from set completedAt) + test.
- History detail shows session summary (exercises · total time · avg rest) + per-exercise avg rest.

**Walkthrough tour (detour) done:**
- `components/tour/Tour.jsx` — themed full-screen 8-step carousel (workouts, XP/ranks, achievements, library/notes, routines, recovery/progress, sharing, settings) with dots, Back/Next, Skip.
- `settingsStore.tourSeen` + setTourSeen; shows after onboarding when unseen; Settings → Experience → "Replay walkthrough" re-runs it.
- Final step now ends with "Open Settings" (navigates to /settings) + "Not now", since sound/effects default off — nudges users to switch on what they want.
- CI consolidated into deploy.yml (test gates deploy; PRs run test only); test.yml removed.

**Sprint 17 extension done:**
- Themed in-app dialogs replace all native browser dialogs: `uiStore` (toasts + promise-based `confirm()`/`prompt()`), `components/ui/UiHost.jsx` (ToastHost + ConfirmDialog + PromptDialog, portaled), mounted in AppLayout. Replaced window.confirm (WorkoutCard/Templates/ExerciseDetail), window.prompt (set notes), window.alert (import error → toast).
- RPE UX: replaced the cramped tiny input with tappable chips (6–10) + an info (i) toggle explaining RPE; effort moved to its own row.
- Test: `src/store/uiStore.test.js` (toasts add/dismiss/auto-expire, confirm/prompt promise resolution).

**Sprint 17 done:**
- Dark mode: `:root[data-theme='dark']` flips only chalk/ivory/text tokens. Foreground `color: chalk` usages migrated to `text-inverse` (light in both themes) so contrast holds on stone/obsidian surfaces; literal palette unchanged.
- `settingsStore.theme` (light/dark/system) + `utils/theme.js` (applyTheme + meta theme-color); applied at boot in main.jsx, follows OS on 'system'. Settings → Experience → Theme.
- Motion/life: global colour transition (smooth theme switch), button press-scale (reduced-motion aware), BottomNav active icon lift, pulsing halo on Home start button; SVGs excluded.

**Sprint 16 done:**
- `hooks/useRecovery.js` (ALL_MUSCLES; per-muscle days-since-last-trained + most-neglected).
- `components/progress/RecoveryMap.jsx` — react-body-highlighter colored by recency (ember=today → gold=1d → sage=2d → neutral=ready), front/back toggle, tap-a-muscle info, neglected nudge, legend.
- Shown on HomePage (after today card) once there's history.

**Sprint 15 (partial) done:**
- Fix: deleting a workout now re-locks achievements whose conditions no longer hold (reconcileAchievements) so XP fully reverts.
- Fix (prior): DatabaseClosedError recovery (versionchange handling + DbRecovery screen).
- rpg.js: RANKS ladder, prestige tiers (getPrestige/prestigeXp/roman/getRankLabel) beyond Magnum Opus.
- AchievementsPage (/achievements): full list, how-to, hidden/secret achievements (game-style).
- ProgressionPage (/progression): rank ladder (1-10 titles + XP) + prestige tiers I-V.
- Profile: TrophyCase → /achievements, "View ranks & prestige" → /progression; CharacterCard shows prestige label.
**Testing detour done:**
- Vitest added (`vitest.config.js`, node env, `npm test`); separate from vite build config.
- Unit tests for pure logic: rpg, units, plateCalc, overload, volume(setLoad), achievement predicates (`src/utils/*.test.js`).
- CI: `.github/workflows/test.yml` runs `npm test` on push/PR (independent of the deploy workflow).
- GOING FORWARD: add `*.test.js` for new pure utils; keep DOM/DB-dependent logic out of unit tests or mock it.

**Sprint 14 done:**
- DB v6: `achievements` table. `utils/achievements.js` (19 data-driven defs + computeStats + checkAchievements; awards XP).
- Detection in `completeWorkout` → returns `newAchievements`; also catch-up on mount via `useAchievements`.
- `recomputeProfile` now includes unlocked-achievement XP (so delete-recompute keeps it).
- Components: AchievementBadge, TrophyCase, AchievementToast (unlock celebration: particles + card).
- `hooks/useLifetimeStats` (workouts/volume/sets/PRs/hours/best-streak).
- Profile revamp: name header + identity line, CharacterCard, Lifetime stats grid, current-streak/XP, member-since, TrophyCase, share.

**Sprint 13 done:**
- `components/fx/Particles.jsx` (gold burst, portaled), `components/fx/CountUp.jsx` (odometer)
- `hooks/useHaptics.js` (vibrate patterns, gated by settings.effects), `utils/sound.js` (WebAudio chime, gated by settings.sound)
- settingsStore: effects + sound prefs; Settings → Experience toggles
- LevelUpScreen: particles + haptics + chime
- WorkoutPage: PR burst (particles + pr haptic + chime); success haptic on save
- SetLogger: "+XP" float on set log + tap haptic
- EndWorkoutModal: CountUp odometer for XP + volume
- RestTimer: ring pulses + gold→ember in final 10s + completion haptic
- animations.css: particleFly, floatUp, timerPulse keyframes

**Sprint 12 done:**
- DB v5: `exerciseNotes` table (sticky coaching notes). exercises.favorite/color, sets.note, workouts.color are unindexed fields.
- `utils/noteActions.js` (setExerciseNote/setWorkoutNote/setWorkoutColor/setSetNote), `exerciseActions` (toggleFavorite/setExerciseColor), `templateActions.setTemplateColor`.
- `components/ui/ColorPicker.jsx` + LABEL_COLORS (8 distinct hues).
- Notes: sticky per-exercise coaching note (ExerciseDetailPage editor, shown in ExerciseSection during workout); per-set note (SetLogger prompt → saved on complete, shown in history); session note (WorkoutPage + WorkoutCard).
- Marking: favorite★ + color on exercises (ExerciseCard dot+star, detail toggle, ExercisePage favorites filter); color on templates (TemplateBuilder picker, TemplateCard dot); color on workouts (WorkoutCard picker+dot).

## Roadmap v2
See ROADMAP_V2.md for Sprints 11–20.

**Sprint 11 done:**
- Central units: `store/settingsStore.js` (unit kg/lbs) + `utils/units.js` (toDisplay/toKg/unitLabel/fmtWeight/fmtVolume); threaded through SetLogger, PlateCalculator (lb plates), WorkoutCard, EndWorkoutModal, ExerciseDetail PRs+chart, Progress charts/body, share cards, overload nudge text, template targets.
- Profile identity: name/height/sex/birthYear on userProfile (unindexed, no migration); bodyweight = latest bodyStats (`useCurrentBodyweight`); shown on Profile, editable in Settings.
- Onboarding revamp: name, bodyweight, height, age, sex, units, barbell weight (clarified separate from bodyweight).
- Bodyweight counts toward volume: `utils/volume.js` (computeVolume) + `workouts.bodyweightKg` snapshot; applied in completeWorkout, recomputeWorkoutTotals, useExerciseVolume.
- Name on share cards (ShareableCard athlete, ProfileCard name).

## ⚠️ PRD alignment note
Earlier work got ahead of the PRD sprint order. Actual mapping:
- PRD Sprint 5 (Progressive Overload) — **done**
- PRD Sprint 6 (RPG System) — **done** (radar CharacterCard, level-up celebration, XP animation, XPBar/LevelBadge/TitleBadge)
- PRD Sprint 7 (Templates & Planning) — **done** (targets, weekly planner, today's recommendation, rest-day, repeat-workout, duplication)
Bonus (user-requested, not in PRD): exercise difficulty tags, Wger demo images, disabled Wger auto-sync in favor of curated seed.

## What's working
- Vite + React 18 + Tailwind v3, PWA installable, transparent gold logo
- Design tokens, animations, Google Fonts, loading screen
- React Router v6, BottomNav, all routes
- Dexie DB schema v1 (11 tables), Zustand stores
- Wger API sync + 70-exercise seed data
- useExercises fully wired (live query, search, filter)
- Full exercise library (Sprint 3)

**Sprint 4 additions:**
- `utils/rpg.js` — XP thresholds, titles, calcSetXP, calcWorkoutXP, getLevelFromTotalXP, getXPProgress
- `utils/plateCalc.js` — calcPlates, nearestLoadable
- `workoutStore.js` updated — toggleWarmup, removeExercise, completeWorkout (persists to DB)
- `hooks/useWorkout.js` updated — useWorkouts, useLastSets, useWorkoutSets
- `PlateCalculator.jsx` — colored plate rings per side, target/loaded weight display
- `SetLogger.jsx` — last-session ghost text, warmup toggle, RPE toggle, plate calculator, add set
- `RestTimer.jsx` — SVG circular countdown, vibrate on complete, skip button
- `ExerciseSection.jsx` — exercise card with muscle badge, SetLogger, remove button
- `ExercisePicker.jsx` — modal wrapper around ExerciseSearch + ExerciseList
- `EndWorkoutModal.jsx` — 2×2 stats grid (duration/sets/volume/XP), save & finish
- `WorkoutCard.jsx` — history card: name, date, duration, sets, volume, XP
- `WorkoutPage.jsx` — full active workout: start screen → session with timer, rest timer, exercises, end modal
- `HistoryPage.jsx` — completed workouts list

**Sprint 5 additions:**
- DB version 2: adds `difficulty` index, clears exercises on upgrade for clean re-seed
- `seedExercises.js` rebuilt: all exercises have `difficulty` (beginner/intermediate/advanced); Wger auto-sync disabled
- `ExerciseCard.jsx`: difficulty badge (color-coded: sage/gold/ember)
- `ExerciseDetailPage.jsx`: live Wger demo image fetched by exercise name; difficulty badge
- `HomePage.jsx`: level/XP strip, streak badge, quick-start CTA, last 3 workouts
- `ProfilePage.jsx`: SVG level ring, XP progress bar, title chip, stats grid (workouts / streak / XP)
- `workoutStore.js`: PR detection on complete (weight/reps/volume per exercise), streak tracking, XP award all happen inside `completeWorkout`
- Bug fix: `muscleGroup` (singular) used correctly in WorkoutPage

**Sprint 6 additions:**
- DB v3: indexes `workouts.createdAt` (fixed SchemaError)
- `useTemplates.js` — `useTemplatesWithExercises()` joins templates + exercise details
- `utils/templateActions.js` — createTemplate / updateTemplate / deleteTemplate
- `TemplateCard.jsx` — routine card: name, day badge, exercise count, muscle tags, start/edit/delete
- `TemplateBuilder.jsx` — modal: name, day picker, multi-add exercises, save
- `TemplatesPage.jsx` (/templates) — list + create + edit + delete routines
- `ExercisePicker.jsx` — added `multi` mode (stays open, "Done" button) for routine building
- `workoutStore.startFromTemplate(template)` — pre-loads exercises into active workout
- WorkoutPage start screen: Quick start + routine list (one-tap start) + Manage link

**PRD Sprint 5 — Progressive Overload Engine (this commit):**
- `utils/overload.js` — getOverloadSuggestion (three-lever logic), isDeloadDue (5+ day detector)
- `hooks/useOverload.js` — useOverload(exerciseId) from last 3 sessions; useDeloadDue()
- `hooks/useProgress.js` — useExerciseVolume(id) per-session volume aggregation
- `components/workout/OverloadNudge.jsx` — gold coaching nudge above each exercise in active workout
- `components/progress/VolumeChart.jsx` — Recharts bar chart, last 10 sessions
- `components/progress/PRBadge.jsx` — gold-pulse PR badge
- ExerciseDetailPage: real volume chart + PR badges (replaced placeholders)

**PRD Sprint 6 — RPG System (completed):**
- `utils/rpg.js` — getCharacterStats (5-axis radar normalization)
- `userStore.addXP` — recomputes level + title on every gain
- `workoutStore.completeWorkout` — streak bonus XP, returns level-up info
- `hooks/useRPG.js` — useCharacterStats (live radar data from history)
- `components/rpg/` — XPBar (animated), LevelBadge, TitleBadge, CharacterCard (Recharts radar), LevelUpScreen (full-screen celebration)
- EndWorkoutModal — animated XP bar showing the gain
- ProfilePage — CharacterCard radar; HomePage — LevelBadge + XPBar

**PRD Sprint 7 — Templates & Planning (completed):**
- DB v4: templateExercises gains targetSets/targetReps/targetWeight
- templateActions: targets in create/update, duplicateTemplate, assignTemplateToDay, clearDay
- TemplateBuilder: per-exercise target inputs (sets × reps @ kg)
- useTemplates: targets joined in; `useToday()` recommendation (template / rest / fresh)
- WeeklyPlanner: 7-day grid to assign routines to weekdays
- HomePage: today's-workout card (assigned routine, rest-day, or fresh start)
- workoutStore.repeatWorkout + WorkoutCard expandable detail with "Repeat this workout"
- ExerciseSection shows template target hint during active workout

**PRD Sprint 8 — Body Stats, Health & Progress Charts (completed):**
- `utils/healthActions.js` — logBodyStat (upsert by date), logSleep
- `hooks/useProgress.js` — useWeeklyVolume, useMuscleFrequency, useWorkoutDays, useExerciseMaxWeight, useSleepLogs
- `components/progress/` — TrendChart (line), MuscleFrequency (bars), Heatmap (12-week grid), BodyStatsForm, SleepForm
- ProgressPage: 3 tabs — Overview (weekly volume / muscle focus / training calendar), By Exercise (max weight + volume), Body (weight trend / measurements / sleep)
- Energy check-in (1-5) at workout start → saved to energyLogs on complete
- UX bonus: modal height cap + scrollable body; delete workouts from cards

**PRD Sprint 9 — Notifications & Shareable Card (completed):**
- `utils/share.js` — html2canvas capture → Web Share API (files) with download fallback
- `components/share/ShareableCard.jsx` — 1080×1080 card (name, muscles, volume/sets/duration, PR, level, XP)
- `components/share/ShareButton.jsx` — button + off-screen capture card; share from end-of-workout modal AND expanded history/recent cards
- `hooks/useWorkout.js` — useShareData(workoutId)
- `utils/notifications.js` + `hooks/useNotifications.js` — permission flow, per-type toggles, quiet hours (DND), PR celebration fires on finish; one-time prompt after first workout
- Settings: Notifications section (master + types + quiet hours)

**Critical fix — modals/overlays portaled:**
- `.anim-fade-slide-up` uses `both` fill, leaving `transform: translateY(0)` on page
  wrappers permanently → that made the wrapper the containing block for any
  `position: fixed` child, so modals rendered trapped at the top of the page
  (seen on Progress → By Exercise picker). Fixed by rendering Modal + LevelUpScreen
  via `createPortal(..., document.body)`. RULE: any full-screen fixed overlay MUST
  portal to body.

**Sprint 9 extension:**
- Bodyweight exercises: SetLogger detects `equipment === 'bodyweight'` → reps-only
  (no forced weight), optional "+ Add weight" for weighted variations; bodyweight
  sets earn XP from reps (calcSetXP) and record rep PRs
- Profile sharing: ProfileCard (level, title, character-stat bars, totals)
- Customize-before-share: ShareSheet modal with live preview + theme (Slate/Black/
  Light) + accent (gold/ember/sage) pickers; cards accept a `theme` prop
- ShareButton now opens the customizer; works for workout + profile cards

**PRD Sprint 10 — Polish, PWA & Launch (completed):**
- ErrorBoundary wrapping the app (friendly crash screen instead of white screen)
- First-run Onboarding (name + barbell weight); Home greets by name
- Settings completed: Profile (name, bar weight), Data (JSON export/import), plus
  existing Notifications + Danger zone
- `settingsStore` (bar weight + onboarded flag); PlateCalculator uses it
- README.md written
- DEFERRED: kg/lbs unit conversion — needs threading through every weight display
  to stay consistent (the user dislikes partial/inconsistent UI), so left as a
  dedicated follow-up rather than half-done. Bar weight + all data are in kg.

## What's in progress
- Nothing — PRD Sprints 1–10 complete. MVP shipped (v1.0.0).

## What's not started
- PRD Sprint 10 (Polish, PWA, onboarding, data export/import, launch)

## Note on scheduled notifications
A static GitHub Pages PWA can't deliver true background notifications (no push
server). PR celebrations fire while the app is open; gym-nudge/streak/weekly are
preference-ready and would need push infra (or periodic background sync) to deliver.

## UX standard (keep for all future work)
- Bottom-sheet modals cap at 90vh with fixed header + scrollable body (never push off-screen top)
- All pages render inside AppLayout main with pb-24 for BottomNav clearance
- Destructive actions (delete) require confirm; full data wipe requires typing "DELETE"
- Design for an Android phone screen first: compact filters, generous tap targets,
  give content (lists) vertical priority over chrome. Settings reachable via gear on Profile.
- Full reset: Settings → Danger zone → type DELETE → wipeAllData() clears all tables +
  localStorage, then reloads to BASE_URL for a clean start.

## Data-integrity principle (keep for all future work)
Anything addable must be removable/editable/deletable, and deletes must revert
ALL derived data. Reference: `deleteWorkout` reverses sets, energy logs, PRs
(recomputed), and XP/level/title/streak (recomputed from remaining workouts).
- Workout XP is stored as the full gained amount per workout (`xpEarned`), so the
  profile can be rebuilt by summing remaining workouts.
- `recomputeProfile()` / `recomputePRs()` in utils/workoutActions.js are the
  canonical rebuilders — reuse them after any deletion that affects history.
- Custom exercises: deletable (cascades sets/PRs/template refs + refreshes
  workout totals). Body-stat & sleep entries: deletable. Built-in seed
  exercises are intentionally not deletable.

## Known issues / deviations
- Local builds blocked (web session network policy); CI builds on GitHub Actions
- No package-lock.json; workflow uses `npm install`
- Exercise virtual scrolling deferred (Wger sync loads 700+; sprint 5 concern)
- Wger exercise names are verbose/scientific; curated seed list covers main compound movements

## File tree (current src/)
```
src/
├── assets/lifter.png
├── components/
│   ├── exercise/{BodyPicker,ExerciseCard,ExerciseSearch,ExerciseList,ExerciseForm}.jsx
│   ├── layout/{AppLayout,BottomNav,TopBar,PageWrapper}.jsx
│   ├── logo/{OpusMark,LoadingScreen}.jsx
│   ├── ui/Modal.jsx
│   └── workout/{PlateCalculator,SetLogger,RestTimer,ExerciseSection,ExercisePicker,EndWorkoutModal,WorkoutCard}.jsx
├── db/{db,migrations}.js
├── hooks/{useExercises,useWorkout,useProgress,useRPG,useNotifications,useOverload}.js
├── pages/{Loading,Home,Workout,History,Exercise,ExerciseDetail,Progress,Profile,Settings}Page.jsx
├── store/{workoutStore,uiStore,userStore}.js
├── styles/{tokens,animations}.css
├── utils/{wger,seedExercises,rpg,plateCalc}.js
├── index.css, main.jsx, router.jsx
```

## Next session — Sprint 5
- RPG profile page: level ring, XP bar, title, streak display
- HomePage: recent workouts, quick-start, streak banner
- PR detection: compare new set against historical bests, award PR_BONUS XP

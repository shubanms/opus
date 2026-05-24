# OPUS — Project State

Last updated: 2026-05-24
Current sprint: Roadmap v3 COMPLETE (S1–S5, S7, S8; S6 dropped). App at v3.0.0.
Current version: v3.0.0

> Docs reorganized into `docs/` (this file moved here). Index: `docs/README.md`. Map: `docs/ARCHITECTURE.md`.
> Rules: `docs/GUIDELINES.md`. Per-version features: `docs/RELEASES.md`. Entry point: root `CLAUDE.md`.

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

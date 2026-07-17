# OPUS — Architecture & codebase map

The efficiency reference: what exists and where. Check here before grepping. Keep updated when adding a table, field, util, hook, route, store, or localStorage key.

## Stack
Vite 5 · React 18 · Tailwind v3 · Dexie.js (IndexedDB) · Zustand · React Router v6 · Recharts · react-body-highlighter · lucide-react · html2canvas · vite-plugin-pwa. Vitest (node env) for unit tests. Deploy: GitHub Pages via `.github/workflows/deploy.yml` (test job gates build-and-deploy; base path `/opus/`).

## Routes (`src/router.jsx`)
`/` Loading · `/home` · `/workout` · `/history` · `/templates` · `/exercises` · `/exercises/:id` · `/progress` · `/profile` · `/settings` · `/achievements` · `/progression` · `/records` (Hall of Records) · `/wrapped` (Spotify-style recap). All under `AppLayout` (BottomNav + Onboarding/Tour/CoachMark/UiHost gates).

## DB (`src/db/db.js`) — Dexie, current v8
- v1–2: `exercises`(++id,name,muscleGroup,equipment,isCustom,difficulty; +favorite,color unindexed)
- v2: `workouts`(++id,date,templateId,status,duration; +name,notes,energy,totalVolume,totalSets,xpEarned,bodyweightKg,color,createdAt), `sets`(++id,workoutId,exerciseId,setNumber,reps,weight,completedAt; +isWarmup,rpe,note), `templates`(++id,name,dayOfWeek,createdAt;+color,**autoKey** unindexed — marks auto-generated routines + muscle signature for re-match), `templateExercises`(++id,templateId,exerciseId,orderIndex; +targetSets/Reps/Weight v4), `prs`(++id,exerciseId,type,value,achievedAt,workoutId), `bodyStats`(++id,date,weight,bodyFat), `sleepLogs`(++id,date,hours,quality), `energyLogs`(++id,workoutId,level), `userProfile`(++id; name,height,sex,birthYear,level,xp,totalXp,title,streak,lastWorkoutDate,joinDate), `notifications`(unused table)
- v3: `workouts.createdAt` index · v4: templateExercises targets · v5: `exerciseNotes`(++id,exerciseId,text,updatedAt) · v6: `achievements`(++id,key,unlockedAt) · v7: `dailyLogs`(++id,date,steps,water) · v8: `questClaims`(++id,weekKey; questId,xp,claimedAt)
- Recovery: `versionchange` handler closes+reloads; `db.open()` gated in main.jsx; `DbRecovery` screen.

## localStorage keys
- `opus_prefs` (settingsStore): barWeight, unit, onboarded, effects, sound, theme, **themeOnOpen**, tourSeen, restDuration, stepGoal, waterGoal, recapDismissedWeek, coachMarksSeen, inventory{active,gym/home:{barKg,plates,unit}}
- `opus_notif_settings`, `opus_notif_prompted` (notifications)
- `opus_snapshots` (monthly character-stat snapshots)
- `opus_active_workout` (in-progress session — S1 resume)
- `opus_reminder_markers` (on-open reminder dedupe — S2)
- `wger_cache_time`

## Stores (`src/store/`)
- **workoutStore** — `activeWorkout` (+localStorage write-through/hydrate, `resumed`/`dismissResumed`), start/startFromTemplate/repeatWorkout, addExercise/removeExercise/**moveExercise**, logSet/removeSet/setSetNote/toggleWarmup, **toggleSuperset**, setEnergy/Name/Notes, **completeWorkout** (writes DB, PR detection, XP/streak, achievements; returns {workoutId,prCount,xpEarned,leveledUp,newLevel,newTitle,newAchievements}), discardWorkout.
- **userStore** — profile init/update, `addXP` (recomputes level/title).
- **uiStore** — toasts + promise-based `confirm`/`prompt`; `showToast(message,opts)`.
- **settingsStore** — prefs (see localStorage) + setters; `applyTheme` on setTheme.

## Utils (`src/utils/`) — pure unless noted
units (kg/lbs: toDisplay/toKg/unitLabel/fmtWeight/fmtVolume) · **setDiff** (diffSet/alignSets/diffsBySetNumber — per-set "vs last session" deltas; also in `@opus/core`) · **dateKey** (todayKey/parseKey/daysBetween — local-calendar date keys; fixes recovery TZ lag) · **routineName** (deriveRoutineName → {name,autoKey} from muscle counts: Chest/Push/Pull/Leg/Upper/Full/Core Day) · rpg (XP thresholds, titles, prestige, getCharacterStats radar, getXPProgress, calcSetXP) · volume (computeVolume, bodyweight-aware) · plateCalc (calcPlates/nearestLoadable, takes a plates arg) · **inventory** (togglePlate/effectivePlates) · overload (3-lever + deload) · restStats · oneRepMax (epley1RM) · achievements (19 defs, computeStats, checkAchievements, reconcileAchievements) · quests (QUEST_POOL, week helpers, weeklyQuests, computeQuestStats, QUEST_BY_ID, weekStartMsFromKey) · questActions (claimQuest, **reconcileQuests** — DB) · **supersets** (supersetRuns/noRestIds) · **reorder** (moveItem) · **workoutSession** (serialize/deserialize/isStale) · **reminders** (pickReminders) · **ambient** (sceneParams) · **wrapped** (buildWrapped/monthRange/yearRange/availablePeriods) · snapshots (monthKeyOf/previousSnapshot/mergeRadarSeries + save/get) · **csv** (escapeCsv/toCsv/setsToCsv) · workoutActions (DB: completeWorkout helpers, deleteWorkout, recomputeProfile, recomputePRs) · healthActions (logBodyStat/logSleep/setSteps/addWater/logActivity/deleteActivity) · noteActions · exerciseActions · templateActions (toLinks writes orderIndex; createTemplate/updateTemplate carry unindexed `autoKey`; **saveWorkoutAsRoutine** derives targets from logged sets + updates the autoKey-matched routine in place; **renameTemplate** name-only) · dataActions (exportData/importData/wipeAllData/**exportSetsCsv**/**exportPdf**) · notifications (getSettings, inQuietHours, notify, **showNotification** — routes through `serviceWorker.ready.showNotification` so Android/PWA actually fires, maybePromptPermission) · sound (WebAudio synth, playChime cues, **playIntro** + `themeOpen` cinematic cold-start cue) · theme · seedExercises (~70) · wger.
Tested utils: rpg, units, plateCalc, overload, volume, achievements, restStats, quests, oneRepMax, supersets, snapshots, workoutSession, reminders, reorder, ambient, wrapped, csv, inventory, dateKey, routineName + uiStore.

## Hooks (`src/hooks/`)
useWorkout(useWorkouts/useLastSets/useWorkoutSets/useShareData) · useExercises · useProgress (usePRs, useBodyStats, useLifetimeStats, useDailyActivity, useActivityHistory, useCurrentBodyweight, useExerciseVolume, **useExerciseOneRepMax**, useWeeklyVolume, useMuscleFrequency, useWorkoutDays, useExerciseMaxWeight, useSleepLogs, **useAllPRs**, **useTopExercises**) · useRPG/useCharacterStats · useRecovery · useOverload · useAchievements · useQuests · **useWeeklyRecap** · **useWrapped** · useTemplates · useNotifications · **useOnOpenReminders** · useHaptics.

## Key components
- layout: AppLayout, BottomNav, PageWrapper, TopBar
- workout: WorkoutPage, ExerciseSection (link/superset + up/down), SetLogger, RestTimer, PlateCalculator, ExercisePicker, EndWorkoutModal, WorkoutCard
- rpg: CharacterCard (radar + monthly overlay), XPBar, LevelBadge, TitleBadge, LevelUpScreen, AchievementToast/Badge, TrophyCase, QuestBoard
- progress: VolumeChart, TrendChart, MuscleFrequency, Heatmap, RecoveryMap (prop-driven: `data/onSelect/legend/title/icon`; falls back to `useRecovery`; exports `MUSCLE_LABEL`), ActivityRings, WeeklyRecap, ActivityForm, BodyStatsForm, SleepForm, PRBadge
- share: ShareSheet (generic: CardComponent+data+theme), ShareButton, ShareableCard, ProfileCard, RecapCard, ChallengeCard, WrappedCard, themes.js
- fx: Particles, CountUp · logo: OpusMark (evolves by level/prestige), LoadingScreen · ui: Modal, UiHost, ColorPicker · coach: CoachMark · tour: Tour · settings: EquipmentModal, ResetDataModal

## Reusable patterns
- **Share**: build a `data` object → `<ShareButton data={...} CardComponent={X} />`; cards are 1080×1080 `forwardRef` reading `{bg,text,sub,accent}` from theme; html2canvas in `utils/share.js`.
- **Sound/haptics/fx**: `playChime(kind)`, `useHaptics()(kind)`, `<Particles/>`, `<CountUp/>` — all gated by effects/sound.
- **Week math**: `weekKeyOf/weekStartMs` (quests.js, Monday-aligned). **Month/year**: wrapped.js + snapshots `monthKeyOf`.
- **Delete-revert**: deleteWorkout → recomputePRs + reconcileAchievements + reconcileQuests + recomputeProfile.
- **Persisted prefs**: settingsStore `load()`/`persist()` localStorage pattern.

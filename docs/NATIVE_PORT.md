# OPUS → Native (React Native + Expo) — port blueprint

## Why

Capacitor's WebView bridge can't reliably deliver the native features OPUS needs. On device the
notification toggle and Health Connect both hang on the first native call (in-app diagnostic reads
`bridge: android · Timeout` — the bridge connects but plugin calls never return, most likely the PWA
service worker intercepting Capacitor's call channel). Rather than keep fighting the WebView, OPUS is
being ported to a **proper native Android app in React Native + Expo** (real native modules, no
WebView) while **keeping the web PWA**. Both live in **one monorepo** sharing a core logic package.
`react-native-health-connect` provides what Capacitor can't: steps, weight, **sleep**, heart rate, and
**background sync**.

## Monorepo layout (both PWA + native app, one repo)
```
opus/
  packages/core/     # framework-agnostic pure logic + tests (SHARED by web + mobile)
  apps/mobile/       # React Native + Expo app (new native target)
  apps/web/          # the Vite PWA — MOVE here in Phase A.2 (currently still at repo root)
  src/, index.html…  # (transitional) the web PWA still lives at root for now
```
`packages/core` is the single source of shared domain logic. Per-app: UI, storage adapter, platform
modules. The web PWA + its Capacitor Android shell are web-only and stay with the web app.

## Current state — Phase A (scaffold) DONE
- **`packages/core`** created and **green (158 tests)**. Contains 22 framework-agnostic utils copied
  verbatim from `src/utils` (proven, test-backed): `rpg, overload, quests, oneRepMax, supersets,
  routineName, dateKey, plateCalc, inventory, restStats, csv, reorder, ambient, bosses, decay,
  staleRoutine, mascot, workoutSession, units, routineGenerator, goals, seedExercises`. Exposed
  namespaced (`import { rpg } from '@opus/core'`) and by subpath (`@opus/core/dateKey`).
- **`apps/mobile`** Expo skeleton that imports `@opus/core` and renders live shared values (proves
  code-sharing works in RN). `app.json` declares the Android package, Health Connect + notification
  permissions, and `minSdkVersion 26`. `metro.config.js` is monorepo-aware.
- The web PWA is **untouched** (root `package.json`/config unmodified) so its build, `test` job, and
  APK pipeline stay green. `packages/core` + `apps/mobile` are additive, isolated, and NOT yet npm
  workspaces (kept that way on purpose so the web CI can't be destabilized).

### Not yet extracted to core (need their impure deps split first)
`wrapped` (→ `snapshots`) and `reminders` (→ `notifications`); and the MIXED utils `volume`,
`achievements`, `snapshots` — extract the pure half to core, adapter-wrap the DB/storage half.

## Reuse map (what moves vs gets rewritten)
- **Reuse as-is → `packages/core`:** the 22 pure utils above (+ the pure halves of volume/achievements/
  snapshots), Zustand *reducer* logic, `uiStore`, `share/themes.js`, and the DB schema as shared types.
- **Adapter layer (identical signatures, per-platform impl):** the 16 impure utils (`workoutActions,
  healthActions, exerciseActions, noteActions, templateActions, questActions, dataActions, wger, share,
  sound, theme, notifications, health` + DB halves of volume/achievements/snapshots) and the
  persistence halves of `settingsStore/userStore/workoutStore`. Web = Dexie + localStorage; Mobile =
  SQLite + MMKV.
- **Full rewrites (mobile UI):** 14 pages + 65 components in native primitives; 15 `useLiveQuery` hooks
  re-authored over a reactive SQLite layer (keep each hook's transform logic). Heaviest: the progress
  chart cluster (Recharts→native), share cards (html2canvas→view-shot), the 3D mascot (three→native GL).

## Mobile tech choices
- **Expo** (config plugins + EAS Build/Update). **Expo Router** (replaces react-router). **NativeWind**
  (Tailwind classes in RN).
- **DB:** `expo-sqlite` + **Drizzle**, or **WatermelonDB** (built-in observers = closest to
  `useLiveQuery`; recommended for reactivity parity). Reproduce the v1–v8 schema (15 tables).
- **Charts:** `victory-native`. **Body map:** `react-native-body-highlighter`. **Icons:**
  `lucide-react-native`. **3D:** `@react-three/fiber/native` + `expo-gl` + `expo-three` (do last; 2D
  fallback first). **Share cards:** `react-native-view-shot` + Share API.
- **Notifications:** Notifee (or `expo-notifications`) — scheduled, channels, background.
- **Health Connect:** `react-native-health-connect` + Expo config plugin; background via
  `expo-task-manager`/`expo-background-fetch`.
- **KV/prefs:** `react-native-mmkv`. **Haptics:** `expo-haptics`. **Sound:** `expo-av`.

## Data layer & migration
Reproduce `OpusDB` v8 in SQLite: `exercises, workouts, sets, templates, templateExercises, prs,
bodyStats, sleepLogs, energyLogs, userProfile, notifications, exerciseNotes, achievements, dailyLogs,
questClaims` (`++id`→`INTEGER PRIMARY KEY AUTOINCREMENT`; unindexed fields → columns incl.
`templates.autoKey`). Provide a one-time **import from the web JSON export** (`dataActions.exportData`)
so users can move data web→mobile. localStorage keys (`opus_prefs, opus_active_workout, opus_snapshots,
opus_notif_*, opus_reminder_markers, wger_cache_time`) → MMKV. Drop web-only recovery mechanics
(`versionchange`/reload/`DbRecovery`).

## Roadmap
- **A (done):** monorepo dirs + `packages/core` (green) + `apps/mobile` skeleton + this doc.
- **A.2:** convert to real npm/pnpm workspaces and move the web PWA into `apps/web` (update
  Vite/Tailwind/vitest/Capacitor configs + `deploy.yml`/`android-release.yml` paths); switch web
  imports to `@opus/core` and delete the duplicated `src/utils` pure files. Keep PWA + APK CI green.
- **B — Data layer:** SQLite schema + migrations mirroring v1–v8; Repository impl + seed; reactive
  query layer; port settings/user/workout persistence adapters.
- **C — Core flows (native UI):** Home → Workout logging (SetLogger/ExerciseSection/RestTimer) →
  Exercises → Progress → Profile.
- **D — Native wins:** Health Connect background auto-sync (steps/weight/sleep/hydration);
  notifications (scheduled/background); home/lock-screen widget.
- **E — Polish:** charts, body map, share cards, animations/haptics/sound, 3D companion (or fallback).
- **F — Build/dist:** EAS Build → installable APK + mobile CI; versioning.

## Verification
- `packages/core`: `cd packages/core && npm test` (vitest) — currently 158 passing.
- `apps/mobile`: `cd apps/mobile && npm install && npx expo start` boots and renders shared-core values;
  native modules require a dev build (`npx expo run:android`, not Expo Go) + on-device testing.
- Web PWA unaffected: root `npm run build` + `vitest` stay green; existing deploy + APK CI unchanged.

## Sources
- react-native-health-connect (matinzd): https://github.com/matinzd/react-native-health-connect
- Expo Health Connect config plugin: https://matinzd.github.io/react-native-health-connect/docs/get-started/
- Background health sync (Open Wearables): https://openwearables.io/docs/sdk/react-native

# @opus/mobile — OPUS native app (React Native + Expo)

Phase-A scaffold. Proves the shared `@opus/core` package runs inside React Native; screens,
data layer, Health Connect and notifications are built out per **`docs/NATIVE_PORT.md`**.

## Run it
```bash
cd apps/mobile
npm install
npx expo install --fix   # aligns react / react-native to the Expo SDK
npx expo start           # dev; press "a" for Android (needs a dev build for native modules)
# Health Connect / notifications require a dev build, not Expo Go:
npx expo run:android
```

## What's here
- `App.js` — a demo screen importing `@opus/core` (`dateKey`, `oneRepMax`, `rpg`) to prove the
  shared logic works unchanged in RN.
- `app.json` — Expo config: android package `com.shubanms.opus`, Health Connect + notification
  permissions, `expo-build-properties` pinning `minSdkVersion 26` (Health Connect floor).
- `metro.config.js` — monorepo-aware resolver so `@opus/core` resolves from `../../packages/core`.

## Next (see docs/NATIVE_PORT.md)
Add: Expo Router, NativeWind, WatermelonDB/expo-sqlite (mirror the v1–v8 schema),
`react-native-health-connect`, Notifee, victory-native, lucide-react-native, then port screens
Home → Workout → Progress → Profile.

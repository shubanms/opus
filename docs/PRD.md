# OPUS — Product Requirements Document
> Version 1.0 | May 2026  
> Author: shubanms | Co-author: Claude  
> Repo: https://github.com/shubanms/opus  
> Live: https://shubanms.github.io/opus/

---

## ⚠️ THINGS YOU (shubanms) MUST ADD MANUALLY

Before handing this to a coding agent, you need to provide:

1. **`src/assets/lifter.png`** — The weightlifter logo image (transparent background PNG). Place it at this exact path.
2. **`.env`** — Not needed for MVP (no secrets). Skip for now.
3. **Git identity** — Run once in your repo:
   ```bash
   git config user.name "shubanms"
   git config user.email "your@email.com"
   ```

That is literally all. Everything else is built by Claude.

---

## 1. PROJECT OVERVIEW

### What is OPUS?
OPUS is a free, offline-first Progressive Web App (PWA) for gym tracking. It combines serious workout logging with an RPG progression system — every rep earns XP, every milestone unlocks a title, and your stats grow like a character sheet. No subscriptions. No cloud. Everything lives on your phone.

### Tagline
> **Build your masterpiece.**

### Core philosophy
- **Zero friction** — Log a set in 3 taps
- **Truly free** — No paywalls, no ads, ever
- **Your data stays yours** — 100% local, IndexedDB via Dexie.js
- **Premium feel** — Looks and feels better than paid apps
- **Gamified** — Training should feel like levelling up

### Target user
Someone who goes to the gym regularly, lifts weights, and is frustrated that good tracking apps cost money or are bloated with features they don't need.

### Platform
- Android-first PWA (installable via "Add to Home Screen")
- iOS compatible (iOS 16.4+ required for notifications)
- Desktop works but mobile is the priority

---

## 2. TECH STACK

| Layer | Technology | Why |
|-------|-----------|-----|
| Build tool | Vite 5 | Fast, modern, PWA plugin support |
| Framework | React 18 | Component model, hooks |
| Styling | Tailwind CSS v3 | Utility-first, no CSS bloat |
| Database | Dexie.js 3 | Clean IndexedDB wrapper |
| Body model | react-body-highlighter | Real anatomical SVG polygons |
| Exercise data | Wger REST API | Free, open-source exercise database |
| PWA | vite-plugin-pwa | Service worker + manifest auto-generation |
| Notifications | Web Notifications API | Scheduled local notifications |
| Charts | Recharts | Volume/progress charts |
| Icons | Lucide React | Clean, consistent icon set |
| Routing | React Router v6 | Client-side navigation |
| State | Zustand | Lightweight global state |
| Sharing | html2canvas | Render shareable card as image |
| Hosting | GitHub Pages | Free static hosting |
| CI/CD | GitHub Actions | Auto build + deploy on push |

### Package versions (pin these)
```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-router-dom": "^6.23.0",
  "zustand": "^4.5.0",
  "dexie": "^3.2.4",
  "dexie-react-hooks": "^1.1.7",
  "react-body-highlighter": "^2.0.5",
  "recharts": "^2.12.0",
  "lucide-react": "^0.383.0",
  "html2canvas": "^1.4.1",
  "tailwindcss": "^3.4.0",
  "vite": "^5.2.0",
  "vite-plugin-pwa": "^0.19.0"
}
```

---

## 3. REPOSITORY STRUCTURE

```
opus/
├── public/
│   ├── lifter.png              ← YOU ADD THIS (transparent PNG logo)
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── assets/
│   │   └── lifter.png          ← Copy here too for import usage
│   ├── components/
│   │   ├── ui/                 ← Reusable UI primitives
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── BottomSheet.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Toast.jsx
│   │   ├── layout/
│   │   │   ├── BottomNav.jsx
│   │   │   ├── TopBar.jsx
│   │   │   └── PageWrapper.jsx
│   │   ├── logo/
│   │   │   ├── OpusMark.jsx    ← Logo ring + image component
│   │   │   └── LoadingScreen.jsx
│   │   ├── exercise/
│   │   │   ├── BodyPicker.jsx  ← Anatomy model + muscle selector
│   │   │   ├── ExerciseCard.jsx
│   │   │   ├── ExerciseSearch.jsx
│   │   │   └── ExerciseList.jsx
│   │   ├── workout/
│   │   │   ├── SetLogger.jsx
│   │   │   ├── RestTimer.jsx
│   │   │   ├── PlateCalculator.jsx
│   │   │   ├── WorkoutCard.jsx
│   │   │   └── OverloadNudge.jsx
│   │   ├── progress/
│   │   │   ├── VolumeChart.jsx
│   │   │   ├── RadarChart.jsx
│   │   │   ├── PRBadge.jsx
│   │   │   └── StreakDisplay.jsx
│   │   ├── rpg/
│   │   │   ├── XPBar.jsx
│   │   │   ├── LevelBadge.jsx
│   │   │   ├── CharacterCard.jsx
│   │   │   └── TitleBadge.jsx
│   │   └── share/
│   │       └── ShareableCard.jsx
│   ├── pages/
│   │   ├── LoadingPage.jsx
│   │   ├── HomePage.jsx        ← Dashboard
│   │   ├── WorkoutPage.jsx     ← Active workout
│   │   ├── HistoryPage.jsx     ← Past workouts
│   │   ├── ExercisePage.jsx    ← Exercise library
│   │   ├── ProgressPage.jsx    ← Charts + stats
│   │   ├── ProfilePage.jsx     ← RPG character + body stats
│   │   └── SettingsPage.jsx
│   ├── store/
│   │   ├── workoutStore.js     ← Active workout state
│   │   ├── uiStore.js          ← UI state (modals, toasts)
│   │   └── userStore.js        ← User profile + RPG state
│   ├── db/
│   │   ├── db.js               ← Dexie instance + schema
│   │   └── migrations.js       ← Schema version migrations
│   ├── hooks/
│   │   ├── useWorkout.js
│   │   ├── useExercises.js
│   │   ├── useProgress.js
│   │   ├── useRPG.js
│   │   ├── useNotifications.js
│   │   └── useOverload.js
│   ├── utils/
│   │   ├── overload.js         ← Progressive overload engine
│   │   ├── rpg.js              ← XP, levels, titles logic
│   │   ├── plateCalc.js        ← Plate calculator
│   │   ├── share.js            ← Shareable card generator
│   │   ├── notifications.js    ← Notification scheduler
│   │   └── wger.js             ← Wger API client
│   ├── styles/
│   │   ├── tokens.css          ← CSS custom properties (design tokens)
│   │   └── animations.css      ← Keyframe animations
│   ├── App.jsx
│   ├── main.jsx
│   └── router.jsx
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions deploy
├── STATE.md                    ← Current project state (always update)
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── package.json
└── README.md
```

### Modularity rules for coding agents
- **One component per file** — never combine multiple components in one file
- **No file over 200 lines** — split if it grows beyond this
- **CSS lives in `tokens.css` and `animations.css`** — no inline styles except Tailwind utilities
- **All DB access through hooks** — never call `db` directly from components
- **All business logic in `utils/`** — components are dumb renderers
- **Zustand stores for cross-component state** — no prop drilling past 2 levels

---

## 4. DESIGN SYSTEM

### Colour tokens
Define these in `src/styles/tokens.css` as CSS custom properties AND in `tailwind.config.js`:

```css
:root {
  /* Backgrounds */
  --color-chalk:    #F7F5F2;   /* Main app background */
  --color-ivory:    #EDEAE5;   /* Card surfaces */
  --color-stone:    #2C2C2C;   /* Dark card surfaces */
  --color-obsidian: #111010;   /* Deepest background */

  /* Text */
  --color-text-primary:   #1A1A1A;  /* Headings */
  --color-text-secondary: #8A8780;  /* Labels, captions */
  --color-text-inverse:   #F7F5F2;  /* Text on dark */

  /* Accents */
  --color-gold:   #C9A84C;   /* XP, PRs, badges — use sparingly */
  --color-ember:  #D4622A;   /* Streaks at risk, urgent */
  --color-sage:   #6B8F71;   /* Success, goals hit */

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Border radius */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-2xl:  24px;
  --radius-full: 9999px;
}
```

### Typography
Import from Google Fonts in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display | Cormorant Garamond | 700 | App name, workout titles, hero numbers |
| Heading | DM Sans | 600 | Section headers, card titles |
| Body | DM Sans | 400 | All body text, labels |
| Emphasis | DM Sans | 500 | Button labels, selected states |
| Numbers | DM Mono | 500 | Stats, weights, reps, XP values |

Define in `tailwind.config.js`:
```js
fontFamily: {
  display: ["'Cormorant Garamond'", "serif"],
  sans:    ["'DM Sans'", "sans-serif"],
  mono:    ["'DM Mono'", "monospace"],
}
```

### Animation principles
Define in `src/styles/animations.css`:
- **All easing**: `cubic-bezier(0.22, 1, 0.36, 1)` — ease-out only, never bouncy
- **Duration scale**: micro=150ms, standard=250ms, enter=350ms, loading=600ms+
- **Gold shimmer**: sweeps across on PR/level-up moments
- **XP arc fill**: circular arc animates fill on XP gain
- **Counter tick**: numbers tick up like a mechanical counter on set log
- **Page transitions**: slide up from bottom (200ms ease-out)
- **Card entrance**: fade + 2px translate-up, staggered if multiple

```css
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes tickUp {
  from { transform: translateY(4px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ringDraw {
  from { stroke-dashoffset: 565; }
  to   { stroke-dashoffset: 0; }
}
@keyframes goldPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
  50%       { box-shadow: 0 0 0 8px rgba(201,168,76,0.3); }
}
```

---

## 5. LOGO & LOADING SCREEN

### OpusMark component (`src/components/logo/OpusMark.jsx`)
Props:
- `size` (number, default 200) — diameter in px
- `dark` (bool, default true) — dark or light background
- `animate` (bool, default false) — animate ring drawing

Behaviour:
- Circular container with `border-radius: 50%` and `overflow: hidden`
- Background: obsidian (dark=true) or chalk (dark=false)
- `lifter.png` centered, `object-fit: contain`, sized at 78% of diameter
- Gold SVG ring drawn on top, strokeWidth=4, r=90 in 200×200 viewBox
- When `animate=true`: ring draws clockwise from top (stroke-dashoffset animation), then image fades in after 800ms

### Loading Screen (`src/components/logo/LoadingScreen.jsx`)
Sequence (total 3.8s):
1. **0.0s** — Obsidian background, nothing
2. **0.3s** — Container fades + scales in (0.88 → 1.0)
3. **0.3s** — Ring begins drawing clockwise (0.9s duration)
4. **1.1s** — `lifter.png` fades in inside ring (0.6s)
5. **2.0s** — "OPUS" wordmark slides up + fades in (Cormorant Garamond, 52px, letterSpacing 18px)
6. **2.6s** — "Build your masterpiece." fades in (DM Sans, 12px, letterSpacing 5px, ash colour)
7. **3.8s** — Entire screen fades out, app loads

Shows on every app open. Never skipped. This is intentional — it sets the tone.

---

## 6. DATABASE SCHEMA

File: `src/db/db.js`

```js
import Dexie from 'dexie';

export const db = new Dexie('OpusDB');

db.version(1).stores({
  exercises:    '++id, name, muscleGroup, equipment, isCustom',
  workouts:     '++id, date, templateId, status, duration',
  sets:         '++id, workoutId, exerciseId, setNumber, reps, weight, rpe, isWarmup, completedAt',
  templates:    '++id, name, dayOfWeek, createdAt',
  templateExercises: '++id, templateId, exerciseId, orderIndex, targetSets, targetReps, targetWeight',
  prs:          '++id, exerciseId, type, value, achievedAt, workoutId',
  bodyStats:    '++id, date, weight, bodyFat, chest, waist, hips, arms, thighs',
  sleepLogs:    '++id, date, hours, quality',
  energyLogs:   '++id, workoutId, level',
  userProfile:  '++id, name, level, xp, totalXp, title, streak, lastWorkoutDate',
  notifications: '++id, type, scheduledFor, sent, message',
});
```

### Table details

**exercises**
```
id            auto-increment
name          string (e.g. "Bench Press")
muscleGroup   string (e.g. "chest") — matches react-body-highlighter keys
secondaryMuscles  string[] (JSON)
equipment     string (e.g. "barbell", "dumbbell", "bodyweight", "cable", "machine")
description   string
isCustom      boolean (false = from Wger, true = user-created)
wgerId        number|null (Wger API exercise ID for reference)
```

**workouts**
```
id            auto-increment
date          ISO date string "YYYY-MM-DD"
templateId    number|null
name          string (e.g. "Push Day")
status        "in-progress" | "completed" | "skipped"
duration      number (seconds)
notes         string
xpEarned      number
createdAt     timestamp
```

**sets**
```
id            auto-increment
workoutId     number (FK → workouts)
exerciseId    number (FK → exercises)
setNumber     number (1-based)
reps          number
weight        number (kg)
rpe           number|null (1-10 scale)
isWarmup      boolean
completedAt   timestamp
```

**templates**
```
id            auto-increment
name          string (e.g. "Push Day")
dayOfWeek     number|null (0=Sun, 1=Mon... null=any day)
createdAt     timestamp
```

**prs** (Personal Records)
```
id            auto-increment
exerciseId    number
type          "weight" | "reps" | "volume" (weight×reps×sets)
value         number
achievedAt    timestamp
workoutId     number
```

**userProfile** (single row, id=1)
```
name          string
level         number (starts 1)
xp            number (current level XP)
totalXp       number (all-time)
title         string (current earned title)
streak        number (consecutive days trained)
lastWorkoutDate string (ISO date)
joinDate      string (ISO date)
```

---

## 7. FEATURE SPECIFICATIONS

### 7.1 Exercise Picker (BodyPicker)

**Component**: `src/components/exercise/BodyPicker.jsx`

Uses `react-body-highlighter` for the anatomy model. Two views: anterior (front) and posterior (back).

Flow:
1. User opens exercise picker (from workout or template builder)
2. Sees anatomical body model + muscle list buttons
3. Taps muscle on body OR button → muscle highlights gold, exercise list loads below
4. Exercise list shows exercises for that muscle group
5. Search bar at top searches across ALL exercises
6. Each exercise card shows name + equipment type
7. Tap to select (gold highlight), tap again to deselect
8. "Add X exercises" sticky CTA at bottom
9. Tapping CTA adds exercises to current workout/template

**Exercise data source**:
- On first load, fetch from Wger API and cache in IndexedDB
- URL: `https://wger.de/api/v2/exercise/?format=json&language=2&limit=100`
- Map Wger muscle IDs to react-body-highlighter muscle keys (see mapping below)
- Fallback: hardcoded exercise list if API unavailable

**Wger → react-body-highlighter muscle mapping**:
```js
const WGER_MUSCLE_MAP = {
  1:  'biceps',
  2:  'front-deltoids',  // Anterior deltoid
  3:  'chest',
  4:  'triceps',
  5:  'abs',
  6:  'quadriceps',
  7:  'trapezius',
  8:  'upper-back',      // General back
  9:  'hamstring',
  10: 'gluteal',
  11: 'calves',
  12: 'forearm',
  13: 'obliques',
  14: 'back-deltoids',
  15: 'lower-back',
};
```

### 7.2 Workout Logging

**Active workout state in Zustand** (`src/store/workoutStore.js`):
```js
{
  activeWorkout: null | { id, name, startedAt, exercises: [] },
  addExercise(exerciseId),
  logSet(exerciseId, { reps, weight, rpe, isWarmup }),
  completeWorkout(),
  discardWorkout(),
}
```

**Set logging UI** (`src/components/workout/SetLogger.jsx`):
- Shows previous session's sets for this exercise at top (ghost text)
- Input fields: Weight (kg) | Reps | RPE (optional)
- "+ Add Set" button
- Each set row: set number, weight, reps, delete button
- Long-press set row to mark as warmup
- Rest timer auto-starts after logging a set

**Rest Timer** (`src/components/workout/RestTimer.jsx`):
- Default 90 seconds, user-configurable per exercise
- Circular countdown, gold ring depletes
- Vibration on completion (if supported)
- Skip button

**Plate Calculator** (`src/utils/plateCalc.js` + `src/components/workout/PlateCalculator.jsx`):
- Input: target weight
- Output: plates to load each side
- Available plates: 25, 20, 15, 10, 5, 2.5, 1.25 kg
- Bar weight: 20kg standard (configurable in settings)
- Shows visual plate stack

### 7.3 Progressive Overload Engine

**File**: `src/utils/overload.js`

Core function:
```js
getOverloadSuggestion(exerciseId, recentSets) → {
  action: "increase_reps" | "increase_sets" | "increase_weight" | "maintain",
  suggestedReps: number,
  suggestedSets: number,
  suggestedWeight: number,
  reason: string,
  confidence: "high" | "medium" | "low",
}
```

**Logic** (The Three Levers — in priority order):

1. **Increase reps first**
   - If last session reps < target reps (default 12) for all sets → suggest +1 or +2 reps
   - Trigger: reps < targetReps for 2 consecutive sessions

2. **Increase sets second**
   - If reps consistently at/above target for all sets and sets < targetSets (default 4) → suggest adding a set
   - Trigger: reps ≥ targetReps for 2 consecutive sessions AND sets < maxSets

3. **Increase weight last**
   - If reps at target AND sets at target for 2 consecutive sessions → suggest +2.5kg, drop reps back to starting reps
   - Trigger: both above conditions met

**Coaching tone** (for `reason` field):
- Good session: "Strong work — push for 10 reps today."
- Bad session: "Slightly down from last time. Hold this weight and nail it next session."
- New PR: "New personal record! You're ready to step up."
- Deload signal: "You've trained 5 days straight. Consider a lighter session."

**Display**: `OverloadNudge` component shown above exercise in active workout. Gold accent, subtle, not pushy.

### 7.4 RPG System

**File**: `src/utils/rpg.js`

**XP calculation**:
```js
// Per set completed
setXP = Math.round((weight * reps) / 10)

// Bonus XP events
PR_BONUS      = 50 XP
STREAK_BONUS  = 10 XP per day of streak (logged at workout end)
COMPLETE_BONUS = 20 XP (finishing a full workout)
CONSISTENCY_BONUS = 30 XP (3+ workouts in a week)
```

**Level thresholds**:
```js
const XP_PER_LEVEL = [
  0,     // Level 1 (starting)
  500,   // Level 2
  1200,  // Level 3
  2500,  // Level 4
  4500,  // Level 5
  7000,  // Level 6
  10000, // Level 7
  14000, // Level 8
  19000, // Level 9
  25000, // Level 10
  // Formula beyond 10: previous + (level * 3000)
];
```

**Titles** (unlocked at levels):
```js
const TITLES = {
  1:  "First Rep",
  2:  "Iron Beginner",
  3:  "Committed",
  4:  "Grinder",
  5:  "Iron Will",
  6:  "Forged",
  7:  "Elite",
  8:  "Masterwork",
  9:  "Legendary",
  10: "Magnum Opus",
};
```

**Stat radar chart** (5 axes, 0-100 scale each):
```js
Strength    = calculated from max weight lifted (all-time PRs normalised)
Power       = calculated from total volume (weight × reps × sets) per session average
Endurance   = calculated from total sets completed per session average
Consistency = streak score + workouts per week average (normalised)
Balance     = muscle group variety score (how many different muscle groups trained)
```

**Character card** (`src/components/rpg/CharacterCard.jsx`):
- Shows radar chart
- Current level + title
- XP progress bar to next level
- Join date + total workouts
- Displayed on Profile page

### 7.5 Body & Health Tracking

**Body stats** (`src/pages/ProfilePage.jsx` → Body Stats section):
- Daily weight log with trend line (Recharts LineChart)
- Measurements: chest, waist, hips, arms, thighs (in cm)
- Each measurement shows trend over 30/90 days
- Optional body fat % entry
- Sleep quality log (1-5 stars) + hours
- Energy level before workout (1-5, logged when starting workout)

### 7.6 Notifications

**File**: `src/utils/notifications.js`

Uses Web Notifications API + localStorage for scheduling.

**Notification types**:
```js
GYM_NUDGE:     Daily at user-set time — "You planned legs today. Time to crush it 💪"
WATER_REMINDER: Every 2hrs during configured hours — "Stay hydrated 💧"
STREAK_RISK:   At 9pm if no workout logged that day — "Your 🔥 streak resets at midnight"
PR_CELEBRATION: Immediate — "New PR on Bench Press! 🏆 80kg"
WEEKLY_SUMMARY: Monday morning — "Last week: 4 sessions, 12,400kg total volume"
```

**Permission flow**:
1. First workout completion → prompt for notifications
2. Single permission request (not on app open — too aggressive)
3. If denied, show inline banner in settings

**iOS caveat**: Document in code comments that iOS requires PWA to be installed AND iOS 16.4+. Graceful fallback if unavailable.

### 7.7 Shareable Workout Card

**File**: `src/components/share/ShareableCard.jsx` + `src/utils/share.js`

Card dimensions: 1080×1080px (rendered off-screen, captured with html2canvas)

Card layout:
```
┌─────────────────────────────────┐
│ [OPUS logo small]  OPUS         │  ← Header row
│                    DATE         │
│                                 │
│ Workout Name                    │  ← Cormorant Garamond, large
│ MUSCLE · MUSCLE · MUSCLE        │  ← Ash colour, uppercase
│ ─────────────────────────       │  ← Gold gradient divider
│ 4,320 kg    18 sets   52 min    │  ← DM Mono stats grid
│ Volume      Sets      Duration  │
│                                 │
│ 🏆 PR — Bench Press 80kg        │  ← Gold badge (if PR exists)
│                                 │
│ LVL 14  +320 XP                 │  ← Character level
│                   Build your    │
│                   masterpiece.  │  ← Tagline bottom-right
└─────────────────────────────────┘
```

Background: Stone (#2C2C2C) with subtle 4% diagonal grid texture
Font colours: Title=chalk, stats=chalk, labels=ash, gold=XP/PR only
Share via Web Share API → falls back to download PNG

### 7.8 Workout Templates & Planner

**Templates** stored in DB. Can be:
- Created from scratch
- Saved from completed workout
- Assigned to a day of week (optional)

**Home screen** shows today's suggested workout based on:
1. Day assignment (if template has `dayOfWeek` set)
2. Last worked muscle group (avoids repeating same day)
3. "Rest day" if trained 3+ days in a row

**Weekly planner view**: 7-day grid, tap day to assign template.

### 7.9 Exercise Library Page

Full searchable list of all exercises (from Wger + custom). Filter by:
- Muscle group (uses body picker or dropdown)
- Equipment type
- Custom only

Each exercise detail view shows:
- Name + muscle group
- Equipment needed
- Personal record (weight and reps)
- Volume history chart (last 10 sessions)
- Overload suggestion

### 7.10 History Page

List of all completed workouts, newest first.

Each history card shows:
- Date, workout name
- Duration, total volume
- Muscles worked (coloured dots)
- XP earned
- Any PRs hit (gold badge)

Tap to expand full workout detail:
- Every exercise, every set logged
- Notes
- Energy level logged
- Option to "Repeat this workout" (loads as new workout)
- Option to share (generates shareable card)

---

## 8. PAGE SPECIFICATIONS

### 8.1 Loading Page (`/`)
- LoadingScreen component (see Section 5)
- 3.8s then navigates to Home
- On subsequent visits: checks if workout in progress → routes to WorkoutPage

### 8.2 Home Page (`/home`)
**Top section**:
- Greeting: "Good morning, [name]" or generic if no name set
- Date
- Small XP bar + level badge
- Streak flame

**Today's workout card**:
- Template name for today (or "Rest Day" or "No plan — start fresh")
- Muscle groups for today
- "Start Workout" CTA button (gold, full width)
- "Browse Exercises" secondary link

**Quick stats row**:
- This week: sessions count
- This month: total volume
- Current streak

**Recent activity**:
- Last 3 workouts as small cards

### 8.3 Workout Page (`/workout`)
**Active workout state**:

Top bar: workout name (editable), timer (counting up), end workout button

Exercise list (scrollable):
- Each exercise has: name, muscle group badge, set rows, + Add Set button
- Overload nudge above each exercise (if available)
- Plate calculator accessible via tap on weight field

Bottom floating bar:
- "Add Exercise" button → opens BodyPicker
- Rest timer (when active, shows countdown here)

**End workout flow**:
1. Tap "Finish" → modal summary
2. Shows: duration, sets, volume, XP earned, PRs hit
3. Animated XP bar fills to new level (if levelled up: full celebration screen)
4. "Share" button → generates shareable card
5. "Save" → saves to DB, returns to Home

### 8.4 History Page (`/history`)
- Workout list (newest first)
- Monthly grouping headers
- Filter by muscle group
- Search by workout name

### 8.5 Exercise Library Page (`/exercises`)
- Body picker at top (compact)
- Exercise list below
- Search bar always visible
- "Add Custom Exercise" button

### 8.6 Progress Page (`/progress`)
Tabs: Overview | By Exercise | Body Stats

**Overview tab**:
- Weekly volume bar chart (Recharts, last 8 weeks)
- Muscle group frequency chart (which muscles trained most)
- Workout frequency heatmap (GitHub contribution-style)
- Streak calendar

**By Exercise tab**:
- Select exercise → shows:
  - Max weight over time (line chart)
  - Volume per session (bar chart)
  - Total sets over time

**Body Stats tab**:
- Body weight trend line
- Measurement trends
- Sleep quality chart

### 8.7 Profile Page (`/profile`)
- OpusMark logo (large)
- Name, join date
- Character card (radar chart + level + title)
- Stat breakdown (Strength, Power, Endurance, Consistency, Balance)
- Total stats: workouts, volume, PRs, hours trained
- Body stats entry form
- Title history (all unlocked titles)

### 8.8 Settings Page (`/settings`)
**Sections**:

Profile:
- Name entry
- Unit preference (kg / lbs)
- Bar weight (default 20kg)

Notifications:
- Enable/disable each type
- Gym nudge time picker
- Water reminder hours (start/end + interval)
- DND window (e.g. 10pm–7am)

Data:
- Export all data (JSON download)
- Import data (JSON upload)
- Clear all data (confirmation required, type "DELETE" to confirm)

About:
- App version
- GitHub link
- "Built with OPUS" — links to repo

---

## 9. NAVIGATION

**Bottom tab bar** (5 tabs, always visible):
```
🏠 Home  |  📊 Progress  |  ➕ Workout  |  🏋️ Exercises  |  👤 Profile
```

Centre tab (➕) is larger, gold background — starts a new workout.

During active workout: tab bar persists but shows workout timer in place of app name.

---

## 10. PWA CONFIGURATION

### vite.config.js
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/opus/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OPUS',
        short_name: 'OPUS',
        description: 'Build your masterpiece.',
        theme_color: '#111010',
        background_color: '#111010',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/opus/',
        icons: [
          { src: '/opus/lifter.png', sizes: '192x192', type: 'image/png' },
          { src: '/opus/lifter.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/wger\.de\/api/,
            handler: 'CacheFirst',
            options: { cacheName: 'wger-api', expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts' }
          }
        ]
      }
    })
  ]
});
```

### tailwind.config.js
```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        chalk:    '#F7F5F2',
        ivory:    '#EDEAE5',
        stone:    '#2C2C2C',
        obsidian: '#111010',
        ash:      '#8A8780',
        gold:     '#C9A84C',
        ember:    '#D4622A',
        sage:     '#6B8F71',
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", 'serif'],
        sans:    ["'DM Sans'", 'sans-serif'],
        mono:    ["'DM Mono'", 'monospace'],
      },
    }
  }
}
```

---

## 11. GITHUB ACTIONS DEPLOY

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy OPUS to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 12. GIT CONVENTIONS

### Commit author
Every commit must be authored as:
```
Author: shubanms <your@email.com>
Co-authored-by: Claude <claude@anthropic.com>
```

Add to every commit message footer:
```
Co-authored-by: Claude <claude@anthropic.com>
```

### Commit message format
```
type(scope): short description

Longer description if needed.

Co-authored-by: Claude <claude@anthropic.com>
```

Types: `feat` | `fix` | `style` | `refactor` | `docs` | `chore` | `test`

Examples:
```
feat(exercise): add body picker with react-body-highlighter
feat(rpg): implement XP calculation and level thresholds
fix(db): correct Dexie schema migration version
style(tokens): update gold colour to match brand spec
docs(state): update STATE.md after sprint 3 completion
```

### Tagging
Tag every sprint completion:
```
git tag -a v0.1.0 -m "Sprint 1: Scaffold complete"
git tag -a v0.2.0 -m "Sprint 2: Database + routing"
...
git tag -a v1.0.0 -m "Sprint 10: Full MVP complete"
git push origin --tags
```

---

## 13. STATE.md — THE LIVING DOCUMENT

**This file must be updated at the end of every coding session.**

File: `STATE.md` (root of repo)

Template:
```markdown
# OPUS — Project State

Last updated: [DATE]
Current sprint: [N]
Current version: [v0.X.0]

## What's working
- [List of completed features]

## What's in progress
- [Current sprint work]

## What's not started
- [Remaining sprints]

## Known issues / bugs
- [Any known problems]

## File tree (current)
[Paste current src/ tree]

## Next session — start here
[Exact instruction for what to build next]
```

---

## 14. SPRINT PLAN

### Sprint 1 — Scaffold & Foundation
**Tag**: v0.1.0  
**Goal**: Repo is set up, app loads, routing works, design tokens in place.

Deliverables:
- [ ] Vite + React + Tailwind project initialised
- [ ] All dependencies installed (see Section 2)
- [ ] Folder structure created (all files, empty or stubbed)
- [ ] `tokens.css` and `animations.css` written
- [ ] `tailwind.config.js` with full colour + font tokens
- [ ] `index.html` with Google Fonts, meta tags, PWA meta
- [ ] `vite.config.js` with base `/opus/` and PWA plugin
- [ ] React Router set up with all routes (pages stubbed)
- [ ] Bottom nav component (non-functional, just renders)
- [ ] LoadingScreen component (full animation working)
- [ ] OpusMark component (logo ring + lifter.png)
- [ ] App loads at localhost:5173, loading screen plays
- [ ] GitHub Actions deploy workflow committed
- [ ] Pushes and deploys successfully to shubanms.github.io/opus
- [ ] `STATE.md` created and filled in
- [ ] Commit: `feat(scaffold): initial project setup with Vite + React + Tailwind`
- [ ] Tag: `v0.1.0`

---

### Sprint 2 — Database & Data Layer
**Tag**: v0.2.0  
**Goal**: Full DB schema live, seed data, hooks working.

Deliverables:
- [ ] `src/db/db.js` — full Dexie schema (all tables from Section 6)
- [ ] `src/db/migrations.js` — version 1 migration
- [ ] Wger API client (`src/utils/wger.js`) — fetches + caches exercises
- [ ] Exercise seed data (fallback list of 60+ exercises, all muscle groups)
- [ ] All custom hooks stubbed: `useWorkout`, `useExercises`, `useProgress`, `useRPG`, `useNotifications`, `useOverload`
- [ ] `useExercises` fully working: fetch from Wger, cache in DB, return list
- [ ] Zustand stores created: `workoutStore`, `uiStore`, `userStore`
- [ ] User profile initialised on first run (level 1, 0 XP, streak 0)
- [ ] `STATE.md` updated
- [ ] Commit + Tag: `v0.2.0`

---

### Sprint 3 — Exercise Picker & Library
**Tag**: v0.3.0  
**Goal**: Full exercise picker working. User can browse, search, select exercises.

Deliverables:
- [ ] `BodyPicker.jsx` — react-body-highlighter integration, front/back toggle
- [ ] `ExerciseCard.jsx` — exercise name, muscle badge, equipment icon
- [ ] `ExerciseSearch.jsx` — debounced search across all exercises
- [ ] `ExerciseList.jsx` — filtered list with virtual scrolling if >50 items
- [ ] Exercise Library Page fully functional
- [ ] Muscle → exercise filtering working both ways (tap body OR tap button)
- [ ] Custom exercise creation form
- [ ] Exercise detail page (history chart placeholder, PR placeholder)
- [ ] `STATE.md` updated
- [ ] Commit + Tag: `v0.3.0`

---

### Sprint 4 — Workout Logging Core
**Tag**: v0.4.0  
**Goal**: User can log a complete workout start to finish and it saves.

Deliverables:
- [ ] Start workout flow (from template or blank)
- [ ] Active workout page — exercise list, set logging
- [ ] `SetLogger.jsx` — weight/reps/RPE input, previous session ghost text
- [ ] `RestTimer.jsx` — circular countdown, auto-start after set
- [ ] Add exercise to active workout (opens BodyPicker)
- [ ] `PlateCalculator.jsx` — tap weight field → shows plates
- [ ] End workout flow — summary modal, XP animation, save to DB
- [ ] `workoutStore` fully wired to DB
- [ ] Workout history page showing saved workouts
- [ ] `STATE.md` updated
- [ ] Commit + Tag: `v0.4.0`

---

### Sprint 5 — Progressive Overload Engine
**Tag**: v0.5.0  
**Goal**: App intelligently suggests reps/sets/weight increases.

Deliverables:
- [ ] `src/utils/overload.js` — full three-lever logic (Section 7.3)
- [ ] `useOverload` hook — reads last 3 sessions per exercise, returns suggestion
- [ ] `OverloadNudge.jsx` — displays suggestion above exercise in workout
- [ ] Coaching tone messages (good/bad/PR/deload states)
- [ ] Deload detector (5+ consecutive training days)
- [ ] Volume chart per exercise (Recharts, last 10 sessions)
- [ ] PR detection — auto-flags when new best weight or reps logged
- [ ] `PRBadge.jsx` — celebration animation on PR
- [ ] `STATE.md` updated
- [ ] Commit + Tag: `v0.5.0`

---

### Sprint 6 — RPG System
**Tag**: v0.6.0  
**Goal**: Full RPG layer working — XP, levels, titles, radar chart.

Deliverables:
- [ ] `src/utils/rpg.js` — XP calc, level thresholds, title unlocks (Section 7.4)
- [ ] `useRPG` hook — computes current level, XP, title from DB
- [ ] `XPBar.jsx` — animated fill bar with level number
- [ ] `LevelBadge.jsx` — compact level display for top bar
- [ ] `TitleBadge.jsx` — shows current title with unlock animation
- [ ] `CharacterCard.jsx` — full radar chart (Recharts), level, title, join date
- [ ] Level-up celebration screen (full screen gold animation, new title reveal)
- [ ] XP animation on workout complete (bar fills with counter ticking)
- [ ] Streak tracking — increment on consecutive days, reset if missed
- [ ] Profile page fully functional
- [ ] `STATE.md` updated
- [ ] Commit + Tag: `v0.6.0`

---

### Sprint 7 — Templates & Planning
**Tag**: v0.7.0  
**Goal**: User can create workout templates and plan their week.

Deliverables:
- [ ] Template creation flow (name, add exercises, set targets)
- [ ] Template list + edit + delete
- [ ] Weekly planner — 7-day grid, assign templates to days
- [ ] Home page "today's workout" recommendation logic
- [ ] "Rest day" detection and display
- [ ] "Repeat last workout" from history
- [ ] Template duplication
- [ ] `STATE.md` updated
- [ ] Commit + Tag: `v0.7.0`

---

### Sprint 8 — Body Stats & Health Tracking
**Tag**: v0.8.0  
**Goal**: User can track body weight, measurements, sleep, energy.

Deliverables:
- [ ] Body weight log — daily entry, trend line chart
- [ ] Measurements tracker — chest, waist, hips, arms, thighs
- [ ] Sleep log — hours + quality rating
- [ ] Energy level prompt at workout start (1-5)
- [ ] Body stats section on Profile page
- [ ] All charts using Recharts with gold accent colour
- [ ] Progress page — Overview tab fully working
- [ ] Progress page — Body Stats tab fully working
- [ ] `STATE.md` updated
- [ ] Commit + Tag: `v0.8.0`

---

### Sprint 9 — Notifications & Shareable Card
**Tag**: v0.9.0  
**Goal**: Notifications working. Shareable card generates and downloads.

Deliverables:
- [ ] `src/utils/notifications.js` — all 5 notification types (Section 7.6)
- [ ] `useNotifications` hook — schedule, check, send
- [ ] Permission request flow (after first workout complete)
- [ ] Notification settings in Settings page — enable/disable each type
- [ ] DND window setting (no notifications between X and Y)
- [ ] `ShareableCard.jsx` — pixel-perfect card matching Section 7.7 spec
- [ ] html2canvas capture → PNG download
- [ ] Web Share API integration (falls back to download)
- [ ] Share CTA on workout completion screen
- [ ] Share CTA on history cards
- [ ] `STATE.md` updated
- [ ] Commit + Tag: `v0.9.0`

---

### Sprint 10 — Polish, PWA & Launch
**Tag**: v1.0.0  
**Goal**: App feels complete. PWA installable. All edges smoothed.

Deliverables:
- [ ] Full PWA — service worker, offline support, installable
- [ ] App icon set (192px, 512px from lifter.png)
- [ ] Splash screen configured
- [ ] All loading states (skeleton screens, not spinners)
- [ ] All empty states (first-time user onboarding)
- [ ] Error boundaries on all pages
- [ ] Data export (JSON) and import
- [ ] Settings page fully complete
- [ ] Onboarding flow (first open: name entry, unit preference)
- [ ] Performance audit — no janky animations, <3s first load
- [ ] All known bugs fixed
- [ ] README.md written (setup, features, screenshots)
- [ ] `STATE.md` final update
- [ ] Tag: `v1.0.0`
- [ ] 🎉 OPUS is live

---

## 15. WHAT YOU (shubanms) NEED TO DO

**Before starting Sprint 1:**
1. Add `lifter.png` to `public/` folder in your repo
2. Run `git config user.name "shubanms"` and `git config user.email "your@email.com"` in repo
3. That's it

**Between sprints:**
- Review what Claude built
- Test on your phone (open shubanms.github.io/opus in Chrome, install to home screen)
- Report any bugs or changes before starting next sprint

**You don't need to write any code.** Hand this PRD to Claude Code and say:
> "Read OPUS_PRD.md and build Sprint 1. Follow all conventions. Update STATE.md when done."

Then repeat for each sprint.

---

## 16. QUICK REFERENCE CARD FOR CODING AGENTS

```
App:        OPUS — Gym tracker PWA
Stack:      Vite + React + Tailwind + Dexie.js + Zustand
Repo:       github.com/shubanms/opus
Live URL:   shubanms.github.io/opus/
Base path:  /opus/ (set in vite.config.js)

Key colours:
  obsidian #111010  chalk #F7F5F2  gold #C9A84C

Key fonts:
  display: Cormorant Garamond 700
  body:    DM Sans 400/500/600
  mono:    DM Mono 500

Commit format:
  type(scope): description
  Co-authored-by: Claude <claude@anthropic.com>

Author:  shubanms
Tag each sprint: v0.1.0 through v1.0.0

ALWAYS:
  - Update STATE.md at end of every session
  - One component per file, max 200 lines
  - All DB access through hooks only
  - All business logic in utils/ only
  - Keep CSS in tokens.css / animations.css
  - Push commits after every meaningful change
```

---

*OPUS PRD v1.0 — shubanms + Claude — May 2026*

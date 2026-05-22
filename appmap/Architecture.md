# Architecture

## System Overview

```
┌─────────────────────────────────────────────┐
│               Mobile App                    │
│   React Native + Expo SDK 51                │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Zustand │  │  Turf.js │  │MapLibre  │  │
│  │  Stores  │  │ Geometry │  │  Map     │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└──────────┬───────────────────────┬──────────┘
           │  REST (Edge Fns)      │  Realtime (presence)
           ▼                       ▼
┌─────────────────────────────────────────────┐
│              Supabase                        │
│                                             │
│  ┌──────────────┐   ┌─────────────────────┐ │
│  │  Edge Fns    │   │  Postgres + PostGIS  │ │
│  │  (Deno)      │──▶│  18 migrations       │ │
│  │  5 functions │   │  pg_cron jobs        │ │
│  └──────────────┘   └─────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Mobile framework | React Native | 0.74.5 |
| Mobile toolchain | Expo SDK | 51 |
| Navigation | Expo Router | v3.5 |
| Map rendering | MapLibre (`@maplibre/maplibre-react-native`) | ~10.0 |
| Global state | Zustand | ^4.5 |
| Server state | TanStack Query | v5 |
| Geometry | Turf.js | ^6.5 |
| Validation | Zod | ^3.23 |
| Secure storage | expo-secure-store | ~13.0 |
| Fast local storage | react-native-mmkv | ^2.12 (GPS buffer) |
| Backend | Supabase (Postgres + PostGIS + pg_cron) | — |
| Edge Functions runtime | Deno | — |
| Auth | Supabase Auth (email/password) | — |
| Push notifications | expo-notifications | ~0.28 |

---

## Monorepo Structure

```
Raftar/
├── apps/
│   └── mobile/               ← React Native app
│       ├── app/              ← Expo Router file-based routes
│       │   ├── (auth)/       ← Welcome, onboarding
│       │   ├── (tabs)/       ← Map, Leaderboard, Profile
│       │   └── run/          ← Active run, summary
│       └── src/
│           ├── components/   ← UI, map layers, run HUD
│           ├── features/     ← Business logic by domain
│           ├── lib/          ← Supabase client, schemas, theme
│           ├── hooks/        ← useTheme, usePermissions
│           └── types/        ← All TypeScript interfaces
├── backend/
│   └── supabase/
│       ├── migrations/       ← 18 ordered .sql files
│       └── functions/        ← 5 Deno Edge Functions
└── scripts/
    ├── import-osm-blocks.ts  ← Seeds territory cells from OSM data
    └── generate-fallback-grid.ts
```

---

## Data Flow

### Starting a Run
```
User taps "Start Run"
  → StartRunButton calls runService.startRun()
  → POST /functions/v1/start-run (JWT auth)
  → Edge Fn validates no open run, inserts run row
  → Returns { runId, startedAt }
  → useRunStore.startRun(runId)
  → router.push('/run/active')
```

### During a Run
```
useRunTracker (every 3s, ≥5m moved, accuracy ≤20m)
  → pushGPSPoint to MMKV gpsBuffer
  → setLastPosition in useRunStore
  → incrementDistance (haversine)

active.tsx watches lastPosition
  → findCellAtPoint (Turf point-in-polygon against loaded cells)
  → onEnterCell → start dwell timer
  → onExitCell (if dwell ≥20s) → submitCapture → Edge Fn
```

### Submitting a Capture
```
captureService.submitCapture()
  → builds payload: runId, cellId, enteredAt, exitedAt, gpsSlice (≤50 pts), deviceId
  → POST /functions/v1/submit-capture
  → Edge Fn: 3 anti-cheat checks → writes cell_captures + updates territory_cells
  → Returns { captured: true, heldUntil }
  → Optimistic update: useTerritoryStore.updateCell(...)
  → useRunStore.captureCell()
```

### Ending a Run
```
User taps "End Run"
  → EndRunButton calls runService.endRun(runId, distanceMeters)
  → POST /functions/v1/end-run with route LineString
  → Edge Fn: closes run, calls update_streak + increment_user_run_stats + refresh_leaderboard_cache
  → Returns { run: Run }
  → useRunStore.endRun()
  → clearBuffer()
  → router.push('/run/summary')
```

---

## State Management

Two Zustand stores handle all runtime state:

**`useRunStore`** — owns the active run
- `activeRun`: run ID, start time, distance, cells captured, cells skipped, zones captured
- `lastPosition`: current GPS lat/lng

**`useTerritoryStore`** — owns the map data
- `cells`: `Map<id, TerritoryCell>` — cells currently loaded in the viewport
- `zones`: `Map<id, Zone>`
- `presenceMap`: `Map<userId, RunnerPresence>` — other live runners
- `viewportBounds`: current map bounding box

**`useAuthStore`** — current session and user profile

---

## See Also
- [[Run Engine]] — GPS tracking internals
- [[Edge Functions]] — what each function does
- [[Capture Flow]] — step-by-step capture sequence
- [[Database Migrations]] — full schema

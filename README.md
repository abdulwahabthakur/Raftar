# Raftar

A geo-conquest running game for iOS and Android. Go for a run, physically move through the city, and capture hexagonal map cells as territory. Hold cells for an hour to lock in ownership. Take over enough cells in a zone to capture the zone. Compete on a live leaderboard.

---

## How It Works

1. Open the app and tap **Start Run**
2. Walk or run through the city — the map shows colored hex cells overlaid on real streets
3. Spend **20+ seconds** inside a cell and it submits a capture request to the server
4. If the capture passes anti-cheat checks, the cell becomes yours and is **held for 1 hour** — nobody can steal it during that window
5. Captured cells accumulate toward zone ownership and leaderboard scores
6. Tap **End Run** to finalize the session and update your stats, streak, and rankings

**Key rules:**
- Held cells (owned by someone and still within the 1-hour window) are silently skipped — no penalty for running through them
- No background GPS — tracking only runs while the app is in the foreground
- All territory mutations happen server-side; the client can never write cells or captures directly
- Speed above 30 km/h is flagged as a cheat and the capture is rejected

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.74, Expo SDK 51, Expo Router v3 |
| Map | MapLibre (`@maplibre/maplibre-react-native`) |
| State | Zustand + TanStack Query v5 |
| Geometry | Turf.js (`boolean-point-in-polygon`) |
| Validation | Zod |
| Backend | Supabase (Postgres + PostGIS + pg_cron) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Auth | Supabase Auth (email/password) |
| Secure storage | `expo-secure-store` (no AsyncStorage anywhere) |

---

## Repo Structure

```
Raftar/
├── apps/
│   └── mobile/               # React Native / Expo app
│       ├── app/
│       │   ├── (auth)/       # Welcome + onboarding screens
│       │   ├── (tabs)/       # Map, Leaderboard, Profile tabs
│       │   └── run/          # Active run + post-run summary screens
│       └── src/
│           ├── components/
│           │   ├── map/      # Map layer components
│           │   ├── run/      # HUD, buttons, flash effects
│           │   ├── leaderboard/
│           │   └── ui/       # Shared Button, Card, StreakBadge
│           ├── features/
│           │   ├── auth/     # Auth store + service
│           │   ├── run/      # GPS tracker, run store, run service, GPS buffer
│           │   ├── territory/# Capture service, territory store, viewport hooks, presence
│           │   └── leaderboard/
│           └── lib/          # Supabase client, Zod schemas, theme, storage utils
└── backend/
    └── supabase/
        ├── migrations/       # 18 ordered SQL migrations
        └── functions/        # 5 Deno Edge Functions
```

---

## Mobile App

### Screens

| Screen | Path | Description |
|---|---|---|
| Welcome | `app/(auth)/welcome.tsx` | Sign in / sign up |
| Onboarding | `app/(auth)/onboarding.tsx` | Username setup after first sign-in |
| Map | `app/(tabs)/map.tsx` | Main map with Start Run button and locate-me |
| Leaderboard | `app/(tabs)/leaderboard.tsx` | Daily / weekly / all-time rankings |
| Profile | `app/(tabs)/profile.tsx` | Personal stats and streak |
| Active Run | `app/run/active.tsx` | Live map + HUD + End Run during a session |
| Run Summary | `app/run/summary.tsx` | Post-run stats (cells, distance, duration) |

### Map Components

All layers sit on top of a `TerritoryMap` base wrapper.

| Component | Purpose |
|---|---|
| `TerritoryMap` | MapLibre map host, exposes `followUser` and `onBoundsChange` props |
| `CellLayer` | Renders owned hex cells with owner-color fill |
| `ZoneLayer` | Draws zone boundary outlines |
| `HeldCellLayer` | Highlights cells in their 1-hour post-capture hold |
| `FogLayer` | Fog-of-war over unexplored areas |
| `PulseLayer` | Animated pulse ring at the user's current position |
| `RunnerDot` | Live position dot during a run |

### Run Engine

GPS tracking is entirely foreground-only.

| Module | Role |
|---|---|
| `useRunTracker` | `watchPositionAsync` loop (3 s interval, 5 m distance filter, 20 m accuracy gate). Computes haversine distance between points, pushes to GPS buffer, updates store. |
| `gpsBuffer` | Ring buffer of recent `GPSPoint` objects. `getSlice(from, to)` extracts the GPS trail for a capture submission. |
| `captureService` | Entry/exit detection via Turf `booleanPointInPolygon`. Starts a 20-second dwell timer on enter; submits to `submit-capture` Edge Function on exit if dwell was long enough. |
| `presenceService` | Supabase Realtime presence broadcast — lets other runners appear on the map live during a run. |
| `runService` | HTTP calls to `start-run` and `end-run` Edge Functions. |
| `useRunStore` | Zustand — active run ID, GPS position, cells captured, distance. |
| `useTerritoryStore` | Zustand — map of cells and zones currently loaded in the viewport. |
| `useViewportCells` | Calls the `cells_in_bounds` spatial RPC whenever the map viewport changes, keeping loaded cells in sync with what the user sees. |

---

## Backend

### Database Migrations

| # | Migration | What it creates |
|---|---|---|
| 001 | `extensions` | PostGIS, pgcrypto, pg_cron |
| 002 | `users` | User profiles table (linked to Supabase Auth) |
| 003 | `launch_zones` | Top-level geographic game regions |
| 004 | `zones` | Sub-zones within a launch zone |
| 005 | `territory_cells` | Individual H3 hex cells with owner, `owned_at`, `held_until` |
| 006 | `runs` | Run sessions (start/end time, distance, route as PostGIS LineString) |
| 007 | `cell_captures` | Audit log of every cell capture event |
| 008 | `zone_captures` | Audit log of zone ownership changes |
| 009 | `anticheat_log` | Server-only cheat event log (`USING(false)` — clients cannot read) |
| 010 | `leaderboard_cache` | Pre-computed score rows refreshed by pg_cron |
| 011 | `streaks` | Consecutive run-day tracking per user |
| 012 | `notifications_log` | Record of sent push notifications |
| 013 | `rls_policies` | Row Level Security for all tables |
| 014 | `functions_and_cron` | Postgres functions + pg_cron jobs (leaderboard refresh, streak decay) |
| 015 | `spatial_rpc` | `cells_in_bounds` RPC — returns cells within a lat/lng bounding box |
| 016 | `seed_gta_launch_zone` | Seeds the Greater Toronto Area as the first launch zone |
| 017 | `increment_functions` | `SECURITY DEFINER` atomic counter RPCs (cell count, run stats, suspicion score) |
| 018 | `grants` | Final permission grants for Edge Function service role |

### Edge Functions

All functions authenticate via the `Authorization: Bearer <jwt>` header and use the service-role key to perform writes.

#### `start-run`
Creates a new run row for the authenticated user. Validates the user doesn't already have an open run.

#### `end-run`
Closes the run, sets `ended_at`, `distance_meters`, `duration_seconds`, and the PostGIS `LINESTRING` route. Then:
- Calls `update_streak` to maintain consecutive-day streak
- Calls `increment_user_run_stats` to update total distance and run count
- Calls `refresh_leaderboard_cache` so rankings update immediately

#### `submit-capture`
The most critical function — runs three layers of anti-cheat before writing anything:

1. **Dwell check** — time inside the cell must be ≥ 18 seconds server-side (client threshold is 20 s)
2. **Speed check** — max speed derived from the submitted GPS slice must be < 30 km/h
3. **Replay check** — rejects if the same user captured this cell within the last 120 seconds

Failures write to `anticheat_log` and increment a `suspicion_score` on the user. On success:
- Inserts into `cell_captures`
- Updates `territory_cells` with new owner and `held_until = now + 1 hour`
- Atomically increments cell capture count, run cells count, and user cell count via `SECURITY DEFINER` functions
- Returns `{ captured: true, heldUntil }` — the client uses this to update local state optimistically

#### `get-leaderboard`
Reads from `leaderboard_cache` and returns ranked results. Accepts `period` (daily/weekly/all_time) and `board_type` query params.

#### `send-territory-notifications`
Called by pg_cron when a cell changes ownership. Sends a push notification to the previous owner informing them their cell was taken.

---

## Security Model

- Clients **never write** to `territory_cells`, `cell_captures`, `zone_captures`, or `anticheat_log` — all via Edge Functions using service role
- RLS is enforced on all other tables; users can only read/write their own rows where applicable
- `anticheat_log` has `USING(false)` on its SELECT policy — zero client visibility
- Device ID is included in capture submissions to track multi-device abuse patterns
- All payloads are validated with Zod on both client and server

---

## Environment Variables

Create `.env` in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_MAPBOX_TOKEN=<mapbox-token>
```

The Supabase Edge Functions pick up `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically from the Supabase runtime environment — no manual config needed for those.

---

## Setup

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com). Region: **AWS ca-central-1** (or wherever your users are).

### 2. Install the Supabase CLI

```bash
npm install -g supabase
supabase login
```

### 3. Link and run migrations

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs all 18 migrations in order.

### 4. Deploy Edge Functions

```bash
supabase functions deploy start-run
supabase functions deploy end-run
supabase functions deploy submit-capture
supabase functions deploy get-leaderboard
supabase functions deploy send-territory-notifications
```

### 5. Seed OSM block data

After the GTA launch zone row is created by migration 016, import real street-block cells:

```bash
cd scripts
npx ts-node import-osm-blocks.ts <launch_zone_id>
```

The `launch_zone_id` is the UUID inserted by migration 016 — grab it with:

```sql
SELECT id FROM launch_zones WHERE name = 'Greater Toronto Area';
```

### 6. Install mobile dependencies

```bash
cd apps/mobile
npm install
```

### 7. Run the app

You need a development build (not Expo Go) because of native modules (MapLibre, expo-secure-store):

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Or start the dev server after building
npx expo start --dev-client
```

---

## Scripts

```bash
# Inside apps/mobile/
npm run start       # Start Expo dev server
npm run ios         # Build + run on iOS simulator
npm run android     # Build + run on Android emulator
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
```

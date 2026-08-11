# Raftar — Claude Context

Geo-conquest running game. Players run through the city and physically capture hexagonal map cells. Monorepo: React Native app + Supabase backend.

## Project Layout

```
apps/mobile/          React Native + Expo SDK 51 + Expo Router v3
backend/supabase/     18 SQL migrations + 5 Deno Edge Functions
scripts/              OSM data import
```

## Hard Rules (never violate these)

- **Never use AsyncStorage** — `expo-secure-store` only
- **Never write to `territory_cells`, `cell_captures`, `zone_captures`, or `anticheat_log` from the client** — these go through Edge Functions only
- **No background GPS** — foreground location only, always
- **Cell hold duration is 1 hour** (not 30 min, not 2 hours)
- **Held cells are silently skipped** — no error, no penalty, no UI feedback beyond the `HeldCellSkip` component

## Key Numbers

| Constant | Value | Where |
|---|---|---|
| GPS poll interval | 3000 ms | `useRunTracker.ts` |
| GPS accuracy gate | 20 m | `useRunTracker.ts` |
| Client dwell threshold | 20 s | `captureService.ts` |
| Server dwell threshold | 18 s | `submit-capture/index.ts` |
| Speed limit (anti-cheat) | 30 km/h | `submit-capture/index.ts` |
| Replay window | 120 s | `submit-capture/index.ts` |
| Cell hold duration | 1 hour | `submit-capture/index.ts` |

## Architecture: How a Capture Works

1. `useRunTracker` polls GPS every 3 s, pushes points to `gpsBuffer`
2. `active.tsx` detects cell entry/exit via `findCellAtPoint` (Turf point-in-polygon)
3. `captureService.onEnterCell` starts a dwell timer
4. `captureService.onExitCell` checks dwell ≥ 20 s, then calls `submit-capture` Edge Function with a GPS slice
5. Edge Function runs 3 anti-cheat checks (dwell, speed, replay), then writes to DB using service role
6. Response `{ captured: true, heldUntil }` → client optimistically updates `useTerritoryStore`

## State Management

- `useRunStore` (Zustand) — active run ID, last GPS position, cells captured, distance, skipped cells
- `useTerritoryStore` (Zustand) — `Map<id, TerritoryCell>` and zones loaded in the current viewport
- `useAuthStore` (Zustand) — current user session
- `useViewportCells` / `useViewportZones` — call `cells_in_bounds` spatial RPC on map viewport change

## Supabase

- All DB writes from Edge Functions use the **service role key**
- RLS enforced on all tables — clients only see/touch their own data
- `anticheat_log` has `USING(false)` on SELECT — completely invisible to clients
- `SECURITY DEFINER` RPCs for atomic counters: `increment_cell_capture_count`, `increment_run_cells_captured`, `increment_user_cell_count`, `increment_user_suspicion`
- pg_cron refreshes `leaderboard_cache` periodically; `end-run` also triggers a manual refresh

## Edge Functions

| Function | Trigger | What it does |
|---|---|---|
| `start-run` | User taps Start Run | Creates run row, validates no open run exists |
| `end-run` | User taps End Run | Closes run, saves route, updates streak + stats, refreshes leaderboard |
| `submit-capture` | Cell exit after 20 s dwell | Anti-cheat → writes capture → updates cell ownership |
| `get-leaderboard` | Leaderboard screen load | Reads leaderboard_cache, returns ranked rows |
| `send-territory-notifications` | pg_cron on cell ownership change | Push notification to displaced owner |

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_MAPBOX_TOKEN
```

Edge Functions get `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically from Supabase runtime.

## Running the App

Requires a dev build (not Expo Go) due to MapLibre and expo-secure-store native modules.

```bash
cd apps/mobile
npm install
npx expo run:ios        # or run:android
npx expo start --dev-client
```

## Git Workflow

| Branch | Purpose | Rules |
|---|---|---|
| `master` | Production | PR required, CI must pass, 1 approval |
| `develop` | Integration | PR required, CI must pass |
| `fix/*` | Bug fixes | Branch from `develop`, PR back to `develop` |
| `feature/*` | Features | Branch from `develop`, PR back to `develop` |

**Never commit directly to `master`.** All changes go `feature/fix branch → develop → master`.

## Active Run — Cell Loading

During a run, `active.tsx` maintains a rolling viewport window:
- Cells refetch every ~250m of movement (`REFETCH_THRESHOLD_DEG = 0.0022`)
- Load radius is ~500m around the runner (`CELL_RADIUS_DEG = 0.0045`)
- Uses `useViewportCells(runBounds)` + `useViewportZones(runBounds)` where `runBounds` is derived from `lastPosition`

## Known Bugs / Not Yet Fixed

- `zonesCaptured` counter never increments (no zone capture detection logic)
- No GPS spoofing protection (no SafetyNet/DeviceCheck)
- No automated ban threshold on suspicion score
- Presence channel not sharded by zone (will bottleneck at 500+ concurrent runners)
- Streak uses UTC — runners near local midnight may see wrong streak date
- App icon and splash image are placeholder assets

## Setup Checklist (first time)

1. Create Supabase project (AWS ca-central-1)
2. `supabase link --project-ref <ref>` then `supabase db push` (runs all 18 migrations)
3. `supabase functions deploy` for all 5 functions
4. Fill `apps/mobile/.env` with the three vars above
5. `cd scripts && npx ts-node import-osm-blocks.ts <gta_launch_zone_id>` to seed cells
6. `cd apps/mobile && npm install && npx expo run:ios`
7. Add GitHub Secrets (see `.github/branch-protection.md`) to enable CI/CD

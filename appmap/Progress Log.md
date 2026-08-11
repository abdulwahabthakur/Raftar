# Progress Log

Running record of what's been built, what's pending, and what changes as the project evolves.

---

## Status: Code Complete, Backend Pending

All application code is written. The app has **not yet been run against a live backend.**

---

## What Is Built (as of 2026-08-07)

### Backend
- [x] 18 SQL migrations covering the complete schema
- [x] RLS policies on all tables
- [x] 4 pg_cron scheduled jobs (cell expiry, zone decay, leaderboard refresh, notifications)
- [x] 5 Deno Edge Functions deployed-ready
- [x] SECURITY DEFINER RPCs for all atomic counter operations
- [x] Spatial RPC `cells_in_bounds` for viewport loading
- [x] GTA launch zone seeded (migration 016)
- [x] Migration 018 grants for Edge Function service role

### Mobile App
- [x] Auth flow (welcome, onboarding, sign in, sign up, sign out)
- [x] Map screen with live territory rendering
- [x] Start Run button + run lifecycle
- [x] Active run screen (GPS tracking, HUD, capture detection, presence)
- [x] End Run + run summary screen
- [x] Cell capture flow (dwell timer, GPS slice, anti-cheat-ready submission)
- [x] Held cell silent skip
- [x] Leaderboard screen (all 3 types × 3 periods)
- [x] Profile screen (stats, streak badge)
- [x] All 7 map layers (CellLayer, ZoneLayer, HeldCellLayer, FogLayer, PulseLayer, RunnerDot, TerritoryMap)
- [x] Presence system (broadcast + receive other runners)
- [x] GPS buffer (MMKV-backed ring buffer)
- [x] Viewport-aware cell/zone loading (spatial RPC)
- [x] Zustand stores (run, territory, auth)
- [x] Zod validation on all API payloads
- [x] Dark theme throughout
- [x] All TypeScript types defined

### Documentation
- [x] README.md (human-readable project overview)
- [x] CLAUDE.md (Claude Code context file)
- [x] This Obsidian vault (appmap/)

---

## What Still Needs To Be Done

### Immediate (before first test run)
- [ ] Create Supabase project
- [ ] Run all 18 migrations (`supabase db push`)
- [ ] Fill in `.env` with real Supabase URL, anon key, Mapbox token
- [ ] Deploy all 5 Edge Functions
- [ ] Configure cron Postgres settings (`app.supabase_url`, `app.service_role_key`)
- [ ] Run OSM import script to seed territory cells for GTA
- [ ] Build dev client on iOS or Android device

### Known Gaps / Future Work
- [ ] **GPS spoofing protection** — no OS-level attestation (SafetyNet / DeviceCheck) yet
- [ ] **Automated bans** — suspicion score accumulates but no automatic action triggers
- [ ] **Multi-device abuse** — device ID tracks hardware but new device bypasses it
- [ ] **Timezone-aware streaks** — currently uses UTC; runners near midnight in non-UTC timezones may see unexpected streak behavior
- [ ] **Spatial presence** — all GTA runners share one Realtime channel; at scale, needs sub-zone fan-out
- [ ] **Zone strength UI** — zones have a `strength` field but it's not visualized in the app yet
- [ ] **Zone capture confirmation** — `zonesCaptured` counter exists but the trigger for incrementing it on the server needs wiring
- [ ] **Push notification token collection** — `users.push_token` column exists, collection UI not implemented
- [ ] **Avatar upload** — `avatar_url` column exists, upload UI not implemented
- [ ] **Streak decay** — streaks are awarded but never decay (no "lose streak after X days" logic)
- [ ] **App icons + splash** — placeholder assets referenced in `app.config.ts`

---

## Change Log

### 2026-08-11 — Active Run + CI/CD Session

**`app/run/active.tsx` — cells now load continuously during a run**
Root cause: the active run screen rendered `<TerritoryMap followUser />` without passing `onBoundsChange`, so `useViewportCells` was never called during a run. Cells loaded before the run started were the only ones available — running into new areas captured nothing.

Fix: added a rolling viewport window using `lastPosition` from the GPS store. Every time the runner moves ~250m from the last fetch center, a new 500m-radius bounding box is computed and passed to `useViewportCells` + `useViewportZones`. TanStack Query deduplicates fetches so only genuinely new viewport areas trigger an RPC call.

Constants:
- `REFETCH_THRESHOLD_DEG = 0.0022` (~250m) — minimum movement before re-fetching
- `CELL_RADIUS_DEG = 0.0045` (~500m) — radius of the cell load window around the runner

**CI/CD — GitHub Actions pipelines added**

Three workflows in `.github/workflows/`:
- `ci.yml` — runs on every PR to `main`/`develop`: TypeScript check, ESLint, migration ordering validation
- `deploy-backend.yml` — runs on push to `master` when backend files change: `supabase db push` + all 5 Edge Function deploys + healthcheck
- `eas-build.yml` — runs on push to `master` when mobile files change: EAS build for Android + iOS (preview profile); also supports manual `workflow_dispatch` trigger

Also added `.github/PULL_REQUEST_TEMPLATE.md` and `.github/CODEOWNERS` (migrations/Edge Functions require review from `@abdulwahabthakur`).

**Branch structure**

| Branch | Purpose |
|---|---|
| `master` | Production. Protected: PR required, CI must pass, 1 approval |
| `develop` | Integration. All feature branches merge here first |
| `fix/*` | Bug fixes (e.g. `fix/active-run-viewport`) |
| `feature/*` | New features |
| `chore/*` | Maintenance, config, docs |

See `.github/branch-protection.md` for exact GitHub settings to apply and the secrets that must be added.

### 2026-08-08 — Bug Fix Session
Six bugs fixed across the app:

1. **`app/_layout.tsx`** — Splash screen was never dismissed. Root cause: `SplashScreen.preventAutoHideAsync()` and `SplashScreen.hideAsync()` were both missing. Fixed by re-adding them with the `isLoading` guard pattern. Combined with the `try/finally` fix in `authService.ts` (ensures `setLoading(false)` always fires even on network error), the splash now dismisses correctly.

2. **`src/components/map/TerritoryMap.tsx`** — Native `SIGABRT` crash in MapLibre's `ResourceLoaderT` thread. Root cause: using an HTTPS Mapbox URL (`api.mapbox.com/styles/v1/...?access_token=TOKEN`) as the map style. MapLibre crashes when it can't parse the response. Fixed by switching to the `mapbox://styles/mapbox/dark-v11` URI scheme, which lets MapLibre authenticate via `setAccessToken` instead.

3. **`app/run/active.tsx`** — Stale closure bug in `startPresenceBroadcast`. The callbacks `() => lastPosition` and `() => cells.filter(...)` captured the values at effect-mount time and never updated. Fixed by using `useRunStore.getState()` and `useTerritoryStore.getState()` inside the callbacks so they always read current state.

4. **`src/components/run/EndRunButton.tsx`** — Run summary always showed zeros. Root cause: navigated to `/run/summary` with no params. Fixed by computing `durationSeconds` and passing all stats (`distance`, `duration`, `cells`, `skipped`, `zones`) as router params.

5. **`app/run/summary.tsx`** — Used `router.useSearchParams?.()` which doesn't exist in Expo Router v3. Fixed by using `useLocalSearchParams<{...}>()` from `expo-router` with typed params.

6. **`src/features/territory/useViewportCells.ts`** — Zones query used `.gte('geometry', bounds.south)` which is meaningless on a PostGIS geometry column (PostgREST can't do spatial comparisons inline). Fixed by fetching all zones with a plain `select` (zones are large static areas, there are very few of them).

### 2026-08-07
- Created Obsidian vault (`appmap/`) with full project documentation
- Created `CLAUDE.md` for Claude Code auto-context
- Created `README.md` (human-readable)
- Migration 018 added (grants for Edge Function service role)
- Multiple files updated since initial scaffold: `map.tsx`, `active.tsx`, `runService.ts`, `useRunTracker.ts`, `CellLayer.tsx`, `FogLayer.tsx`, `HeldCellLayer.tsx`, `PulseLayer.tsx`, `RunnerDot.tsx`, `TerritoryMap.tsx`, `ZoneLayer.tsx`, `StartRunButton.tsx`, `supabase.ts`, `schemas.ts`, `start-run/index.ts`, `end-run/index.ts`, `get-leaderboard/index.ts`

### Initial Scaffold (2026-05-24)
- Full project scaffolded: 80 files, 16 migrations, 5 Edge Functions, all component shells

---

## How to Update This Log

When making code changes:
1. Note the date and what changed in the **Change Log** section above
2. If a "pending" item is completed, move it from **What Still Needs To Be Done** to **What Is Built**
3. If a new gap is discovered, add it to **Known Gaps / Future Work**

---

## See Also
- [[Environment & Setup]] — the setup checklist
- [[Hard Rules]] — constraints that must not change
- [[Architecture]] — full system overview

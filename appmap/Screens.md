# Screens

All screens use Expo Router file-based routing. The app uses a dark theme (`#0A0A0A` background).

---

## Auth Flow — `app/(auth)/`

### Welcome — `app/(auth)/welcome.tsx`
Entry point for unauthenticated users.
- Sign in with email + password → calls `authService.signIn()`
- Sign up → calls `authService.signUp(email, password, username)`
- On success → redirects to `(tabs)/map`

### Onboarding — `app/(auth)/onboarding.tsx`
Shown after first sign-up.
- User picks a username (validated against `UpdateProfileSchema`: 3–24 chars, `[a-zA-Z0-9_-]` only)
- Saves via Supabase `users` table update

---

## Tab Screens — `app/(tabs)/`

### Map — `app/(tabs)/map.tsx`
The main screen. Visible when no run is active.

**What it shows:**
- `TerritoryMap` — full-screen MapLibre map
- Start Run button (bottom center, hidden when a run is active)
- Locate-me button (bottom right) — increments a `locateTrigger` counter which the map watches

**What it does:**
- `useViewportCells(bounds)` — loads cells for the current map viewport
- `useViewportZones(bounds)` — loads zones for the current map viewport
- On run started → `router.push('/run/active')`

**Bounds type:**
```ts
type Bounds = { north: number; south: number; east: number; west: number };
```

### Leaderboard — `app/(tabs)/leaderboard.tsx`
Three board types × three periods = 9 combinations.
- `BoardTypeTabs` — Distance / Territory / Domination
- `PeriodTabs` — Today / This Week / All Time
- `LeaderboardList` — virtualized list using `@shopify/flash-list`
- `LeaderRow` — single ranked entry with avatar, username, rank, value

Data from `useLeaderboard` hook → calls `get-leaderboard` Edge Function.

### Profile — `app/(tabs)/profile.tsx`
Personal stats for the logged-in user.
- Total distance (km), total cells, total runs
- Current streak, longest streak (`StreakBadge` component)
- Sign out button

---

## Run Screens — `app/run/`

### Active Run — `app/run/active.tsx`
Shown during a run. Overlays HUD and controls on top of the map.

**Components:**
- `TerritoryMap` with `followUser` prop — camera locks to GPS position
- `RunHUD` — top overlay: cells captured, distance, elapsed time
- `CaptureFlash` — brief white flash on screen when a capture is confirmed
- `HeldCellSkip` — brief toast-style notification when a held cell is silently skipped
- `EndRunButton` — bottom center

**Logic in `active.tsx`:**
- Calls `useRunTracker(isActive)` — starts/stops GPS tracking
- Calls `startPresenceBroadcast` / `stopPresenceBroadcast` when run starts/ends
- Watches `lastPosition` → calls `findCellAtPoint` → `onEnterCell` / `onExitCell`
- Watches `activeRun.cellsCaptured` → triggers `CaptureFlash`

### Run Summary — `app/run/summary.tsx`
Post-run stats displayed after `endRun()` completes.
- Distance, duration, cells captured, zones captured
- Link back to the map

---

## Root Layout — `app/_layout.tsx`
- Initialises auth via `authService.initAuth()` on mount
- Handles auth state routing (redirect to welcome if no session)
- Sets up safe area, gesture handler, and screen providers

---

## See Also
- [[Map Components]] — the layers inside `TerritoryMap`
- [[Run Engine]] — what powers the active run screen
- [[Data Types]] — `ActiveRun`, `UserProfile`, `LeaderboardEntry` types

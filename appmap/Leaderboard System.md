# Leaderboard System

Three board types × three time periods = 9 combinations. Powered by a pre-computed cache table.

---

## Board Types

### Distance
- Ranks users by total kilometers run in the period
- Value = sum of `runs.distance_meters` for completed runs in the window
- All-time version uses `users.total_distance_meters` (denormalized counter)

### Territory
- Ranks users by number of cells captured in the period
- Value = COUNT(*) from `cell_captures` in the window
- All-time version uses `users.total_cells`

### Domination
- **Live ranking** — who currently owns the most cells RIGHT NOW
- Value = COUNT(*) of `territory_cells` where `owner_id = userId`
- No time period — always "all time" (it's a snapshot of current state)

---

## Time Periods

| Period | Window |
|---|---|
| `today` | Since midnight today (UTC) |
| `week` | Last 7 days |
| `alltime` | All completed runs / all captures ever |

---

## The Cache (`leaderboard_cache` table)

Schema:
```sql
PRIMARY KEY (board_type, period, rank)
-- board_type: 'distance', 'territory', 'domination'
-- period: 'today', 'week', 'alltime'
-- rank: 1, 2, 3, ..., 100
```

**Why a cache?** Computing leaderboards on every request requires full table scans over `runs` and `cell_captures`, which gets slow at scale. Pre-computing and storing the top 100 makes reads instant.

**Max rows:** 100 per combination = 7 combinations × 100 = 700 rows total.

---

## Refresh Triggers

The cache is rebuilt in two ways:

1. **pg_cron every 5 minutes** — `refresh-leaderboard` job (background refresh)
2. **After every run ends** — `end-run` Edge Function calls `refresh_leaderboard_cache()` immediately

This means rankings update within seconds of finishing a run.

---

## get-leaderboard Edge Function

The mobile app calls `GET /functions/v1/get-leaderboard?type=distance&period=week&limit=50`.

For `distance` and `territory`, the function actually aggregates live from `runs` / `cell_captures` rather than reading the cache — this ensures accuracy even if the cron is lagging. For `domination`, it tallies from `territory_cells` directly.

See [[Edge Functions]] for the full implementation.

---

## Mobile App

### `useLeaderboard` hook — `features/leaderboard/useLeaderboard.ts`
TanStack Query hook. Calls the `get-leaderboard` Edge Function with the selected `boardType` and `period`.

### `LeaderboardList` — `components/leaderboard/LeaderboardList.tsx`
Virtualized list using `@shopify/flash-list` for smooth scrolling.

### `LeaderRow` — `components/leaderboard/LeaderRow.tsx`
Single row: rank number, avatar, username, value (formatted as km or cell count).

### `BoardTypeTabs` — `components/leaderboard/BoardTypeTabs.tsx`
Switches between Distance / Territory / Domination.

### `PeriodTabs` — `components/leaderboard/PeriodTabs.tsx`
Switches between Today / This Week / All Time.

---

## See Also
- [[Cron Jobs]] — the `refresh-leaderboard` cron job details
- [[Edge Functions]] — `get-leaderboard` function
- [[Database Migrations]] — migration 010 (`leaderboard_cache` table)

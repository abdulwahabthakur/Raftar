# Security & RLS

Row Level Security is enabled on every table. Source: `backend/supabase/migrations/013_rls_policies.sql`.

---

## The Core Security Model

**Clients can never mutate territory.** There are no INSERT or UPDATE RLS policies on `territory_cells`, `cell_captures`, or `zone_captures` for the `anon` or `authenticated` roles. The only way to write to these tables is through Edge Functions that use the **service-role key**, which bypasses RLS entirely.

---

## RLS Policies by Table

### `users`
| Policy | Rule |
|---|---|
| `users_select_all` | `USING (true)` — anyone can read any profile |
| `users_update_own` | `USING (auth.uid() = id)` — can only update own row |
| No INSERT policy | Inserts happen via `handle_new_user()` trigger (SECURITY DEFINER) |

### `territory_cells`
| Policy | Rule |
|---|---|
| `cells_select_auth` | `USING (auth.role() = 'authenticated')` — logged-in users can read all cells |
| No INSERT / UPDATE policies | Writes via Edge Function service role only |

### `zones`
| Policy | Rule |
|---|---|
| `zones_select_auth` | `USING (auth.role() = 'authenticated')` |
| No writes | Writes via service role only |

### `launch_zones`
| Policy | Rule |
|---|---|
| `launch_zones_select_all` | `USING (true)` — public read |

### `runs`
| Policy | Rule |
|---|---|
| `runs_select_own` | `USING (auth.uid() = user_id)` — users only see their own runs |
| No INSERT / UPDATE | Via Edge Functions only |

### `cell_captures`
| Policy | Rule |
|---|---|
| `cell_captures_select_auth` | `USING (auth.role() = 'authenticated')` — read-only for all logged-in users |
| No INSERT | Via `submit-capture` Edge Function only |

### `zone_captures`
| Policy | Rule |
|---|---|
| `zone_captures_select_auth` | `USING (auth.role() = 'authenticated')` |

### `anticheat_log`
| Policy | Rule |
|---|---|
| `anticheat_no_access` | `USING (false)` — **blocks all clients, always** |

This means even a logged-in user querying `anticheat_log` directly gets zero rows back (RLS hides them). Only the service-role key (used inside Edge Functions) can read or write this table.

### `leaderboard_cache`
| Policy | Rule |
|---|---|
| `leaderboard_select_auth` | `USING (auth.role() = 'authenticated')` |

### `run_streaks`
| Policy | Rule |
|---|---|
| `streaks_select_own` | `USING (auth.uid() = user_id)` |

### `notification_log`
| Policy | Rule |
|---|---|
| `notifications_select_own` | `USING (auth.uid() = user_id)` |

---

## SECURITY DEFINER Functions

Several Postgres functions are defined with `SECURITY DEFINER`, meaning they run with the privileges of the function owner (postgres superuser), not the calling user. This allows them to write to tables even when the calling context doesn't have INSERT/UPDATE permission.

| Function | Purpose |
|---|---|
| `handle_new_user()` | Auto-creates `users` row on Auth signup |
| `increment_cell_capture_count` | Atomic counter update on `territory_cells` |
| `increment_run_cells_captured` | Atomic counter update on `runs` |
| `increment_user_cell_count` | Atomic counter update on `users.total_cells` |
| `increment_user_suspicion` | Adds to user's suspicion score |
| `increment_user_run_stats` | Updates `total_runs` and `total_distance_meters` |
| `update_streak` | Updates `run_streaks` table |
| `refresh_leaderboard_cache` | Rebuilds all leaderboard cache rows |

---

## JWT Auth in Edge Functions

Every Edge Function:
1. Extracts `Authorization: Bearer <token>` from request headers
2. Calls `supabase.auth.getUser(token)` using the service-role Supabase client
3. If the token is invalid or expired → 401 immediately
4. All subsequent DB operations are done with the service-role client, meaning RLS is bypassed but the user's identity is verified

---

## Device ID

`expo-secure-store` generates and persists a device UUID on first install. It's included in every capture submission. Used in the `anticheat_log` metadata to track which physical device is submitting captures, independent of which user account is logged in.

---

## See Also
- [[Anti-Cheat System]] — how `anticheat_log` is used
- [[Edge Functions]] — how service-role key is used
- [[Hard Rules]] — no client writes to territory tables
- [[Database Migrations]] — where these policies are defined (013)

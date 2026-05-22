# Streak System

Tracks consecutive days on which a user completed at least one run.

---

## Storage

Two places track streak data:

**`run_streaks` table** (migration 011):
```sql
CREATE TABLE run_streaks (
  user_id        UUID PRIMARY KEY REFERENCES users(id),
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_run_date  DATE
);
```

**`users` table** (migration 002) also stores:
```ts
current_streak: INT
longest_streak: INT
```
These are denormalized copies for fast profile reads without joining `run_streaks`.

---

## How It Updates

The `update_streak` Postgres function (SECURITY DEFINER) is called by the `end-run` Edge Function:

```ts
await supabase.rpc('update_streak', {
  p_user_id: user.id,
  p_run_date: endedAt.split('T')[0],  // date portion only: 'YYYY-MM-DD'
});
```

**Logic (inside the function):**
1. Fetch the user's `last_run_date` from `run_streaks`
2. If `last_run_date = yesterday` → `current_streak + 1`
3. If `last_run_date = today` → no change (already ran today)
4. If `last_run_date` is older or NULL → reset `current_streak = 1`
5. Update `longest_streak = MAX(current_streak, longest_streak)`
6. Update `last_run_date = today`
7. Sync `users.current_streak` and `users.longest_streak`

---

## Display

**`StreakBadge` component** — `apps/mobile/src/components/ui/StreakBadge.tsx`
Shown on the Profile screen. Displays the current streak count with a flame/fire icon.

The `UserProfile` type carries both `currentStreak` and `longestStreak`:
```ts
interface UserProfile {
  ...
  currentStreak: number;
  longestStreak: number;
}
```

---

## Edge Cases

- **Multiple runs in one day:** Only the first run of the day counts for streak purposes. The `last_run_date = today` check prevents double-counting.
- **Missed day:** Any gap resets `current_streak` to 1 (the current run).
- **Timezone:** The date is extracted from `endedAt` (ISO string) on the server — uses UTC. Runners at midnight local time may see unexpected behavior if they're in a non-UTC timezone and run just after midnight. Future: use user's local timezone.

---

## See Also
- [[Edge Functions]] — `end-run` calls `update_streak`
- [[Database Migrations]] — migration 011 (run_streaks table)
- [[Data Types]] — `UserProfile` has `currentStreak`, `longestStreak`

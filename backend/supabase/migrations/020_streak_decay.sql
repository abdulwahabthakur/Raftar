-- ===================== STREAK DECAY =====================
-- Runs at 00:05 UTC daily.
-- Resets current_streak to 0 for any user who didn't run yesterday.
-- Uses 00:05 instead of midnight to avoid race with update_streak calls
-- that land just before midnight UTC.

SELECT cron.schedule(
  'decay-streaks',
  '5 0 * * *',
  $$
    WITH stale AS (
      SELECT user_id
      FROM run_streaks
      WHERE current_streak > 0
        AND last_run_date < CURRENT_DATE - INTERVAL '1 day'
    )
    UPDATE run_streaks
    SET current_streak = 0,
        updated_at     = now()
    WHERE user_id IN (SELECT user_id FROM stale);

    -- Mirror the reset into the denormalized users table
    UPDATE users u
    SET current_streak = 0
    FROM run_streaks rs
    WHERE u.id = rs.user_id
      AND rs.current_streak = 0
      AND u.current_streak > 0;
  $$
);

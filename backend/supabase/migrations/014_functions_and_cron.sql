-- ===================== CELL EXPIRY =====================
-- Runs every minute: release expired holds
SELECT cron.schedule(
  'expire-cells',
  '* * * * *',
  $$
    -- Only clears the hold lock; ownership stays until someone else captures the cell
    UPDATE territory_cells
       SET held_until = NULL
     WHERE held_until IS NOT NULL
       AND held_until < now();
  $$
);

-- ===================== ZONE STRENGTH DECAY =====================
-- Runs every hour: -15 strength if owner hasn't defended in 12h; neutral at 0
SELECT cron.schedule(
  'decay-zone-strength',
  '0 * * * *',
  $$
    UPDATE zones
       SET strength = GREATEST(0, strength - 15),
           owner_id = CASE WHEN GREATEST(0, strength - 15) = 0 THEN NULL ELSE owner_id END,
           captured_at = CASE WHEN GREATEST(0, strength - 15) = 0 THEN NULL ELSE captured_at END
     WHERE owner_id IS NOT NULL
       AND (last_defended_at IS NULL OR last_defended_at < now() - INTERVAL '12 hours');
  $$
);

-- ===================== LEADERBOARD REFRESH =====================
-- Runs every 5 minutes: rebuild all 7 leaderboard slices
SELECT cron.schedule(
  'refresh-leaderboard',
  '*/5 * * * *',
  $$
    -- Distance Today
    INSERT INTO leaderboard_cache (board_type, period, rank, user_id, value, refreshed_at)
    SELECT 'distance', 'today', ROW_NUMBER() OVER (ORDER BY SUM(distance_meters) DESC),
           user_id, SUM(distance_meters), now()
      FROM runs
     WHERE started_at >= CURRENT_DATE
     GROUP BY user_id
     ORDER BY SUM(distance_meters) DESC
     LIMIT 100
    ON CONFLICT (board_type, period, rank)
    DO UPDATE SET user_id = EXCLUDED.user_id, value = EXCLUDED.value, refreshed_at = EXCLUDED.refreshed_at;

    -- Distance This Week
    INSERT INTO leaderboard_cache (board_type, period, rank, user_id, value, refreshed_at)
    SELECT 'distance', 'week', ROW_NUMBER() OVER (ORDER BY SUM(distance_meters) DESC),
           user_id, SUM(distance_meters), now()
      FROM runs
     WHERE started_at >= date_trunc('week', now())
     GROUP BY user_id
     ORDER BY SUM(distance_meters) DESC
     LIMIT 100
    ON CONFLICT (board_type, period, rank)
    DO UPDATE SET user_id = EXCLUDED.user_id, value = EXCLUDED.value, refreshed_at = EXCLUDED.refreshed_at;

    -- Distance All Time
    INSERT INTO leaderboard_cache (board_type, period, rank, user_id, value, refreshed_at)
    SELECT 'distance', 'alltime', ROW_NUMBER() OVER (ORDER BY total_distance_meters DESC),
           id, total_distance_meters, now()
      FROM users
     ORDER BY total_distance_meters DESC
     LIMIT 100
    ON CONFLICT (board_type, period, rank)
    DO UPDATE SET user_id = EXCLUDED.user_id, value = EXCLUDED.value, refreshed_at = EXCLUDED.refreshed_at;

    -- Territory Today
    INSERT INTO leaderboard_cache (board_type, period, rank, user_id, value, refreshed_at)
    SELECT 'territory', 'today', ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC),
           user_id, COUNT(*), now()
      FROM cell_captures
     WHERE captured_at >= CURRENT_DATE
     GROUP BY user_id
     ORDER BY COUNT(*) DESC
     LIMIT 100
    ON CONFLICT (board_type, period, rank)
    DO UPDATE SET user_id = EXCLUDED.user_id, value = EXCLUDED.value, refreshed_at = EXCLUDED.refreshed_at;

    -- Territory This Week
    INSERT INTO leaderboard_cache (board_type, period, rank, user_id, value, refreshed_at)
    SELECT 'territory', 'week', ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC),
           user_id, COUNT(*), now()
      FROM cell_captures
     WHERE captured_at >= date_trunc('week', now())
     GROUP BY user_id
     ORDER BY COUNT(*) DESC
     LIMIT 100
    ON CONFLICT (board_type, period, rank)
    DO UPDATE SET user_id = EXCLUDED.user_id, value = EXCLUDED.value, refreshed_at = EXCLUDED.refreshed_at;

    -- Territory All Time
    INSERT INTO leaderboard_cache (board_type, period, rank, user_id, value, refreshed_at)
    SELECT 'territory', 'alltime', ROW_NUMBER() OVER (ORDER BY total_cells DESC),
           id, total_cells, now()
      FROM users
     ORDER BY total_cells DESC
     LIMIT 100
    ON CONFLICT (board_type, period, rank)
    DO UPDATE SET user_id = EXCLUDED.user_id, value = EXCLUDED.value, refreshed_at = EXCLUDED.refreshed_at;

    -- Domination (live — cells currently owned)
    INSERT INTO leaderboard_cache (board_type, period, rank, user_id, value, refreshed_at)
    SELECT 'domination', 'alltime', ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC),
           owner_id, COUNT(*), now()
      FROM territory_cells
     WHERE owner_id IS NOT NULL
       AND (held_until IS NULL OR held_until > now())
     GROUP BY owner_id
     ORDER BY COUNT(*) DESC
     LIMIT 100
    ON CONFLICT (board_type, period, rank)
    DO UPDATE SET user_id = EXCLUDED.user_id, value = EXCLUDED.value, refreshed_at = EXCLUDED.refreshed_at;
  $$
);

-- ===================== THEFT NOTIFICATIONS =====================
-- Runs every hour: trigger Edge Function for push notifications
SELECT cron.schedule(
  'send-theft-notifications',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-territory-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

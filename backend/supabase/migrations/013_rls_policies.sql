-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE anticheat_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- ===================== users =====================
-- Public read, own update only, INSERT via trigger only
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- ===================== territory_cells =====================
-- SELECT for all authenticated; no client writes (Edge Functions use service role)
CREATE POLICY "cells_select_auth" ON territory_cells FOR SELECT USING (auth.role() = 'authenticated');

-- ===================== zones =====================
CREATE POLICY "zones_select_auth" ON zones FOR SELECT USING (auth.role() = 'authenticated');

-- ===================== launch_zones =====================
CREATE POLICY "launch_zones_select_all" ON launch_zones FOR SELECT USING (true);

-- ===================== runs =====================
CREATE POLICY "runs_select_own" ON runs FOR SELECT USING (auth.uid() = user_id);

-- ===================== cell_captures =====================
-- SELECT only — no client INSERT
CREATE POLICY "cell_captures_select_auth" ON cell_captures FOR SELECT USING (auth.role() = 'authenticated');

-- ===================== zone_captures =====================
CREATE POLICY "zone_captures_select_auth" ON zone_captures FOR SELECT USING (auth.role() = 'authenticated');

-- ===================== anticheat_log =====================
-- COMPLETELY inaccessible to ALL clients — service role only
CREATE POLICY "anticheat_no_access" ON anticheat_log USING (false);

-- ===================== leaderboard_cache =====================
CREATE POLICY "leaderboard_select_auth" ON leaderboard_cache FOR SELECT USING (auth.role() = 'authenticated');

-- ===================== run_streaks =====================
CREATE POLICY "streaks_select_own" ON run_streaks FOR SELECT USING (auth.uid() = user_id);

-- ===================== notification_log =====================
CREATE POLICY "notifications_select_own" ON notification_log FOR SELECT USING (auth.uid() = user_id);

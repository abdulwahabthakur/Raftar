-- Atomic stat increment functions used by Edge Functions (service role only)
-- These are SECURITY DEFINER so the Edge Function's JWT-validated user
-- cannot call them directly through the anon/user role.

CREATE OR REPLACE FUNCTION increment_user_run_stats(
  p_user_id        UUID,
  p_distance_meters BIGINT
)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users
     SET total_distance_meters = total_distance_meters + p_distance_meters,
         total_runs            = total_runs + 1
   WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION increment_user_cell_count(p_user_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users SET total_cells = total_cells + 1 WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION increment_user_suspicion(p_user_id UUID, p_score INT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users SET suspicion_score = suspicion_score + p_score WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION increment_run_cells_captured(p_run_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE runs SET cells_captured = cells_captured + 1 WHERE id = p_run_id;
$$;

CREATE OR REPLACE FUNCTION increment_cell_capture_count(p_cell_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE territory_cells SET capture_count = capture_count + 1 WHERE id = p_cell_id;
$$;

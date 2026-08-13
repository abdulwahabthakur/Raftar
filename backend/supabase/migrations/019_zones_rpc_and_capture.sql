-- ===================== GET ALL ZONES (GeoJSON geometry) =====================
-- PostgREST returns PostGIS geometry as raw WKB binary — unusable by MapLibre.
-- This RPC converts to JSONB so the client receives proper GeoJSON polygons.
CREATE OR REPLACE FUNCTION get_all_zones()
RETURNS TABLE (
  id               UUID,
  name             TEXT,
  geometry         JSONB,
  owner_id         UUID,
  strength         INT,
  captured_at      TIMESTAMPTZ,
  last_defended_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    id,
    name,
    ST_AsGeoJSON(geometry)::jsonb AS geometry,
    owner_id,
    strength,
    captured_at,
    last_defended_at
  FROM zones;
$$;

GRANT EXECUTE ON FUNCTION get_all_zones() TO authenticated;

-- ===================== ZONE DOMINANCE CHECK =====================
-- Called by submit-capture Edge Function after each cell capture.
-- If the capturing user now owns >= 50% of the zone's cells, they take the zone.
-- Returns: { zone_id, zone_captured, previous_owner_id }
CREATE OR REPLACE FUNCTION check_zone_dominance(
  p_zone_id  UUID,
  p_user_id  UUID,
  p_run_id   UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_cells    INT;
  v_total_cells   INT;
  v_dominance     NUMERIC;
  v_new_strength  INT;
  v_prev_owner    UUID;
  v_zone_captured BOOLEAN := false;
BEGIN
  -- Count cells in zone owned by this user (held or expired hold doesn't matter for dominance)
  SELECT COUNT(*) INTO v_user_cells
  FROM territory_cells
  WHERE zone_id = p_zone_id AND owner_id = p_user_id;

  SELECT COUNT(*) INTO v_total_cells
  FROM territory_cells
  WHERE zone_id = p_zone_id;

  IF v_total_cells = 0 THEN
    RETURN jsonb_build_object('zone_captured', false);
  END IF;

  v_dominance    := v_user_cells::NUMERIC / v_total_cells;
  v_new_strength := LEAST(100, ROUND(v_dominance * 100));

  -- Fetch current zone owner
  SELECT owner_id INTO v_prev_owner FROM zones WHERE id = p_zone_id;

  IF v_dominance >= 0.5 THEN
    IF v_prev_owner IS DISTINCT FROM p_user_id THEN
      -- Zone ownership changes hands
      UPDATE zones SET
        owner_id         = p_user_id,
        strength         = v_new_strength,
        captured_at      = now(),
        last_defended_at = now()
      WHERE id = p_zone_id;

      INSERT INTO zone_captures (zone_id, user_id, run_id, previous_owner_id)
      VALUES (p_zone_id, p_user_id, p_run_id, v_prev_owner);

      v_zone_captured := true;
    ELSE
      -- Same owner, just refresh strength and defended timestamp
      UPDATE zones SET
        strength         = v_new_strength,
        last_defended_at = now()
      WHERE id = p_zone_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'zone_captured',      v_zone_captured,
    'previous_owner_id',  v_prev_owner,
    'new_strength',       v_new_strength,
    'dominance',          v_dominance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_zone_dominance(UUID, UUID, UUID) TO service_role;

-- RPC function called by useViewportCells to fetch cells within a bounding box
CREATE OR REPLACE FUNCTION cells_in_bbox(bbox_wkt TEXT)
RETURNS TABLE (
  id             UUID,
  zone_id        UUID,
  geometry       JSONB,
  owner_id       UUID,
  owned_at       TIMESTAMPTZ,
  held_until     TIMESTAMPTZ,
  capture_count  INT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    tc.id,
    tc.zone_id,
    ST_AsGeoJSON(tc.geometry)::jsonb AS geometry,
    tc.owner_id,
    tc.owned_at,
    tc.held_until,
    tc.capture_count
  FROM territory_cells tc
  WHERE ST_Intersects(
    tc.geometry,
    ST_GeomFromText(bbox_wkt, 4326)
  )
  LIMIT 500;
$$;

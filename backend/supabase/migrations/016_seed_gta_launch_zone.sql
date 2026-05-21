-- Seed: Greater Toronto Area launch zone polygon
-- Step 2 of the build order: seed launch_zones with GTA boundary (is_active = TRUE)
INSERT INTO launch_zones (name, city, geometry, is_active)
VALUES (
  'Greater Toronto Area',
  'Toronto',
  ST_GeomFromText(
    'POLYGON((-79.6392 43.5810,-79.1183 43.5810,-79.1183 43.8554,-79.6392 43.8554,-79.6392 43.5810))',
    4326
  ),
  TRUE
)
ON CONFLICT DO NOTHING;

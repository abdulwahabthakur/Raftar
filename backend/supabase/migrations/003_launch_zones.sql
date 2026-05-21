CREATE TABLE launch_zones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  geometry    GEOMETRY(POLYGON, 4326) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_zones_geometry ON launch_zones USING GIST (geometry);
CREATE INDEX idx_launch_zones_active ON launch_zones (is_active) WHERE is_active = TRUE;

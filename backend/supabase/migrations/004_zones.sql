-- Neighbourhood-level zones (cluster of cells)
CREATE TABLE zones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_zone_id    UUID NOT NULL REFERENCES launch_zones(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  geometry          GEOMETRY(POLYGON, 4326) NOT NULL,
  owner_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  strength          INT NOT NULL DEFAULT 0 CHECK (strength >= 0 AND strength <= 100),
  captured_at       TIMESTAMPTZ,
  last_defended_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zones_geometry ON zones USING GIST (geometry);
CREATE INDEX idx_zones_owner ON zones (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_zones_launch_zone ON zones (launch_zone_id);

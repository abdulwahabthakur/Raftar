-- Individual capturable city-block polygons
CREATE TABLE territory_cells (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id        UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  geometry       GEOMETRY(POLYGON, 4326) NOT NULL,
  owner_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  owned_at       TIMESTAMPTZ,
  held_until     TIMESTAMPTZ,   -- NULL = free; non-null = locked for 1 hour
  capture_count  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_territory_cells_geometry ON territory_cells USING GIST (geometry);
CREATE INDEX idx_territory_cells_zone ON territory_cells (zone_id);
CREATE INDEX idx_territory_cells_owner ON territory_cells (owner_id) WHERE owner_id IS NOT NULL;

-- Partial index — only rows currently held, kept small
CREATE INDEX idx_territory_cells_held ON territory_cells (held_until)
  WHERE held_until IS NOT NULL;

-- View: cells that can be captured right now
CREATE OR REPLACE VIEW capturable_cells AS
SELECT * FROM territory_cells
WHERE held_until IS NULL OR held_until < now();

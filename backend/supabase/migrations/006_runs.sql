CREATE TABLE runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  distance_meters  NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  cells_captured   INT NOT NULL DEFAULT 0,
  cells_skipped    INT NOT NULL DEFAULT 0,
  zones_captured   INT NOT NULL DEFAULT 0,
  route            GEOMETRY(LINESTRING, 4326),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_runs_user ON runs (user_id, started_at DESC);
CREATE INDEX idx_runs_started_at ON runs (started_at DESC);

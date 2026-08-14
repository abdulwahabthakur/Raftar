CREATE TABLE zone_captures (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id            UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id             UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  captured_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_owner_id  UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_zone_captures_zone ON zone_captures (zone_id, captured_at DESC);
CREATE INDEX idx_zone_captures_user ON zone_captures (user_id, captured_at DESC);

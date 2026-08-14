-- Append-only anti-cheat suspicion log — COMPLETELY inaccessible to clients
CREATE TABLE anticheat_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id          UUID REFERENCES runs(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL, -- 'speed_violation', 'dwell_too_short', 'replay_attempt', 'rooted_device'
  suspicion_score INT NOT NULL DEFAULT 0,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cumulative suspicion per user (materialised for fast reads)
ALTER TABLE users ADD COLUMN suspicion_score INT NOT NULL DEFAULT 0;

CREATE INDEX idx_anticheat_user ON anticheat_log (user_id, created_at DESC);

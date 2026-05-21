-- Append-only capture log
CREATE TABLE cell_captures (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cell_id            UUID NOT NULL REFERENCES territory_cells(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id             UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  captured_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_owner_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  entered_at         TIMESTAMPTZ NOT NULL,
  exited_at          TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_cell_captures_cell ON cell_captures (cell_id, captured_at DESC);
CREATE INDEX idx_cell_captures_user ON cell_captures (user_id, captured_at DESC);
CREATE INDEX idx_cell_captures_run ON cell_captures (run_id);

-- Log of territory-theft push notifications sent
CREATE TABLE notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL, -- 'cell_stolen', 'zone_stolen', 'zone_decaying'
  cell_id       UUID REFERENCES territory_cells(id) ON DELETE SET NULL,
  zone_id       UUID REFERENCES zones(id) ON DELETE SET NULL,
  thief_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  push_success  BOOLEAN
);

CREATE INDEX idx_notification_log_user ON notification_log (user_id, sent_at DESC);

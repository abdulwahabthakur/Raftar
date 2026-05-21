-- Materialised leaderboard cache refreshed every 5 minutes by pg_cron
CREATE TABLE leaderboard_cache (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_type  TEXT NOT NULL, -- 'distance' | 'territory' | 'domination'
  period      TEXT NOT NULL, -- 'today' | 'week' | 'alltime'
  rank        INT NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value       NUMERIC NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (board_type, period, rank)
);

CREATE INDEX idx_leaderboard_lookup ON leaderboard_cache (board_type, period, rank);

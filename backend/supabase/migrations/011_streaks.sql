-- Daily run streak tracking
CREATE TABLE run_streaks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  last_run_date DATE NOT NULL,
  current_streak INT NOT NULL DEFAULT 1,
  longest_streak INT NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggered from end-run Edge Function (via service role)
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID, p_run_date DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_date DATE;
  v_current   INT;
  v_longest   INT;
BEGIN
  SELECT last_run_date, current_streak, longest_streak
    INTO v_last_date, v_current, v_longest
    FROM run_streaks
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO run_streaks (user_id, last_run_date, current_streak, longest_streak)
    VALUES (p_user_id, p_run_date, 1, 1);
    UPDATE users SET current_streak = 1, longest_streak = 1 WHERE id = p_user_id;
    RETURN;
  END IF;

  IF p_run_date = v_last_date THEN
    RETURN; -- already ran today
  ELSIF p_run_date = v_last_date + INTERVAL '1 day' THEN
    v_current := v_current + 1;
    v_longest := GREATEST(v_longest, v_current);
  ELSE
    v_current := 1;
  END IF;

  UPDATE run_streaks
     SET last_run_date = p_run_date,
         current_streak = v_current,
         longest_streak = v_longest,
         updated_at = now()
   WHERE user_id = p_user_id;

  UPDATE users
     SET current_streak = v_current,
         longest_streak = v_longest
   WHERE id = p_user_id;
END;
$$;

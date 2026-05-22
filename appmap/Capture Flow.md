# Capture Flow

End-to-end sequence of exactly what happens when a runner captures a cell. The most important flow in the whole system.

---

## Step-by-Step

```
1. useRunTracker fires (every 3 s, if moved ≥5 m, accuracy ≤20 m)
   │
   ├─ pushGPSPoint → MMKV buffer
   ├─ setLastPosition → useRunStore
   └─ incrementDistance → useRunStore

2. active.tsx watches lastPosition change
   │
   └─ findCellAtPoint(lat, lng, loadedCells)
         │  (Turf booleanPointInPolygon over all viewport cells)
         │
         ├─ If same cell as before → do nothing
         │
         └─ If different cell:
               ├─ onExitCell(previousCell)   ← if there was one
               └─ onEnterCell(newCell, userId, runId)

3. onEnterCell
   │
   ├─ getCellStatus(cell, userId)
   │     ├─ 'held' (someone else's locked cell)
   │     │    └─ processedCells.add(id), skipCell(), RETURN (silent skip)
   │     │
   │     ├─ 'mine' (my own held cell — start timer anyway or skip?)
   │     │    └─ proceeds to timer (will just re-confirm ownership)
   │     │
   │     └─ 'free' (no owner or hold expired)
   │
   ├─ processedCells.has(id) → already done this run → RETURN
   │
   └─ activeTimers.set(cellId, { cellId, enteredAt: now(), runId })

4. onExitCell (fires when runner steps into a different cell)
   │
   ├─ activeTimers.get(cellId) → retrieve timer
   ├─ dwellSecs = (now - enteredAt) / 1000
   │
   ├─ dwellSecs < 20 → RETURN (not long enough)
   │
   └─ dwellSecs ≥ 20:
         processedCells.add(cellId)
         submitCapture(timer)  ← async, fire and forget

5. submitCapture (client-side)
   │
   ├─ gpsSlice = getSlice(enteredAt, now).slice(0, 50)
   ├─ gpsSlice.length < 2 → RETURN (can't prove movement)
   │
   ├─ Zod validate SubmitCaptureSchema
   │     { runId, cellId, enteredAt, exitedAt, gpsSlice, deviceId }
   │
   └─ POST /functions/v1/submit-capture

6. submit-capture Edge Function (server)
   │
   ├─ Auth: verify JWT → get user
   ├─ Zod validate body
   ├─ Verify run exists, belongs to user, is still open (ended_at IS NULL)
   ├─ Fetch cell from territory_cells
   │
   ├─ [CHECK 1] Server-side held check
   │     held_until > now() → HTTP 409 → client: silent no-op
   │
   ├─ [CHECK 2] Dwell check
   │     (exitedAt - enteredAt) < 18 s → anticheat_log + suspicion+10 → HTTP 422
   │
   ├─ [CHECK 3] Speed check
   │     maxSpeedKmh(gpsSlice) > 30 → anticheat_log + suspicion+30 → HTTP 422
   │
   ├─ [CHECK 4] Replay check
   │     Same user captured this cell in last 120 s → anticheat_log + suspicion+20 → HTTP 409
   │
   └─ All checks passed:
         heldUntil = now + 1 hour
         INSERT INTO cell_captures (cell_id, user_id, run_id, previous_owner_id, entered_at, exited_at)
         UPDATE territory_cells SET owner_id, owned_at, held_until
         RPC increment_cell_capture_count(cellId)
         RPC increment_run_cells_captured(runId)
         RPC increment_user_cell_count(userId)
         RETURN { captured: true, heldUntil }

7. Client receives { captured: true, heldUntil }
   │
   ├─ useRunStore.captureCell()         → cellsCaptured + 1
   ├─ useTerritoryStore.updateCell(...)  → optimistic: new owner + heldUntil on map
   └─ CaptureFlash triggers (active.tsx watches cellsCaptured)
```

---

## What Can Go Wrong

| Situation | Result |
|---|---|
| GPS accuracy > 20 m | Point discarded, no capture attempt |
| Runner in cell < 20 s (client) | Timer not submitted |
| Cell became held between entry and exit | Server 409 → client silent no-op |
| Dwell < 18 s server-side | 422 + anticheat log |
| GPS shows speed > 30 km/h | 422 + anticheat log + suspicion +30 |
| Same cell captured in last 120 s | 409 + anticheat log + suspicion +20 |
| GPS slice < 2 points | Client aborts before sending |
| Run already ended on server | 404 from Edge Fn |
| Cell doesn't exist | 404 from Edge Fn |

---

## See Also
- [[Run Engine]] — `useRunTracker`, `gpsBuffer`, `captureService` internals
- [[Anti-Cheat System]] — deep dive on the three server checks
- [[Edge Functions]] — `submit-capture` full function code context
- [[Hard Rules]] — held cell skip behavior, speed limit

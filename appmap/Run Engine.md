# Run Engine

Everything that powers an active run. Files live in `apps/mobile/src/features/run/`.

---

## useRunTracker — `useRunTracker.ts`

A React hook that manages the GPS subscription for the duration of a run.

**Signature:**
```ts
export function useRunTracker(isActive: boolean): void
```

**How it works:**
1. When `isActive` becomes `true`, requests foreground location permission
2. Calls `Location.watchPositionAsync` with:
   - Accuracy: `BestForNavigation`
   - Time interval: **3000 ms**
   - Distance interval: **5 m** (only fires if you've moved this far)
3. Each incoming point is filtered:
   - `accuracy > 20 m` → discarded
4. Valid points:
   - `pushGPSPoint(point)` → into the MMKV buffer
   - `setLastPosition(lat, lng)` → updates `useRunStore`
   - Haversine distance to last point → `incrementDistance(meters)` in store
5. When `isActive` becomes `false`, removes the subscription and resets refs

**Why foreground only:** No background location requested, ever. [[Hard Rules]]

---

## gpsBuffer — `gpsBuffer.ts`

A persistent ring buffer backed by **react-native-mmkv** (fast synchronous key-value store, not AsyncStorage).

**Functions:**
```ts
pushGPSPoint(point: GPSPoint): void
// Appends a point. Drops oldest if buffer exceeds 10,000 points.

getSlice(fromTimestamp: number, toTimestamp: number): GPSPoint[]
// Returns all points whose timestamp falls in [from, to].
// Used to extract the GPS trail for a capture submission.

getRouteCoordinates(): [number, number][]
// Returns all points as [lng, lat] pairs for the PostGIS LINESTRING route.

clearBuffer(): void
// Called after endRun() to wipe the buffer clean.
```

**Storage key:** `'gps_points'` in MMKV store `id: 'gps-buffer'`
**Max size:** 10,000 points (about 8+ hours of tracking at 3 s intervals)

---

## runService — `runService.ts`

HTTP client for the two run lifecycle Edge Functions.

### `startRun()`
```ts
async function startRun(): Promise<StartRunResponse>
```
1. Gets device ID from `expo-secure-store`
2. Builds and Zod-validates `StartRunSchema` payload
3. POST `/functions/v1/start-run` with JWT auth header
4. On success → `useRunStore.getState().startRun(data.runId)`
5. Returns `{ runId, startedAt }`

### `endRun(runId, distanceMeters)`
```ts
async function endRun(runId: string, distanceMeters: number): Promise<EndRunResponse>
```
1. `getRouteCoordinates()` from GPS buffer → builds GeoJSON LineString
2. Builds and validates `EndRunSchema` payload
3. POST `/functions/v1/end-run`
4. On success → `useRunStore.getState().endRun()` + `clearBuffer()`
5. Returns `{ run: Run }`

---

## useRunStore — `useRunStore.ts`

Zustand store. The single source of truth for an active run.

**State shape:**
```ts
{
  activeRun: ActiveRun | null,
  lastPosition: { lat: number; lng: number } | null,
}
```

**`ActiveRun` type:**
```ts
{
  id: string,
  startedAt: number,          // epoch ms
  distanceMeters: number,
  cellsCaptured: number,
  cellsSkipped: number,       // held cells silently skipped
  zonesCaptured: number,
  isActive: boolean,
}
```

**Actions:**
- `startRun(runId)` — initialises `activeRun` with zeros
- `endRun()` — sets `activeRun` to null
- `incrementDistance(meters)` — adds to `distanceMeters`
- `captureCell()` — increments `cellsCaptured`
- `skipCell()` — increments `cellsSkipped` (held cell was entered)
- `captureZone()` — increments `zonesCaptured`
- `setLastPosition(lat, lng)` — updates GPS dot on map

---

## captureService — `captureService.ts`

Handles entry/exit detection and capture submission.

### State
Two module-level maps (reset at end of run via `resetRunCells()`):
- `activeTimers: Map<cellId, CellTimer>` — cells the runner is currently inside
- `processedCells: Set<cellId>` — cells already processed this run (prevents re-submission)

### `findCellAtPoint(lat, lng, cells)`
Uses **Turf.js** `booleanPointInPolygon` to check which cell (if any) contains the GPS coordinate. Iterates over all loaded cells and returns the first match.

### `onEnterCell(cell, currentUserId, runId)`
Called when the runner enters a new cell polygon.
1. `getCellStatus(cell, userId)` → determines `'free'`, `'held'`, or `'mine'`
2. If `'held'` (someone else's locked cell) → `processedCells.add(id)` + `skipCell()` + return (silent skip)
3. If already in `processedCells` → return (already captured this run)
4. Otherwise → start timer: `activeTimers.set(cellId, { cellId, enteredAt: Date.now(), runId })`

### `onExitCell(cell)`
Called when the runner exits a cell polygon.
1. Retrieves timer from `activeTimers`
2. Calculates `dwellSecs = (now - enteredAt) / 1000`
3. If `dwellSecs < 20` → not enough time, do nothing
4. Otherwise → `processedCells.add(cellId)` + `submitCapture(timer)`

### `submitCapture(timer)`
Async. Builds and sends the capture to the server:
1. `getSlice(enteredAt, now).slice(0, 50)` — GPS trail for anti-cheat
2. If slice has fewer than 2 points → abort (can't prove movement)
3. Zod-validates `SubmitCaptureSchema`
4. POST `/functions/v1/submit-capture`
5. HTTP 409 → silent no-op (server says held)
6. On `{ captured: true, heldUntil }`:
   - `useRunStore.captureCell()`
   - `useTerritoryStore.updateCell(...)` with new owner + heldUntil

---

## See Also
- [[Capture Flow]] — the full end-to-end sequence
- [[Anti-Cheat System]] — what the server does with the GPS slice
- [[Constants & Key Numbers]] — all the timing constants
- [[Hard Rules]] — no background GPS, no AsyncStorage

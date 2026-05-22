# Data Types

All TypeScript interfaces. Source file: `apps/mobile/src/types/index.ts`

---

## Territory

### `TerritoryCell`
```ts
interface TerritoryCell {
  id: string;
  zoneId: string;
  geometry: GeoJSON.Polygon;   // the cell's shape
  ownerId: string | null;      // null = uncaptured
  ownedAt: string | null;
  heldUntil: string | null;    // null = free; non-null = locked for 1 hour
  captureCount: number;        // total times captured, all time
}
```

### `CellStatus`
```ts
type CellStatus = 'free' | 'held' | 'mine' | 'contested';
```
- `free` — no owner, or hold has expired
- `held` — owned by someone else and within the 1-hour lock window
- `mine` — owned by the current user and within the 1-hour lock window
- `contested` — defined but not currently used in render logic

### `Zone`
```ts
interface Zone {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon;
  ownerId: string | null;
  strength: number;           // 0–100, decays hourly if not defended
  capturedAt: string | null;
  lastDefendedAt: string | null;
}
```

---

## GPS & Runs

### `GPSPoint`
```ts
interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;           // metres — points >20 m are discarded
  timestamp: number;          // epoch ms
}
```

### `Run` (completed run from DB)
```ts
interface Run {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  distanceMeters: number;
  durationSeconds: number;
  cellsCaptured: number;
  cellsSkipped: number;       // held cells entered but not capturable
  zonesCaptured: number;
  route: GeoJSON.LineString | null;
}
```

### `ActiveRun` (in-progress run, client-only)
```ts
interface ActiveRun {
  id: string;
  startedAt: number;          // epoch ms (Date.now())
  distanceMeters: number;
  cellsCaptured: number;
  cellsSkipped: number;
  zonesCaptured: number;
  isActive: boolean;
}
```

---

## User

### `UserProfile`
```ts
interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  totalDistanceMeters: number;
  totalCells: number;
  totalRuns: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}
```

---

## Presence

### `RunnerPresence`
```ts
interface RunnerPresence {
  userId: string;
  username: string;
  lat: number;
  lng: number;
  heldCellIds: string[];    // cells this runner currently holds (for map rendering)
  broadcastAt: number;      // epoch ms — discard if >15 s old
}
```

---

## Leaderboard

### `LeaderboardEntry`
```ts
interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  value: number;   // km (distance), cell count (territory), or live cells (domination)
}
```

### `LeaderboardType`
```ts
type LeaderboardType = 'distance' | 'territory' | 'domination';
```

### `LeaderboardPeriod`
```ts
type LeaderboardPeriod = 'today' | 'week' | 'alltime';
```

---

## Captures & Anti-Cheat

### `CellCapture`
```ts
interface CellCapture {
  id: string;
  cellId: string;
  userId: string;
  runId: string;
  capturedAt: string;
  previousOwnerId: string | null;
}
```

### `AntiCheatResult`
```ts
interface AntiCheatResult {
  allowed: boolean;
  reason?: string;
  suspicionAdded?: number;
}
```

---

## API Request/Response

### `StartRunResponse`
```ts
interface StartRunResponse {
  runId: string;
  startedAt: string;
}
```

### `EndRunResponse`
```ts
interface EndRunResponse {
  run: Run;
}
```

### `SubmitCaptureResponse`
```ts
interface SubmitCaptureResponse {
  captured: boolean;
  heldUntil?: string;
  error?: string;
}
```

---

## Zod Schemas (runtime validation)

Source: `apps/mobile/src/lib/schemas.ts`

| Schema | Used by |
|---|---|
| `GPSPointSchema` | Part of `SubmitCaptureSchema` |
| `StartRunSchema` | `runService.startRun()` |
| `EndRunSchema` | `runService.endRun()` |
| `SubmitCaptureSchema` | `captureService.submitCapture()` |
| `UpdateProfileSchema` | Profile update (username validation) |

---

## See Also
- [[Run Engine]] — how `ActiveRun` and `GPSPoint` are used
- [[Map Components]] — how `TerritoryCell` and `Zone` are rendered
- [[Presence System]] — how `RunnerPresence` is broadcast and consumed

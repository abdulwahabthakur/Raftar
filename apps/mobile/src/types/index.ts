export type CellStatus = 'free' | 'held' | 'mine' | 'contested';

export interface TerritoryCell {
  id: string;
  zoneId: string;
  geometry: GeoJSON.Polygon;
  ownerId: string | null;
  ownedAt: string | null;
  heldUntil: string | null; // null = free, non-null = locked for 1 hour
  captureCount: number;
}

export interface Zone {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon;
  ownerId: string | null;
  strength: number; // 0–100
  capturedAt: string | null;
  lastDefendedAt: string | null;
}

export interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface Run {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  distanceMeters: number;
  durationSeconds: number;
  cellsCaptured: number;
  cellsSkipped: number; // held cells runner entered but couldn't capture
  zonesCaptured: number;
  route: GeoJSON.LineString | null;
}

export interface ActiveRun {
  id: string;
  startedAt: number;
  distanceMeters: number;
  cellsCaptured: number;
  cellsSkipped: number;
  zonesCaptured: number;
  isActive: boolean;
}

export interface UserProfile {
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

export interface RunnerPresence {
  userId: string;
  username: string;
  lat: number;
  lng: number;
  heldCellIds: string[]; // cells this runner currently holds
  broadcastAt: number; // discard if >15s old
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  value: number; // distance in meters OR cell count OR domination score
}

export type LeaderboardType = 'distance' | 'territory' | 'domination';
export type LeaderboardPeriod = 'today' | 'week' | 'alltime';

export interface CellCapture {
  id: string;
  cellId: string;
  userId: string;
  runId: string;
  capturedAt: string;
  previousOwnerId: string | null;
}

export interface AntiCheatResult {
  allowed: boolean;
  reason?: string;
  suspicionAdded?: number;
}

export interface StartRunResponse {
  runId: string;
  startedAt: string;
}

export interface EndRunResponse {
  run: Run;
}

export interface SubmitCaptureResponse {
  captured: boolean;
  heldUntil?: string;
  zoneCaptured?: boolean;
  zoneId?: string | null;
  error?: string;
}

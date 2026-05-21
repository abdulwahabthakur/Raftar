import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { supabase } from '@/lib/supabase';
import { SubmitCaptureSchema } from '@/lib/schemas';
import { getDeviceId } from '@/lib/storage';
import { getSlice } from '../run/gpsBuffer';
import { useRunStore } from '../run/useRunStore';
import { useTerritoryStore } from './useTerritoryStore';
import { TerritoryCell, CellStatus } from '@/types';

const EDGE_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';
const CAPTURE_DWELL_SECS = 20; // client-side threshold before submitting

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  };
}

export function getCellStatus(cell: TerritoryCell, currentUserId: string): CellStatus {
  const now = Date.now();
  const held = cell.heldUntil ? new Date(cell.heldUntil).getTime() : null;
  if (held && held > now) {
    return cell.ownerId === currentUserId ? 'mine' : 'held';
  }
  return 'free';
}

export function findCellAtPoint(
  lat: number,
  lng: number,
  cells: TerritoryCell[],
): TerritoryCell | null {
  const pt = point([lng, lat]);
  for (const cell of cells) {
    if (booleanPointInPolygon(pt, cell.geometry)) return cell;
  }
  return null;
}

interface CellTimer {
  cellId: string;
  enteredAt: number;
  runId: string;
}

const activeTimers = new Map<string, CellTimer>();
const processedCells = new Set<string>();

export function onEnterCell(
  cell: TerritoryCell,
  currentUserId: string,
  runId: string,
): void {
  const status = getCellStatus(cell, currentUserId);

  if (status === 'held') {
    // Held cell — silently skip. No timer, no error, no penalty.
    processedCells.add(cell.id);
    useRunStore.getState().skipCell();
    return;
  }

  if (processedCells.has(cell.id)) return;

  activeTimers.set(cell.id, {
    cellId: cell.id,
    enteredAt: Date.now(),
    runId,
  });
}

export function onExitCell(cell: TerritoryCell): void {
  const timer = activeTimers.get(cell.id);
  if (!timer) return;

  activeTimers.delete(cell.id);

  const dwellSecs = (Date.now() - timer.enteredAt) / 1000;
  if (dwellSecs < CAPTURE_DWELL_SECS) return; // not enough time

  processedCells.add(cell.id);
  submitCapture(timer).catch(console.error);
}

export function resetRunCells(): void {
  activeTimers.clear();
  processedCells.clear();
}

async function submitCapture(timer: CellTimer): Promise<void> {
  const exitedAt = Date.now();
  const deviceId = await getDeviceId();
  const gpsSlice = getSlice(timer.enteredAt, exitedAt).slice(0, 50);

  if (gpsSlice.length < 2) return;

  const payload = SubmitCaptureSchema.parse({
    runId: timer.runId,
    cellId: timer.cellId,
    enteredAt: new Date(timer.enteredAt).toISOString(),
    exitedAt: new Date(exitedAt).toISOString(),
    gpsSlice,
    deviceId,
  });

  const res = await fetch(`${EDGE_BASE}/submit-capture`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  if (res.status === 409) return; // held by server — no UI penalty
  if (!res.ok) return;

  const data = await res.json();
  if (data.captured) {
    useRunStore.getState().captureCell();
    // Optimistically update local cell state
    const { cells, updateCell } = useTerritoryStore.getState();
    const cell = cells.get(timer.cellId);
    if (cell) {
      const { data: { session } } = await supabase.auth.getSession();
      updateCell({ ...cell, ownerId: session?.user?.id ?? null, heldUntil: data.heldUntil });
    }
  }
}

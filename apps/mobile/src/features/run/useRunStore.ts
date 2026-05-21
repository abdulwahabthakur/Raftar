import { create } from 'zustand';
import { ActiveRun } from '@/types';

interface RunState {
  activeRun: ActiveRun | null;
  lastPosition: { lat: number; lng: number } | null;

  startRun: (runId: string) => void;
  endRun: () => void;
  incrementDistance: (meters: number) => void;
  captureCell: () => void;
  skipCell: () => void;
  captureZone: () => void;
  setLastPosition: (lat: number, lng: number) => void;
}

export const useRunStore = create<RunState>((set) => ({
  activeRun: null,
  lastPosition: null,

  startRun: (runId) =>
    set({
      activeRun: {
        id: runId,
        startedAt: Date.now(),
        distanceMeters: 0,
        cellsCaptured: 0,
        cellsSkipped: 0,
        zonesCaptured: 0,
        isActive: true,
      },
    }),

  endRun: () => set({ activeRun: null }),

  incrementDistance: (meters) =>
    set((s) =>
      s.activeRun
        ? { activeRun: { ...s.activeRun, distanceMeters: s.activeRun.distanceMeters + meters } }
        : s,
    ),

  captureCell: () =>
    set((s) =>
      s.activeRun
        ? { activeRun: { ...s.activeRun, cellsCaptured: s.activeRun.cellsCaptured + 1 } }
        : s,
    ),

  skipCell: () =>
    set((s) =>
      s.activeRun
        ? { activeRun: { ...s.activeRun, cellsSkipped: s.activeRun.cellsSkipped + 1 } }
        : s,
    ),

  captureZone: () =>
    set((s) =>
      s.activeRun
        ? { activeRun: { ...s.activeRun, zonesCaptured: s.activeRun.zonesCaptured + 1 } }
        : s,
    ),

  setLastPosition: (lat, lng) => set({ lastPosition: { lat, lng } }),
}));

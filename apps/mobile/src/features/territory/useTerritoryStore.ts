import { create } from 'zustand';
import { TerritoryCell, Zone, RunnerPresence } from '@/types';

interface TerritoryState {
  cells: Map<string, TerritoryCell>;
  zones: Map<string, Zone>;
  presenceMap: Map<string, RunnerPresence>;
  viewportBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;

  setCells: (cells: TerritoryCell[]) => void;
  updateCell: (cell: TerritoryCell) => void;
  setZones: (zones: Zone[]) => void;
  updateZone: (zone: Zone) => void;
  setPresence: (presence: RunnerPresence) => void;
  removePresence: (userId: string) => void;
  setViewportBounds: (bounds: TerritoryState['viewportBounds']) => void;
}

export const useTerritoryStore = create<TerritoryState>((set) => ({
  cells: new Map(),
  zones: new Map(),
  presenceMap: new Map(),
  viewportBounds: null,

  setCells: (cells) =>
    set({ cells: new Map(cells.map((c) => [c.id, c])) }),

  updateCell: (cell) =>
    set((s) => {
      const next = new Map(s.cells);
      next.set(cell.id, cell);
      return { cells: next };
    }),

  setZones: (zones) =>
    set({ zones: new Map(zones.map((z) => [z.id, z])) }),

  updateZone: (zone) =>
    set((s) => {
      const next = new Map(s.zones);
      next.set(zone.id, zone);
      return { zones: next };
    }),

  setPresence: (presence) =>
    set((s) => {
      const next = new Map(s.presenceMap);
      next.set(presence.userId, presence);
      return { presenceMap: next };
    }),

  removePresence: (userId) =>
    set((s) => {
      const next = new Map(s.presenceMap);
      next.delete(userId);
      return { presenceMap: next };
    }),

  setViewportBounds: (viewportBounds) => set({ viewportBounds }),
}));

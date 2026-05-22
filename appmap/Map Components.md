# Map Components

All map components live in `apps/mobile/src/components/map/`. They are layers stacked inside `TerritoryMap`.

---

## TerritoryMap — `TerritoryMap.tsx`

The base map wrapper. Uses `@maplibre/maplibre-react-native`.

**Props:**
```ts
followUser?: boolean       // locks camera to GPS position (used in active run)
onBoundsChange?: (bounds) => void  // fires when map is panned/zoomed
locateTrigger?: number     // increment this to fly-to current location
```

**What it renders:**
All other map layer components are children of `TerritoryMap`, stacked in order:
1. `ZoneLayer`
2. `CellLayer`
3. `HeldCellLayer`
4. `FogLayer`
5. `PulseLayer`
6. `RunnerDot` (only during a run)

---

## CellLayer — `CellLayer.tsx`

Renders all territory cells currently loaded in the viewport.

- Source: `useTerritoryStore.cells`
- Cells owned by the current user → rendered in the user's color
- Cells owned by others → rendered in a distinct "enemy" color
- Free cells → rendered with a subtle outline, no fill (or very faint fill)
- Uses `getCellStatus(cell, userId)` from `captureService` to determine render style

Cell status values:
- `'free'` — no owner or hold expired
- `'held'` — owned and within the 1-hour lock window (someone else's)
- `'mine'` — owned by the current user (within hold window)
- `'contested'` — (defined in types, not currently used in render)

---

## ZoneLayer — `ZoneLayer.tsx`

Draws zone boundary outlines on the map.

- Source: `useTerritoryStore.zones`
- Owned zones → outlined in the owner's color
- Neutral zones → subtle gray outline
- Does not fill the zone interior (cells do that)

---

## HeldCellLayer — `HeldCellLayer.tsx`

Highlights cells that are currently in their 1-hour post-capture hold.

- Filters cells where `heldUntil !== null && new Date(heldUntil) > Date.now()`
- Renders with a glow/pulsing effect to indicate they're locked
- Distinguishes "my held cells" vs "other's held cells" by color

---

## FogLayer — `FogLayer.tsx`

Fog of war over the map.

- Covers areas outside the current launch zone
- May also cover cells the user has never visited (depending on implementation)
- Rendered as a dark semi-transparent overlay

---

## PulseLayer — `PulseLayer.tsx`

Animated concentric ring pulse centered on the user's GPS position.

- Only visible during an active run
- Uses `lastPosition` from `useRunStore`
- Animates outward to indicate live tracking is active

---

## RunnerDot — `RunnerDot.tsx`

The user's current live position dot on the map.

- Only shown during an active run
- Positioned from `lastPosition` in `useRunStore`
- Also shows other runners via `presenceMap` in `useTerritoryStore`

---

## Viewport Data Loading

Map data is loaded lazily based on what's visible:

**`useViewportCells(bounds)`** — in `features/territory/useViewportCells.ts`
- Called from `MapScreen` and `ActiveRunScreen`
- When bounds change, calls the `cells_in_bounds` Postgres RPC (migration 015)
- RPC returns only cells whose geometry intersects the bounding box
- Result is written to `useTerritoryStore.setCells()`

**`useViewportZones(bounds)`**
- Same pattern, fetches zones intersecting the viewport

---

## See Also
- [[Run Engine]] — `useRunTracker`, `captureService`, how the map reacts to GPS
- [[Data Types]] — `TerritoryCell`, `Zone`, `RunnerPresence`
- [[Presence System]] — how other runners appear on the map

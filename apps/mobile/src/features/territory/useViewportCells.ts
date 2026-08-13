import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTerritoryStore } from './useTerritoryStore';
import { TerritoryCell, Zone } from '@/types';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

async function fetchCellsInBounds(bounds: Bounds): Promise<TerritoryCell[]> {
  const bbox = `POLYGON((
    ${bounds.west} ${bounds.south},
    ${bounds.east} ${bounds.south},
    ${bounds.east} ${bounds.north},
    ${bounds.west} ${bounds.north},
    ${bounds.west} ${bounds.south}
  ))`;

  const { data, error } = await supabase.rpc('cells_in_bbox', {
    bbox_wkt: bbox,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    zoneId: row.zone_id,
    geometry: row.geometry,
    ownerId: row.owner_id,
    ownedAt: row.owned_at,
    heldUntil: row.held_until,
    captureCount: row.capture_count,
  }));
}

async function fetchAllZones(): Promise<Zone[]> {
  // Direct select returns PostGIS WKB binary — unusable by MapLibre.
  // The get_all_zones RPC converts geometry to GeoJSON (migration 019).
  const { data, error } = await supabase.rpc('get_all_zones');

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    geometry: row.geometry,
    ownerId: row.owner_id,
    strength: row.strength,
    capturedAt: row.captured_at,
    lastDefendedAt: row.last_defended_at,
  }));
}

export function useViewportCells(bounds: Bounds | null) {
  const { setCells } = useTerritoryStore();

  const cellQuery = useQuery({
    queryKey: ['cells', bounds],
    queryFn: () => fetchCellsInBounds(bounds!),
    enabled: bounds !== null,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (cellQuery.data) {
      setCells(cellQuery.data);
    }
  }, [cellQuery.data]);

  return { isLoading: cellQuery.isLoading, error: cellQuery.error };
}

export function useViewportZones(bounds: Bounds | null) {
  const { setZones } = useTerritoryStore();

  // Zones are large static geographic areas — fetch all of them once per session.
  // Using a PostGIS bounding box filter here would require a dedicated RPC.
  const zoneQuery = useQuery({
    queryKey: ['zones'],
    queryFn: fetchAllZones,
    enabled: bounds !== null,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  useEffect(() => {
    if (zoneQuery.data) {
      setZones(zoneQuery.data);
    }
  }, [zoneQuery.data]);

  return { isLoading: zoneQuery.isLoading, error: zoneQuery.error };
}

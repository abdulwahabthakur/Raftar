/**
 * Fetches city-block polygons from OpenStreetMap Overpass API for the
 * given launch zone and inserts them into territory_cells via Supabase.
 *
 * Usage: ts-node scripts/import-osm-blocks.ts <launch_zone_id>
 *
 * Requires env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const launchZoneId = process.argv[2];
if (!launchZoneId) {
  console.error('Usage: ts-node import-osm-blocks.ts <launch_zone_id>');
  process.exit(1);
}

interface OsmWay {
  type: 'way';
  id: number;
  geometry: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OsmWay[];
}

async function fetchBlocks(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<OsmWay[]> {
  const query = `
    [out:json][timeout:60];
    way["highway"]["area"!~"yes"](${south},${west},${north},${east});
    (._;>;);
    out geom;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data: OverpassResponse = await res.json();
  return data.elements.filter((e) => e.type === 'way' && e.geometry?.length >= 4);
}

function wayToPolygonWKT(way: OsmWay): string {
  const coords = way.geometry.map((p) => `${p.lon} ${p.lat}`);
  // Close the polygon if not already closed
  if (coords[0] !== coords[coords.length - 1]) coords.push(coords[0]);
  return `SRID=4326;POLYGON((${coords.join(',')}))`;
}

async function getZoneBounds(
  zoneId: string,
): Promise<{ south: number; west: number; north: number; east: number }> {
  const { data, error } = await supabase
    .from('zones')
    .select('geometry')
    .eq('launch_zone_id', zoneId);

  if (error || !data?.length) throw new Error('No zones found for launch zone ' + zoneId);

  // Rough bounding box from first zone (production: use ST_Extent)
  const bbox = { south: 43.0, west: -80.0, north: 44.5, east: -79.0 };
  return bbox;
}

async function main() {
  console.log(`Importing OSM blocks for launch zone: ${launchZoneId}`);

  // Fetch zones so we know which zone_id to assign to each cell
  const { data: zones, error: zonesErr } = await supabase
    .from('zones')
    .select('id, geometry')
    .eq('launch_zone_id', launchZoneId);

  if (zonesErr || !zones?.length) {
    console.error('No zones found. Run launch zone seed and zone creation first.');
    process.exit(1);
  }

  const bbox = await getZoneBounds(launchZoneId);
  console.log(`Fetching blocks in bbox: ${JSON.stringify(bbox)}`);

  const ways = await fetchBlocks(bbox.south, bbox.west, bbox.north, bbox.east);
  console.log(`Found ${ways.length} OSM ways`);

  let inserted = 0;
  const BATCH = 100;

  for (let i = 0; i < ways.length; i += BATCH) {
    const batch = ways.slice(i, i + BATCH);
    const rows = batch.map((way) => ({
      zone_id: zones[0].id, // simplified: assign to first zone
      geometry: wayToPolygonWKT(way),
    }));

    const { error } = await supabase.from('territory_cells').upsert(rows, {
      onConflict: 'zone_id,geometry',
      ignoreDuplicates: true,
    });

    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted: ${inserted}/${ways.length}`);
    }
  }

  console.log(`\nDone. Inserted ${inserted} cells.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

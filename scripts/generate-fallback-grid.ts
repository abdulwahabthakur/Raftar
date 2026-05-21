/**
 * Generates a uniform grid of rectangular cells for a given bounding box
 * and inserts them as territory_cells. Used as a fallback when OSM data
 * is unavailable or to fill gaps.
 *
 * Usage: ts-node scripts/generate-fallback-grid.ts <launch_zone_id> <zone_id>
 *
 * Requires env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const [, , launchZoneId, zoneId] = process.argv;

if (!launchZoneId || !zoneId) {
  console.error('Usage: ts-node generate-fallback-grid.ts <launch_zone_id> <zone_id>');
  process.exit(1);
}

// GTA bounding box — roughly 250m × 250m cells
const BBOX = { south: 43.58, west: -79.65, north: 43.87, east: -79.10 };
const CELL_DEG_LAT = 0.00225; // ~250m latitude
const CELL_DEG_LNG = 0.00280; // ~250m longitude at ~43.7°N

function makePolygonWKT(
  south: number,
  west: number,
  north: number,
  east: number,
): string {
  return `SRID=4326;POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;
}

async function main() {
  const rows: { zone_id: string; geometry: string }[] = [];

  for (let lat = BBOX.south; lat < BBOX.north; lat += CELL_DEG_LAT) {
    for (let lng = BBOX.west; lng < BBOX.east; lng += CELL_DEG_LNG) {
      rows.push({
        zone_id: zoneId,
        geometry: makePolygonWKT(lat, lng, lat + CELL_DEG_LAT, lng + CELL_DEG_LNG),
      });
    }
  }

  console.log(`Generated ${rows.length} grid cells`);

  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from('territory_cells')
      .insert(rows.slice(i, i + BATCH));

    if (error) {
      console.error(`Batch error at ${i}:`, error.message);
    } else {
      inserted += Math.min(BATCH, rows.length - i);
      process.stdout.write(`\rInserted: ${inserted}/${rows.length}`);
    }
  }

  console.log(`\nDone. ${inserted} cells inserted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

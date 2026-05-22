# Environment & Setup

Everything needed to go from zero to a running app.

---

## Environment Variables

Create `.env` in `apps/mobile/`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-dashboard>
EXPO_PUBLIC_MAPBOX_TOKEN=<mapbox-access-token>
```

The `EXPO_PUBLIC_` prefix makes these available in the React Native bundle via `process.env`.

**Edge Functions environment:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase's runtime — you don't configure these manually.

**Cron notifications:** The `send-theft-notifications` cron job needs these Postgres config settings:
```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://...';
ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';
```
Run these in the Supabase SQL editor after creating the project.

---

## First-Time Setup Checklist

### Step 1 — Create a Supabase Project
- Go to [supabase.com](https://supabase.com) → New Project
- Region: **AWS ca-central-1** (Toronto, closest to GTA launch zone)
- Copy the **Project URL** and **anon key** → put in `.env`
- Copy the **service-role key** → keep it safe, used for cron config

### Step 2 — Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

### Step 3 — Link and Run Migrations
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```
This runs all 18 migrations in order. Check for errors — if any migration fails, fix it before continuing.

### Step 4 — Configure Cron Postgres Settings
In the Supabase dashboard → SQL Editor:
```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = 'eyJ...service-role-key...';
```

### Step 5 — Deploy Edge Functions
```bash
supabase functions deploy start-run
supabase functions deploy end-run
supabase functions deploy submit-capture
supabase functions deploy get-leaderboard
supabase functions deploy send-territory-notifications
```
Or all at once: `supabase functions deploy`

### Step 6 — Seed OSM Territory Cells
After migration 016 inserts the GTA launch zone, import real street-block cells:

```bash
cd scripts
npx ts-node import-osm-blocks.ts <launch_zone_id>
```

Get the launch zone UUID:
```sql
SELECT id FROM launch_zones WHERE name = 'Greater Toronto Area';
```

This imports city block polygons from OpenStreetMap as `territory_cells`. Without this step, the map has no capturable cells.

### Step 7 — Install Mobile Dependencies
```bash
cd apps/mobile
npm install
```

### Step 8 — Build and Run the App

**Requires a development build** — Expo Go will NOT work because of native modules (MapLibre, expo-secure-store, react-native-mmkv).

```bash
# iOS (requires Mac + Xcode)
npx expo run:ios

# Android (requires Android Studio)
npx expo run:android

# After building once, start the dev server:
npx expo start --dev-client
```

---

## Development Scripts (inside `apps/mobile/`)

```bash
npm run start       # Expo dev server
npm run ios         # Build + run on iOS simulator
npm run android     # Build + run on Android emulator
npm run typecheck   # TypeScript check (tsc --noEmit)
npm run lint        # ESLint
```

---

## app.config.ts

Key config values:
- **Bundle ID:** `com.raftar.app` (iOS + Android)
- **EAS Project ID:** `f3e3a02d-072e-4a6d-9acf-c7a0467f3d4f`
- **Scheme:** `raftar` (deep linking)
- **Plugins:** expo-router, expo-secure-store, expo-location, expo-notifications, @maplibre/maplibre-react-native
- **Dark mode:** `userInterfaceStyle: 'dark'`
- **iOS location permission string:** `'Raftar uses your location to track runs and capture territory.'`

---

## See Also
- [[Architecture]] — tech stack versions
- [[Database Migrations]] — what each migration does
- [[Edge Functions]] — what gets deployed
- [[Hard Rules]] — constraints that apply to all development

# Project Overview

## What Is Raftar?

Raftar is a **geo-conquest running game** for iOS and Android. The core loop is simple: you go for a run outside, and as you physically move through the city your phone captures hexagonal map cells for you. The more you run, the more territory you own.

It's like Ingress or Pokémon GO but built specifically for runners, with a real anti-cheat system that prevents driving or spoofing.

---

## The Game Loop

1. **Open the app** → see a live map of your city with colored hex cells overlaid on real streets
2. **Tap Start Run** → GPS tracking begins (foreground only)
3. **Run through cells** → spend 20+ seconds inside a cell and it submits a capture request
4. **Server validates** → anti-cheat checks run (dwell time, speed, replay), then the cell is yours
5. **Cell is held for 1 hour** → nobody can steal it during that window; it glows differently on the map
6. **Zones accumulate** → own enough cells in a neighborhood zone to capture the whole zone
7. **Tap End Run** → stats saved, streak updated, leaderboard refreshed
8. **Check the leaderboard** → compete on distance, territory captured, or live domination

---

## Core Mechanics

### Cells
- Each cell is a polygon (imported from OSM street blocks, not H3 hexagons despite early spec)
- A cell has an `owner_id`, `owned_at`, and `held_until`
- `held_until` = NULL means free; non-null means it's locked for 1 hour post-capture
- Held cells owned by someone else are **silently skipped** — the runner gets a `HeldCellSkip` notification but no penalty

### Zones
- Zones are larger sub-regions within the launch zone (neighborhoods)
- A zone has a `strength` (0–100) that decays by 15 every hour if not defended
- When `strength` hits 0, the zone becomes neutral

### Leaderboard
Three board types:
- **Distance** — total km run in the period
- **Territory** — cells captured in the period
- **Domination** — cells currently owned right now (live ranking)

Three periods: **Today**, **This Week**, **All Time**

### Streaks
- A streak counts consecutive days where you completed at least one run
- `update_streak` RPC is called at end of every run
- The `run_streaks` table tracks `current_streak` and `longest_streak` per user

---

## Launch Zone

The first (and currently only) launch zone is the **Greater Toronto Area (GTA)**, seeded by migration 016. The OSM import script populates the actual cell geometries from real street data.

---

## What Makes It Different from Other Geo Games

1. **Runners only** — the 30 km/h speed cap on the server means driving won't work
2. **Server-authority** — the client never writes territory; all captures go through Edge Functions
3. **Real street polygons** — cells are actual city blocks, not arbitrary hexagons
4. **Presence** — you can see other runners live on the map during a run
5. **No background GPS** — respects battery and privacy

---

## See Also
- [[Architecture]] — how all the pieces connect
- [[Hard Rules]] — non-negotiable constraints
- [[Capture Flow]] — the full technical capture sequence
- [[Anti-Cheat System]] — how cheating is prevented

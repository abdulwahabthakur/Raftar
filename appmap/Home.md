# Raftar — Project Map

> Geo-conquest running game for iOS and Android. Run through the city, capture territory, dominate the leaderboard.

---

## Navigate

### Understanding the Project
- [[Project Overview]] — What it is, how the game works, the vision
- [[Architecture]] — System design, data flow, tech stack
- [[Hard Rules]] — Constraints that must NEVER be violated
- [[Constants & Key Numbers]] — Every magic number in one place

### Mobile App
- [[Screens]] — Every screen and what it does
- [[Map Components]] — All map layers (cells, fog, pulse, etc.)
- [[Run Engine]] — GPS tracking, capture flow, state management
- [[Data Types]] — All TypeScript interfaces

### Backend
- [[Database Migrations]] — All 18 SQL migrations explained
- [[Edge Functions]] — All 5 Deno functions in detail
- [[Cron Jobs]] — pg_cron scheduled tasks
- [[Security & RLS]] — Row Level Security policies

### Systems
- [[Capture Flow]] — End-to-end: step-by-step how a cell gets captured
- [[Anti-Cheat System]] — The three checks + suspicion scoring
- [[Leaderboard System]] — How rankings are computed
- [[Presence System]] — Real-time runner visibility on the map
- [[Streak System]] — Consecutive run-day tracking

### Operations
- [[Environment & Setup]] — First-time setup checklist
- [[Progress Log]] — What's built, what's left, what's changed

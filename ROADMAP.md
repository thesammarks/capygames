# Capygames — Roadmap

## Current state (as of 2026-06-26)

### Working
- **Hub** (`app/page.tsx`) — 2-col tile grid, live status from Supabase (auth) or localStorage (guest), dark/light mode toggle
- **Sudoku** — fully playable; board state, notes, undo, win detection, guest progress in localStorage, server-side win validation via `record_solve` RPC
- **Guest progress** (`lib/guestProgress.ts`) — keyed `cg_daily_YYYY-MM-DD` per game; startedAt, status, duration; board state separately at `cg_board_{puzzleId}`
- **Supabase schema** (`supabase/schema.sql`) — profiles, puzzles, progress, stats, friendships; `record_solve` and `friend_leaderboard` RPCs; RLS on all tables
- **API routes** — `/api/puzzle/[game]` (generic), `/api/complete` (validates + persists, archive-aware), `/api/progress` (in-progress upsert), `/auth/callback`
- **Dark mode** — `data-theme` attribute, anti-FOUC inline script, ThemeToggle component (system/light/dark cycle)

### Stubs / not built
- Nonogram, Nonomini, Bridges, Kakuro — "coming soon" placeholder in GamePage
- Auth UI — callback route exists, no login/signup pages
- Friends UI — schema and RPC ready, no UI
- Archives — `/api/complete` already handles archive solves (no streak update), no browse UI or date routing
- Account/settings page

---

## Recommended implementation order

### Phase 1 — Auth UI  *(do first)*

Everything else benefits from having persistent identity from day one.

**Why first:** Auth unlocks server-side progress, streaks, and social features for all games as they're built. Guest → auth migration only needs to run once per user.

**What to build:**
- `app/login/page.tsx` — minimal page with email/password form + Google OAuth button; Supabase `signInWithPassword` / `signInWithOAuth`
- `app/signup/page.tsx` — email + username → `signUp` then insert into `profiles`
- Username validation (unique, 3-20 chars, alphanumeric+underscore)
- `app/api/migrate-guest/route.ts` — POST on first sign-in; reads localStorage progress passed in body, merges into Supabase (upserts progress rows with `in_progress` status, does not overwrite `solved`); clears localStorage after
- Auth state in hub header — show username / avatar initials when signed in, "Sign in" link when not
- Protect account/settings route (redirect to login if unauthenticated)

**Schema additions needed:** None — `profiles` and `auth.users` are already wired.

**Key decisions:**
- Username required at signup (needed for leaderboard display)
- Google OAuth: enable in Supabase Auth dashboard, set redirect URL to `{SITE_URL}/auth/callback`
- Session cookie handled by `proxy.ts` (existing `@supabase/ssr` middleware)

---

### Phase 2 — Remaining Games

Build in this order (increasing UI complexity):

#### 2a. Nonogram + Nonomini

Shared component, `size` prop distinguishes 5×5 (Nonomini) from larger grids.

**`lib/games/nonogram.ts`**
```ts
// Port from prototype
export function deriveClues(grid: boolean[], w: number, h: number): { rows: number[][]; cols: number[][] }
export function checkWin(grid: boolean[], solution: string): boolean  // solution = "0/1" flat string
export function clueOf(run: boolean[]): number[]  // run-length encode
```

**`components/games/Nonogram.tsx`**
- State: `grid: 0|1|2[]` (0=unknown, 1=filled, 2=X), `dragMode`, `history`
- Interaction: click = toggle filled; right-click / long-press = cycle to X
- Auto-X when row/column clue is fully satisfied
- Row clues left, column clues top — highlight satisfied clues

**Data format:**
```json
{ "clues": { "rows": [[2,1],[3],[1,1]], "cols": [[...]] } }
```
**Solution:** `{ "answer": "010110..." }` (W×H flat string, row-major)

**Nonomini:** same component, `size={5}` prop

#### 2b. Kakuro

Closest to Sudoku — reuses NumberPad and notes model.

**`lib/games/kakuro.ts`**
```ts
export function kRuns(cells: KCell[][]): { across: Run[]; down: Run[] }
export function isKBad(cells: KCell[][], run: Run): boolean
export function kWin(cells: KCell[][], solution: number[][]): boolean
```

**`components/games/Kakuro.tsx`**
- Cell types: clue cell (diagonal split, down/across totals), answer cell, black cell
- Reuses `NumberPad` (same `--sc` CSS var)
- Notes/pencil marks: reuse Sudoku's `boolean[][]` notes model
- Live run-sum indicator: show current total vs target in clue cell

**Data format:**
```json
{ "cells": [[null, {"down":16}, {"across":8}], [{"down":10,"across":3}, {"value":null}, {"value":null}]] }
```
**Solution:** `{ "answer": [[0,5,3],[4,...]] }` (null for non-answer cells)

#### 2c. Bridges

Most custom interaction — SVG-based.

**`lib/games/bridges.ts`**
```ts
export function bCandidates(islands: Island[], a: number, b: number): boolean  // valid pair?
export function bCrosses(bridges: Bridge[], candidate: Bridge): boolean         // would cross?
export function bDeg(bridges: Bridge[], islandId: number): number               // current degree
export function bWin(islands: Island[], bridges: Bridge[]): boolean
```

**`components/games/Bridges.tsx`**
- SVG canvas: islands as `<circle>` with count labels, bridges as `<line>` (single or double)
- Interaction: tap island A → tap island B → toggle bridge (none→1→2→none); invalid if would cross or exceed degree
- State: `bridges: { a: number; b: number; count: 1|2 }[]`

**Data format:**
```json
{ "islands": [{ "id": 0, "x": 1, "y": 1, "count": 3 }, ...] }
```
**Solution:** `{ "answer": [{ "a": 0, "b": 1, "count": 2 }, ...] }`

---

#### Plugging new games into the existing infrastructure

When adding each game:

1. Add `lib/games/[game].ts` with `checkWin` export
2. Update `validateSubmission` in `app/api/complete/route.ts` to dispatch to the new validator
3. Add seed entry in `scripts/seed.ts` (or a new `scripts/seed-[game].ts`)
4. The hub tile, start screen, GamePage "coming soon" branch, and API routes all already handle any game ID generically

---

### Phase 3 — Archives

**Route:** `app/play/[game]/[date]/page.tsx`
- Same server component as `app/play/[game]/page.tsx`, but passes `play_date=date` to `getServerSideProps`-equivalent fetch
- `date` param format: `YYYY-MM-DD`; validate and 404 if future or before launch date
- `/api/puzzle/[game]?date=YYYY-MM-DD` — extend the puzzle API to accept an optional date query param (falls back to todayUTC)

**`/api/complete`** already handles archive solves (`play_date !== todayUTC` → upsert progress only, no streak/best update).

**Guest:** `lib/guestProgress.ts` keys by date already, so `cg_daily_2026-06-10` just works for archives.

**Browse UI:** A calendar or date-list component at the bottom of the hub (or `/archive` page) showing past 30 days with completion status dots.

---

### Phase 4 — Friends + Leaderboard

**Schema already has:**
- `friendships (user_id, friend_id, status)` with pending/accepted states
- `friend_leaderboard(game, date)` RPC returns `{ username, duration_seconds }[]` ordered by time

**What to build:**

`app/friends/page.tsx`
- Search by username → send friend request (insert `friendships` row with `status='pending'`)
- Pending requests list (incoming) → Accept / Decline buttons
- Friends list with their today's status per game

**Leaderboard on StartScreen:**
- Replace the static "—" in the "vs friends" stat box
- Fetch `friend_leaderboard(game, todayUTC())` from a new `/api/leaderboard/[game]` route
- Show: your rank among friends, friend count who have solved, top friend's time

**Notification dot:** a small badge on the hub header when there are pending friend requests.

---

### Phase 5 — Account Settings + Personalization

`app/account/page.tsx`
- Username (editable, re-validates uniqueness)
- Display name / bio (optional)
- Avatar: initials-based default; optional upload to Supabase Storage
- Danger zone: delete account (cascades via `on delete cascade` on all tables)

**Preferences** (add columns to `profiles`):
- `input_mode text default 'digit-first'` — digit-first vs cell-first for Sudoku/Kakuro
- `show_timer boolean default true`
- Theme preference is already localStorage-based; could sync to profile for cross-device

**Tutorials:**
- `profiles.tutorials_seen text[] default '{}'` (already in schema)
- `RulesSheet` slide-up component per game, auto-opens on first play

---

### Phase 6 — Future Games Architecture

The `GAMES` array in `lib/rules.ts` is the registry. For new games:

**Standard interface each game module must export:**
```ts
// lib/games/[game].ts
export function checkWin(submission: unknown, solution: unknown): boolean
export type GameData = { ... }      // what goes in puzzles.data (served to client)
export type GameSolution = { ... }  // what goes in puzzles.solution (server-only)
```

**Admin seeding:**
- `scripts/seed.ts` evolves into `scripts/seed-[game].ts` per game + a `scripts/schedule.ts` that seeds N days ahead for all games
- Vercel Cron: weekly job to check buffer depth; alert if < 7 days ahead (add to `vercel.json` or `vercel.ts`)
- Puzzle generation: each game gets a `scripts/generate-[game].ts` that creates valid puzzles programmatically

---

## Key architectural constraints (don't change these)

| Decision | Reason |
|---|---|
| UTC timezone for `play_date` (`todayUTC()` in `lib/daily.ts`) | Consistent global daily rollover |
| Solution stored as `{ answer: ... }` jsonb, never returned to client | Prevents spoilers; `/api/complete` loads it server-side |
| `record_solve` RPC for streak/best (not direct table writes) | Atomic, fair-play aware, security definer |
| `proxy.ts` not `middleware.ts` (Next.js 16) | Framework rename |
| `@supabase/ssr` with `createBrowserClient` / `createServerClient` | Cookie-based sessions for SSR |
| Board state in `localStorage` (`cg_board_{puzzleId}`), timer in sessionStorage + `guestProgress.startedAt` | Survives navigation and tab close |
| `isComplete()` client-side for win UX, `checkWin(val, solution)` server-side for persistence | Fast feedback without exposing solution |

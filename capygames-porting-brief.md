# Capygames — Porting Brief (prototype → production)

Handoff doc for rebuilding the `capygames.html` prototype as a real app in **Next.js (App Router) + Supabase + Vercel**, using Claude Code in WebStorm.

**Guiding principle:** the *game logic* ports almost verbatim (it's framework-agnostic); the *shell* (storage, auth, routing, persistence, leaderboards) gets rebuilt properly. Don't convert the HTML file — lift the logic functions into typed modules and rebuild the UI as React components.

Branding:

- Project name: Capygames
- Logo/favicon: @favicon.svg (Yuzu/orange made up of blocks/tiles)
- Aesthetic: Modern, sleek, clean
- Add dark mode

---

## 1. Stack & key decisions (locked)

- **Next.js App Router + TypeScript**, deployed on **Vercel**.
- **Supabase** for auth (email + Google OAuth), Postgres, RLS. Use **`@supabase/ssr`** (current pattern — *not* the deprecated `auth-helpers`).
- **Per-game** streaks, best times, and leaderboards (each puzzle independent — not one combined streak).
- **Guest mode**: play unauthenticated via localStorage; migrate to the account on first sign-in.
- **Curated puzzle banks**, seeded ahead into the DB. Generators run offline.
- **Server-side completion validation** for leaderboard integrity.
- **Friends-only leaderboards** for MVP.
- **Fair-play rule: using Check disqualifies that day's leaderboard time** (warned first). Details in §6.
- **One fixed rollover timezone**, chosen now and never changed (UTC simplest; America/New_York for NYT parity).

---

## 2. Target file structure

```
capygames/
  app/
    layout.tsx
    page.tsx                       # Hub home (server component: reads today's status)
    play/[game]/page.tsx           # Today's puzzle: StartScreen + game component
    play/[game]/[date]/page.tsx    # Archive (v2): same component, date param
    api/
      puzzle/[game]/route.ts       # GET puzzle data only — NEVER the solution
      progress/route.ts            # PUT autosave board for resume
      complete/route.ts            # POST validate + record solve -> streak/rank
      leaderboard/[game]/route.ts  # GET friends' (non-assisted) times for today
      friends/route.ts             # POST add / accept
      migrate-guest/route.ts       # POST merge localStorage stats on first sign-in
    auth/callback/route.ts
  components/
    Hub.tsx  Tile.tsx  StartScreen.tsx  RulesSheet.tsx  GameClock.tsx
    NumberPad.tsx  Seal.tsx  GameToolbar.tsx
    games/Nonogram.tsx  Sudoku.tsx  Bridges.tsx  Kakuro.tsx
  lib/
    games/  types.ts nonogram.ts sudoku.ts bridges.ts kakuro.ts validate.ts
    daily.ts  streak.ts  rules.ts
    supabase/{client,server,middleware}.ts
  puzzles/  nonogram.json nonomini.json sudoku.json bridges.json kakuro.json
  scripts/  gen_sudoku.py gen_bridges.py gen_kakuro.py make_nonograms.ts seed.ts
  supabase/schema.sql
  middleware.ts
  .env.local
```

---

## 3. What ports from the prototype, and where

Split every game into **pure logic** (`lib/games/*.ts`, reused on the server for validation) and a **React component** (`components/games/*.tsx`). The named functions already exist in `capygames.html` — lift them, add types.

| Game | → `lib/games/*.ts` (pure) | → component (UI/input) |
|---|---|---|
| **Nonogram / Mini** | `clueOf`, `deriveClues`, `checkWin`. Mini = same module, size param + bank | drag-paint + axis-lock, Fill/Mark, clue cross-off |
| **Sudoku** | `peersOf`, conflict (`isBad`), `checkWin`, notes model | select, NumberPad, keyboard, notes, undo |
| **Bridges** | `bCandidates`, `bCrosses`, `bDeg`, `bWin` (degrees + connected) | drag-between-islands, crossing block, SVG |
| **Kakuro** | `kRuns`, `isKBad`, `kWin` | white-cell select, NumberPad, Check |

**Port once, shared:** `StartScreen`, `Tile` + hub status logic, `NumberPad` (Sudoku **and** Kakuro), the timer, share-string builder, the **capybara `Seal`** SVG, and the per-game **puzzle label** ("Daily #N · date · size" — spoiler-safe; never the Nonogram picture name pre-solve). Carry **design tokens** verbatim into `globals.css`: `--paper #F5F3EE`, `--ink #241E18`, `--yuzu #F2922B / --yuzu-deep #D9701A / --yuzu-wash #FCEBD6`, hairline `--line #E7E2D8`; fonts **Zen Maru Gothic** (display) + **Zen Kaku Gothic New** (UI).

**Does NOT port:** the `store` localStorage wrapper and `K(id,suf)` stat keys → Supabase rows. Keep a thin localStorage layer only for guest mode.

**Production detail:** the prototype uses one shared `Daily #`. NYT numbers each game from its own launch — derive the number per game from its first `play_date`.

---

## 4. Supabase schema

`supabase/schema.sql`:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  tutorials_seen text[] not null default '{}',   -- games whose how-to was shown
  created_at timestamptz default now()
);

create table puzzles (
  id bigint generated always as identity primary key,
  game text not null,                       -- nonogram|nonomini|sudoku|bridges|kakuro
  play_date date not null,
  difficulty text,
  data jsonb not null,                      -- served to client
  solution jsonb not null,                  -- server-only
  unique (game, play_date)
);

create table progress (
  user_id uuid references auth.users(id) on delete cascade,
  puzzle_id bigint references puzzles(id) on delete cascade,
  board jsonb,
  status text not null default 'in_progress',  -- in_progress | solved
  duration_seconds int,
  assisted boolean not null default false,     -- Check/hints used -> off the board
  completed_at timestamptz,
  updated_at timestamptz default now(),
  primary key (user_id, puzzle_id)
);

create table stats (                            -- PER-GAME, per user
  user_id uuid references auth.users(id) on delete cascade,
  game text not null,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  best_seconds int,                            -- only set by CLEAN (unassisted) solves
  total_solved int not null default 0,
  last_solved_date date,
  primary key (user_id, game)
);

create table friendships (
  user_id uuid references auth.users(id) on delete cascade,
  friend_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',      -- pending | accepted
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);
```

**RLS (enable on all):** `profiles` select=authenticated, update own. `progress` all ops scoped to `user_id = auth.uid()`. `stats` select own; **writes only via the RPC below.** `friendships` manage own rows. `puzzles` **no client select policy** — read only by the server (service role); the puzzle API strips `solution`. Never hide the solution column client-side.

**Server functions** — solution stays hidden, and the solve is atomic + fair-play-aware:

```sql
-- friends' CLEAN times for a game+date
create function friend_leaderboard(p_game text, p_date date)
returns table(username text, seconds int) security definer as $$
  select pr.username, pg.duration_seconds
  from progress pg
  join puzzles z on z.id = pg.puzzle_id and z.game = p_game and z.play_date = p_date
  join profiles pr on pr.id = pg.user_id
  where pg.status = 'solved' and pg.assisted = false
    and (pg.user_id = auth.uid()
      or pg.user_id in (select friend_id from friendships
                        where user_id = auth.uid() and status='accepted'))
  order by pg.duration_seconds asc;
$$ language sql;

-- record a validated TODAY solve: progress + streak/best, fair-play aware
create function record_solve(p_puzzle_id bigint, p_seconds int, p_assisted boolean default false)
returns stats security definer as $$
declare g text; d date; cur stats; new_streak int;
begin
  select game, play_date into g, d from puzzles where id = p_puzzle_id;
  insert into progress(user_id, puzzle_id, status, duration_seconds, completed_at, assisted)
    values (auth.uid(), p_puzzle_id, 'solved', p_seconds, now(), p_assisted)
    on conflict (user_id, puzzle_id) do update
      set status='solved', duration_seconds=excluded.duration_seconds,
          completed_at=now(), assisted=excluded.assisted;

  select * into cur from stats where user_id=auth.uid() and game=g;
  new_streak := case
    when cur.last_solved_date = d then cur.current_streak
    when cur.last_solved_date = d - 1 then coalesce(cur.current_streak,0)+1
    else 1 end;

  insert into stats(user_id, game, current_streak, longest_streak, best_seconds, total_solved, last_solved_date)
    values (auth.uid(), g, new_streak, new_streak,
            case when p_assisted then null else p_seconds end, 1, d)
    on conflict (user_id, game) do update set
      current_streak = new_streak,
      longest_streak = greatest(stats.longest_streak, new_streak),
      best_seconds   = case when p_assisted then stats.best_seconds
                            else least(coalesce(stats.best_seconds, 2147483647), p_seconds) end,
      total_solved   = stats.total_solved + case when stats.last_solved_date = d then 0 else 1 end,
      last_solved_date = d;
  return (select * from stats where user_id=auth.uid() and game=g);
end; $$ language plpgsql;
```

Assisted solves still count as **solved** and keep the **streak**; they just don't set a personal best and are excluded from the leaderboard.

---

## 5. Daily mechanism & rollover

`daily.ts` resolves "today" in the one fixed timezone. `play_date` is the key; the puzzle route selects `where game=$1 and play_date = today()`. Seed weeks ahead; a weekly Vercel Cron can warn when the buffer runs low.

---

## 6. Completion validation & fair-play

Flow: solve → `POST /api/complete { game, clientSeconds, submission, assisted }` → server loads puzzle + solution (service role) → **validate** → branch on date → return `{ streak, best, rank }`.

**Validate** (two games self-check, no stored solution needed):
- Nonogram / Mini / Sudoku / Kakuro: compare `submission` to stored `solution` (Sudoku/Kakuro can re-check constraints).
- Bridges: re-run `bWin` server-side (degrees + connected + no crossings). Generated-unique ⇒ any valid config is the solution.

**Today vs archive branch (correctness — don't skip):**
- `play_date == today` → call `record_solve(puzzle_id, seconds, assisted)` (streak + best + leaderboard).
- `play_date < today` (archive) → upsert `progress` as solved only. **Do NOT run streak math on archive solves** — `record_solve` keys off `play_date`, so feeding it an old date corrupts streaks. Archive completions never touch streak, best, or the leaderboard.

**Fair-play (Check disqualifies, with warning):**
- The **first** time a player taps Check on a puzzle, show a confirm: *"Using Check takes today's time off the leaderboard. You'll still solve it and keep your streak. Continue?"*
- On confirm, set a **sticky** `assisted = true` for that puzzle (can't be undone by not checking again). Persist it with the completion (`assisted` in the POST → `record_solve`).
- Apply the same rule to any future autocheck/hints. Treat *any* assistance as assisted.

**Time integrity:** MVP trusts `clientSeconds` with a sanity floor (reject sub-human times). Robust version: issue a signed start token when the puzzle is fetched, compute elapsed server-side. Ship the floor first; add the token before public leaderboards.

---

## 7. Controls per game

Cross-cutting (all five):
- **Pause/resume** that blanks the board — required once time feeds a leaderboard.
- **Undo/redo everywhere** (only Sudoku has undo in the prototype).
- **Consistent keyboard map:** arrows move, `1–9`/space/`X` act, `⌫` clear, `Z`/`Y` undo/redo, `P` pause.

Per game (beyond what the prototype already has):
- **Nonogram / Mini** — keep Fill/Mark mode-toggle + drag as primary (fast for runs); offer tri-state tap-cycle (empty→fill→X) as a setting for newcomers. Add **auto-X** when a line's clue is satisfied, and keyboard cursor nav. No per-cell mistake-check (against convention).
- **Sudoku** — add **number-first input mode** (pick digit, tap cells), **fill-all-candidates**, and **redo**.
- **Bridges** — add **click-island-then-island** as an alternative to dragging (precision/accessibility), and **direct-remove** (right-click / long-press) instead of cycling 0→1→2→0. Highlight reachable neighbors on select.
- **Kakuro** — add **pencil marks** (reuse the Sudoku notes model — biggest gap) and a **live run-sum indicator** (current vs target for the selected across/down run).

---

## 8. Per-game instructions (three layers)

1. **One-line rule** always visible on the StartScreen (already in the prototype's `RULES` map → move to `lib/rules.ts`).
2. **Persistent "?" in the game toolbar** opening a `RulesSheet` with a small worked example (a 2–3 cell mini-diagram beats text).
3. **Auto-open the full how-to once** on a player's first play of each game, tracked by `profiles.tutorials_seen` (array of game ids; localStorage for guests).

Spoiler rule: a Nonogram's hidden-picture name is rules content only *after* solving.

---

## 9. Archives (v2, but free structurally)

`puzzles.play_date` + `progress.puzzle_id` already persist past days and completions. Add `play/[game]/[date]/page.tsx` (reusing the game component with a date param) and an archive list (calendar/by-date, joined to `progress` for solved/time). Policy: archive solves are **practice** — they record progress but never affect live streaks, best times, or daily boards (enforced by the §6 branch). Natural future **paywall** (NYT gates the full archive). Accrues automatically from launch; just keep the UI hidden until v2.

---

## 10. Puzzle generation — carry these over

The three Python generators already produce **uniqueness-verified** puzzles; drop them in `scripts/` unchanged → `puzzles/*.json`:
- `gen_sudoku.py` — full-grid backtracking + hole-digging with a solution-counter.
- `gen_bridges.py` — grows a connected planar island graph; CSP solver confirms a single solution.
- `gen_kakuro.py` — fixed staircase layout, random valid fills, uniqueness-checked (add layouts later).
- Nonograms: hand-authored bitmaps → `make_nonograms.ts` derives clues + checks line-solvability. Mini = 5×5 bank.

`seed.ts` assigns each puzzle a sequential `play_date` from a launch date and upserts into `puzzles`. Run generators → commit JSON → `seed.ts` → DB.

---

## 11. Auth & guest migration

`@supabase/ssr`: `createBrowserClient` (components), `createServerClient` (routes/server components), `middleware.ts` to refresh the session cookie. Guests play with progress + a local stats blob (same shape as `stats`). On first sign-in, `POST /api/migrate-guest` → upsert into `progress`/`stats` (max of streaks, min of clean best times) → clear localStorage.

---

## 12. Suggested build order (vertical slice first)

1. Scaffold Next.js + TS + `@supabase/ssr`; `globals.css` tokens, fonts, `Seal.tsx`.
2. Apply `schema.sql`; wire auth (email + Google) + middleware; confirm sign-in/guest.
3. Port `lib/games/sudoku.ts` + `Sudoku.tsx`.
4. Full loop for Sudoku only: `api/puzzle` → play → autosave → `api/complete` → `record_solve` → streak shows. **Proves the whole architecture.**
5. Port Nonogram + Mini, Bridges, Kakuro into the same loop.
6. Hub tiles/streaks; StartScreen; puzzle labels; share.
7. Friends + `friend_leaderboard`; Check-disqualify confirm flow.
8. Controls (pause, undo/redo, Kakuro notes, etc.); instructions/`RulesSheet`.
9. Guest migration; time-token hardening; seed buffer + Cron. (Archive = v2.)

---

## 13. Env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only — puzzle/complete routes
NEXT_PUBLIC_SITE_URL=             # OAuth redirect
```

---

## 14. Kickoff prompt for Claude Code

> Scaffold a Next.js (App Router) + TypeScript project called `capygames` using `@supabase/ssr`. Create `app/layout.tsx` loading Zen Maru Gothic + Zen Kaku Gothic New, and `globals.css` with the CSS variables I'll paste from capygames.html. Add `middleware.ts` for Supabase session refresh and `lib/supabase/{client,server}.ts`. Then build a vertical slice for **Sudoku only**: `lib/games/sudoku.ts` (pure logic — I'll paste `peersOf`, the conflict check, and the win check from my prototype), `components/games/Sudoku.tsx`, `app/api/puzzle/[game]/route.ts` (returns today's puzzle data without the solution, service-role read), and `app/api/complete/route.ts` (validates the submission against the stored solution, branches today-vs-archive, then calls the `record_solve` RPC with the `assisted` flag). Use the schema I'll paste from the brief. Stop after Sudoku works end to end so I can test before porting the other games.

Paste game logic from `capygames.html` as you reach each module. The prototype is the reference for behavior and visuals; this brief is the reference for structure.

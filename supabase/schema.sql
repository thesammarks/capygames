-- ============================================================
-- Capygames schema
-- Apply via Supabase Studio SQL editor or `supabase db push`
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  tutorials_seen text[] not null default '{}',
  created_at timestamptz default now()
);

create table puzzles (
  id bigint generated always as identity primary key,
  game text not null,          -- nonogram|nonomini|sudoku|bridges|kakuro
  play_date date not null,
  difficulty text,
  data jsonb not null,         -- served to client (no solution)
  solution jsonb not null,     -- server-only, never returned to client
  unique (game, play_date)
);

create table progress (
  user_id uuid references auth.users(id) on delete cascade,
  puzzle_id bigint references puzzles(id) on delete cascade,
  board jsonb,
  status text not null default 'in_progress',  -- in_progress | solved
  duration_seconds int,
  assisted boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  primary key (user_id, puzzle_id)
);

create table stats (
  user_id uuid references auth.users(id) on delete cascade,
  game text not null,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  best_seconds int,
  total_solved int not null default 0,
  last_solved_date date,
  primary key (user_id, game)
);

create table friendships (
  user_id uuid references auth.users(id) on delete cascade,
  friend_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',   -- pending | accepted
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

-- ============================================================
-- RLS
-- ============================================================

alter table profiles enable row level security;
alter table puzzles enable row level security;
alter table progress enable row level security;
alter table stats enable row level security;
alter table friendships enable row level security;

-- profiles: any authenticated user can read; only own row update
create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_update" on profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert to authenticated with check (auth.uid() = id);

-- puzzles: no client access — read only via service role in API routes
-- (no policy = no access from client)

-- progress: all ops scoped to own user_id
create policy "progress_all" on progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- stats: read own; writes only via record_solve RPC (security definer)
create policy "stats_select" on stats for select to authenticated using (auth.uid() = user_id);

-- friendships: manage own rows
create policy "friendships_all" on friendships for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "friendships_read_received" on friendships for select to authenticated using (auth.uid() = friend_id);

-- ============================================================
-- Server functions
-- ============================================================

-- Friends' CLEAN times for a game+date
create function friend_leaderboard(p_game text, p_date date)
returns table(username text, seconds int) security definer as $$
  select pr.username, pg.duration_seconds
  from progress pg
  join puzzles z on z.id = pg.puzzle_id and z.game = p_game and z.play_date = p_date
  join profiles pr on pr.id = pg.user_id
  where pg.status = 'solved' and pg.assisted = false
    and (pg.user_id = auth.uid()
      or pg.user_id in (
        select friend_id from friendships
        where user_id = auth.uid() and status = 'accepted'
      ))
  order by pg.duration_seconds asc;
$$ language sql;

-- Record a validated TODAY solve: progress + streak/best, fair-play aware
create function record_solve(
  p_puzzle_id bigint,
  p_seconds int,
  p_assisted boolean default false
)
returns stats security definer as $$
declare
  g text;
  d date;
  cur stats;
  new_streak int;
begin
  select game, play_date into g, d from puzzles where id = p_puzzle_id;

  insert into progress(user_id, puzzle_id, status, duration_seconds, completed_at, assisted)
    values (auth.uid(), p_puzzle_id, 'solved', p_seconds, now(), p_assisted)
    on conflict (user_id, puzzle_id) do update
      set status = 'solved',
          duration_seconds = excluded.duration_seconds,
          completed_at = now(),
          assisted = excluded.assisted;

  select * into cur from stats where user_id = auth.uid() and game = g;

  new_streak := case
    when cur.last_solved_date = d               then cur.current_streak
    when cur.last_solved_date = d - 1           then coalesce(cur.current_streak, 0) + 1
    else 1
  end;

  insert into stats(user_id, game, current_streak, longest_streak, best_seconds, total_solved, last_solved_date)
    values (
      auth.uid(), g, new_streak, new_streak,
      case when p_assisted then null else p_seconds end,
      1, d
    )
    on conflict (user_id, game) do update set
      current_streak   = new_streak,
      longest_streak   = greatest(stats.longest_streak, new_streak),
      best_seconds     = case
                           when p_assisted then stats.best_seconds
                           else least(coalesce(stats.best_seconds, 2147483647), p_seconds)
                         end,
      total_solved     = stats.total_solved + case when stats.last_solved_date = d then 0 else 1 end,
      last_solved_date = d;

  select * into cur from stats where user_id = auth.uid() and game = g;
  return cur;
end;
$$ language plpgsql;

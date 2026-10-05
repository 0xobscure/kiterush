-- Kite Rush leaderboard (Supabase / Postgres). Run once in the Supabase SQL editor.
-- Then put the project URL + anon key into KR_CONFIG.lbUrl / KR_CONFIG.lbKey in index.html.
-- The game upserts one row per (uid, board, day); all-time rows use day = 'all'.

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  uid         text not null check (char_length(uid) between 8 and 64),
  name        text not null check (char_length(name) between 1 and 12 and name ~ '^[A-Za-z0-9 _-]+$'),
  board       text not null check (board in ('daily','all')),
  day         text not null check (day = 'all' or day ~ '^\d{4}-\d{2}-\d{2}$'),
  score       integer not null check (score between 0 and 50000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (uid, board, day)
);
create index if not exists scores_board_day_score on public.scores (board, day, score desc);

-- v2.2: ghost path of the best daily run (URL-safe base64, 2 bytes per 0.25 s sample, max 3600 samples).
alter table public.scores add column if not exists ghost text;
alter table public.scores drop constraint if exists scores_ghost_ok;
alter table public.scores add constraint scores_ghost_ok check (
  ghost is null or (board = 'daily' and char_length(ghost) between 8 and 9600 and ghost ~ '^[A-Za-z0-9_-]+$'));

-- Never let an update lower a score; stamp updated_at.
create or replace function public.scores_keep_best() returns trigger language plpgsql as $$
begin
  if new.score <= old.score then new.ghost := old.ghost; end if;   -- ghost always belongs to the best run
  new.score := greatest(old.score, new.score);
  new.uid := old.uid; new.board := old.board; new.day := old.day;   -- immutable keys
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists scores_keep_best on public.scores;
create trigger scores_keep_best before update on public.scores for each row execute function public.scores_keep_best();

-- Daily rows only for today ±1 day (time zones); stops back-dated spam.
create or replace function public.scores_check_day() returns trigger language plpgsql as $$
begin
  if new.board = 'daily' and abs(new.day::date - (now() at time zone 'utc')::date) > 1 then
    raise exception 'stale day';
  end if;
  return new;
end $$;
drop trigger if exists scores_check_day on public.scores;
create trigger scores_check_day before insert on public.scores for each row execute function public.scores_check_day();

alter table public.scores enable row level security;
drop policy if exists "read all" on public.scores;
drop policy if exists "insert own" on public.scores;
drop policy if exists "update own" on public.scores;
create policy "read all"   on public.scores for select to anon using (true);
create policy "insert own" on public.scores for insert to anon with check (true);
create policy "update own" on public.scores for update to anon using (true) with check (true);
-- Note: anonymous leaderboards can't fully stop a determined cheater (scores come from the client).
-- The checks above block garbage and score-lowering. Delete bad rows from the dashboard if needed,
-- or later move submission behind an Edge Function with rate limiting.

-- Housekeeping (optional, via pg_cron): keep 30 days of daily boards.
-- select cron.schedule('kr-prune', '0 3 * * *', $$delete from public.scores where board='daily' and day::date < now()::date - 30$$);

-- Pokreni OVO u Supabase SQL Editoru na postojećem projektu.
-- Ako si već pokrenuo/la stariju verziju migration_players.sql (samo s
-- rating/games_played/points poljima), prvo obriši tu tablicu:
--
--   drop table if exists players cascade;
--
-- pa onda pokreni ovo u cijelosti.

create table if not exists players (
    id serial primary key,
    full_name text not null,
    gender text,                        -- 'M' ili 'Ž'
    title text,                         -- GM, IM, FM, WGM, WIM, WFM, CM, WCM, ili prazno
    club text,
    category text,                      -- S65, S50, U20, U16, U12, U1800, Akademija
    is_member boolean default true,
    general_gp_points numeric(6,1) default 0,
    category_gp_points numeric(6,1) default 0,
    created_at timestamp default now()
);

create table if not exists player_ratings (
    id serial primary key,
    player_id int references players(id) on delete cascade,
    effective_month date not null,      -- 1. u mjesecu, npr. 2026-09-01
    fide_standard int,
    fide_rapid int,
    fide_blitz int,
    created_at timestamp default now(),
    unique (player_id, effective_month)
);

alter table players enable row level security;
alter table player_ratings enable row level security;

create policy "Javno čitanje players" on players for select using (true);
create policy "Admin upravlja players" on players for all using (auth.role() = 'authenticated');

create policy "Javno čitanje player_ratings" on player_ratings for select using (true);
create policy "Admin upravlja player_ratings" on player_ratings for all using (auth.role() = 'authenticated');

-- ŠK Dubrovnik Grand Prix — Supabase (PostgreSQL) shema
-- Pokreni ovo u Supabase dashboardu: SQL Editor -> New query -> paste -> Run

-- ---------- pages / page_content ----------
-- Za statične dijelove stranice (npr. "O nama", "Dokumenti", "Kontakt")
-- koje želiš urediti kroz admin panel bez diranja koda.

create table if not exists pages (
    id serial primary key,
    slug text unique not null,        -- npr. 'o-nama', 'kontakt'
    title text not null,
    created_at timestamp default now()
);

create table if not exists page_content (
    id serial primary key,
    page_id int references pages(id) on delete cascade,
    section text not null,            -- npr. 'intro', 'sidebar'
    content text
);

-- ---------- news ----------
-- Ovo puni "Najave" sekciju (news-card petlju) na naslovnici.

create table if not exists news (
    id serial primary key,
    title text not null,
    tag text,                          -- npr. "Prijave otvorene", "Kalendar sezone"
    excerpt text,                       -- kratki opis ispod naslova
    body text,                          -- puni tekst vijesti (za detalj stranicu, ako zatreba)
    format text,                        -- npr. "Švicarski", "Kola: 6"
    status text,                        -- npr. "Prijave otvorene"
    published_at timestamp default now()
);

-- ---------- tournaments ----------
-- Turniri Grand Prix serije.

create table if not exists tournaments (
    id serial primary key,
    name text not null,
    description text,
    format text,                        -- npr. "Švicarski sustav, 7 kola"
    tempo text,                         -- npr. "90 min + 30 sek/potez"
    starts_at date,
    location text,
    status text default 'najavljen',    -- 'najavljen' | 'prijave_otvorene' | 'zavrsen'
    created_at timestamp default now()
);

-- ---------- tournament_registrations ----------
-- Prijave igrača na turnir (javni formular na stranici).

create table if not exists tournament_registrations (
    id serial primary key,
    tournament_id int references tournaments(id) on delete cascade,
    full_name text not null,
    email text not null,
    registered_at timestamp default now()
);

-- ---------- users ----------
-- NAPOMENA: posebnu 'users' tablicu ne trebaš — admin login ide kroz
-- ugrađeni Supabase Auth (Authentication -> Users u dashboardu).
-- Tamo ručno dodaš svoj admin email/lozinku.

-- ---------- Row Level Security ----------
-- Javni posjetitelji smiju samo ČITATI news/tournaments/pages.
-- Pisanje (unos/izmjena) dopušteno je samo prijavljenom adminu.

alter table pages enable row level security;
alter table page_content enable row level security;
alter table news enable row level security;
alter table tournaments enable row level security;
alter table tournament_registrations enable row level security;

-- Čitanje je javno za sve osim prijava (registracije ne treba da itko čita)
create policy "Javno čitanje pages" on pages for select using (true);
create policy "Javno čitanje page_content" on page_content for select using (true);
create policy "Javno čitanje news" on news for select using (true);
create policy "Javno čitanje tournaments" on tournaments for select using (true);

-- Pisanje samo za prijavljene (authenticated) korisnike, tj. admina
create policy "Admin upravlja pages" on pages for all using (auth.role() = 'authenticated');
create policy "Admin upravlja page_content" on page_content for all using (auth.role() = 'authenticated');
create policy "Admin upravlja news" on news for all using (auth.role() = 'authenticated');
create policy "Admin upravlja tournaments" on tournaments for all using (auth.role() = 'authenticated');

-- Prijave na turnir: bilo tko smije UBACITI (javni formular), ali ne i čitati/brisati
create policy "Svatko se moze prijaviti" on tournament_registrations for insert with check (true);
create policy "Admin cita prijave" on tournament_registrations for select using (auth.role() = 'authenticated');
create policy "Admin brise prijave" on tournament_registrations for delete using (auth.role() = 'authenticated');

-- ---------- Primjer podataka (obriši ili prilagodi) ----------
insert into news (title, tag, excerpt, format, status) values
  ('Grand Prix — kolo 1', 'Prijave otvorene',
   'Prvo kolo Grand Prix serije ŠK Dubrovnik igra se po švicarskom sustavu u 7 kola, tempo partije 90 min + 30 sek po potezu.',
   'Švicarski', 'Prijave otvorene'),
  ('Raspored turnira 2026.', 'Kalendar sezone',
   'Objavljen je kalendar svih kola Grand Prix serije za ovu sezonu, uključujući datume i lokacije igranja.',
   'Kola: 6', 'Sezona: 2026.');

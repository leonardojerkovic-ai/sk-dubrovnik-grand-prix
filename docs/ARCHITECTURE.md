# Dubrovnik Grand Prix — Arhitektura sustava

## Cilj

Aplikacija je web sustav za ŠK Dubrovnik koji objedinjuje javnu prezentacijsku stranicu, turnire, online prijave, profile igrača, FIDE rejtinge, GP bodovanje, ljestvice i administratorski panel.

## Tehnološki smjer

- Frontend: Next.js App Router + TypeScript
- UI: Tailwind CSS + shadcn/ui komponente, uz vlastite komponente za brand i leaderboard prikaz
- Backend: Next.js server-side funkcije / Route Handlers
- Baza i autentikacija: Supabase PostgreSQL + Supabase Auth
- Sigurnost: Row Level Security (RLS)
- Deploy: Vercel
- Repository: GitHub

## Arhitektonska pravila

1. Poslovna pravila bodovanja ne smiju biti implementirana u UI komponentama.
2. Scoring engine mora biti determinističan i testiran neovisno o bazi i UI-u.
3. Pravila bodovanja su verzionirana po sustavu i sezoni.
4. Rezultat turnira čuva rejting relevantan za taj turnir; mjesečni aktualni rejting ne smije retroaktivno promijeniti povijesni rezultat.
5. Dobne kategorije računaju se iz godišta i referentne godine definirane pravilima sezone.
6. Za GP Akademije 2026/27 referentna godina za igrača vezana je uz prvi turnir Akademije na kojem je igrač nastupio u toj sezoni.
7. Kategorijske ljestvice Dubrovnik GP-a sastoje se od bodova Općeg GP-a za igrača koji ispunjava uvjet kategorije i bodova posebnih kategorijskih turnira za tu kategoriju.
8. U1800 je rating kategorija i ne određuje se prema godištu.
9. Javne ljestvice prikazuju samo članove ŠK Dubrovnik kada je to propisano pravilnikom; obračun turnira i pravo nastupa moraju ostati odvojeni koncepti.
10. Svaka objavljena ljestvica mora biti reproducibilna: čuva se sezona, ruleset verzija i vrijeme obračuna/objave.

## Glavni domenski slojevi

```text
Sezona
  ├── Turniri
  │     ├── Prijave
  │     └── Rezultati
  │             └── Povijesni rejting
  │
  ├── Pravila / verzije pravila
  │
  └── Ljestvice
          ├── Opći GP
          └── Kategorijske ljestvice
                 ├── U20
                 ├── U16
                 ├── U12
                 ├── S50
                 ├── S65
                 ├── U1800
                 └── Žene
```

## Sustavi

### ACADEMY_GP

Sezona: `2026/27`.

Referentna dob igrača u sezoni određuje se prema godini prvog turnira Akademije na kojem je igrač nastupio, uz godište igrača. Početni uvjet podobnosti i GP bodovanje moraju slijediti odobreni pravilnik/ruleset.

### DUBROVNIK_GP

Sezona: `2027`.

Opći GP je osnovna ljestvica. Kategorijske ljestvice nadograđuju Opći GP posebnim kategorijskim turnirima.

## Deployment model

```text
GitHub
   ↓
Vercel Preview
   ↓
Supabase razvojno okruženje

main
   ↓
Vercel Production
   ↓
Supabase Production
```

Preview deploymenti ne smiju koristiti produkcijske tajne ili produkcijske podatke bez eksplicitne odluke.

## Struktura koda

```text
app/                 # Next.js rute i stranice
components/          # ponovno iskoristive UI komponente
lib/
  supabase/           # browser/server Supabase klijenti
  domain/             # domenska logika
  scoring/            # scoring engine, pravila i testni slučajevi
  rankings/           # izračun ljestvica
  categories/         # logika kategorija
  ratings/            # povijesni rejting
supabase/
  migrations/         # verzionirane SQL migracije
  seed/               # razvojni/demo podaci
docs/                 # specifikacije i odluke
```

## Faze

1. Foundation — arhitektura, standardi, Supabase/Vercel osnova
2. Database — konačna PostgreSQL shema i RLS
3. Scoring engine — Akademija 2026/27 pa Dubrovnik GP 2027
4. Admin — igrači, turniri, rezultati, obračun i objava
5. Public UI — turniri, ljestvice, profili, kalendar i dokumenti
6. Player accounts — prijave i osobni profil
7. QA, SEO, accessibility i production hardening

# ŠK Dubrovnik Grand Prix — Next.js + Supabase

Ovo je dinamička verzija tvoje stranice: umjesto ručno upisanog HTML-a,
naslovnica čita "Najave" (news) i "Nadolazeći" turnire iz Supabase baze
kroz `map()` (isto što bi u PHP-u bio `foreach`). Admin panel omogućava
unos vijesti/turnira bez diranja koda.

## 1. Supabase — baza i autentikacija

1. Idi na [supabase.com](https://supabase.com) i otvori (ili napravi) projekt.
2. **SQL Editor** → **New query** → zalijepi sadržaj `schema.sql` iz ovog
   projekta → **Run**. Ovo stvara tablice `news`, `tournaments`,
   `tournament_registrations`, `pages`, `page_content` i sigurnosna
   pravila (RLS) tako da javnost može samo čitati, a admin (prijavljen)
   može i uređivati.
3. **Authentication → Users → Add user** — ovdje ručno dodaš svoj admin
   email i lozinku. To je tvoj login za `/admin/login` (nema potrebe za
   posebnom `users` tablicom ni ručnim hashiranjem lozinki).
4. **Project Settings → API** — kopiraj `Project URL` i `anon public` ključ.

## 2. Lokalno pokretanje

```bash
npm install
cp .env.local.example .env.local
# u .env.local zalijepi URL i anon key iz koraka 1.4

npm run dev
```

Otvori `http://localhost:3000` — naslovnica bi trebala povlačiti vijesti
koje si dodao/la kroz `schema.sql` (dvije demo vijesti su već uključene).

Admin panel: `http://localhost:3000/admin/login`

## 3. Logo kluba

Predložak koristi `<img src="/logo.png">` u headeru. Spremi svoju sličicu
kluba kao `public/logo.png` (napravi `public/` folder ako ne postoji).

## 4. Deploy na Vercel

1. Stavi ovaj projekt na GitHub (git init, commit, push).
2. Na [vercel.com](https://vercel.com) → **Add New Project** → odaberi
   repo.
3. U **Environment Variables** dodaj `NEXT_PUBLIC_SUPABASE_URL` i
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (iste vrijednosti kao u `.env.local`).
4. Deploy. Nakon toga u Vercel projektu pod **Domains** povežeš svoju
   kupljenu domenu (Vercel će dati DNS zapise koje upišeš kod
   registrara domene).

## Struktura

```
app/
  layout.js              — fontovi + globals.css
  page.js                — naslovnica (dohvaća news + tournaments)
  admin/login/page.js     — prijava (Supabase Auth)
  admin/dashboard/page.js — unos/brisanje vijesti i turnira
  globals.css             — dizajn portiran iz originalnog HTML predloška
lib/supabaseClient.js     — Supabase konekcija
schema.sql                — SQL shema + RLS pravila + demo podaci
```

## Sljedeći koraci (opcionalno)

- Javni formular za prijavu na turnir koji piše u
  `tournament_registrations` (insert je već dopušten svima kroz RLS).
- Detalj stranica za pojedinu vijest/turnir (`app/turniri/[id]/page.js`).
- Uređivanje postojeće vijesti/turnira (trenutno dashboard radi
  dodavanje i brisanje; edit se lako doda istim obrascem).

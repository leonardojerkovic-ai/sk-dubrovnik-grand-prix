# Production schema manifest — 2026-09-09

This file is a verified catalog manifest of the live Supabase production database `qyfpnyswyluveflvknij`.

It is **not** a replacement for an exact schema-only `pg_dump`.

## Inventory

- Applied migrations: **46**
- Public tables: **21**
- Public views: **20**
- Public functions: **24**
- Public indexes: **54**
- Public RLS policies: **44**
- All 21 public tables have RLS enabled.

## Public tables

| Table | Rows | Key notes |
|---|---:|---|
| `pages` | 0 | CMS pages |
| `page_content` | 0 | CMS content; FK `page_id → pages.id` |
| `news` | 0 | Published news |
| `tournaments` | 19 | DGP tournament catalog; FK `season_id → seasons.id` |
| `tournament_registrations` | 0 | Public/admin registration workflow; `email` nullable |
| `profiles` | 3 | Legacy profile table |
| `players` | 21 | Authoritative player records |
| `player_ratings` | 2 | Date-effective FIDE ratings |
| `user_profiles` | 1 | Auth-linked role profile; `PLAYER/ADMIN/SUPER_ADMIN` |
| `seasons` | 2 | Academy 2026/27 and DGP 2027 |
| `player_memberships` | 0 | Season membership intervals |
| `tournament_results` | 142 | Results + calculated DGP points |
| `scoring_rules` | 2 | Academy + DGP scoring rules |
| `scoring_rule_parameters` | 33 | Formula parameters |
| `scoring_position_points` | 0 | Position scoring configuration |
| `scoring_factor_values` | 0 | DGP factor configuration |
| `scoring_categories` | 8 | GENERAL + 7 special categories |
| `scoring_category_rules` | 7 | Category eligibility rules |
| `scoring_category_sources` | 14 | General/special point sources |
| `grand_prix_final_qualifiers` | 0 | General GP Final qualification |
| `junior_gp_final_qualifiers` | 2 | Junior U20 Final qualification |

## Tournament schema

`public.tournaments` currently contains the following application-facing fields:

`id`, `name`, `description`, `format`, `tempo`, `starts_at`, `location`, `status`, `created_at`, `season_id`, `tournament_type`, `tournament_level`, `tournament_scope`, `category_code`, `event_stage`, `access_type`, `start_date`, `end_date`, `registration_deadline`, `max_players`, `rounds`, `fide_rated`, `published`, `updated_at`.

Important defaults:

- `status = 'najavljen'`
- `tournament_scope = 'GENERAL'`
- `event_stage = 'REGULAR'`
- `access_type = 'OPEN'`
- `fide_rated = false`
- `published = false`
- `updated_at = now()`

## Results schema

`public.tournament_results` contains:

`id`, `tournament_id`, `player_id`, `final_rank`, `score`, `games_played`, `wins`, `draws`, `losses`, `rating_standard`, `rating_rapid`, `rating_blitz`, `rating_used`, `created_at`, `updated_at`, `points_awarded`, `scoring_rule_id`, `calculated_at`.

Result writes are protected by the completed-tournament locking workflow and DGP admin RPC authorization.

## DGP scoring configuration

Active scoring rules:

- `ACADEMY_2026_27` → `ACADEMY_POSITION`
- `DGP_2027` → `DUBROVNIK_FACTORS`

DGP 2027 parameters verified in production include:

`BASE_POINTS=100`, `FC_CLUB=1.00`, `FC_COMPETITIVE=1.25`, `FC_TOP=1.50`, `FN_BASE=0.80`, `FN_MAX=1.50`, `FN_MULTIPLIER=0.16`, `FN_REFERENCE_PLAYERS=7`, `FR_MAX=1.30`, `FR_MIN=0.80`, `FR_MULTIPLIER=0.0008`, `FR_REFERENCE_RATING=1750`, `FT_BLITZ=0.75`, `FT_RAPID=0.90`, `FT_STANDARD=1.00`.

## Categories

Production contains 8 categories:

- `GENERAL` — Opći GP
- `S65`
- `S50`
- `U1800`
- `U20`
- `U16`
- `U12`
- `WOMEN` — Žene

Category sources use `GENERAL_GP` and/or `CATEGORY_SPECIAL`.

Eligibility rules currently represented in the schema include:

- U12 → `AGE_MAX = 12`
- U16 → `AGE_MAX = 16`
- U20 → `AGE_MAX = 20`
- S50 → `AGE_MIN = 50`
- S65 → `AGE_MIN = 65`
- U1800 → `RATING_MAX = 1800`
- WOMEN → `CUSTOM`, female eligibility

## Final workflow

General GP Final uses `grand_prix_final_qualifiers` with 8 active slots and lifecycle statuses:

`QUALIFIED`, `INVITED`, `CONFIRMED`, `DECLINED`, `REPLACEMENT`, `PLAYED`, `NO_SHOW`.

The workflow supports:

1. TOP 8 qualification.
2. Tie handling at the 8th position.
3. `DECLINED → REPLACEMENT`.
4. Replacement confirmation.
5. `CONFIRMED → NO_SHOW`.
6. `CONFIRMED → PLAYED`.
7. Protection/locking of final outcomes.
8. Automatic qualifier refresh.

Junior U20 Final has its own qualifier table and analogous lifecycle functions.

## Security state

Verified production security state includes:

- RLS enabled on all 21 public tables.
- Public tournament reads constrained to published tournaments.
- Public registration insert restricted to valid published regular tournaments and registration eligibility.
- Registration reads are not public.
- Admin registration workflow uses protected RPCs.
- DGP admin/workflow RPCs require admin authorization internally.
- Sensitive SECURITY DEFINER functions have anonymous execution revoked.
- Ranking views use security-invoker behavior where hardened.
- Public profiles expose only intended public columns.

Intentional authenticated SECURITY DEFINER admin/workflow functions remain documented in the production security audit; this is not an authorization bypass.

## Performance notes

The production Performance Advisor currently reports 9 unindexed foreign keys, 2 RLS init-plan warnings, 6 unused indexes, and multiple permissive-policy warnings. These are recorded as audit findings and are **not automatically changed** as part of this baseline reconstruction.

## Reproducibility boundary

The manifest verifies the production catalog but cannot reconstruct the exact historical SQL of all 46 migrations. The GitHub branch currently contains only three migration files, so it is not yet a complete historical migration mirror.

The canonical next artifact is a schema-only production dump generated from the linked database connection (`pg_dump` / `supabase db dump --linked`). That dump should be committed before treating GitHub as a byte-for-byte reproducible baseline.

Do not fabricate the missing historical migration SQL and do not run `supabase db push` against production until reconciliation is complete.

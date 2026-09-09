# Production catalog snapshot — 2026-09-09

Supabase project: `dubrovnikgrandprix`  
Project ref: `qyfpnyswyluveflvknij`

This is a **catalog snapshot**, not a `pg_dump`. It records the production database shape observed through the Supabase management connection. It must not be mistaken for an exact SQL baseline.

## Database inventory

- Applied migrations: **46**
- Public tables: **21**
- Public views: **20**
- Public functions: **24**
- Public indexes: **54**
- Public RLS policies: **44**
- All 21 public tables have RLS enabled.

## Public tables

1. `pages`
2. `page_content`
3. `news`
4. `tournaments`
5. `tournament_registrations`
6. `profiles`
7. `players`
8. `player_ratings`
9. `user_profiles`
10. `seasons`
11. `player_memberships`
12. `tournament_results`
13. `scoring_rules`
14. `scoring_rule_parameters`
15. `scoring_position_points`
16. `scoring_factor_values`
17. `scoring_categories`
18. `scoring_category_rules`
19. `scoring_category_sources`
20. `grand_prix_final_qualifiers`
21. `junior_gp_final_qualifiers`

## Critical DGP schema observations

### `tournaments`

Production contains the Phase 2 fields required by the application, including:

- `season_id`
- `tournament_type`
- `tournament_level`
- `tournament_scope`
- `category_code`
- `event_stage`
- `access_type`
- `start_date`
- `end_date`
- `registration_deadline`
- `max_players`
- `rounds`
- `fide_rated`
- `published`
- `updated_at`

### `tournament_registrations`

Production has nullable `email` and includes:

- `player_id`
- `status`
- `updated_at`

This matches the final registration workflow where a player may register without an email address.

### `tournament_results`

Production includes result data plus calculated GP data:

- final rank / score / games / W-D-L
- standard/rapid/blitz/rating-used fields
- `points_awarded`
- `scoring_rule_id`
- `calculated_at`
- tournament/player foreign keys

### Final qualification

`grand_prix_final_qualifiers` and `junior_gp_final_qualifiers` both contain:

- season/final/player relationships
- qualification rank and points
- lifecycle `status`
- replacement tracking
- `final_slot`
- `source_rank`
- timestamps

Supported lifecycle statuses include `QUALIFIED`, `INVITED`, `CONFIRMED`, `DECLINED`, `REPLACEMENT`, `PLAYED`, and `NO_SHOW`.

### Category scoring

Production contains eight scoring categories and the source/rule model needed for:

- GENERAL
- S65
- S50
- U1800
- U20
- U16
- U12
- WOMEN

Category sources support `GENERAL_GP` and `CATEGORY_SPECIAL`.

## Security state

Production currently has 10 intentionally exposed `SECURITY DEFINER` functions for authenticated workflows/admin RPCs. The functions contain internal authorization checks; sensitive anonymous execution was revoked during the security hardening work.

The Supabase Security Advisor still reports the separate leaked-password-protection recommendation. Auth/SMTP changes are intentionally out of scope for this project phase.

## Performance findings to address separately

The current Performance Advisor reports:

- 9 foreign keys without covering indexes
- 2 `user_profiles` RLS policies that can use `(select auth.<function>())`
- 6 unused indexes
- 28 multiple-permissive-policy findings

These findings are recorded here but **no production performance migration is being applied as part of the baseline reconstruction**. They should be handled in a separate reviewed migration so that security semantics are not changed accidentally.

## Reproducibility status

GitHub still does not contain the complete historical production migration directory. The branch has only a small subset of migration files, including development bootstrap/fix files that are not part of production migration history.

Therefore:

- do **not** run `supabase db push` from the current branch against production;
- do **not** fabricate the missing historical migrations;
- do **not** treat the development bootstrap migration as an exact production baseline;
- obtain an exact schema-only production dump (`supabase db dump` / `pg_dump`) when a database connection secret is available;
- commit that exact dump as the canonical reproducibility baseline;
- then align `schema.sql` and future migrations with that baseline.

## Verification boundary

The Phase 2 DGP end-to-end workflow has already been verified using rollback-only test data. This catalog snapshot is an additional structural verification of the production database and does not modify production data.

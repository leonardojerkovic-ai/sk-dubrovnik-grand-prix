# Production database ↔ GitHub synchronization

## Current authoritative production project

Supabase project ref: `qyfpnyswyluveflvknij`

## Current state

Production has **46 recorded migrations** in `supabase_migrations.schema_migrations`.
The branch now also contains a corrected Phase-2 baseline contract:

- `supabase/20260910000000_phase2_reproducible_baseline.sql`

That baseline is additive/idempotent and covers the Phase-2 tables, tournament fields, result storage, scoring metadata, core DGP scoring/ranking objects, RLS enablement, grants, and the nine previously missing FK indexes. It is intended to make the Phase-2 application schema reproducible from the original `schema.sql` without pretending to recreate the 46 historical production migrations.

## Production migration history

The following **46 versions** are recorded as applied in production:

- 20260829175800_create_profiles_table
- 20260901201307_add_dgp_final_qualification
- 20260901201431_fix_dgp_final_qualification_membership_tiebreak
- 20260901201511_final_qualification_slots_and_article18_v2
- 20260901201650_fix_dgp_final_qualification_candidate_member_flag
- 20260901201736_make_dgp_regular_quota_dynamic_and_final_protected
- 20260901201948_add_category_ranking_views
- 20260901202007_add_category_ranking_final_protection
- 20260901202018_rebuild_category_ranking_view
- 20260901202140_fix_category_membership_by_tournament_date
- 20260901202512_add_junior_gp_final_2027
- 20260901202642_fix_category_final_double_count_v3
- 20260901202728_automate_junior_gp_final_2027
- 20260901202822_link_junior_final_to_category_rankings
- 20260901203410_fix_junior_final_replacement_cycle
- 20260901204449_harden_dgp_scoring_engine
- 20260901211614_automate_membership_eligibility
- 20260901211638_repair_general_ranking_view_v2
- 20260901220351_harden_tournament_registration_eligibility
- 20260901220842_admin_registration_workflow
- 20260901220952_automate_results_scoring_and_rankings
- 20260901221012_fix_player_gp_sync
- 20260901221052_add_result_validation_before_finalize
- 20260901221106_fix_result_validation_ambiguity
- 20260901221833_protect_locked_tournament_results
- 20260902011503_harden_dgp_admin_rpc_and_women_category
- 20260902011704_harden_dgp_final_security_definers
- 20260902012244_harden_phase2_admin_rls_and_views_v2
- 20260902013047_security_audit_harden_legacy_policies
- 20260902015437_tighten_public_registration_to_published_tournaments
- 20260902020615_lock_profiles_public_columns
- 20260902020626_harden_profiles_view_grants
- 20260902023348_admin_registration_workflow_v2
- 20260902065443_harden_dgp_admin_workflow_v2
- 20260909200756_auto_recalculate_dgp_after_result_update
- 20260909201255_complete_dgp_final_status_workflow
- 20260909205653_harden_dgp_final_status_state_machine
- 20260909205925_fix_dgp_final_replacement_uniqueness
- 20260909205947_stabilize_dgp_final_slot_refresh
- 20260909210020_allow_confirmed_final_outcomes
- 20260909214800_tighten_security_definer_execution_and_profiles_view
- 20260909214832_harden_remaining_security_definer_workflows
- 20260909214902_make_public_profiles_security_invoker_public_columns
- 20260909222541_fix_registration_status_workflow
- 20260909222648_allow_player_registration_without_email
- 20260909222717_fix_admin_registration_role_check

## GitHub migration state

The historical migration directory is still intentionally not fabricated: the 43 missing historical migration files are not available through the current connector and are therefore not invented.

The new baseline is a **reproducible Phase-2 schema contract**, not a replacement for the missing historical migrations.

## Security / performance

The Phase-2 security hardening remains in production. Auth/SMTP is intentionally untouched.

The performance baseline now includes indexes for the nine previously unindexed foreign keys. Existing unused-index and multiple-permissive-policy notices are retained rather than deleting potentially useful indexes or changing policy semantics without evidence.

## Exact production dump boundary

An exact schema-only production `pg_dump` is still not available through the current connector, so this repository must not claim byte-for-byte reproduction of production. The baseline above closes the concrete Phase-2 bootstrap/schema gap while preserving that distinction.

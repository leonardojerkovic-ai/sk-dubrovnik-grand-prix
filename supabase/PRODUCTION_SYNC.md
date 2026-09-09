# Production database ↔ GitHub synchronization

## Current authoritative production project

Supabase project ref: `qyfpnyswyluveflvknij`

## Important finding

The production database currently has **45 recorded migrations** in `supabase_migrations.schema_migrations`, while this branch currently contains only three migration files under `supabase/migrations/`.

Therefore the GitHub migration directory is **not yet a reproducible representation of production**. Do not run `supabase db push` against production from this branch until the migration history is reconciled.

## Production migration history

The following versions are recorded as applied in production:

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

## GitHub migration files currently present

Only these three are currently committed on `phase-2-engine-ui`:

- `20260909214902_make_public_profiles_security_invoker_public_columns.sql`
- `20260909221000_phase2_dgp_bootstrap.sql`
- `20260909223000_fix_phase2_e2e_registration_workflow.sql`

The latter two are **not recorded as applied in production**. They are development bootstrap/fix files and must not be treated as the production migration history.

## Required reconciliation

The safe way to make GitHub the reproducible source of truth is to pull a schema-only dump from the linked production project and commit it as the baseline, then preserve/repair migration history around that baseline. Supabase documents `supabase db pull` / `supabase db dump` for exactly this workflow.

Do not manually fabricate a replacement for the 42 missing historical migration files: the final schema is the source that matters for a reproducible fresh deployment, while production migration history must remain separately documented.

## Security / application state already verified

Production currently contains the Phase 2 tables, DGP scoring functions, ranking views, Final qualification workflow, RLS/policies, and the registration workflow fixes. The final E2E workflow was also verified with rollback-only test data.

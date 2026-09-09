-- Security hardening snapshot for the DGP project.
-- This migration mirrors the final security state applied to Supabase.
-- It intentionally does not change Auth/SMTP configuration.

-- public_profiles must execute with the caller's privileges so its SELECT
-- cannot bypass RLS on public.profiles.
alter view public.public_profiles set (security_invoker = true);

-- Keep the public profile surface limited to non-sensitive ranking fields.
revoke all on public.profiles from anon;
grant select (
  id,
  full_name,
  title_category,
  rating_rapid,
  category_gp_type,
  points_general_gp,
  points_category_gp
) on public.profiles to anon;

-- Public profile view is read-only for the two API roles.
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- SECURITY DEFINER routines must never be callable anonymously.
revoke execute on function public.admin_update_registration_status(integer, text) from anon;
revoke execute on function public.calculate_dgp_points(integer) from anon;
revoke execute on function public.finalize_tournament(integer) from anon;
revoke execute on function public.import_tournament_results(integer, jsonb) from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_super_admin() from anon;
revoke execute on function public.recalculate_tournament_and_rankings(integer) from anon;
revoke execute on function public.refresh_dgp_final_qualifiers(integer) from anon;
revoke execute on function public.set_dgp_final_status(bigint, text) from anon;
revoke execute on function public.update_dgp_result(bigint, integer, numeric, integer, integer, integer, integer) from anon;

-- Trigger/helper functions are internal and must not be exposed through the API.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.sync_player_gp_totals() from public, anon, authenticated;
revoke execute on function public.require_dgp_admin() from public, anon, authenticated;

-- Admin browser actions remain available to authenticated callers; each
-- SECURITY DEFINER function independently enforces the DGP admin role.
grant execute on function public.admin_update_registration_status(integer, text) to authenticated;
grant execute on function public.calculate_dgp_points(integer) to authenticated;
grant execute on function public.finalize_tournament(integer) to authenticated;
grant execute on function public.import_tournament_results(integer, jsonb) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.recalculate_tournament_and_rankings(integer) to authenticated;
grant execute on function public.refresh_dgp_final_qualifiers(integer) to authenticated;
grant execute on function public.set_dgp_final_status(bigint, text) to authenticated;
grant execute on function public.update_dgp_result(bigint, integer, numeric, integer, integer, integer, integer) to authenticated;

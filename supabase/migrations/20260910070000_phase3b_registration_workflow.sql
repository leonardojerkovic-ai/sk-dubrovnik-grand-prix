-- Phase 3B — public tournament registration workflow
-- Server-side eligibility, duplicate protection, capacity enforcement,
-- and REGISTERED -> CONFIRMED / REJECTED workflow.

ALTER TABLE public.tournament_registrations
  DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;

ALTER TABLE public.tournament_registrations
  ADD CONSTRAINT tournament_registrations_status_check
  CHECK (status IN ('REGISTERED', 'CONFIRMED', 'REJECTED'));

CREATE UNIQUE INDEX IF NOT EXISTS tournament_registrations_tournament_player_active_idx
  ON public.tournament_registrations (tournament_id, player_id)
  WHERE player_id IS NOT NULL AND status IN ('REGISTERED', 'CONFIRMED');

CREATE OR REPLACE FUNCTION public.check_tournament_registration_eligibility(
  p_tournament_id integer,
  p_player_id integer
)
RETURNS TABLE(eligible boolean, reason text, category_eligible boolean, membership_eligible boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_t public.tournaments%rowtype;
  v_p public.players%rowtype;
  v_cat boolean := true;
  v_mem boolean := true;
  v_age integer;
  v_rating integer;
  v_rule record;
BEGIN
  SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Turnir ne postoji', false, false;
    RETURN;
  END IF;

  IF v_t.published IS DISTINCT FROM true
     OR v_t.event_stage IS DISTINCT FROM 'REGULAR'
     OR v_t.status IS DISTINCT FROM 'prijave_otvorene' THEN
    RETURN QUERY SELECT false, 'Prijave za ovaj turnir nisu otvorene', false, false;
    RETURN;
  END IF;

  IF v_t.registration_deadline IS NOT NULL AND v_t.registration_deadline < now() THEN
    RETURN QUERY SELECT false, 'Rok prijave je istekao', false, false;
    RETURN;
  END IF;

  SELECT * INTO v_p FROM public.players WHERE id = p_player_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Igrač ne postoji ili nije aktivan', false, false;
    RETURN;
  END IF;

  IF v_t.access_type = 'RESTRICTED' THEN
    v_mem := public.player_is_dgp_member_on_date(p_player_id, v_t.start_date);
  END IF;

  IF v_t.tournament_scope = 'CATEGORY' AND v_t.category_code IS NOT NULL THEN
    SELECT scr.rule_type, scr.parameter_value, scr.parameter_text
      INTO v_rule
    FROM public.scoring_categories sc
    JOIN public.scoring_category_rules scr ON scr.scoring_category_id = sc.id
    WHERE sc.category_code = v_t.category_code
      AND sc.is_active = true
    ORDER BY scr.id
    LIMIT 1;

    IF v_rule.rule_type = 'AGE_MAX' THEN
      v_cat := v_p.birth_year IS NOT NULL
        AND (extract(year FROM v_t.start_date)::integer - v_p.birth_year) <= v_rule.parameter_value;
    ELSIF v_rule.rule_type = 'AGE_MIN' THEN
      v_cat := v_p.birth_year IS NOT NULL
        AND (extract(year FROM v_t.start_date)::integer - v_p.birth_year) >= v_rule.parameter_value;
    ELSIF v_rule.rule_type IN ('RATING_MAX', 'RATING_MIN') THEN
      SELECT COALESCE(pr.fide_standard, pr.fide_rapid, pr.fide_blitz)
        INTO v_rating
      FROM public.player_ratings pr
      WHERE pr.player_id = p_player_id
        AND pr.effective_month <= v_t.start_date
      ORDER BY pr.effective_month DESC, pr.id DESC
      LIMIT 1;
      IF v_rule.rule_type = 'RATING_MAX' THEN
        v_cat := v_rating IS NOT NULL AND v_rating < v_rule.parameter_value;
      ELSE
        v_cat := v_rating IS NOT NULL AND v_rating >= v_rule.parameter_value;
      END IF;
    ELSIF v_rule.rule_type = 'CUSTOM' AND v_rule.parameter_code = 'GENDER' THEN
      v_cat := upper(coalesce(v_p.gender, '')) = upper(coalesce(v_rule.parameter_text, ''));
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    (v_mem AND v_cat),
    CASE
      WHEN NOT v_mem THEN 'Nema važeće članstvo na datum turnira'
      WHEN NOT v_cat THEN 'Igrač ne pripada kategoriji turnira'
      ELSE 'Pravo nastupa potvrđeno'
    END,
    v_cat,
    v_mem;
END;
$$;

REVOKE ALL ON FUNCTION public.check_tournament_registration_eligibility(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_tournament_registration_eligibility(integer, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_tournament_registration(
  p_tournament_id integer,
  p_player_id integer,
  p_email text
)
RETURNS public.tournament_registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_t public.tournaments%rowtype;
  v_p public.players%rowtype;
  v_e record;
  v_existing public.tournament_registrations%rowtype;
  v_result public.tournament_registrations%rowtype;
  v_active_count integer;
BEGIN
  SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turnir ne postoji'; END IF;

  IF v_t.published IS DISTINCT FROM true
     OR v_t.event_stage IS DISTINCT FROM 'REGULAR'
     OR v_t.status IS DISTINCT FROM 'prijave_otvorene' THEN
    RAISE EXCEPTION 'Prijave za ovaj turnir nisu otvorene';
  END IF;

  IF v_t.registration_deadline IS NOT NULL AND v_t.registration_deadline < now() THEN
    RAISE EXCEPTION 'Rok prijave je istekao';
  END IF;

  SELECT * INTO v_p FROM public.players WHERE id = p_player_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Igrač ne postoji ili nije aktivan'; END IF;

  IF length(trim(coalesce(p_email, ''))) < 3 OR length(trim(p_email)) > 320
     OR trim(p_email) !~ '^\S+@\S+\.\S+$' THEN
    RAISE EXCEPTION 'Unesite ispravnu e-mail adresu';
  END IF;

  SELECT * INTO v_e FROM public.check_tournament_registration_eligibility(p_tournament_id, p_player_id);
  IF NOT v_e.eligible THEN RAISE EXCEPTION 'Prijava odbijena: %', v_e.reason; END IF;

  SELECT * INTO v_existing
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id
    AND player_id = p_player_id
    AND status IN ('REGISTERED', 'CONFIRMED')
  LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'Igrač je već prijavljen na ovaj turnir'; END IF;

  IF v_t.max_players IS NOT NULL THEN
    SELECT count(*)::integer INTO v_active_count
    FROM public.tournament_registrations
    WHERE tournament_id = p_tournament_id
      AND status IN ('REGISTERED', 'CONFIRMED');
    IF v_active_count >= v_t.max_players THEN
      RAISE EXCEPTION 'Kapacitet turnira je popunjen';
    END IF;
  END IF;

  INSERT INTO public.tournament_registrations
    (tournament_id, player_id, full_name, email, status, registered_at, updated_at)
  VALUES
    (p_tournament_id, p_player_id, v_p.full_name, trim(p_email), 'REGISTERED', now(), now())
  RETURNING * INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Igrač je već prijavljen na ovaj turnir';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_tournament_registration(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_tournament_registration(integer, integer, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can submit registration" ON public.tournament_registrations;

CREATE OR REPLACE FUNCTION public.admin_update_registration_status(
  p_registration_id integer,
  p_status text
)
RETURNS public.tournament_registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.tournament_registrations;
  v_t public.tournaments%rowtype;
  v_active_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND upper(up.role::text) IN ('ADMIN','SUPER_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Nedozvoljeno';
  END IF;

  IF upper(trim(p_status)) NOT IN ('REGISTERED','CONFIRMED','REJECTED') THEN
    RAISE EXCEPTION 'Neispravan status prijave';
  END IF;

  SELECT * INTO v_registration
  FROM public.tournament_registrations
  WHERE id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prijava nije pronađena'; END IF;

  IF upper(trim(p_status)) = 'CONFIRMED' THEN
    SELECT * INTO v_t FROM public.tournaments WHERE id = v_registration.tournament_id;
    IF v_t.max_players IS NOT NULL THEN
      SELECT count(*)::integer INTO v_active_count
      FROM public.tournament_registrations
      WHERE tournament_id = v_registration.tournament_id
        AND status = 'CONFIRMED'
        AND id <> p_registration_id;
      IF v_active_count >= v_t.max_players THEN
        RAISE EXCEPTION 'Kapacitet turnira je popunjen';
      END IF;
    END IF;
  END IF;

  UPDATE public.tournament_registrations
  SET status = upper(trim(p_status)), updated_at = now()
  WHERE id = p_registration_id
  RETURNING * INTO v_registration;

  RETURN v_registration;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_registration_status(integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_registration_status(integer,text) TO authenticated;

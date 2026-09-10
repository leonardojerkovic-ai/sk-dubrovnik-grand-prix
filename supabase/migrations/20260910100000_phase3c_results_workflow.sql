-- Phase 3C — tournament results workflow
-- Results can be entered/imported before finalization, validated server-side,
-- scored automatically, and then locked atomically when the tournament ends.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS results_locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS results_locked_at timestamptz;
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS results_locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.tournament_results_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_tournament_id integer;
  v_locked boolean;
BEGIN
  v_tournament_id := COALESCE(NEW.tournament_id, OLD.tournament_id);
  SELECT t.results_locked INTO v_locked
  FROM public.tournaments t
  WHERE t.id = v_tournament_id;

  IF COALESCE(v_locked, false)
     AND current_setting('app.results_write_override', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Rezultati turnira su zaključani i više se ne mogu mijenjati.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tournament_results_write_guard ON public.tournament_results;
CREATE TRIGGER tournament_results_write_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.tournament_results
FOR EACH ROW EXECUTE FUNCTION public.tournament_results_write_guard();

CREATE OR REPLACE FUNCTION public.phase3c_validate_result_payload(
  p_tournament_id integer,
  p_results jsonb
)
RETURNS TABLE(is_valid boolean, error_code text, message text, player_id integer, player_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_t public.tournaments%rowtype;
  v_item jsonb;
  v_player_id integer;
  v_rank integer;
  v_games integer;
  v_wins integer;
  v_draws integer;
  v_losses integer;
  v_score numeric;
  v_rating integer;
  v_name text;
  v_count integer := 0;
  v_ranks integer[] := ARRAY[]::integer[];
BEGIN
  PERFORM public.require_dgp_admin();

  SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'TOURNAMENT_NOT_FOUND', 'Turnir ne postoji.', NULL::integer, NULL::text;
    RETURN;
  END IF;

  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'array' THEN
    RETURN QUERY SELECT false, 'INVALID_PAYLOAD', 'Rezultati moraju biti JSON niz.', NULL::integer, NULL::text;
    RETURN;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_results)
  LOOP
    v_count := v_count + 1;
    v_player_id := NULLIF(v_item->>'player_id','')::integer;
    v_rank := NULLIF(v_item->>'final_rank','')::integer;
    v_games := COALESCE(NULLIF(v_item->>'games_played','')::integer, 0);
    v_wins := COALESCE(NULLIF(v_item->>'wins','')::integer, 0);
    v_draws := COALESCE(NULLIF(v_item->>'draws','')::integer, 0);
    v_losses := COALESCE(NULLIF(v_item->>'losses','')::integer, 0);
    v_score := NULLIF(v_item->>'score','')::numeric;
    v_rating := NULLIF(v_item->>'rating_used','')::integer;

    SELECT p.full_name INTO v_name FROM public.players p WHERE p.id = v_player_id AND p.is_active = true;
    IF v_player_id IS NULL OR v_name IS NULL THEN
      RETURN QUERY SELECT false, 'INVALID_PLAYER', 'Igrač ne postoji ili nije aktivan.', v_player_id, NULLIF(v_item->>'full_name','');
      CONTINUE;
    END IF;

    IF v_rank IS NULL OR v_rank < 1 THEN
      RETURN QUERY SELECT false, 'INVALID_RANK', 'Konačni plasman mora biti pozitivan broj.', v_player_id, v_name;
    ELSIF v_rank > jsonb_array_length(p_results) THEN
      RETURN QUERY SELECT false, 'RANK_OUT_OF_RANGE', 'Konačni plasman ne može biti veći od broja rezultata.', v_player_id, v_name;
    END IF;

    IF v_games < 0 OR v_wins < 0 OR v_draws < 0 OR v_losses < 0 THEN
      RETURN QUERY SELECT false, 'INVALID_GAMES', 'Broj partija, pobjeda, remija i poraza ne može biti negativan.', v_player_id, v_name;
    END IF;

    IF v_wins + v_draws + v_losses <> v_games THEN
      RETURN QUERY SELECT false, 'INVALID_WDL', 'Pobjede + remiji + porazi moraju odgovarati broju odigranih partija.', v_player_id, v_name;
    END IF;

    IF v_score IS NULL OR v_score < 0 OR v_score > v_games THEN
      RETURN QUERY SELECT false, 'INVALID_SCORE', 'Bodovi moraju biti između 0 i broja odigranih partija.', v_player_id, v_name;
    END IF;

    IF v_games > 0 AND (v_rating IS NULL OR v_rating <= 0) THEN
      RETURN QUERY SELECT false, 'INVALID_RATING', 'Korišteni rejting mora biti pozitivan.', v_player_id, v_name;
    END IF;

    IF v_games > 0 AND NOT EXISTS (
      SELECT 1 FROM public.tournament_registrations r
      WHERE r.tournament_id = p_tournament_id
        AND r.player_id = v_player_id
        AND r.status = 'CONFIRMED'
    ) THEN
      RETURN QUERY SELECT false, 'REGISTRATION_MISSING', 'Igrač nema potvrđenu prijavu za ovaj turnir.', v_player_id, v_name;
    END IF;

    v_ranks := array_append(v_ranks, v_rank);
  END LOOP;

  IF v_count = 0 THEN
    RETURN QUERY SELECT false, 'EMPTY_RESULTS', 'Nema rezultata za spremanje.', NULL::integer, NULL::text;
  END IF;

  FOR v_rank IN SELECT DISTINCT unnest(v_ranks)
  LOOP
    IF array_length(v_ranks, 1) - array_length(array_remove(v_ranks, v_rank), 1) > 1 THEN
      RETURN QUERY SELECT false, 'DUPLICATE_RANK', 'Postoji dupli plasman: ' || v_rank || '.', NULL::integer, NULL::text;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.phase3c_validate_result_payload(integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3c_validate_result_payload(integer,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_tournament_results(
  p_tournament_id integer,
  p_results jsonb
)
RETURNS SETOF public.tournament_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_t public.tournaments%rowtype;
  v_error record;
  v_item jsonb;
  v_result public.tournament_results;
BEGIN
  PERFORM public.require_dgp_admin();

  SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turnir ne postoji.'; END IF;
  IF v_t.results_locked THEN RAISE EXCEPTION 'Rezultati turnira su zaključani.'; END IF;

  SELECT * INTO v_error
  FROM public.phase3c_validate_result_payload(p_tournament_id, p_results)
  WHERE NOT is_valid
  LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION '%', v_error.message; END IF;

  PERFORM set_config('app.results_write_override', '1', true);

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_results)
  LOOP
    INSERT INTO public.tournament_results (
      tournament_id, player_id, final_rank, score, games_played,
      wins, draws, losses, rating_standard, rating_rapid, rating_blitz,
      rating_used, updated_at
    ) VALUES (
      p_tournament_id,
      (v_item->>'player_id')::integer,
      NULLIF(v_item->>'final_rank','')::integer,
      NULLIF(v_item->>'score','')::numeric,
      COALESCE(NULLIF(v_item->>'games_played','')::integer,0),
      COALESCE(NULLIF(v_item->>'wins','')::integer,0),
      COALESCE(NULLIF(v_item->>'draws','')::integer,0),
      COALESCE(NULLIF(v_item->>'losses','')::integer,0),
      NULLIF(v_item->>'rating_standard','')::integer,
      NULLIF(v_item->>'rating_rapid','')::integer,
      NULLIF(v_item->>'rating_blitz','')::integer,
      NULLIF(v_item->>'rating_used','')::integer,
      now()
    )
    ON CONFLICT (tournament_id, player_id)
    DO UPDATE SET
      final_rank = EXCLUDED.final_rank,
      score = EXCLUDED.score,
      games_played = EXCLUDED.games_played,
      wins = EXCLUDED.wins,
      draws = EXCLUDED.draws,
      losses = EXCLUDED.losses,
      rating_standard = EXCLUDED.rating_standard,
      rating_rapid = EXCLUDED.rating_rapid,
      rating_blitz = EXCLUDED.rating_blitz,
      rating_used = EXCLUDED.rating_used,
      updated_at = now();
  END LOOP;

  -- Recalculate DGP points immediately after every successful save.
  IF EXISTS (
    SELECT 1 FROM public.scoring_rules sr
    JOIN public.seasons s ON s.id = sr.season_id
    WHERE sr.rule_code = 'DGP_2027'
      AND sr.system_type = 'DUBROVNIK_GP'
      AND sr.is_active = true
      AND s.id = v_t.season_id
  ) THEN
    PERFORM public.calculate_dgp_points(p_tournament_id);
  END IF;

  RETURN QUERY
  SELECT * FROM public.tournament_results
  WHERE tournament_id = p_tournament_id
  ORDER BY final_rank NULLS LAST, player_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_tournament_results(integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_tournament_results(integer,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_tournament_results(p_tournament_id integer)
RETURNS public.tournaments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_t public.tournaments%rowtype;
  v_error record;
BEGIN
  PERFORM public.require_dgp_admin();

  SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turnir ne postoji.'; END IF;
  IF v_t.results_locked THEN RAISE EXCEPTION 'Rezultati turnira su već zaključani.'; END IF;

  SELECT * INTO v_error
  FROM public.validate_tournament_results(p_tournament_id)
  WHERE NOT is_valid
  LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION '%', v_error.message; END IF;

  PERFORM set_config('app.results_write_override', '1', true);

  -- DGP scoring is recalculated before the lock. Existing ranking views
  -- immediately consume the updated points_awarded values.
  IF EXISTS (
    SELECT 1 FROM public.scoring_rules sr
    WHERE sr.rule_code = 'DGP_2027'
      AND sr.system_type = 'DUBROVNIK_GP'
      AND sr.is_active = true
  ) THEN
    PERFORM public.calculate_dgp_points(p_tournament_id);
  END IF;

  UPDATE public.tournaments
  SET results_locked = true,
      results_locked_at = now(),
      results_locked_by = auth.uid(),
      status = 'zavrsen',
      updated_at = now()
  WHERE id = p_tournament_id
  RETURNING * INTO v_t;

  RETURN v_t;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_tournament_results(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_tournament_results(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.unlock_tournament_results(p_tournament_id integer)
RETURNS public.tournaments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_t public.tournaments%rowtype;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Samo SUPER_ADMIN može otključati rezultate.'; END IF;
  UPDATE public.tournaments
  SET results_locked=false, results_locked_at=NULL, results_locked_by=NULL, updated_at=now()
  WHERE id=p_tournament_id
  RETURNING * INTO v_t;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turnir ne postoji.'; END IF;
  RETURN v_t;
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_tournament_results(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_tournament_results(integer) TO authenticated;

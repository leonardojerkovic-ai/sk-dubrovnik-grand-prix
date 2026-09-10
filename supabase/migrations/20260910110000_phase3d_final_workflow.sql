-- Phase 3D — Final workflow
-- TOP 8 qualification, confirmation/decline, automatic replacement,
-- no-show/play states and database protection for finalized Final results.

ALTER TABLE public.tournament_results
  ADD COLUMN IF NOT EXISTS final_result_protected boolean NOT NULL DEFAULT false;
ALTER TABLE public.tournament_results
  ADD COLUMN IF NOT EXISTS final_result_protected_at timestamptz;
ALTER TABLE public.tournament_results
  ADD COLUMN IF NOT EXISTS final_result_protected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.tournament_results_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_tournament_id integer;
  v_locked boolean;
  v_protected boolean;
BEGIN
  v_tournament_id := COALESCE(NEW.tournament_id, OLD.tournament_id);
  SELECT t.results_locked,
         CASE WHEN t.event_stage = 'FINAL' THEN COALESCE(OLD.final_result_protected, NEW.final_result_protected, false) ELSE false END
    INTO v_locked, v_protected
  FROM public.tournaments t
  WHERE t.id = v_tournament_id;

  IF COALESCE(v_locked, false)
     AND current_setting('app.results_write_override', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Rezultati turnira su zaključani i više se ne mogu mijenjati.';
  END IF;

  IF COALESCE(v_protected, false)
     AND current_setting('app.final_result_override', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Rezultat Finala je zaštićen i više se ne može mijenjati.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tournament_results_write_guard ON public.tournament_results;
CREATE TRIGGER tournament_results_write_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.tournament_results
FOR EACH ROW EXECUTE FUNCTION public.tournament_results_write_guard();

-- Junior workflow previously lacked an admin check and could not replace a declined player.
CREATE OR REPLACE FUNCTION public.junior_final_record_status(
  p_final_tournament_id integer,
  p_player_id integer,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_q public.junior_gp_final_qualifiers%rowtype;
BEGIN
  PERFORM public.require_dgp_admin();
  IF p_status NOT IN ('INVITED','CONFIRMED','DECLINED','NO_SHOW','PLAYED') THEN
    RAISE EXCEPTION 'Nedozvoljen status %', p_status;
  END IF;

  SELECT * INTO v_q
  FROM public.junior_gp_final_qualifiers
  WHERE final_tournament_id = p_final_tournament_id
    AND player_id = p_player_id
  ORDER BY id DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Igrač % nije kandidat/pozvan za finale', p_player_id;
  END IF;

  IF v_q.status IN ('PLAYED','NO_SHOW') AND p_status <> v_q.status THEN
    RAISE EXCEPTION 'Status % je zaključan.', v_q.status;
  END IF;
  IF v_q.status = 'CONFIRMED' AND p_status NOT IN ('CONFIRMED','PLAYED','NO_SHOW') THEN
    RAISE EXCEPTION 'CONFIRMED može prijeći samo u PLAYED ili NO_SHOW.';
  END IF;
  IF p_status = 'DECLINED' AND v_q.status NOT IN ('QUALIFIED','INVITED') THEN
    RAISE EXCEPTION 'DECLINED je dopušten samo za QUALIFIED ili INVITED.';
  END IF;
  IF p_status IN ('PLAYED','NO_SHOW') AND v_q.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION '% je dopušten samo iz CONFIRMED.', p_status;
  END IF;

  UPDATE public.junior_gp_final_qualifiers
  SET status = p_status, updated_at = now()
  WHERE id = v_q.id;

  IF p_status = 'DECLINED' THEN
    PERFORM public.refresh_dgp_junior_final_qualifiers(p_final_tournament_id);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.junior_final_record_status(integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.junior_final_record_status(integer,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_dgp_junior_final_qualifiers(p_final_tournament_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_final public.tournaments%rowtype;
  v_slot integer;
  v_active record;
  v_last record;
  v_candidate record;
BEGIN
  PERFORM public.require_dgp_admin();
  SELECT * INTO v_final FROM public.tournaments WHERE id = p_final_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Junior GP Finale % ne postoji', p_final_tournament_id; END IF;
  IF v_final.event_stage <> 'FINAL' OR v_final.category_code <> 'U20' THEN
    RAISE EXCEPTION 'Turnir % nije U20 finale', p_final_tournament_id;
  END IF;

  FOR v_slot IN 1..8 LOOP
    SELECT * INTO v_active
    FROM public.junior_gp_final_qualifiers
    WHERE final_tournament_id = p_final_tournament_id
      AND final_slot = v_slot
      AND status IN ('CONFIRMED','PLAYED','NO_SHOW')
    ORDER BY id DESC LIMIT 1;
    IF FOUND THEN CONTINUE; END IF;

    SELECT * INTO v_last
    FROM public.junior_gp_final_qualifiers
    WHERE final_tournament_id = p_final_tournament_id
      AND final_slot = v_slot
    ORDER BY id DESC LIMIT 1;

    SELECT c.* INTO v_candidate
    FROM public.dgp_junior_final_qualification_candidates c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.junior_gp_final_qualifiers q
      WHERE q.final_tournament_id = p_final_tournament_id
        AND q.player_id = c.player_id
        AND q.status IN ('QUALIFIED','INVITED','CONFIRMED','REPLACEMENT','PLAYED','NO_SHOW')
    )
    ORDER BY c.qualification_rank, c.full_name
    LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    INSERT INTO public.junior_gp_final_qualifiers(
      season_id, final_tournament_id, player_id, qualification_rank,
      qualification_points, status, final_slot, source_rank, replaced_player_id
    ) VALUES (
      v_final.season_id, p_final_tournament_id, v_candidate.player_id,
      v_candidate.qualification_rank, v_candidate.category_gp_points,
      CASE WHEN v_last.id IS NULL THEN 'QUALIFIED' ELSE 'REPLACEMENT' END,
      v_slot, v_candidate.qualification_rank,
      CASE WHEN v_last.id IS NULL THEN NULL ELSE v_last.player_id END
    )
    ON CONFLICT (final_tournament_id,player_id) DO UPDATE SET
      qualification_rank=excluded.qualification_rank,
      qualification_points=excluded.qualification_points,
      status=excluded.status,
      final_slot=excluded.final_slot,
      source_rank=excluded.source_rank,
      replaced_player_id=excluded.replaced_player_id,
      updated_at=now();
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_dgp_junior_final_qualifiers(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_dgp_junior_final_qualifiers(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_dgp_final_qualifiers(p_final_tournament_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_final public.tournaments%rowtype;
  v_slot integer;
  v_existing record;
  v_candidate record;
  v_original_player_id integer;
BEGIN
  PERFORM public.require_dgp_admin();
  SELECT * INTO v_final FROM public.tournaments WHERE id=p_final_tournament_id;
  IF NOT FOUND OR v_final.event_stage <> 'FINAL' OR v_final.category_code IS NOT NULL THEN
    RAISE EXCEPTION 'Turnir % nije opći FINAL turnir.', p_final_tournament_id;
  END IF;

  FOR v_slot IN 1..8 LOOP
    SELECT q.* INTO v_existing
    FROM public.grand_prix_final_qualifiers q
    WHERE q.final_tournament_id=p_final_tournament_id AND q.final_slot=v_slot
    ORDER BY q.updated_at DESC,q.id DESC LIMIT 1;

    IF FOUND AND v_existing.status IN ('CONFIRMED','PLAYED','NO_SHOW') THEN CONTINUE; END IF;
    v_original_player_id := CASE WHEN FOUND AND v_existing.status='DECLINED' THEN v_existing.player_id ELSE NULL END;

    SELECT c.* INTO v_candidate
    FROM public.dgp_final_qualification_candidates c
    WHERE c.is_member=true
      AND NOT EXISTS (
        SELECT 1 FROM public.grand_prix_final_qualifiers q2
        WHERE q2.final_tournament_id=p_final_tournament_id
          AND q2.player_id=c.player_id
      )
    ORDER BY c.qualification_rank
    LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    INSERT INTO public.grand_prix_final_qualifiers(
      season_id,final_tournament_id,player_id,qualification_rank,
      qualification_points,status,replaced_player_id,final_slot,source_rank,updated_at
    ) VALUES (
      v_final.season_id,p_final_tournament_id,v_candidate.player_id,
      v_candidate.qualification_rank,v_candidate.qualification_points,
      CASE WHEN v_original_player_id IS NULL THEN 'QUALIFIED' ELSE 'REPLACEMENT' END,
      v_original_player_id,v_slot,v_candidate.qualification_rank,now()
    )
    ON CONFLICT (final_tournament_id,player_id) DO UPDATE SET
      qualification_rank=excluded.qualification_rank,
      qualification_points=excluded.qualification_points,
      status=excluded.status,
      replaced_player_id=excluded.replaced_player_id,
      final_slot=excluded.final_slot,
      source_rank=excluded.source_rank,
      updated_at=now();
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_dgp_final_qualifiers(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_dgp_final_qualifiers(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_dgp_final_results(p_final_tournament_id integer)
RETURNS public.tournaments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_final public.tournaments%rowtype;
  v_confirmed integer;
BEGIN
  PERFORM public.require_dgp_admin();
  SELECT * INTO v_final FROM public.tournaments WHERE id=p_final_tournament_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Finale ne postoji.'; END IF;
  IF v_final.event_stage <> 'FINAL' THEN RAISE EXCEPTION 'Turnir nije Finale.'; END IF;
  IF v_final.results_locked THEN RAISE EXCEPTION 'Rezultati Finala su već zaključani.'; END IF;

  SELECT count(*) INTO v_confirmed
  FROM public.grand_prix_final_qualifiers
  WHERE final_tournament_id=p_final_tournament_id
    AND status IN ('CONFIRMED','PLAYED','NO_SHOW');
  IF v_confirmed < 8 THEN
    SELECT count(*) INTO v_confirmed
    FROM public.junior_gp_final_qualifiers
    WHERE final_tournament_id=p_final_tournament_id
      AND status IN ('CONFIRMED','PLAYED','NO_SHOW');
  END IF;
  IF v_confirmed < 8 THEN RAISE EXCEPTION 'Finale ne može biti zaključeno: svih 8 mjesta mora imati konačan status.'; END IF;

  PERFORM set_config('app.results_write_override','1',true);
  PERFORM public.calculate_dgp_points(p_final_tournament_id);

  PERFORM set_config('app.final_result_override','1',true);
  UPDATE public.tournament_results
  SET final_result_protected=true,
      final_result_protected_at=now(),
      final_result_protected_by=auth.uid(),
      updated_at=now()
  WHERE tournament_id=p_final_tournament_id;

  UPDATE public.tournaments
  SET results_locked=true, results_locked_at=now(), results_locked_by=auth.uid(), status='zavrsen', updated_at=now()
  WHERE id=p_final_tournament_id
  RETURNING * INTO v_final;
  RETURN v_final;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_dgp_final_results(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_dgp_final_results(integer) TO authenticated;

CREATE OR REPLACE VIEW public.dgp_final_ranking AS
SELECT tr.player_id,
       p.full_name,
       tr.final_rank,
       tr.score,
       tr.games_played,
       tr.points_awarded,
       tr.rating_used,
       tr.final_result_protected,
       t.id AS final_tournament_id,
       t.name AS final_name,
       t.start_date
FROM public.tournament_results tr
JOIN public.tournaments t ON t.id=tr.tournament_id
JOIN public.seasons s ON s.id=t.season_id
JOIN public.players p ON p.id=tr.player_id
WHERE s.code='DGP-2027'
  AND t.event_stage='FINAL'
  AND COALESCE(tr.games_played,0)>0;

REVOKE ALL ON public.dgp_final_ranking FROM PUBLIC;
GRANT SELECT ON public.dgp_final_ranking TO authenticated;

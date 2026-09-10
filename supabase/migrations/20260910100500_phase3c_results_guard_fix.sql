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

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

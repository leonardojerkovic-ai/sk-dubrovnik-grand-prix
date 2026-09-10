-- Phase 2 E2E registration workflow fixes
-- Keeps registration status values consistent across registration, admin
-- confirmation and result validation.

ALTER TABLE public.tournament_registrations
  ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.register_player_for_tournament(
  p_tournament_id integer,
  p_player_id integer
)
RETURNS public.tournament_registrations
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
declare
  v public.tournament_registrations;
  e record;
  t public.tournaments%rowtype;
begin
  select * into t from public.tournaments where id=p_tournament_id;
  if not found then raise exception 'Turnir ne postoji'; end if;

  select * into e from public.check_tournament_registration_eligibility(p_tournament_id,p_player_id);
  if not e.eligible then raise exception 'Prijava odbijena: %',e.reason; end if;

  insert into public.tournament_registrations(
    tournament_id,player_id,full_name,status,registered_at,updated_at
  )
  select p_tournament_id,p.id,p.full_name,'REGISTERED',now(),now()
  from public.players p
  where p.id=p_player_id
  on conflict (tournament_id,player_id) where player_id is not null
  do update set status='REGISTERED',updated_at=now()
  returning * into v;

  return v;
end
$$;

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
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND upper(up.role::text) IN ('ADMIN','SUPER_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Nedozvoljeno';
  END IF;

  IF upper(trim(p_status)) NOT IN ('REGISTERED','CONFIRMED','DECLINED') THEN
    RAISE EXCEPTION 'Neispravan status prijave';
  END IF;

  UPDATE public.tournament_registrations
  SET status = upper(trim(p_status)),
      updated_at = now()
  WHERE id = p_registration_id
  RETURNING * INTO v_registration;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prijava nije pronađena';
  END IF;

  RETURN v_registration;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_registration_status(integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_registration_status(integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_tournament_results(p_tournament_id integer)
RETURNS TABLE(is_valid boolean, error_code text, message text, player_id integer, player_name text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
begin
  return query
  with r as (
    select tr.*,p.full_name
    from public.tournament_results tr
    join public.players p on p.id=tr.player_id
    where tr.tournament_id=p_tournament_id
  ), errors as (
    select false,'TOO_FEW_PLAYERS','Turnir mora imati najmanje 6 igrača.',null::integer,null::text
      where (select count(*) from r where games_played>0)<6
    union all
    select false,'INVALID_RANK','Plasman mora biti pozitivan i jedinstven.',r.player_id,r.full_name
      from r where r.games_played>0 and (r.final_rank is null or r.final_rank<1)
    union all
    select false,'DUPLICATE_RANK','Postoji dupli plasman.',r.player_id,r.full_name
      from r join (select x.final_rank from r x where x.games_played>0 and x.final_rank is not null group by x.final_rank having count(*)>1) d on d.final_rank=r.final_rank
      where r.games_played>0
    union all
    select false,'INVALID_GAMES','Broj partija mora biti 0 ili veći.',r.player_id,r.full_name
      from r where r.games_played is null or r.games_played<0
    union all
    select false,'INVALID_WDL','Pobjede + remiji + porazi moraju odgovarati broju odigranih partija.',r.player_id,r.full_name
      from r where r.games_played>0 and coalesce(r.wins,0)+coalesce(r.draws,0)+coalesce(r.losses,0)<>r.games_played
    union all
    select false,'INVALID_SCORE','Bodovi ne mogu biti negativni.',r.player_id,r.full_name
      from r where r.score is null or r.score<0
    union all
    select false,'INVALID_RATING','Korišteni rejting mora biti pozitivan.',r.player_id,r.full_name
      from r where r.games_played>0 and (r.rating_used is null or r.rating_used<=0)
    union all
    select false,'INACTIVE_PLAYER','Neaktivan igrač ne može imati rezultat.',r.player_id,r.full_name
      from r where r.games_played>0 and not exists(select 1 from public.players p where p.id=r.player_id and p.is_active)
    union all
    select false,'REGISTRATION_MISSING','Igrač nema potvrđenu prijavu za ovaj turnir.',r.player_id,r.full_name
      from r where r.games_played>0 and not exists(
        select 1 from public.tournament_registrations x
        where x.tournament_id=p_tournament_id and x.player_id=r.player_id and x.status='CONFIRMED'
      )
    union all
    select false,'UNSCORED_PLAYER','Potvrđeni igrač nema rezultat.',x.player_id,x.full_name
      from public.tournament_registrations x
      where x.tournament_id=p_tournament_id and x.status='CONFIRMED' and x.player_id is not null
        and not exists(select 1 from r where r.player_id=x.player_id and r.games_played>0)
  )
  select * from errors;
end
$$;

REVOKE ALL ON FUNCTION public.validate_tournament_results(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_tournament_results(integer) TO authenticated;

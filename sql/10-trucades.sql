-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · 10 — Seguiment de trucades
--
-- Un sol desplegable per persona al Seguiment:
--   pendent      ☎ Pendent de trucar
--   no_contesta  📵 No contesta
--   inscrit      ✓ Inscrit/a  → reserva confirmada i, si encara no
--                               constava, informada de la clàusula de
--                               dades en la trucada (qui i quan)
--   no_inscriu   ✗ No s'hi apunta → el panell fa la baixa i esborra dades
--
-- Substitueix la casella "Alta" i la columna "Dades" (que era massa feina).
-- Requereix 00–09. És idempotent.
-- ═══════════════════════════════════════════════════════════════

alter table comunitat.reserves
  add column if not exists trucada_estat text,
  add column if not exists trucada_at    timestamptz,
  add column if not exists trucada_per   text;

alter table comunitat.reserves drop constraint if exists reserves_trucada_check;
alter table comunitat.reserves add constraint reserves_trucada_check
  check (trucada_estat is null or trucada_estat in ('pendent','no_contesta','inscrit','no_inscriu'));

create or replace function comunitat.admin_trucada(
  p_id     text,
  p_estat  text,
  p_actor  text,
  p_versio text default 'clausula-v2-2026-09'
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  if p_estat not in ('pendent','no_contesta','inscrit') then
    return jsonb_build_object('ok', false, 'error', 'estat_no_valid');
  end if;
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'seguiment: ' || p_estat ||
    case when p_estat = 'inscrit' then ' (informada de la clàusula de dades en la trucada)' else '' end, true);

  update comunitat.reserves set
    trucada_estat = p_estat,
    trucada_at    = now(),
    trucada_per   = p_actor,
    status = case
               when p_estat = 'inscrit' and status = 'pending' then 'confirmed'
               when p_estat in ('pendent','no_contesta') and status = 'confirmed' then 'pending'
               else status end,
    confirmed_at = case when p_estat = 'inscrit' then coalesce(confirmed_at, now()) else confirmed_at end,
    -- Prova d'informació (art. 13/14 RGPD): el guió de trucada inclou la clàusula
    informada_at  = case when p_estat = 'inscrit' and informada_at is null then now()    else informada_at end,
    informada_per = case when p_estat = 'inscrit' and informada_at is null then p_actor  else informada_per end,
    info_versio   = case when p_estat = 'inscrit' and informada_at is null then p_versio else info_versio end
  where id = p_id and esborrat_at is null and status <> 'cancelled'
  returning * into v_r;

  if not found then return jsonb_build_object('ok', false, 'error', 'no_trobada'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

revoke execute on function comunitat.admin_trucada(text,text,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_trucada(text,text,text,text) to service_role;

-- Comprovació: com queda cada persona (null = es calcula al panell)
select coalesce(trucada_estat, '(sense marcar)') as trucada, count(*)
from comunitat.reserves where status not in ('cancelled') and esborrat_at is null
group by 1 order by 1;

-- Que l'API (PostgREST) vegi de seguida les funcions noves
notify pgrst, 'reload schema';

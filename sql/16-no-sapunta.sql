-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · 16 — "✗ No s'hi apunta" sense esborrar
--
-- Abans: marcar "No s'hi apunta" feia la baixa i esborrava les dades, i
-- la persona desapareixia del Seguiment. Ara:
--   · no_inscriu → la reserva passa a 'cancelled' (allibera la plaça) però
--     es conserven les dades i continua visible al Seguiment, a part.
--   · Es pot desfer: tornar-la a pendent / no contesta / inscrit/a la
--     reactiva ('pending' o 'confirmed').
--   · Esborrar les dades continua sent el botó "Baixa".
-- Les ja esborrades (esborrat_at) no es toquen mai.
-- Requereix 10. És idempotent.
-- ═══════════════════════════════════════════════════════════════

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
  if p_estat not in ('pendent','no_contesta','inscrit','no_inscriu') then
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
               when p_estat = 'no_inscriu' and status in ('attended','no-show') then status
               when p_estat = 'no_inscriu'                                      then 'cancelled'
               when p_estat = 'inscrit' and status in ('pending','cancelled')   then 'confirmed'
               when p_estat in ('pendent','no_contesta') and status in ('confirmed','cancelled') then 'pending'
               else status end,
    cancelled_at = case when p_estat = 'no_inscriu' and status not in ('attended','no-show') then coalesce(cancelled_at, now())
                        when p_estat <> 'no_inscriu' and status = 'cancelled' then null      -- es reactiva
                        else cancelled_at end,
    confirmed_at = case when p_estat = 'inscrit' then coalesce(confirmed_at, now()) else confirmed_at end,
    informada_at  = case when p_estat = 'inscrit' and informada_at is null then now()    else informada_at end,
    informada_per = case when p_estat = 'inscrit' and informada_at is null then p_actor  else informada_per end,
    info_versio   = case when p_estat = 'inscrit' and informada_at is null then p_versio else info_versio end
  where id = p_id and esborrat_at is null
    and (status <> 'cancelled' or trucada_estat = 'no_inscriu')
  returning * into v_r;

  if not found then return jsonb_build_object('ok', false, 'error', 'no_trobada'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

revoke execute on function comunitat.admin_trucada(text,text,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_trucada(text,text,text,text) to service_role;

notify pgrst, 'reload schema';

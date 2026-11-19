-- ═══════════════════════════════════════════════════════════════════
-- 31 · Comptador d'assistents per sessió (només activitats de tipus "Activitat")
--   Per a activitats obertes (ex. "Una cadira més") on la gent ve sense
--   inscriure's: a Passar llista es desa un número per dia i una nota opcional.
--   Sense dades personals. Es guarda a events.assistents_sessio:
--     { "2026-11-19": { "n": 13, "nota": "..." } }
--   Cada canvi queda a l'auditoria (qui i quan).
--   També: "Una cadira més" ja ha començat → passa a Visible i es desa el 19/11 = 13.
-- Requereix 00–30. Idempotent.
-- ═══════════════════════════════════════════════════════════════════
begin;

alter table comunitat.events
  add column if not exists assistents_sessio jsonb not null default '{}'::jsonb;

create or replace function comunitat.admin_comptador(
  p_event_id text,
  p_data     date,
  p_n        integer,      -- null = esborrar el registre d'aquell dia
  p_nota     text,
  p_actor    text
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_ev comunitat.events%rowtype;
begin
  if p_n is not null and (p_n < 0 or p_n > 9999) then
    return jsonb_build_object('ok', false, 'error', 'n_no_valid');
  end if;
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'assistents ' || p_data || ': ' || coalesce(p_n::text, 'esborrat'), true);
  select * into v_ev from comunitat.events where id = p_event_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_ev.tipo <> 'mensual' then return jsonb_build_object('ok', false, 'error', 'no_es_activitat'); end if;

  update comunitat.events set assistents_sessio = case
      when p_n is null then assistents_sessio - p_data::text
      else assistents_sessio || jsonb_build_object(p_data::text,
             jsonb_strip_nulls(jsonb_build_object('n', p_n, 'nota', nullif(trim(coalesce(p_nota, '')), ''))))
    end
  where id = p_event_id
  returning * into v_ev;

  return jsonb_build_object('ok', true, 'assistents_sessio', v_ev.assistents_sessio);
end $$;

revoke execute on function comunitat.admin_comptador(text,date,integer,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_comptador(text,date,integer,text,text) to service_role;

-- Una cadira més: ja ha començat (Visible) i el 19/11 hi van venir 13 persones
select set_config('app.actor', 'sql-31', true);
update comunitat.events set estat = 'actiu'
 where id = 'una-cadira-mes-canyado' and estat = 'proximament';
update comunitat.events set assistents_sessio = assistents_sessio || '{"2026-11-19":{"n":13}}'::jsonb
 where id = 'una-cadira-mes-canyado' and not assistents_sessio ? '2026-11-19';

-- Comprovació
select id, titol->>'ca' as titol, tipo, estat, assistents_sessio
  from comunitat.events where id = 'una-cadira-mes-canyado';

commit;

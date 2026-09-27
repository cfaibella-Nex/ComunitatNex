-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · MIGRACIÓ v14 — activitats que es repeteixen
--                                        i persona de contacte
--
-- recurrencia:
--   'cap'      → una data (o unes quantes sessions puntuals)
--   'setmanal' → cada setmana, el mateix dia que la data de
--                l'activitat. La web mostra "Cada dimarts · 16:30–17:30"
--                i continua visible encara que la data d'inici ja hagi
--                passat (fins que s'arxivi).
--
-- Requereix v10–v13. És idempotent.
-- ═══════════════════════════════════════════════════════════════

-- La columna i el marcatge inicial dels tallers setmanals, només el
-- primer cop: si es torna a executar, no desfà el que s'hagi canviat
-- després des del panell.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'comunitat' and table_name = 'events'
                   and column_name = 'recurrencia') then
    alter table comunitat.events add column recurrencia text not null default 'cap';
    update comunitat.events set recurrencia = 'setmanal'
     where id in ('taller-castellano-santroc', 'taller-mobil-santroc',
                  'taller-memoria-canpepus', 'taller-angles-canpepus');
  end if;
end $$;

alter table comunitat.events drop constraint if exists events_recurrencia_check;
alter table comunitat.events add constraint events_recurrencia_check
  check (recurrencia in ('cap','setmanal'));

-- Alta/edició amb el camp nou
create or replace function comunitat.admin_upsert_event(
  p_event jsonb,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare v_e comunitat.events%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);

  insert into comunitat.events as e (
    id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
    data, hora, durada, cupo, preu_cents, tipo_iva, imatge, imatge_lloc, cartell,
    data_label, estat, model, pagament, tarifes, extres, recurrencia
  )
  select id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
         data, hora, durada, coalesce(cupo, 20), coalesce(preu_cents, 0),
         coalesce(tipo_iva, 'exempt'), imatge, imatge_lloc, nullif(cartell, ''), data_label,
         coalesce(estat, 'proximament'),
         coalesce(model, 'puntual'), coalesce(pagament, 'reserva'),
         coalesce(tarifes, '[]'::jsonb), coalesce(extres, '[]'::jsonb),
         coalesce(recurrencia, 'cap')
  from jsonb_populate_record(null::comunitat.events, p_event)
  on conflict (id) do update set
    tipo = excluded.tipo, titol = excluded.titol, descripcio = excluded.descripcio,
    entitat = excluded.entitat, ubicacio = excluded.ubicacio, mapa_url = excluded.mapa_url,
    data = excluded.data, hora = excluded.hora, durada = excluded.durada,
    cupo = excluded.cupo, preu_cents = excluded.preu_cents, tipo_iva = excluded.tipo_iva,
    imatge = excluded.imatge, imatge_lloc = excluded.imatge_lloc, cartell = excluded.cartell,
    data_label = excluded.data_label, estat = excluded.estat,
    model = excluded.model, pagament = excluded.pagament,
    tarifes = excluded.tarifes, extres = excluded.extres,
    recurrencia = excluded.recurrencia
  returning * into v_e;

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_e));
end $$;

revoke execute on function comunitat.admin_upsert_event(jsonb,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_upsert_event(jsonb,text) to service_role;

-- ── PERSONA DE CONTACTE ───────────────────────────────────────
-- Quan el telèfon no és de l'usuari sinó d'un familiar (la neboda, la
-- filla…): de qui és. Text lliure, p. ex. "Cecilia (neboda)".
alter table comunitat.reserves add column if not exists contacte text;

-- Afegir persona: ara també amb el contacte (paràmetre nou, opcional).
drop function if exists comunitat.admin_afegir_persona(text,text,text,text,text,jsonb,integer,integer,boolean,text,boolean,text,text);
create or replace function comunitat.admin_afegir_persona(
  p_ref          text,
  p_event_id     text,
  p_nom          text,
  p_telefon      text,
  p_email        text,
  p_linies       jsonb,
  p_places       integer,
  p_total_cents  integer,
  p_consultar    boolean,
  p_origen       text,
  p_alta         boolean,
  p_observacions text,
  p_actor        text,
  p_contacte     text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare
  v_ev comunitat.events%rowtype;
  v_ocupades integer;
  v_disp integer;
  v_status text;
  v_r comunitat.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'afegida des del panell (' || coalesce(p_origen, '') || ')', true);

  select * into v_ev from comunitat.events where id = p_event_id for update;
  if not found or v_ev.estat = 'arxivat' then
    return jsonb_build_object('ok', false, 'error', 'event_unavailable');
  end if;

  -- Duplicat = mateix telèfon I mateix nom (famílies que comparteixen telèfon)
  if exists (
    select 1 from comunitat.reserves
    where event_id = p_event_id
      and status in ('pending','confirmed','waitlist','attended')
      and lower(trim(nom)) = lower(trim(p_nom))
      and coalesce(telefon, '') = coalesce(p_telefon, '')
  ) then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;

  select coalesce(sum(places), 0) into v_ocupades
  from comunitat.reserves
  where event_id = p_event_id and status in ('pending','confirmed','attended');
  v_disp := case when v_ev.estat = 'esgotat' then 0 else greatest(0, coalesce(v_ev.cupo, 0) - v_ocupades) end;

  v_status := case when p_places > v_disp then 'waitlist'
                   when p_alta then 'confirmed' else 'pending' end;

  insert into comunitat.reserves (
    id, event_id, nom, telefon, email, places, notes, preu_cents, total_cents,
    status, lang, linies, consultar, mode_pagament, payment_status, origen, observacions,
    contacte, confirmed_at
  ) values (
    p_ref, p_event_id, p_nom, coalesce(p_telefon, ''), p_email, p_places, null,
    coalesce(v_ev.preu_cents, 0), coalesce(p_total_cents, 0),
    v_status, 'ca', coalesce(p_linies, '[]'::jsonb), coalesce(p_consultar, false),
    coalesce(v_ev.pagament, 'reserva'), 'none', coalesce(p_origen, 'telefon'), p_observacions,
    nullif(trim(coalesce(p_contacte, '')), ''),
    case when v_status = 'confirmed' then now() end
  ) returning * into v_r;

  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r), 'disponibles', v_disp);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'ref_collision');
end $$;

-- Editar persona: també el contacte
create or replace function comunitat.admin_editar_persona(
  p_id    text,
  p_camps jsonb,
  p_actor text
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  update comunitat.reserves set
    nom          = case when p_camps ? 'nom'          then p_camps->>'nom'                      else nom end,
    telefon      = case when p_camps ? 'telefon'      then coalesce(p_camps->>'telefon', '')    else telefon end,
    email        = case when p_camps ? 'email'        then nullif(p_camps->>'email', '')        else email end,
    observacions = case when p_camps ? 'observacions' then nullif(p_camps->>'observacions', '') else observacions end,
    origen       = case when p_camps ? 'origen'       then p_camps->>'origen'                   else origen end,
    contacte     = case when p_camps ? 'contacte'     then nullif(trim(p_camps->>'contacte'), '') else contacte end
  where id = p_id
  returning * into v_r;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

revoke execute on function comunitat.admin_afegir_persona(text,text,text,text,text,jsonb,integer,integer,boolean,text,boolean,text,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_afegir_persona(text,text,text,text,text,jsonb,integer,integer,boolean,text,boolean,text,text,text) to service_role;
revoke execute on function comunitat.admin_editar_persona(text,jsonb,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_editar_persona(text,jsonb,text) to service_role;

-- ── Comprovació: el dia de la setmana surt de la DATA de l'activitat ──
-- Si no quadra amb el cartell, canvia la data al panell (per exemple,
-- castellà Sant Roc → un dimarts; memòria Can Pepus → un dijous).
select id, titol->>'ca' as titol, recurrencia, data,
       (array['dilluns','dimarts','dimecres','dijous','divendres','dissabte','diumenge'])[extract(isodow from data::date)::int] as dia_setmana, hora, durada
from comunitat.events
where estat <> 'arxivat'
order by recurrencia desc, id;

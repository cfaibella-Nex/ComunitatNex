-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · MIGRACIÓ v13 — usuaris del panell i seguiment
--
--   · Persones afegides des del panell (trucada, presencial…)
--   · Observacions internes per persona
--   · Sessions de cada activitat: automàtiques cada setmana segons
--     el dia de l'activitat, amb dates afegides o tretes a mà
--   · Correcció: el hash de contrasenya ja no arriba a l'auditoria
--
-- Requereix v10, v11, v12 i api/gestor-schema.sql (taules d'usuaris).
-- Ordre: gestor-schema.sql → aquest fitxer. És idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. RESERVES: origen i observacions ────────────────────────
alter table comunitat.reserves
  add column if not exists origen       text not null default 'web',
  add column if not exists observacions text;

alter table comunitat.reserves drop constraint if exists reserves_origen_check;
alter table comunitat.reserves add constraint reserves_origen_check
  check (origen in ('web','telefon','presencial','altres'));

-- ── 2. EVENTS: sessions afegides o tretes a mà ────────────────
alter table comunitat.events
  add column if not exists sessions_afegides jsonb not null default '[]'::jsonb,
  add column if not exists sessions_tretes   jsonb not null default '[]'::jsonb;

-- ── 3. AUDITORIA sense hash de contrasenya ────────────────────
-- La versió de gestor-schema.sql intentava esborrar el hash DESPRÉS
-- d'escriure'l, però l'auditoria és immutable i l'esborrat fallava
-- en silenci. Ara el hash no s'hi escriu mai: només consta que ha
-- canviat.
create or replace function comunitat.fn_auditoria()
returns trigger
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare
  v_actor   text  := coalesce(nullif(current_setting('app.actor', true), ''), 'sistema');
  v_motiu   text  := nullif(current_setting('app.motiu', true), '');
  v_abans   jsonb;
  v_despres jsonb;
  v_canvis  jsonb := '{}'::jsonb;
  k         text;
begin
  if (tg_op = 'INSERT') then
    v_despres := to_jsonb(new) - 'hash';
    insert into comunitat.auditoria (taula, registre_id, accio, actor, motiu, fila_despres)
    values (tg_table_name, new.id::text, 'insert', v_actor, v_motiu, v_despres);
    return new;

  elsif (tg_op = 'UPDATE') then
    v_abans   := to_jsonb(old);
    v_despres := to_jsonb(new);
    for k in select jsonb_object_keys(v_despres) loop
      if k not in ('updated_at') and (v_abans -> k) is distinct from (v_despres -> k) then
        v_canvis := v_canvis || jsonb_build_object(k,
          case when k = 'hash' then '"canviada"'::jsonb
               else jsonb_build_object('abans', v_abans -> k, 'despres', v_despres -> k) end);
      end if;
    end loop;
    if v_canvis = '{}'::jsonb then return new; end if;
    insert into comunitat.auditoria (taula, registre_id, accio, actor, motiu, canvis, fila_abans, fila_despres)
    values (tg_table_name, new.id::text, 'update', v_actor, v_motiu, v_canvis,
            v_abans - 'hash', v_despres - 'hash');
    return new;

  else
    insert into comunitat.auditoria (taula, registre_id, accio, actor, motiu, fila_abans)
    values (tg_table_name, old.id::text, 'delete', v_actor, v_motiu, to_jsonb(old) - 'hash');
    return old;
  end if;
end $$;

-- (si gestor-schema.sql encara no s'ha executat, la taula no hi és: no fa res)
do $$ begin
  if to_regclass('comunitat.usuaris') is not null then
    drop trigger if exists trg_auditoria_usuaris_net on comunitat.usuaris;
  end if;
end $$;

-- ── 4. AFEGIR UNA PERSONA DES DEL PANELL ──────────────────────
-- Per a qui s'apunta trucant o al centre cívic. Mateixes comprovacions
-- d'aforament que la web: si no hi ha places, queda en llista d'espera.
-- El telèfon pot quedar buit (algú que ve en persona sense donar-lo).
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
  p_actor        text
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

  if coalesce(p_telefon, '') <> '' and exists (
    select 1 from comunitat.reserves
    where event_id = p_event_id and telefon = p_telefon
      and status in ('pending','confirmed','waitlist','attended')
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
    confirmed_at
  ) values (
    p_ref, p_event_id, p_nom, coalesce(p_telefon, ''), p_email, p_places, null,
    coalesce(v_ev.preu_cents, 0), coalesce(p_total_cents, 0),
    v_status, 'ca', coalesce(p_linies, '[]'::jsonb), coalesce(p_consultar, false),
    coalesce(v_ev.pagament, 'reserva'), 'none', coalesce(p_origen, 'telefon'), p_observacions,
    case when v_status = 'confirmed' then now() end
  ) returning * into v_r;

  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r), 'disponibles', v_disp);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'ref_collision');
end $$;

-- ── 5. EDITAR DADES D'UNA PERSONA ─────────────────────────────
-- Només aquests camps. La resta (preus, estat, pagament) té la seva via.
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
    nom          = case when p_camps ? 'nom'          then p_camps->>'nom'                 else nom end,
    telefon      = case when p_camps ? 'telefon'      then coalesce(p_camps->>'telefon', '') else telefon end,
    email        = case when p_camps ? 'email'        then nullif(p_camps->>'email', '')   else email end,
    observacions = case when p_camps ? 'observacions' then nullif(p_camps->>'observacions', '') else observacions end,
    origen       = case when p_camps ? 'origen'       then p_camps->>'origen'              else origen end
  where id = p_id
  returning * into v_r;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

-- ── 6. AFEGIR O TREURE UNA SESSIÓ ─────────────────────────────
-- Les sessions automàtiques no es desen: es calculen. Aquí només es
-- guarden les excepcions (afegides o tretes).
create or replace function comunitat.admin_sessio(
  p_event_id text,
  p_data     date,
  p_accio    text,       -- 'afegir' | 'treure'
  p_actor    text
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare
  v_ev comunitat.events%rowtype;
  v_d  jsonb := to_jsonb(p_data::text);
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'sessió ' || p_data || ': ' || p_accio, true);
  select * into v_ev from comunitat.events where id = p_event_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if p_accio = 'afegir' then
    if v_ev.sessions_tretes @> jsonb_build_array(v_d) then
      update comunitat.events set sessions_tretes =
        (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(sessions_tretes) x where x <> v_d)
      where id = p_event_id;
    elsif not v_ev.sessions_afegides @> jsonb_build_array(v_d) then
      update comunitat.events set sessions_afegides = sessions_afegides || jsonb_build_array(v_d)
      where id = p_event_id;
    end if;
  elsif p_accio = 'treure' then
    if v_ev.sessions_afegides @> jsonb_build_array(v_d) then
      update comunitat.events set sessions_afegides =
        (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(sessions_afegides) x where x <> v_d)
      where id = p_event_id;
    elsif not v_ev.sessions_tretes @> jsonb_build_array(v_d) then
      update comunitat.events set sessions_tretes = sessions_tretes || jsonb_build_array(v_d)
      where id = p_event_id;
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'accio_no_valida');
  end if;

  select * into v_ev from comunitat.events where id = p_event_id;
  return jsonb_build_object('ok', true,
    'sessions_afegides', v_ev.sessions_afegides, 'sessions_tretes', v_ev.sessions_tretes);
end $$;

-- ── 7. PERMISOS ───────────────────────────────────────────────
revoke execute on function comunitat.admin_afegir_persona(text,text,text,text,text,jsonb,integer,integer,boolean,text,boolean,text,text) from public, anon, authenticated;
revoke execute on function comunitat.admin_editar_persona(text,jsonb,text) from public, anon, authenticated;
revoke execute on function comunitat.admin_sessio(text,date,text,text)     from public, anon, authenticated;
grant  execute on function comunitat.admin_afegir_persona(text,text,text,text,text,jsonb,integer,integer,boolean,text,boolean,text,text) to service_role;
grant  execute on function comunitat.admin_editar_persona(text,jsonb,text) to service_role;
grant  execute on function comunitat.admin_sessio(text,date,text,text)     to service_role;

-- ── 8. COMPROVACIÓ ────────────────────────────────────────────
--   select origen, observacions from comunitat.reserves limit 1;
--   select sessions_afegides, sessions_tretes from comunitat.events limit 1;

-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · INSTAL·LACIÓ COMPLETA
-- Esquema `comunitat` DINS del projecte Supabase d'IntraNex.
--
-- Per què un esquema propi i no `public`:
--   IntraNex ja té persones, casos, clients, historial_canvis... i
--   possiblement una funció set_updated_at(). Instal·lar això a
--   `public` la sobreescriuria i podria trencar el CRM. Amb un
--   esquema propi, els dos mons no es toquen.
--
-- Enganxa aquest fitxer SENCER a l'SQL Editor i executa'l una vegada.
-- És idempotent: es pot tornar a executar sense perill.
--
-- DESPRÉS: Supabase → Settings → API → Exposed schemas → afegir
-- `comunitat`. Sense això, l'API retorna 404 a tot.
-- ═══════════════════════════════════════════════════════════════

create schema if not exists comunitat;

-- Només el backend hi entra. anon i authenticated no hi tenen accés.
grant usage on schema comunitat to service_role;
revoke all on schema comunitat from anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · schema Postgres (Supabase)
-- Executa aquest fitxer sencer una vegada a l'SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════

-- ── EVENTS ────────────────────────────────────────────────
create table if not exists comunitat.events (
  id           text primary key,
  tipo         text not null check (tipo in ('mensual','taller','esdeveniment')),
  titol        jsonb not null,           -- { ca, es }
  descripcio   jsonb not null,
  entitat      jsonb,                    -- { ca, es }
  ubicacio     jsonb,                    -- { ca, es }
  mapa_url     text,
  data         date,
  hora         text,
  durada       integer default 90,
  cupo         integer not null default 20 check (cupo >= 0),
  preu_cents   integer not null default 0 check (preu_cents >= 0),
  tipo_iva     text default 'exempt' check (tipo_iva in ('exempt','iva10','iva21')),
  imatge       text,
  estat        text not null default 'actiu' check (estat in ('actiu','proximament','esgotat','arxivat')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_events_data on comunitat.events (data);
create index if not exists idx_events_tipo on comunitat.events (tipo);
create index if not exists idx_events_estat on comunitat.events (estat);

-- Trigger updated_at automàtic
create or replace function comunitat.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_events_updated on comunitat.events;
create trigger trg_events_updated before update on comunitat.events
  for each row execute function comunitat.set_updated_at();

-- ── RESERVES ──────────────────────────────────────────────
create table if not exists comunitat.reserves (
  id          text primary key,          -- NX-XXXXXX visible per l'usuari
  event_id    text not null references comunitat.events(id) on delete restrict,
  nom         text not null,
  telefon     text not null,
  email       text,
  places      integer not null check (places > 0),
  notes       text,
  preu_cents  integer not null default 0,
  total_cents integer not null default 0,
  status      text not null default 'pending'
              check (status in ('pending','confirmed','cancelled','attended','no-show')),
  lang        text default 'ca',
  created_at  timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_reserves_event on comunitat.reserves (event_id, status);
create index if not exists idx_reserves_estat on comunitat.reserves (status, created_at);
create index if not exists idx_reserves_tel   on comunitat.reserves (telefon);

-- ── OCUPACIÓ (RPC) ────────────────────────────────────────
-- Places ocupades d'un event: confirmades + pending recents (hold)
create or replace function comunitat.places_ocupades(
  p_event_id text,
  p_hold_min integer default 60
)
returns integer
language sql
stable
as $$
  select coalesce(sum(places), 0)::int
  from comunitat.reserves
  where event_id = p_event_id
    and ( status in ('confirmed','attended')
       or (status = 'pending' and created_at > now() - (p_hold_min || ' minutes')::interval) );
$$;

-- Ocupació de tots els events d'un cop (per al llistat)
create or replace function comunitat.places_ocupades_totes(
  p_hold_min integer default 60
)
returns table (event_id text, places integer)
language sql
stable
as $$
  select r.event_id, coalesce(sum(r.places), 0)::int
  from comunitat.reserves r
  where r.status in ('confirmed','attended')
     or (r.status = 'pending' and r.created_at > now() - (p_hold_min || ' minutes')::interval)
  group by r.event_id;
$$;

-- ── RECURSOS ──────────────────────────────────────────────
create table if not exists comunitat.recursos (
  id          text primary key,
  categoria   text not null,
  titol       jsonb not null,
  descripcio  jsonb not null,
  tipus       text not null check (tipus in ('guia','video','audio','link')),
  enllac      text not null,
  publicat    boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────
-- Amb service_role_key des del backend saltem RLS.
-- Igualment, si es vol activar per lectura pública:
alter table comunitat.events enable row level security;
alter table comunitat.reserves enable row level security;
alter table comunitat.recursos enable row level security;

-- Lectura pública només d'events actius
drop policy if exists "public read active events" on comunitat.events;
create policy "public read active events" on comunitat.events
  for select using (estat in ('actiu','proximament','esgotat'));

-- Recursos publicats són públics
drop policy if exists "public read published resources" on comunitat.recursos;
create policy "public read published resources" on comunitat.recursos
  for select using (publicat = true);

-- Reserves: ningú les pot llegir per anon (només via API admin amb service_role)
-- (per defecte amb RLS on i sense policy, cap select és permès)


-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · MIGRACIÓ v2 (auditoria + reserves atòmiques)
--
-- Executa aquest fitxer SENCER una vegada a l'SQL Editor de Supabase,
-- DESPRÉS de schema.sql. És idempotent: es pot re-executar sense perill.
--
-- Decisions aplicades:
--  · Les reserves 'pending' bloquegen plaça indefinidament (fins cancel·lar)
--  · Tot canvi a events/reserves queda registrat a comunitat.auditoria
--  · comunitat.auditoria és NOMÉS D'INSERCIÓ (no es pot editar ni esborrar)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. COLUMNES NOVES A RESERVES ──────────────────────────────
alter table comunitat.reserves
  add column if not exists consent_rgpd_at      timestamptz,
  add column if not exists consent_versio       text,
  add column if not exists payment_status       text not null default 'none',
  add column if not exists stripe_payment_intent text,
  add column if not exists import_pagat_cents   integer not null default 0,
  add column if not exists cancelled_at         timestamptz,
  add column if not exists updated_at           timestamptz not null default now();

-- Estat de pagament (preparat per Stripe, inactiu de moment)
alter table comunitat.reserves drop constraint if exists reserves_payment_status_check;
alter table comunitat.reserves add constraint reserves_payment_status_check
  check (payment_status in ('none','pending','paid','refunded','failed'));

-- Nou estat: waitlist (llista d'espera)
alter table comunitat.reserves drop constraint if exists reserves_status_check;
alter table comunitat.reserves add constraint reserves_status_check
  check (status in ('pending','confirmed','waitlist','cancelled','attended','no-show'));

-- updated_at automàtic també a reserves
drop trigger if exists trg_reserves_updated on comunitat.reserves;
create trigger trg_reserves_updated before update on comunitat.reserves
  for each row execute function comunitat.set_updated_at();

create index if not exists idx_reserves_tel_recent on comunitat.reserves (telefon, created_at desc);

-- ── 1b. COLUMNES QUE FALTAVEN A EVENTS ────────────────────────
-- data.js les feia servir però la taula no les tenia: migrar sense
-- aquestes columnes perdria la foto del local i l'etiqueta de data.
alter table comunitat.events
  add column if not exists imatge_lloc text,   -- foto de l'edifici (detall > "On es fa")
  add column if not exists data_label  jsonb;  -- { ca, es } — "Octubre 2026", "Cada setmana"

-- ── 2. TAULA D'AUDITORIA ──────────────────────────────────────
create table if not exists comunitat.auditoria (
  id           bigserial primary key,
  taula        text        not null,
  registre_id  text        not null,
  accio        text        not null check (accio in ('insert','update','delete')),
  actor        text        not null default 'sistema',
  motiu        text,
  canvis       jsonb,            -- { camp: { abans, despres } }
  fila_abans   jsonb,
  fila_despres jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_auditoria_registre on comunitat.auditoria (taula, registre_id, created_at desc);
create index if not exists idx_auditoria_data     on comunitat.auditoria (created_at desc);

alter table comunitat.auditoria enable row level security;
-- Sense cap policy: anon no hi pot accedir. Només el backend (service_role).

-- ── 3. IMMUTABILITAT DE L'AUDITORIA ───────────────────────────
-- Bloqueja UPDATE i DELETE fins i tot amb service_role. Si algun dia cal
-- purgar per retenció, s'ha de desactivar el trigger explícitament.
create or replace function comunitat.fn_auditoria_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'comunitat.auditoria és només d''inserció (registre d''auditoria)';
end $$;

drop trigger if exists trg_auditoria_immutable on comunitat.auditoria;
create trigger trg_auditoria_immutable
  before update or delete on comunitat.auditoria
  for each row execute function comunitat.fn_auditoria_immutable();

-- ── 4. TRIGGER GENÈRIC D'AUDITORIA ────────────────────────────
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
    insert into comunitat.auditoria (taula, registre_id, accio, actor, motiu, fila_despres)
    values (tg_table_name, new.id::text, 'insert', v_actor, v_motiu, to_jsonb(new));
    return new;

  elsif (tg_op = 'UPDATE') then
    v_abans   := to_jsonb(old);
    v_despres := to_jsonb(new);

    for k in select jsonb_object_keys(v_despres) loop
      if k not in ('updated_at') and (v_abans -> k) is distinct from (v_despres -> k) then
        v_canvis := v_canvis || jsonb_build_object(
          k, jsonb_build_object('abans', v_abans -> k, 'despres', v_despres -> k)
        );
      end if;
    end loop;

    -- Si només ha canviat updated_at, no registrem soroll
    if v_canvis = '{}'::jsonb then return new; end if;

    insert into comunitat.auditoria (taula, registre_id, accio, actor, motiu, canvis, fila_abans, fila_despres)
    values (tg_table_name, new.id::text, 'update', v_actor, v_motiu, v_canvis, v_abans, v_despres);
    return new;

  else
    insert into comunitat.auditoria (taula, registre_id, accio, actor, motiu, fila_abans)
    values (tg_table_name, old.id::text, 'delete', v_actor, v_motiu, to_jsonb(old));
    return old;
  end if;
end $$;

drop trigger if exists trg_auditoria_reserves on comunitat.reserves;
create trigger trg_auditoria_reserves
  after insert or update or delete on comunitat.reserves
  for each row execute function comunitat.fn_auditoria();

drop trigger if exists trg_auditoria_events on comunitat.events;
create trigger trg_auditoria_events
  after insert or update or delete on comunitat.events
  for each row execute function comunitat.fn_auditoria();

-- ── 5. OCUPACIÓ: pending bloqueja plaça sempre ────────────────
-- Es manté el paràmetre p_hold_min per no trencar les crides existents,
-- però s'ignora (decisió: les pendents compten fins que es cancel·len).
create or replace function comunitat.places_ocupades(
  p_event_id text,
  p_hold_min integer default 60
)
returns integer language sql stable as $$
  select coalesce(sum(places), 0)::int
  from comunitat.reserves
  where event_id = p_event_id
    and status in ('pending','confirmed','attended');
$$;

create or replace function comunitat.places_ocupades_totes(
  p_hold_min integer default 60
)
returns table (event_id text, places integer)
language sql stable as $$
  select r.event_id, coalesce(sum(r.places), 0)::int
  from comunitat.reserves r
  where r.status in ('pending','confirmed','attended')
  group by r.event_id;
$$;

-- ── 6. RESERVA ATÒMICA ────────────────────────────────────────
-- Bloqueja la fila de l'event (FOR UPDATE): comprovació d'aforament i
-- inserció dins la MATEIXA transacció. Impossible passar-se del cupo.
create or replace function comunitat.crear_reserva(
  p_ref            text,
  p_event_id       text,
  p_nom            text,
  p_telefon        text,
  p_email          text,
  p_places         integer,
  p_notes          text,
  p_lang           text default 'ca',
  p_consent_versio text default null,
  p_permet_espera  boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare
  v_ev          comunitat.events%rowtype;
  v_ocupades    integer;
  v_disponibles integer;
  v_recents     integer;
  v_status      text;
begin
  perform set_config('app.actor', 'web-publica', true);

  select * into v_ev from comunitat.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'event_not_found');
  end if;
  if v_ev.estat = 'arxivat' then
    return jsonb_build_object('ok', false, 'error', 'event_unavailable');
  end if;

  -- Anti-duplicat: mateix telèfon ja té reserva viva en aquest event
  if exists (
    select 1 from comunitat.reserves
    where event_id = p_event_id
      and telefon  = p_telefon
      and status in ('pending','confirmed','waitlist','attended')
  ) then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;

  -- Anti-bot bàsic: màxim 5 reserves per telèfon en una hora
  select count(*) into v_recents
  from comunitat.reserves
  where telefon = p_telefon and created_at > now() - interval '1 hour';
  if v_recents >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limit');
  end if;

  select coalesce(sum(places), 0) into v_ocupades
  from comunitat.reserves
  where event_id = p_event_id and status in ('pending','confirmed','attended');

  if v_ev.estat = 'esgotat' then
    v_disponibles := 0;
  else
    v_disponibles := greatest(0, coalesce(v_ev.cupo, 0) - v_ocupades);
  end if;

  if p_places > v_disponibles then
    if not p_permet_espera then
      return jsonb_build_object('ok', false, 'error', 'sold_out', 'disponibles', v_disponibles);
    end if;
    v_status := 'waitlist';
  else
    v_status := 'pending';
  end if;

  insert into comunitat.reserves (
    id, event_id, nom, telefon, email, places, notes,
    preu_cents, total_cents, status, lang, consent_rgpd_at, consent_versio
  ) values (
    p_ref, p_event_id, p_nom, p_telefon, p_email, p_places, p_notes,
    coalesce(v_ev.preu_cents, 0), coalesce(v_ev.preu_cents, 0) * p_places,
    v_status, coalesce(p_lang, 'ca'),
    case when p_consent_versio is null then null else now() end,
    p_consent_versio
  );

  return jsonb_build_object(
    'ok', true,
    'reserva_id', p_ref,
    'status', v_status,
    'disponibles', greatest(0, v_disponibles - case when v_status = 'pending' then p_places else 0 end)
  );

exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ref_collision');
end $$;

-- ── 7. RPC ADMIN (amb actor per auditoria) ────────────────────
create or replace function comunitat.canviar_estat_reserva(
  p_id     text,
  p_status text,
  p_actor  text default 'admin',
  p_motiu  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', coalesce(p_motiu, ''), true);

  update comunitat.reserves set
    status       = p_status,
    confirmed_at = case when p_status = 'confirmed' and confirmed_at is null then now() else confirmed_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
  where id = p_id
  returning * into v_r;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

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
    data, hora, durada, cupo, preu_cents, tipo_iva, imatge, imatge_lloc,
    data_label, estat
  )
  select id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
         data, hora, durada, coalesce(cupo, 20), coalesce(preu_cents, 0),
         coalesce(tipo_iva, 'exempt'), imatge, imatge_lloc, data_label,
         coalesce(estat, 'proximament')
  from jsonb_populate_record(null::comunitat.events, p_event)
  on conflict (id) do update set
    tipo = excluded.tipo, titol = excluded.titol, descripcio = excluded.descripcio,
    entitat = excluded.entitat, ubicacio = excluded.ubicacio, mapa_url = excluded.mapa_url,
    data = excluded.data, hora = excluded.hora, durada = excluded.durada,
    cupo = excluded.cupo, preu_cents = excluded.preu_cents, tipo_iva = excluded.tipo_iva,
    imatge = excluded.imatge, imatge_lloc = excluded.imatge_lloc,
    data_label = excluded.data_label, estat = excluded.estat
  returning * into v_e;

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_e));
end $$;

create or replace function comunitat.admin_arxivar_event(
  p_id    text,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'arxivat des del panel', true);
  update comunitat.events set estat = 'arxivat' where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ── 8. PERMISOS (IMPORTANT) ───────────────────────────────────
-- Supabase exposa les funcions de l'esquema public via PostgREST, també al
-- rol anon. Sense això, qualsevol podria cridar les RPC d'admin des del
-- navegador. Només el backend (service_role) hi ha de poder accedir.
revoke execute on function comunitat.crear_reserva(text,text,text,text,text,integer,text,text,text,boolean) from public, anon, authenticated;
revoke execute on function comunitat.canviar_estat_reserva(text,text,text,text)                              from public, anon, authenticated;
revoke execute on function comunitat.admin_upsert_event(jsonb,text)                                          from public, anon, authenticated;
revoke execute on function comunitat.admin_arxivar_event(text,text)                                          from public, anon, authenticated;

grant execute on function comunitat.crear_reserva(text,text,text,text,text,integer,text,text,text,boolean) to service_role;
grant execute on function comunitat.canviar_estat_reserva(text,text,text,text)                              to service_role;
grant execute on function comunitat.admin_upsert_event(jsonb,text)                                          to service_role;
grant execute on function comunitat.admin_arxivar_event(text,text)                                          to service_role;

-- La taula d'auditoria no és consultable ni pels rols públics
revoke all on comunitat.auditoria from anon, authenticated;
grant select, insert on comunitat.auditoria to service_role;
grant usage, select on sequence comunitat.auditoria_id_seq to service_role;

-- ── 9. COMPROVACIÓ FINAL ──────────────────────────────────────
-- Executa aquestes dues línies per verificar que tot ha quedat instal·lat:
--   select proname from pg_proc where proname in
--     ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
--   select count(*) from comunitat.auditoria;


-- ── 10. PERMISOS DE L'ESQUEMA (ha d'anar al final) ────────────
-- Les taules i funcions ja existeixen: ara sí que es poden concedir.
grant all on all tables    in schema comunitat to service_role;
grant all on all sequences in schema comunitat to service_role;
grant all on all functions in schema comunitat to service_role;

alter default privileges in schema comunitat
  grant all on tables to service_role;
alter default privileges in schema comunitat
  grant all on sequences to service_role;

-- Blindatge: cap rol públic no hi arriba, encara que l'esquema
-- estigui exposat a PostgREST.
revoke all on all tables    in schema comunitat from anon, authenticated;
revoke all on all sequences in schema comunitat from anon, authenticated;

-- ── 11. COMPROVACIÓ ───────────────────────────────────────────
-- select table_name from information_schema.tables where table_schema = 'comunitat';
--   → events, reserves, recursos, auditoria
-- select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'comunitat';

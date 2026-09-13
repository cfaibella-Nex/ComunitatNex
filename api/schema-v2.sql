-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · MIGRACIÓ v2 (auditoria + reserves atòmiques)
--
-- Executa aquest fitxer SENCER una vegada a l'SQL Editor de Supabase,
-- DESPRÉS de schema.sql. És idempotent: es pot re-executar sense perill.
--
-- Decisions aplicades:
--  · Les reserves 'pending' bloquegen plaça indefinidament (fins cancel·lar)
--  · Tot canvi a events/reserves queda registrat a public.auditoria
--  · public.auditoria és NOMÉS D'INSERCIÓ (no es pot editar ni esborrar)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. COLUMNES NOVES A RESERVES ──────────────────────────────
alter table public.reserves
  add column if not exists consent_rgpd_at      timestamptz,
  add column if not exists consent_versio       text,
  add column if not exists payment_status       text not null default 'none',
  add column if not exists stripe_payment_intent text,
  add column if not exists import_pagat_cents   integer not null default 0,
  add column if not exists cancelled_at         timestamptz,
  add column if not exists updated_at           timestamptz not null default now();

-- Estat de pagament (preparat per Stripe, inactiu de moment)
alter table public.reserves drop constraint if exists reserves_payment_status_check;
alter table public.reserves add constraint reserves_payment_status_check
  check (payment_status in ('none','pending','paid','refunded','failed'));

-- Nou estat: waitlist (llista d'espera)
alter table public.reserves drop constraint if exists reserves_status_check;
alter table public.reserves add constraint reserves_status_check
  check (status in ('pending','confirmed','waitlist','cancelled','attended','no-show'));

-- updated_at automàtic també a reserves
drop trigger if exists trg_reserves_updated on public.reserves;
create trigger trg_reserves_updated before update on public.reserves
  for each row execute function public.set_updated_at();

create index if not exists idx_reserves_tel_recent on public.reserves (telefon, created_at desc);

-- ── 2. TAULA D'AUDITORIA ──────────────────────────────────────
create table if not exists public.auditoria (
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

create index if not exists idx_auditoria_registre on public.auditoria (taula, registre_id, created_at desc);
create index if not exists idx_auditoria_data     on public.auditoria (created_at desc);

alter table public.auditoria enable row level security;
-- Sense cap policy: anon no hi pot accedir. Només el backend (service_role).

-- ── 3. IMMUTABILITAT DE L'AUDITORIA ───────────────────────────
-- Bloqueja UPDATE i DELETE fins i tot amb service_role. Si algun dia cal
-- purgar per retenció, s'ha de desactivar el trigger explícitament.
create or replace function public.fn_auditoria_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'public.auditoria és només d''inserció (registre d''auditoria)';
end $$;

drop trigger if exists trg_auditoria_immutable on public.auditoria;
create trigger trg_auditoria_immutable
  before update or delete on public.auditoria
  for each row execute function public.fn_auditoria_immutable();

-- ── 4. TRIGGER GENÈRIC D'AUDITORIA ────────────────────────────
create or replace function public.fn_auditoria()
returns trigger
language plpgsql
security definer
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
    insert into public.auditoria (taula, registre_id, accio, actor, motiu, fila_despres)
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

    insert into public.auditoria (taula, registre_id, accio, actor, motiu, canvis, fila_abans, fila_despres)
    values (tg_table_name, new.id::text, 'update', v_actor, v_motiu, v_canvis, v_abans, v_despres);
    return new;

  else
    insert into public.auditoria (taula, registre_id, accio, actor, motiu, fila_abans)
    values (tg_table_name, old.id::text, 'delete', v_actor, v_motiu, to_jsonb(old));
    return old;
  end if;
end $$;

drop trigger if exists trg_auditoria_reserves on public.reserves;
create trigger trg_auditoria_reserves
  after insert or update or delete on public.reserves
  for each row execute function public.fn_auditoria();

drop trigger if exists trg_auditoria_events on public.events;
create trigger trg_auditoria_events
  after insert or update or delete on public.events
  for each row execute function public.fn_auditoria();

-- ── 5. OCUPACIÓ: pending bloqueja plaça sempre ────────────────
-- Es manté el paràmetre p_hold_min per no trencar les crides existents,
-- però s'ignora (decisió: les pendents compten fins que es cancel·len).
create or replace function public.places_ocupades(
  p_event_id text,
  p_hold_min integer default 60
)
returns integer language sql stable as $$
  select coalesce(sum(places), 0)::int
  from public.reserves
  where event_id = p_event_id
    and status in ('pending','confirmed','attended');
$$;

create or replace function public.places_ocupades_totes(
  p_hold_min integer default 60
)
returns table (event_id text, places integer)
language sql stable as $$
  select r.event_id, coalesce(sum(r.places), 0)::int
  from public.reserves r
  where r.status in ('pending','confirmed','attended')
  group by r.event_id;
$$;

-- ── 6. RESERVA ATÒMICA ────────────────────────────────────────
-- Bloqueja la fila de l'event (FOR UPDATE): comprovació d'aforament i
-- inserció dins la MATEIXA transacció. Impossible passar-se del cupo.
create or replace function public.crear_reserva(
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
as $$
declare
  v_ev          public.events%rowtype;
  v_ocupades    integer;
  v_disponibles integer;
  v_recents     integer;
  v_status      text;
begin
  perform set_config('app.actor', 'web-publica', true);

  select * into v_ev from public.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'event_not_found');
  end if;
  if v_ev.estat = 'arxivat' then
    return jsonb_build_object('ok', false, 'error', 'event_unavailable');
  end if;

  -- Anti-duplicat: mateix telèfon ja té reserva viva en aquest event
  if exists (
    select 1 from public.reserves
    where event_id = p_event_id
      and telefon  = p_telefon
      and status in ('pending','confirmed','waitlist','attended')
  ) then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;

  -- Anti-bot bàsic: màxim 5 reserves per telèfon en una hora
  select count(*) into v_recents
  from public.reserves
  where telefon = p_telefon and created_at > now() - interval '1 hour';
  if v_recents >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limit');
  end if;

  select coalesce(sum(places), 0) into v_ocupades
  from public.reserves
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

  insert into public.reserves (
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
create or replace function public.canviar_estat_reserva(
  p_id     text,
  p_status text,
  p_actor  text default 'admin',
  p_motiu  text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare v_r public.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', coalesce(p_motiu, ''), true);

  update public.reserves set
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

create or replace function public.admin_upsert_event(
  p_event jsonb,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
as $$
declare v_e public.events%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);

  insert into public.events as e (
    id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
    data, hora, durada, cupo, preu_cents, tipo_iva, imatge, estat
  )
  select id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
         data, hora, durada, coalesce(cupo, 20), coalesce(preu_cents, 0),
         coalesce(tipo_iva, 'exempt'), imatge, coalesce(estat, 'proximament')
  from jsonb_populate_record(null::public.events, p_event)
  on conflict (id) do update set
    tipo = excluded.tipo, titol = excluded.titol, descripcio = excluded.descripcio,
    entitat = excluded.entitat, ubicacio = excluded.ubicacio, mapa_url = excluded.mapa_url,
    data = excluded.data, hora = excluded.hora, durada = excluded.durada,
    cupo = excluded.cupo, preu_cents = excluded.preu_cents, tipo_iva = excluded.tipo_iva,
    imatge = excluded.imatge, estat = excluded.estat
  returning * into v_e;

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_e));
end $$;

create or replace function public.admin_arxivar_event(
  p_id    text,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
as $$
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'arxivat des del panel', true);
  update public.events set estat = 'arxivat' where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ── 8. PERMISOS (IMPORTANT) ───────────────────────────────────
-- Supabase exposa les funcions de l'esquema public via PostgREST, també al
-- rol anon. Sense això, qualsevol podria cridar les RPC d'admin des del
-- navegador. Només el backend (service_role) hi ha de poder accedir.
revoke execute on function public.crear_reserva(text,text,text,text,text,integer,text,text,text,boolean) from public, anon, authenticated;
revoke execute on function public.canviar_estat_reserva(text,text,text,text)                              from public, anon, authenticated;
revoke execute on function public.admin_upsert_event(jsonb,text)                                          from public, anon, authenticated;
revoke execute on function public.admin_arxivar_event(text,text)                                          from public, anon, authenticated;

grant execute on function public.crear_reserva(text,text,text,text,text,integer,text,text,text,boolean) to service_role;
grant execute on function public.canviar_estat_reserva(text,text,text,text)                              to service_role;
grant execute on function public.admin_upsert_event(jsonb,text)                                          to service_role;
grant execute on function public.admin_arxivar_event(text,text)                                          to service_role;

-- La taula d'auditoria no és consultable ni pels rols públics
revoke all on public.auditoria from anon, authenticated;
grant select, insert on public.auditoria to service_role;
grant usage, select on sequence public.auditoria_id_seq to service_role;

-- ── 9. COMPROVACIÓ FINAL ──────────────────────────────────────
-- Executa aquestes dues línies per verificar que tot ha quedat instal·lat:
--   select proname from pg_proc where proname in
--     ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
--   select count(*) from public.auditoria;

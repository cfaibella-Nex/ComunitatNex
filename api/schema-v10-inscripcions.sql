-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · MIGRACIÓ v10 — inscripcions al nivell de BookingFEB
--
-- Què afegeix:
--   · Tres models d'inscripció: puntual · mensual · trimestral
--   · Tarifes (nivells) per activitat, cadascuna amb preu fix, gratuït
--     o a consultar, i places pròpies opcionals
--   · Extres: mesos (activitats mensuals), sessions vinculades (una
--     altra activitat, que ocupa plaça allà) i extres genèrics
--   · Com es cobra cada activitat: reserva · presencial · online
--   · Pagament amb Stripe (queda apagat fins que hi hagi claus)
--
-- Requereix schema-full.sql ja executat. És idempotent: es pot tornar
-- a executar sense perill. Les activitats i reserves existents no es
-- toquen: una activitat sense tarifes continua funcionant com ara
-- (una sola tarifa amb el preu de sempre).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. EVENTS: model, cobrament, tarifes i extres ─────────────
alter table comunitat.events
  add column if not exists model    text  not null default 'puntual',
  add column if not exists pagament text  not null default 'reserva',
  add column if not exists tarifes  jsonb not null default '[]'::jsonb,
  add column if not exists extres   jsonb not null default '[]'::jsonb;

alter table comunitat.events drop constraint if exists events_model_check;
alter table comunitat.events add constraint events_model_check
  check (model in ('puntual','mensual','trimestral'));

alter table comunitat.events drop constraint if exists events_pagament_check;
alter table comunitat.events add constraint events_pagament_check
  check (pagament in ('reserva','presencial','online'));

alter table comunitat.events drop constraint if exists events_tarifes_array;
alter table comunitat.events add constraint events_tarifes_array
  check (jsonb_typeof(tarifes) = 'array' and jsonb_typeof(extres) = 'array');

-- ── 2. RESERVES: línies, vincle pare-fill i pagament ──────────
-- linies     → què s'ha triat, amb el preu del moment (foto fixa: si
--              demà canvia el preu, la reserva d'avui no es mou)
-- pare_id    → reserva d'una sessió vinculada: apunta a la principal
-- consultar  → hi ha alguna línia amb preu a consultar
-- mode_pagament → com s'havia de cobrar quan es va fer
alter table comunitat.reserves
  add column if not exists linies         jsonb   not null default '[]'::jsonb,
  add column if not exists pare_id        text,
  add column if not exists consultar      boolean not null default false,
  add column if not exists mode_pagament  text,
  add column if not exists stripe_session text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reserves_pare_fk') then
    alter table comunitat.reserves
      add constraint reserves_pare_fk foreign key (pare_id)
      references comunitat.reserves(id) on delete restrict;
  end if;
end $$;

create index if not exists idx_reserves_pare    on comunitat.reserves (pare_id)        where pare_id is not null;
create index if not exists idx_reserves_session on comunitat.reserves (stripe_session) where stripe_session is not null;

-- ── 3. NOTIFICACIONS DE PAGAMENT (idempotència) ───────────────
-- Stripe reenvia cada avís fins que rep un 200. El segon ha de ser
-- un no-res: la clau primària ho garanteix.
create table if not exists comunitat.notificacions (
  id         text primary key,          -- id de l'event de Stripe
  proveidor  text not null,
  tipus      text,
  rebuda     timestamptz not null default now()
);
alter table comunitat.notificacions enable row level security;

-- ── 4. OCUPACIÓ PER TARIFA ────────────────────────────────────
-- Només compten les reserves vives. Les reserves antigues (sense
-- línies) compten per a l'activitat però no per a cap nivell.
create or replace function comunitat.places_tarifa(p_event_id text, p_tarifa_id text)
returns integer language sql stable as $$
  select coalesce(sum((l->>'qty')::int), 0)::int
  from comunitat.reserves r
  cross join lateral jsonb_array_elements(r.linies) l
  where r.event_id = p_event_id
    and r.status in ('pending','confirmed','attended')
    and l->>'tipus' = 'tarifa'
    and l->>'id' = p_tarifa_id;
$$;

create or replace function comunitat.ocupacio_tarifes_totes()
returns table (event_id text, tarifa_id text, places integer)
language sql stable as $$
  select r.event_id, l->>'id', coalesce(sum((l->>'qty')::int), 0)::int
  from comunitat.reserves r
  cross join lateral jsonb_array_elements(r.linies) l
  where r.status in ('pending','confirmed','attended')
    and l->>'tipus' = 'tarifa'
  group by r.event_id, l->>'id';
$$;

-- ── 5. RESERVA ATÒMICA v2 ─────────────────────────────────────
-- El preu el calcula el servidor (api/reserva.js) a partir de la
-- base de dades; aquí es comprova l'aforament de TOT dins la mateixa
-- transacció: l'activitat, cada nivell i cada sessió vinculada.
-- Les files queden bloquejades (FOR UPDATE) fins al final: dues
-- persones que agafen l'última plaça alhora no poden passar totes dues.
create or replace function comunitat.crear_reserva_v2(
  p_ref             text,
  p_event_id        text,
  p_nom             text,
  p_telefon         text,
  p_email           text,
  p_notes           text,
  p_lang            text,
  p_consent_versio  text,
  p_linies          jsonb,     -- detall complet calculat pel servidor
  p_places          integer,   -- suma de les tarifes
  p_total_cents     integer,
  p_consultar       boolean,
  p_mode_pagament   text,
  p_payment_status  text,      -- 'none' | 'pending'
  p_sessions        jsonb,     -- [{ "event_id": "...", "qty": n, "extra_id": "..." }]
  p_permet_espera   boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare
  v_ev          comunitat.events%rowtype;
  v_sev         comunitat.events%rowtype;
  v_ocupades    integer;
  v_disponibles integer;
  v_recents     integer;
  v_status      text;
  v_linia       jsonb;
  v_cfg         jsonb;
  v_ple_nivell  boolean := false;
  v_s           jsonb;
  v_sdisp       integer;
  v_i           integer := 0;
  v_fills       text[] := '{}';
  v_fill_id     text;
begin
  perform set_config('app.actor', 'web-publica', true);

  select * into v_ev from comunitat.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'event_not_found');
  end if;
  if v_ev.estat = 'arxivat' then
    return jsonb_build_object('ok', false, 'error', 'event_unavailable');
  end if;

  -- Anti-duplicat: mateix telèfon amb reserva viva en aquesta activitat
  if exists (
    select 1 from comunitat.reserves
    where event_id = p_event_id and telefon = p_telefon
      and status in ('pending','confirmed','waitlist','attended')
  ) then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;

  -- Anti-bot bàsic: màxim 5 reserves per telèfon i hora
  select count(*) into v_recents
  from comunitat.reserves
  where telefon = p_telefon and created_at > now() - interval '1 hour';
  if v_recents >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limit');
  end if;

  -- Aforament de l'activitat
  select coalesce(sum(places), 0) into v_ocupades
  from comunitat.reserves
  where event_id = p_event_id and status in ('pending','confirmed','attended');

  v_disponibles := case when v_ev.estat = 'esgotat' then 0
                        else greatest(0, coalesce(v_ev.cupo, 0) - v_ocupades) end;

  -- Aforament de cada nivell (només si el nivell en té de propi)
  for v_linia in select * from jsonb_array_elements(coalesce(p_linies, '[]'::jsonb)) loop
    continue when v_linia->>'tipus' is distinct from 'tarifa';
    select t.value into v_cfg
    from jsonb_array_elements(v_ev.tarifes) as t(value)
    where t.value->>'id' = v_linia->>'id'
    limit 1;
    continue when v_cfg is null;

    if v_cfg->>'estat' = 'complet' then
      return jsonb_build_object('ok', false, 'error', 'tarifa_completa', 'tarifa', v_linia->>'id');
    end if;
    if coalesce(v_cfg->>'places', '') ~ '^[0-9]+$' then
      if (v_linia->>'qty')::int >
         greatest(0, (v_cfg->>'places')::int - comunitat.places_tarifa(p_event_id, v_linia->>'id')) then
        v_ple_nivell := true;
      end if;
    end if;
  end loop;

  if p_places > v_disponibles or v_ple_nivell then
    if not p_permet_espera then
      return jsonb_build_object('ok', false, 'error', 'sold_out', 'disponibles', v_disponibles);
    end if;
    v_status := 'waitlist';
  else
    v_status := 'pending';
  end if;

  -- Sessions vinculades: es comproven TOTES abans d'inserir res
  for v_s in select * from jsonb_array_elements(coalesce(p_sessions, '[]'::jsonb)) loop
    select * into v_sev from comunitat.events where id = v_s->>'event_id' for update;
    if not found or v_sev.estat = 'arxivat' then
      return jsonb_build_object('ok', false, 'error', 'sessio_no_disponible', 'event', v_s->>'event_id');
    end if;
    if exists (
      select 1 from comunitat.reserves
      where event_id = v_sev.id and telefon = p_telefon
        and status in ('pending','confirmed','waitlist','attended')
    ) then
      return jsonb_build_object('ok', false, 'error', 'sessio_duplicada', 'event', v_sev.id);
    end if;
    if v_status = 'pending' then
      select greatest(0, coalesce(v_sev.cupo, 0) - coalesce(sum(places), 0)) into v_sdisp
      from comunitat.reserves
      where event_id = v_sev.id and status in ('pending','confirmed','attended');
      if v_sev.estat = 'esgotat' then v_sdisp := 0; end if;
      if (v_s->>'qty')::int > v_sdisp then
        return jsonb_build_object('ok', false, 'error', 'sessio_completa', 'event', v_sev.id, 'disponibles', v_sdisp);
      end if;
    end if;
  end loop;

  insert into comunitat.reserves (
    id, event_id, nom, telefon, email, places, notes,
    preu_cents, total_cents, status, lang, consent_rgpd_at, consent_versio,
    linies, consultar, mode_pagament, payment_status
  ) values (
    p_ref, p_event_id, p_nom, p_telefon, p_email, p_places, p_notes,
    coalesce(v_ev.preu_cents, 0), coalesce(p_total_cents, 0), v_status, coalesce(p_lang, 'ca'),
    case when p_consent_versio is null then null else now() end, p_consent_versio,
    coalesce(p_linies, '[]'::jsonb), coalesce(p_consultar, false), p_mode_pagament,
    case when v_status = 'pending' then coalesce(p_payment_status, 'none') else 'none' end
  );

  -- Una reserva filla per sessió vinculada: ocupa plaça a l'altra
  -- activitat i surt a les seves reserves. El preu va a la principal.
  for v_s in select * from jsonb_array_elements(coalesce(p_sessions, '[]'::jsonb)) loop
    v_i := v_i + 1;
    v_fill_id := p_ref || '-' || chr(64 + v_i);   -- NX-XXXXXX-A, -B…
    insert into comunitat.reserves (
      id, event_id, nom, telefon, email, places, notes,
      preu_cents, total_cents, status, lang, consent_rgpd_at, consent_versio,
      linies, consultar, mode_pagament, payment_status, pare_id
    ) values (
      v_fill_id, v_s->>'event_id', p_nom, p_telefon, p_email, (v_s->>'qty')::int, p_notes,
      0, 0, v_status, coalesce(p_lang, 'ca'),
      case when p_consent_versio is null then null else now() end, p_consent_versio,
      jsonb_build_array(jsonb_build_object('tipus', 'sessio', 'id', v_s->>'extra_id',
                                           'qty', (v_s->>'qty')::int, 'pare', p_ref)),
      false, p_mode_pagament, 'none', p_ref
    );
    v_fills := array_append(v_fills, v_fill_id);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'reserva_id', p_ref,
    'status', v_status,
    'sessions', to_jsonb(v_fills),
    'disponibles', greatest(0, v_disponibles - case when v_status = 'pending' then p_places else 0 end)
  );

exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ref_collision');
end $$;

-- ── 6. RESULTAT DEL PAGAMENT ──────────────────────────────────
-- Només l'avís signat de Stripe crida aquesta funció. Només actua
-- sobre reserves amb el pagament pendent: un segon avís no fa res.
--   paid   → pagada i confirmada (també les sessions vinculades)
--   failed → cancel·lada: la plaça s'allibera de seguida
create or replace function comunitat.marcar_pagament(
  p_ref         text,
  p_resultat    text,
  p_payment_ref text default null,
  p_import      integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare v_n integer;
begin
  perform set_config('app.actor', 'stripe', true);

  if p_resultat = 'paid' then
    perform set_config('app.motiu', 'pagament rebut', true);
    update comunitat.reserves set
      payment_status        = 'paid',
      import_pagat_cents    = coalesce(p_import, total_cents),
      stripe_payment_intent = coalesce(p_payment_ref, stripe_payment_intent),
      status       = case when status = 'pending' then 'confirmed' else status end,
      confirmed_at = coalesce(confirmed_at, now())
    where id = p_ref and payment_status = 'pending';
    get diagnostics v_n = row_count;
    if v_n > 0 then
      update comunitat.reserves set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
      where pare_id = p_ref and status = 'pending';
    end if;

  elsif p_resultat = 'failed' then
    perform set_config('app.motiu', 'pagament no completat', true);
    update comunitat.reserves set
      payment_status = 'failed', status = 'cancelled', cancelled_at = now()
    where id = p_ref and payment_status = 'pending';
    get diagnostics v_n = row_count;
    if v_n > 0 then
      update comunitat.reserves set status = 'cancelled', cancelled_at = now()
      where pare_id = p_ref and status in ('pending','waitlist');
    end if;

  else
    return jsonb_build_object('ok', false, 'error', 'resultat_no_valid');
  end if;

  return jsonb_build_object('ok', true, 'canviat', v_n > 0);
end $$;

-- ── 7. ALTA/EDICIÓ D'ACTIVITATS amb els camps nous ────────────
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
    data_label, estat, model, pagament, tarifes, extres
  )
  select id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
         data, hora, durada, coalesce(cupo, 20), coalesce(preu_cents, 0),
         coalesce(tipo_iva, 'exempt'), imatge, imatge_lloc, data_label,
         coalesce(estat, 'proximament'),
         coalesce(model, 'puntual'), coalesce(pagament, 'reserva'),
         coalesce(tarifes, '[]'::jsonb), coalesce(extres, '[]'::jsonb)
  from jsonb_populate_record(null::comunitat.events, p_event)
  on conflict (id) do update set
    tipo = excluded.tipo, titol = excluded.titol, descripcio = excluded.descripcio,
    entitat = excluded.entitat, ubicacio = excluded.ubicacio, mapa_url = excluded.mapa_url,
    data = excluded.data, hora = excluded.hora, durada = excluded.durada,
    cupo = excluded.cupo, preu_cents = excluded.preu_cents, tipo_iva = excluded.tipo_iva,
    imatge = excluded.imatge, imatge_lloc = excluded.imatge_lloc,
    data_label = excluded.data_label, estat = excluded.estat,
    model = excluded.model, pagament = excluded.pagament,
    tarifes = excluded.tarifes, extres = excluded.extres
  returning * into v_e;

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_e));
end $$;

-- ── 8. PERMISOS ───────────────────────────────────────────────
revoke execute on function comunitat.crear_reserva_v2(text,text,text,text,text,text,text,text,jsonb,integer,integer,boolean,text,text,jsonb,boolean) from public, anon, authenticated;
revoke execute on function comunitat.marcar_pagament(text,text,text,integer)  from public, anon, authenticated;
revoke execute on function comunitat.admin_upsert_event(jsonb,text)           from public, anon, authenticated;
revoke execute on function comunitat.places_tarifa(text,text)                 from public, anon, authenticated;
revoke execute on function comunitat.ocupacio_tarifes_totes()                 from public, anon, authenticated;

grant execute on function comunitat.crear_reserva_v2(text,text,text,text,text,text,text,text,jsonb,integer,integer,boolean,text,text,jsonb,boolean) to service_role;
grant execute on function comunitat.marcar_pagament(text,text,text,integer)  to service_role;
grant execute on function comunitat.admin_upsert_event(jsonb,text)           to service_role;
grant execute on function comunitat.places_tarifa(text,text)                 to service_role;
grant execute on function comunitat.ocupacio_tarifes_totes()                 to service_role;

grant all on comunitat.notificacions to service_role;
revoke all on comunitat.notificacions from anon, authenticated;

-- ── 9. COMPROVACIÓ ────────────────────────────────────────────
-- Ha de tornar 4 files:
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'comunitat'
--     and proname in ('crear_reserva_v2','marcar_pagament','places_tarifa','ocupacio_tarifes_totes');
--
-- I aquestes columnes han d'existir:
--   select model, pagament, tarifes, extres from comunitat.events limit 1;

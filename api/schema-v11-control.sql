-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · MIGRACIÓ v11 — control intern
--
--   · Cobraments registrats des del panell (efectiu, Bizum, transferència…)
--   · Link de pagament amb targeta per a una reserva concreta, que
--     l'equip envia per on vulgui (la web no envia res a ningú)
--   · Passar llista per dia: també serveix per a activitats mensuals,
--     on cada setmana hi ha una sessió
--
-- Requereix schema-v10-inscripcions.sql. És idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. RESERVES: dades del cobrament ──────────────────────────
alter table comunitat.reserves
  add column if not exists metode_pagament     text,
  add column if not exists pagat_at            timestamptz,
  add column if not exists import_cobrar_cents integer,       -- null = total_cents
  add column if not exists link_pagament       text,
  add column if not exists link_caduca         timestamptz;

alter table comunitat.reserves drop constraint if exists reserves_metode_check;
alter table comunitat.reserves add constraint reserves_metode_check
  check (metode_pagament is null or metode_pagament in ('targeta','efectiu','bizum','transferencia','altres'));

alter table comunitat.reserves drop constraint if exists reserves_import_cobrar_check;
alter table comunitat.reserves add constraint reserves_import_cobrar_check
  check (import_cobrar_cents is null or import_cobrar_cents >= 0);

-- ── 2. ASSISTÈNCIA PER DIA ────────────────────────────────────
create table if not exists comunitat.assistencia (
  id          bigserial primary key,
  reserva_id  text not null references comunitat.reserves(id) on delete cascade,
  data        date not null,
  present     boolean not null,
  actor       text not null default 'admin',
  updated_at  timestamptz not null default now(),
  unique (reserva_id, data)
);
create index if not exists idx_assistencia_data on comunitat.assistencia (data);
alter table comunitat.assistencia enable row level security;

drop trigger if exists trg_auditoria_assistencia on comunitat.assistencia;
create trigger trg_auditoria_assistencia
  after insert or update or delete on comunitat.assistencia
  for each row execute function comunitat.fn_auditoria();

-- ── 3. REGISTRAR UN COBRAMENT FET FORA DE LA WEB ──────────────
create or replace function comunitat.admin_registrar_pagament(
  p_id     text,
  p_import integer,
  p_metode text,
  p_actor  text default 'admin',
  p_nota   text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  if p_import is null or p_import < 0 then
    return jsonb_build_object('ok', false, 'error', 'import_no_valid');
  end if;
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', coalesce('cobrament ' || p_metode || coalesce(': ' || p_nota, ''), ''), true);

  update comunitat.reserves set
    payment_status      = 'paid',
    import_pagat_cents  = p_import,
    metode_pagament     = p_metode,
    pagat_at            = now(),
    link_pagament       = null,
    link_caduca         = null,
    status       = case when status = 'pending' then 'confirmed' else status end,
    confirmed_at = coalesce(confirmed_at, now())
  where id = p_id and status not in ('cancelled')
  returning * into v_r;

  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

-- ── 4. DESFER UN COBRAMENT (errors en el registre) ────────────
-- No retorna diners a Stripe: això es fa des del tauler de Stripe.
create or replace function comunitat.admin_anular_pagament(
  p_id    text,
  p_actor text default 'admin',
  p_motiu text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', coalesce(p_motiu, 'cobrament anul·lat'), true);
  update comunitat.reserves set
    payment_status = 'none', import_pagat_cents = 0,
    metode_pagament = null, pagat_at = null
  where id = p_id and payment_status = 'paid'
  returning * into v_r;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_pagada'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

-- ── 5. LINK DE PAGAMENT ───────────────────────────────────────
-- Es desa quan el servidor ja ha creat la sessió a Stripe. Mentre el
-- link és viu, la reserva queda "pendent de pagar" però NO es cancel·la
-- si caduca: només torna a "sense pagar".
create or replace function comunitat.admin_desar_link(
  p_id      text,
  p_import  integer,
  p_session text,
  p_url     text,
  p_caduca  timestamptz,
  p_actor   text default 'admin'
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'link de pagament generat', true);
  update comunitat.reserves set
    payment_status      = 'pending',
    import_cobrar_cents = p_import,
    stripe_session      = p_session,
    link_pagament       = p_url,
    link_caduca         = p_caduca
  where id = p_id and payment_status <> 'paid' and status not in ('cancelled')
  returning * into v_r;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_es_pot'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

-- ── 6. RESULTAT DEL PAGAMENT (substitueix la de v10) ──────────
-- Nou resultat 'caducat_link': el link ha caducat sense pagar.
-- Només actua si la sessió que caduca és la vigent: si l'equip n'ha
-- generat una de nova, la vella no desfà res.
create or replace function comunitat.marcar_pagament(
  p_ref         text,
  p_resultat    text,
  p_payment_ref text default null,
  p_import      integer default null,
  p_session     text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_n integer := 0;
begin
  perform set_config('app.actor', 'stripe', true);

  if p_resultat = 'paid' then
    perform set_config('app.motiu', 'pagament rebut', true);
    update comunitat.reserves set
      payment_status        = 'paid',
      import_pagat_cents    = coalesce(p_import, import_cobrar_cents, total_cents),
      stripe_payment_intent = coalesce(p_payment_ref, stripe_payment_intent),
      metode_pagament       = 'targeta',
      pagat_at              = now(),
      link_pagament = null, link_caduca = null,
      status       = case when status = 'pending' then 'confirmed' else status end,
      confirmed_at = coalesce(confirmed_at, now())
    where id = p_ref and payment_status = 'pending';
    get diagnostics v_n = row_count;
    if v_n > 0 then
      update comunitat.reserves set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
      where pare_id = p_ref and status = 'pending';
    end if;

  elsif p_resultat = 'failed' then
    -- Pagament de la web que no s'ha completat: s'allibera la plaça
    perform set_config('app.motiu', 'pagament no completat', true);
    update comunitat.reserves set
      payment_status = 'failed', status = 'cancelled', cancelled_at = now()
    where id = p_ref and payment_status = 'pending' and link_pagament is null;
    get diagnostics v_n = row_count;
    if v_n > 0 then
      update comunitat.reserves set status = 'cancelled', cancelled_at = now()
      where pare_id = p_ref and status in ('pending','waitlist');
    end if;

  elsif p_resultat = 'caducat_link' then
    perform set_config('app.motiu', 'link de pagament caducat', true);
    update comunitat.reserves set
      payment_status = 'none', link_pagament = null, link_caduca = null
    where id = p_ref and payment_status = 'pending'
      and (p_session is null or stripe_session = p_session);
    get diagnostics v_n = row_count;

  else
    return jsonb_build_object('ok', false, 'error', 'resultat_no_valid');
  end if;

  return jsonb_build_object('ok', true, 'canviat', v_n > 0);
end $$;

-- La versió de 4 paràmetres de v10 queda substituïda per aquesta
drop function if exists comunitat.marcar_pagament(text,text,text,integer);

-- ── 7. PASSAR LLISTA ──────────────────────────────────────────
-- p_present: true (ha vingut) · false (no ha vingut) · null (esborrar)
-- Si el dia és el de l'activitat, l'estat de la reserva també canvia
-- (Va assistir / No va venir): així els comptes de sempre quadren.
create or replace function comunitat.admin_marcar_assistencia(
  p_reserva text,
  p_data    date,
  p_present boolean,
  p_actor   text default 'admin'
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare
  v_r  comunitat.reserves%rowtype;
  v_ev comunitat.events%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);

  select * into v_r from comunitat.reserves where id = p_reserva;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_r.status in ('cancelled','waitlist') then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_activa');
  end if;
  select * into v_ev from comunitat.events where id = v_r.event_id;

  if p_present is null then
    delete from comunitat.assistencia where reserva_id = p_reserva and data = p_data;
  else
    insert into comunitat.assistencia (reserva_id, data, present, actor)
    values (p_reserva, p_data, p_present, coalesce(p_actor, 'admin'))
    on conflict (reserva_id, data) do update
      set present = excluded.present, actor = excluded.actor, updated_at = now();
  end if;

  if v_ev.data is not null and v_ev.data::date = p_data and coalesce(v_ev.model, 'puntual') = 'puntual' then
    update comunitat.reserves set status = case
        when p_present is true  then 'attended'
        when p_present is false then 'no-show'
        else 'confirmed' end,
      confirmed_at = coalesce(confirmed_at, now())
    where id = p_reserva;
  end if;

  return jsonb_build_object('ok', true);
end $$;

-- ── 8. PERMISOS ───────────────────────────────────────────────
revoke execute on function comunitat.admin_registrar_pagament(text,integer,text,text,text) from public, anon, authenticated;
revoke execute on function comunitat.admin_anular_pagament(text,text,text)                 from public, anon, authenticated;
revoke execute on function comunitat.admin_desar_link(text,integer,text,text,timestamptz,text) from public, anon, authenticated;
revoke execute on function comunitat.marcar_pagament(text,text,text,integer,text)          from public, anon, authenticated;
revoke execute on function comunitat.admin_marcar_assistencia(text,date,boolean,text)       from public, anon, authenticated;

grant execute on function comunitat.admin_registrar_pagament(text,integer,text,text,text) to service_role;
grant execute on function comunitat.admin_anular_pagament(text,text,text)                 to service_role;
grant execute on function comunitat.admin_desar_link(text,integer,text,text,timestamptz,text) to service_role;
grant execute on function comunitat.marcar_pagament(text,text,text,integer,text)          to service_role;
grant execute on function comunitat.admin_marcar_assistencia(text,date,boolean,text)       to service_role;

grant all on comunitat.assistencia to service_role;
grant usage, select on sequence comunitat.assistencia_id_seq to service_role;
revoke all on comunitat.assistencia from anon, authenticated;

-- ── 9. COMPROVACIÓ ────────────────────────────────────────────
--   select link_pagament, metode_pagament from comunitat.reserves limit 1;
--   select count(*) from comunitat.assistencia;

-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · 09 — Baixa i esborrat de dades personals
--
-- La política diu: "quan et dones de baixa de l'activitat o aquesta
-- s'acaba, les eliminem". Aquest fitxer ho fa possible:
--
--   admin_baixa_esborrar(id)        una persona (i les seves sessions vinculades)
--   admin_esborrar_activitat(event) totes les inscripcions d'una activitat
--                                   arxivada o ja passada
--
-- Què s'esborra: nom, telèfon, correu, contacte, observacions i notes,
-- a la reserva I a l'auditoria (que guarda el valor d'abans de cada
-- canvi). Què es conserva: activitat, places, assistència i la prova
-- d'haver informat, sense identificar ningú. Si havia PAGAT, es
-- conserva el nom i l'import (obligació fiscal); la resta s'esborra.
--
-- L'auditoria continua sent immutable per a tothom: només aquestes dues
-- funcions poden treure-hi dades personals, i ho deixen anotat.
-- Requereix 00–08. És idempotent.
-- ═══════════════════════════════════════════════════════════════

alter table comunitat.reserves
  add column if not exists esborrat_at  timestamptz,
  add column if not exists esborrat_per text;

-- ── 1. Auditoria: immutable, excepte l'esborrat RGPD ──────────
create or replace function comunitat.fn_auditoria_immutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and current_setting('app.esborrat_rgpd', true) = 'on' then
    return new;          -- només des de les funcions d'esborrat (més avall)
  end if;
  raise exception 'comunitat.auditoria és només d''inserció (registre d''auditoria)';
end $$;

-- ── 2. El trigger d'auditoria no desa el valor d'abans en un esborrat ──
create or replace function comunitat.fn_auditoria()
returns trigger
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare
  v_actor   text  := coalesce(nullif(current_setting('app.actor', true), ''), 'sistema');
  v_motiu   text  := nullif(current_setting('app.motiu', true), '');
  v_esborrat boolean := current_setting('app.esborrat_rgpd', true) = 'on';
  v_personals text[] := array['nom','telefon','email','contacte','observacions','notes'];
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
               when v_esborrat and k = any(v_personals) then '"esborrat"'::jsonb
               else jsonb_build_object('abans', v_abans -> k, 'despres', v_despres -> k) end);
      end if;
    end loop;
    if v_canvis = '{}'::jsonb then return new; end if;
    insert into comunitat.auditoria (taula, registre_id, accio, actor, motiu, canvis, fila_abans, fila_despres)
    values (tg_table_name, new.id::text, 'update', v_actor, v_motiu, v_canvis,
            case when v_esborrat then null else v_abans - 'hash' end,
            v_despres - 'hash');
    return new;

  else
    insert into comunitat.auditoria (taula, registre_id, accio, actor, motiu, fila_abans)
    values (tg_table_name, old.id::text, 'delete', v_actor, v_motiu, to_jsonb(old) - 'hash');
    return old;
  end if;
end $$;

-- ── 3. Baixa + esborrat d'una persona ─────────────────────────
create or replace function comunitat.admin_baixa_esborrar(
  p_id    text,
  p_actor text,
  p_motiu text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare
  v_r       comunitat.reserves%rowtype;
  v_ids     text[];
  v_pagat   boolean;
  v_claus   text[];
  v_n       integer := 0;
begin
  select * into v_r from comunitat.reserves where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_trobada'); end if;
  if v_r.esborrat_at is not null then return jsonb_build_object('ok', false, 'error', 'ja_esborrada'); end if;

  -- La principal i les seves sessions vinculades (si és una filla, la mare i germanes)
  select array_agg(id) into v_ids from comunitat.reserves
  where id = coalesce(v_r.pare_id, v_r.id) or pare_id = coalesce(v_r.pare_id, v_r.id);

  select bool_or(payment_status = 'paid') into v_pagat from comunitat.reserves where id = any(v_ids);
  v_claus := case when v_pagat
                  then array['telefon','email','contacte','observacions','notes']        -- es conserva el nom (fiscal)
                  else array['nom','telefon','email','contacte','observacions','notes'] end;

  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'baixa i esborrat de dades personals (RGPD)' ||
                     coalesce(': ' || nullif(trim(p_motiu), ''), '') ||
                     case when v_pagat then ' · es conserva nom i import per obligació fiscal' else '' end, true);
  perform set_config('app.esborrat_rgpd', 'on', true);

  update comunitat.reserves set
    nom          = case when v_pagat then nom else 'Persona donada de baixa' end,
    telefon      = '',
    email        = null,
    contacte     = null,
    observacions = null,
    notes        = null,
    status       = case when status in ('attended','no-show') then status else 'cancelled' end,
    cancelled_at = coalesce(cancelled_at, now()),
    esborrat_at  = now(),
    esborrat_per = p_actor
  where id = any(v_ids);
  get diagnostics v_n = row_count;

  -- Treure les dades personals de l'historial d'auditoria d'aquestes reserves
  update comunitat.auditoria set
    fila_abans   = case when fila_abans   is null then null else fila_abans   - v_claus end,
    fila_despres = case when fila_despres is null then null else fila_despres - v_claus end,
    canvis       = case when canvis       is null then null else canvis       - v_claus end
  where taula = 'reserves' and registre_id = any(v_ids);

  perform set_config('app.esborrat_rgpd', 'off', true);
  return jsonb_build_object('ok', true, 'esborrades', v_n, 'conserva_nom_fiscal', coalesce(v_pagat, false));
end $$;

-- ── 4. Esborrar totes les inscripcions d'una activitat acabada ──
create or replace function comunitat.admin_esborrar_activitat(
  p_event_id text,
  p_actor    text
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare
  v_ev comunitat.events%rowtype;
  v_id text;
  v_n  integer := 0;
  v_out jsonb;
begin
  select * into v_ev from comunitat.events where id = p_event_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_trobada'); end if;
  -- Només si s'ha acabat: arxivada, o puntual amb la data passada
  if not (v_ev.estat = 'arxivat'
          or (coalesce(v_ev.recurrencia, 'cap') <> 'setmanal' and v_ev.data is not null and v_ev.data::date < current_date)) then
    return jsonb_build_object('ok', false, 'error', 'activitat_no_acabada');
  end if;

  for v_id in
    select id from comunitat.reserves
    where event_id = p_event_id and esborrat_at is null and pare_id is null
    order by id
  loop
    v_out := comunitat.admin_baixa_esborrar(v_id, p_actor, 'activitat acabada');
    if (v_out->>'ok')::boolean then v_n := v_n + (v_out->>'esborrades')::int; end if;
  end loop;
  -- Sessions vinculades d'aquesta activitat que pengen d'una altra
  for v_id in
    select id from comunitat.reserves
    where event_id = p_event_id and esborrat_at is null and pare_id is not null
  loop
    v_out := comunitat.admin_baixa_esborrar(v_id, p_actor, 'activitat acabada');
    if (v_out->>'ok')::boolean then v_n := v_n + (v_out->>'esborrades')::int; end if;
  end loop;

  return jsonb_build_object('ok', true, 'esborrades', v_n);
end $$;

-- ── 5. Permisos ───────────────────────────────────────────────
revoke execute on function comunitat.admin_baixa_esborrar(text,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_baixa_esborrar(text,text,text) to service_role;
revoke execute on function comunitat.admin_esborrar_activitat(text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_esborrar_activitat(text,text) to service_role;

-- Comprovació
select count(*) filter (where esborrat_at is not null) as esborrades,
       count(*) filter (where esborrat_at is null)     as amb_dades
from comunitat.reserves;

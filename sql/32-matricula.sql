-- ═══════════════════════════════════════════════════════════════════
-- 32 · Matrícula per activitat
--   · events.matricula_cents: import de la matrícula (null = l'activitat no en té).
--     Es configura al panell (Editar → Inscripció i preus). No es mostra a la web.
--   · Un sol pagament per inscripció, a banda de la quota (mensual o única).
--   · reserves.matricula_*: com s'ha pagat (o "exempta", amb motiu), qui i quan.
--   · Cada cobrament, exempció i anul·lació queda a l'auditoria.
--   · Baixa RGPD: si la matrícula s'ha pagat es conserva el nom (fiscal) i
--     s'esborra la nota (el motiu d'exempció pot ser una dada personal).
--   · Taller Repara i Reviu (Can Pepus): matrícula de 10 €.
-- Requereix 00–31. Idempotent.
-- ═══════════════════════════════════════════════════════════════════
begin;

-- ── 1. Columnes ───────────────────────────────────────────────
alter table comunitat.events
  add column if not exists matricula_cents integer;
alter table comunitat.events drop constraint if exists events_matricula_check;
alter table comunitat.events add constraint events_matricula_check
  check (matricula_cents is null or (matricula_cents > 0 and matricula_cents <= 100000));

alter table comunitat.reserves
  add column if not exists matricula_cents  integer,      -- import cobrat (0 si exempta)
  add column if not exists matricula_metode text,         -- efectiu · bizum · … · exempta
  add column if not exists matricula_at     timestamptz,
  add column if not exists matricula_per    text,
  add column if not exists matricula_nota   text;          -- nota del cobrament o motiu de l'exempció
alter table comunitat.reserves drop constraint if exists reserves_matricula_check;
alter table comunitat.reserves add constraint reserves_matricula_check
  check (matricula_metode is null
         or (matricula_metode in ('efectiu','bizum','transferencia','targeta','altres') and matricula_cents >= 0)
         or (matricula_metode = 'exempta' and matricula_cents = 0));

-- ── 2. Desar l'activitat: ara també la matrícula ──────────────
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
    data_label, estat, model, pagament, tarifes, extres, recurrencia, matricula_cents
  )
  select id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
         data, hora, durada, coalesce(cupo, 20), coalesce(preu_cents, 0),
         coalesce(tipo_iva, 'exempt'), imatge, imatge_lloc, nullif(cartell, ''), data_label,
         coalesce(estat, 'proximament'),
         coalesce(model, 'puntual'), coalesce(pagament, 'reserva'),
         coalesce(tarifes, '[]'::jsonb), coalesce(extres, '[]'::jsonb),
         coalesce(recurrencia, 'cap'), nullif(matricula_cents, 0)
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
    recurrencia = excluded.recurrencia, matricula_cents = excluded.matricula_cents
  returning * into v_e;

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_e));
end $$;

revoke execute on function comunitat.admin_upsert_event(jsonb,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_upsert_event(jsonb,text) to service_role;

-- ── 3. Registrar la matrícula (pagada o exempta) ──────────────
create or replace function comunitat.admin_matricula(
  p_id     text,
  p_import integer,
  p_metode text,
  p_actor  text,
  p_nota   text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  if p_metode = 'exempta' then
    p_import := 0;
    if nullif(trim(coalesce(p_nota, '')), '') is null then
      return jsonb_build_object('ok', false, 'error', 'falta_motiu');
    end if;
  end if;
  if p_import is null or p_import < 0 or p_import > 100000 then
    return jsonb_build_object('ok', false, 'error', 'import_no_valid');
  end if;

  select * into v_r from comunitat.reserves where id = p_id;
  if not found or v_r.esborrat_at is not null or v_r.status in ('cancelled','waitlist') or v_r.pare_id is not null then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_activa');
  end if;
  if v_r.matricula_metode is not null then
    return jsonb_build_object('ok', false, 'error', 'ja_registrada');
  end if;

  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', case when p_metode = 'exempta'
                                       then 'matrícula exempta: ' || trim(p_nota)
                                       else 'matrícula ' || p_metode || coalesce(': ' || nullif(trim(p_nota), ''), '') end, true);
  update comunitat.reserves set
    matricula_cents  = p_import,
    matricula_metode = p_metode,
    matricula_at     = now(),
    matricula_per    = coalesce(p_actor, 'admin'),
    matricula_nota   = nullif(trim(coalesce(p_nota, '')), '')
  where id = p_id
  returning * into v_r;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
exception
  when check_violation then return jsonb_build_object('ok', false, 'error', 'dades_no_valides');
end $$;

-- ── 4. Anul·lar (errors de registre o treure l'exempció) ─────
create or replace function comunitat.admin_anular_matricula(
  p_id    text,
  p_actor text,
  p_motiu text default null
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'anul·la la matrícula' || coalesce(': ' || nullif(trim(p_motiu), ''), ''), true);
  update comunitat.reserves set
    matricula_cents = null, matricula_metode = null, matricula_at = null,
    matricula_per = null, matricula_nota = null
  where id = p_id and matricula_metode is not null and esborrat_at is null
  returning * into v_r;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_registrada'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

revoke execute on function comunitat.admin_matricula(text,integer,text,text,text) from public, anon, authenticated;
revoke execute on function comunitat.admin_anular_matricula(text,text,text)       from public, anon, authenticated;
grant  execute on function comunitat.admin_matricula(text,integer,text,text,text) to service_role;
grant  execute on function comunitat.admin_anular_matricula(text,text,text)       to service_role;

-- ── 5. Baixa RGPD: la matrícula pagada també conserva el nom ──
-- Igual que a l'SQL 09, amb dos canvis: compta la matrícula pagada com a
-- pagament (fiscal) i esborra matricula_nota.
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

  select bool_or(payment_status = 'paid' or coalesce(matricula_cents, 0) > 0) into v_pagat
    from comunitat.reserves where id = any(v_ids);
  v_claus := case when v_pagat
                  then array['telefon','email','contacte','observacions','notes','matricula_nota']        -- es conserva el nom (fiscal)
                  else array['nom','telefon','email','contacte','observacions','notes','matricula_nota'] end;

  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'baixa i esborrat de dades personals (RGPD)' ||
                     coalesce(': ' || nullif(trim(p_motiu), ''), '') ||
                     case when v_pagat then ' · es conserva nom i import per obligació fiscal' else '' end, true);
  perform set_config('app.esborrat_rgpd', 'on', true);

  update comunitat.reserves set
    nom            = case when v_pagat then nom else 'Persona donada de baixa' end,
    telefon        = '',
    email          = null,
    contacte       = null,
    observacions   = null,
    notes          = null,
    matricula_nota = null,
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

revoke execute on function comunitat.admin_baixa_esborrar(text,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_baixa_esborrar(text,text,text) to service_role;

-- ── 6. Repara i Reviu: matrícula de 10 € ─────────────────────
select set_config('app.actor', 'sql-32', true);
update comunitat.events set matricula_cents = 1000
 where id = 'taller-repara-reviu-canpepus' and matricula_cents is distinct from 1000;

-- Comprovació (ha de sortir Repara i Reviu amb 1000)
select id, titol->>'ca' as titol, model, matricula_cents
  from comunitat.events where matricula_cents is not null;

commit;

notify pgrst, 'reload schema';

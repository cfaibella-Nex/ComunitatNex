-- ═══════════════════════════════════════════════════════════════
-- GESTOR COMUNITAT NEXSOCIAL · esquema                      S2
-- ═══════════════════════════════════════════════════════════════
-- El gestor escriu sobre comunitat.events, la taula que ja existeix
-- i on pengen les reserves per clau forana. No es migra res a
-- `contingut`: aquella taula queda per a textos, recursos i imatges.
--
-- REQUISIT: schema-full.sql i gestor-schema.sql ja executats.
-- INSTAL·LACIÓ: SQL Editor → enganxar sencer → Run. Idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. CONTROL DE VERSIÓ A EVENTS ───────────────────────────────
-- Si tu i la Nidhi editeu la mateixa activitat alhora, el segon
-- desat rep un avís en lloc de trepitjar el canvi del primer.
alter table comunitat.events
  add column if not exists versio integer not null default 1;

-- ── 2. RPC: DESAR ACTIVITAT ─────────────────────────────────────
-- p_versio NULL → alta nova (falla si l'id ja existeix).
-- p_versio N    → modificació només si la fila encara és a la versió N.
--
-- Les columnes que NO s'escriuen aquí no es poden tocar des del
-- panell encara que arribin a la petició: tipo_iva, created_at,
-- updated_at i versio. El preu sempre surt d'aquí, mai del client.
create or replace function comunitat.desar_event(
  p_id     text,
  p_tipus  text,
  p_dades  jsonb,
  p_versio integer,
  p_actor  text,
  p_motiu  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare
  v        comunitat.events%rowtype;
  v_actual integer;
begin
  perform set_config('app.actor', coalesce(nullif(p_actor, ''), 'sistema'), true);
  perform set_config('app.motiu', coalesce(p_motiu, ''), true);

  if p_versio is null then
    insert into comunitat.events (
      id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
      data, hora, durada, data_label, cupo, preu_cents,
      imatge, imatge_lloc, estat
    )
    select p_id, p_tipus,
           coalesce(d.titol, '{}'::jsonb), coalesce(d.descripcio, '{}'::jsonb),
           d.entitat, d.ubicacio, d.mapa_url,
           d.data, d.hora, coalesce(d.durada, 90), d.data_label,
           coalesce(d.cupo, 20), coalesce(d.preu_cents, 0),
           d.imatge, d.imatge_lloc, coalesce(d.estat, 'proximament')
      from jsonb_populate_record(null::comunitat.events, p_dades) d
    on conflict (id) do nothing
    returning * into v;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'ja_existeix');
    end if;

  else
    update comunitat.events e
       set tipo        = coalesce(d.tipo, e.tipo),
           titol       = coalesce(d.titol, e.titol),
           descripcio  = coalesce(d.descripcio, e.descripcio),
           entitat     = d.entitat,
           ubicacio    = d.ubicacio,
           mapa_url    = d.mapa_url,
           data        = d.data,
           hora        = d.hora,
           durada      = coalesce(d.durada, e.durada),
           data_label  = d.data_label,
           cupo        = coalesce(d.cupo, e.cupo),
           preu_cents  = coalesce(d.preu_cents, e.preu_cents),
           imatge      = d.imatge,
           imatge_lloc = d.imatge_lloc,
           estat       = coalesce(d.estat, e.estat),
           versio      = e.versio + 1
      from jsonb_populate_record(null::comunitat.events, p_dades) d
     where e.id = p_id and e.versio = p_versio
    returning e.* into v;

    if not found then
      select versio into v_actual from comunitat.events where id = p_id;
      if v_actual is null then
        return jsonb_build_object('ok', false, 'error', 'no_trobat');
      end if;
      return jsonb_build_object('ok', false, 'error', 'conflicte', 'versio_actual', v_actual);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'fila', to_jsonb(v));
end $$;

-- ── 3. RPC: RESTAURAR ACTIVITAT (desfer) ────────────────────────
-- Torna una activitat a com estava ABANS del canvi indicat.
-- Les reserves no es toquen mai: només el contingut de l'activitat.
create or replace function comunitat.restaurar_event(
  p_audit_id bigint,
  p_actor    text
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare
  a comunitat.auditoria%rowtype;
  d jsonb;
  v comunitat.events%rowtype;
begin
  select * into a from comunitat.auditoria
   where id = p_audit_id and taula = 'events';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_trobat');
  end if;
  if a.accio = 'insert' or a.fila_abans is null then
    return jsonb_build_object('ok', false, 'error', 'res_a_restaurar');
  end if;

  d := a.fila_abans;
  perform set_config('app.actor', coalesce(nullif(p_actor, ''), 'sistema'), true);
  perform set_config('app.motiu', 'restaurat a l''estat anterior al canvi #' || p_audit_id, true);

  update comunitat.events e
     set tipo        = coalesce(r.tipo, e.tipo),
         titol       = coalesce(r.titol, e.titol),
         descripcio  = coalesce(r.descripcio, e.descripcio),
         entitat     = r.entitat,
         ubicacio    = r.ubicacio,
         mapa_url    = r.mapa_url,
         data        = r.data,
         hora        = r.hora,
         durada      = coalesce(r.durada, e.durada),
         data_label  = r.data_label,
         cupo        = coalesce(r.cupo, e.cupo),
         preu_cents  = coalesce(r.preu_cents, e.preu_cents),
         imatge      = r.imatge,
         imatge_lloc = r.imatge_lloc,
         estat       = coalesce(r.estat, e.estat),
         versio      = e.versio + 1
    from jsonb_populate_record(null::comunitat.events, d) r
   where e.id = a.registre_id
  returning e.* into v;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_trobat');
  end if;
  return jsonb_build_object('ok', true, 'fila', to_jsonb(v));
end $$;

-- ── 4. PERMISOS ─────────────────────────────────────────────────
revoke execute on function comunitat.desar_event(text,text,jsonb,integer,text,text) from public, anon, authenticated;
revoke execute on function comunitat.restaurar_event(bigint,text)                   from public, anon, authenticated;
grant  execute on function comunitat.desar_event(text,text,jsonb,integer,text,text) to service_role;
grant  execute on function comunitat.restaurar_event(bigint,text)                   to service_role;

-- ── 5. COMPROVACIÓ ──────────────────────────────────────────────
--   select id, versio, estat from comunitat.events order by data;
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'comunitat' and proname like '%event%';
--     → admin_arxivar_event, admin_upsert_event, desar_event, restaurar_event

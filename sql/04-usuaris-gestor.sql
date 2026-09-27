-- ═══════════════════════════════════════════════════════════════
-- GESTOR COMUNITAT NEXSOCIAL · esquema                      S1
-- ═══════════════════════════════════════════════════════════════
-- Motor de gestió portat de BookingFEB. Afegeix contingut editable
-- i usuaris del panell a l'esquema `comunitat` que ja existeix.
--
-- REQUISIT: api/schema-full.sql ja executat. Aquest fitxer reutilitza
-- comunitat.auditoria, comunitat.set_updated_at() i
-- comunitat.fn_auditoria(), que ja hi són. No els torna a definir:
-- redefinir-los podria canviar el comportament de les reserves.
--
-- INSTAL·LACIÓ: Supabase → SQL Editor → enganxar sencer → Run.
-- És idempotent.
--
-- NO CANVIA RES VISIBLE. Les taules es creen buides i el panell
-- actual segueix funcionant fins que s'activi el gestor (S2).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. CONTINGUT ────────────────────────────────────────────────
-- Un document per activitat. L'estructura interna de `dades` la
-- decideix api/_lib/gestor/config.js; la base de dades només
-- garanteix id, versió i auditoria. Afegir un camp nou al panell
-- no requereix cap migració.
create table if not exists comunitat.contingut (
  id          text primary key
              check (id ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  tipus       text not null,
  ordre       integer not null default 0,
  dades       jsonb not null check (jsonb_typeof(dades) = 'object'),
  -- Control de concurrència: cada desat puja la versió. Si tu i la
  -- Nidhi editeu alhora, el segon rep un avís en lloc de trepitjar
  -- el canvi del primer.
  versio      integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create index if not exists idx_contingut_tipus on comunitat.contingut (tipus, ordre);

-- ── 2. USUARIS DEL PANELL ───────────────────────────────────────
-- Cada persona amb el seu nom: això és el que fa que l'auditoria
-- pugui dir qui ha fet què. La contrasenya només es desa com a hash
-- scrypt amb sal, mai en clar, i no surt mai a l'auditoria.
create table if not exists comunitat.usuaris (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (email = lower(email)),
  nom             text not null,
  rol             text not null check (rol in ('admin','responsable','editor')),
  hash            text not null,
  actiu           boolean not null default true,
  ha_de_canviar   boolean not null default false,   -- contrasenya temporal
  intents         integer not null default 0,       -- intents fallits seguits
  bloquejat_fins  timestamptz,
  -- Pujar-la invalida les sessions obertes d'aquesta persona
  -- (desactivar-la, canviar-li la contrasenya).
  sessio_versio   integer not null default 1,
  ultim_acces     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 3. Triggers (reutilitzen les funcions ja existents) ─────────
drop trigger if exists trg_contingut_updated on comunitat.contingut;
create trigger trg_contingut_updated before update on comunitat.contingut
  for each row execute function comunitat.set_updated_at();

drop trigger if exists trg_usuaris_updated on comunitat.usuaris;
create trigger trg_usuaris_updated before update on comunitat.usuaris
  for each row execute function comunitat.set_updated_at();

drop trigger if exists trg_auditoria_contingut on comunitat.contingut;
create trigger trg_auditoria_contingut
  after insert or update or delete on comunitat.contingut
  for each row execute function comunitat.fn_auditoria();

drop trigger if exists trg_auditoria_usuaris on comunitat.usuaris;
create trigger trg_auditoria_usuaris
  after insert or update or delete on comunitat.usuaris
  for each row execute function comunitat.fn_auditoria();

-- ⚠ El hash de contrasenya acabaria a l'auditoria com qualsevol altre
-- camp. S'esborra dels registres d'usuaris abans de desar-los.
create or replace function comunitat.fn_auditoria_sense_hash()
returns trigger
language plpgsql
security definer
set search_path = comunitat, public
as $$
begin
  update comunitat.auditoria
     set fila_abans   = fila_abans   - 'hash',
         fila_despres = fila_despres - 'hash',
         canvis       = canvis       - 'hash'
   where taula = 'usuaris'
     and registre_id = coalesce(new.id, old.id)::text
     and created_at > now() - interval '5 seconds';
  return null;
exception when others then
  return null;   -- mai bloqueja l'operació principal
end $$;

-- ── 4. RPC: DESAR CONTINGUT ─────────────────────────────────────
-- p_versio NULL → alta nova (falla si l'id ja existeix).
-- p_versio N    → modificació només si la fila encara és a la versió N.
create or replace function comunitat.desar_contingut(
  p_id     text,
  p_tipus  text,
  p_dades  jsonb,
  p_versio integer,
  p_actor  text,
  p_motiu  text    default null,
  p_ordre  integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare
  v        comunitat.contingut%rowtype;
  v_actual integer;
begin
  perform set_config('app.actor', coalesce(nullif(p_actor, ''), 'sistema'), true);
  perform set_config('app.motiu', coalesce(p_motiu, ''), true);

  if p_versio is null then
    insert into comunitat.contingut (id, tipus, ordre, dades, updated_by)
    values (p_id, p_tipus, coalesce(p_ordre, 0), p_dades, p_actor)
    on conflict (id) do nothing
    returning * into v;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'ja_existeix');
    end if;
  else
    update comunitat.contingut
       set dades = p_dades,
           versio = versio + 1,
           updated_by = p_actor,
           ordre = coalesce(p_ordre, ordre)
     where id = p_id and versio = p_versio
    returning * into v;
    if not found then
      select versio into v_actual from comunitat.contingut where id = p_id;
      if v_actual is null then
        return jsonb_build_object('ok', false, 'error', 'no_trobat');
      end if;
      return jsonb_build_object('ok', false, 'error', 'conflicte', 'versio_actual', v_actual);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'fila', to_jsonb(v));
end $$;

-- ── 5. RPC: ESBORRAR CONTINGUT ──────────────────────────────────
-- Només per a esborranys creats per error. Queda sencer a
-- l'auditoria i es pot recuperar amb restaurar_contingut.
create or replace function comunitat.esborrar_contingut(
  p_id    text,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
begin
  perform set_config('app.actor', coalesce(nullif(p_actor, ''), 'sistema'), true);
  perform set_config('app.motiu', 'esborrat des del panell', true);
  delete from comunitat.contingut where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_trobat');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ── 6. RPC: RESTAURAR (desfer) ──────────────────────────────────
-- Torna una activitat a com estava ABANS del canvi indicat. Si
-- aquell canvi va ser un esborrat, la recupera sencera.
create or replace function comunitat.restaurar_contingut(
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
  v comunitat.contingut%rowtype;
begin
  select * into a from comunitat.auditoria
   where id = p_audit_id and taula = 'contingut';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_trobat');
  end if;
  if a.accio = 'insert' or a.fila_abans is null then
    return jsonb_build_object('ok', false, 'error', 'res_a_restaurar');
  end if;

  d := a.fila_abans;
  perform set_config('app.actor', coalesce(nullif(p_actor, ''), 'sistema'), true);
  perform set_config('app.motiu', 'restaurat a l''estat anterior al canvi #' || p_audit_id, true);

  insert into comunitat.contingut as c (id, tipus, ordre, dades, updated_by)
  values (a.registre_id, d ->> 'tipus', coalesce((d ->> 'ordre')::int, 0), d -> 'dades', p_actor)
  on conflict (id) do update
     set dades = excluded.dades,
         tipus = excluded.tipus,
         ordre = excluded.ordre,
         versio = c.versio + 1,
         updated_by = excluded.updated_by
  returning * into v;

  return jsonb_build_object('ok', true, 'fila', to_jsonb(v));
end $$;

-- ── 7. RPC: GESTIÓ D'USUARIS ────────────────────────────────────
-- Els permisos (qui pot crear qui) es comproven al backend; aquí
-- només s'executa i es deixa constància de l'actor.
--   crear  → p_dades: { email, nom, rol, hash }
--   hash   → p_dades: { hash, ha_de_canviar }   (reinici o canvi propi)
--   actiu  → p_dades: { actiu }
--   rol    → p_dades: { rol }
create or replace function comunitat.admin_usuari(
  p_accio text,
  p_id    uuid,
  p_dades jsonb,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = comunitat, public
as $$
declare
  v comunitat.usuaris%rowtype;
begin
  perform set_config('app.actor', coalesce(nullif(p_actor, ''), 'sistema'), true);
  perform set_config('app.motiu', 'usuaris: ' || p_accio, true);

  if p_accio = 'crear' then
    insert into comunitat.usuaris (email, nom, rol, hash, ha_de_canviar)
    values (lower(p_dades ->> 'email'), p_dades ->> 'nom', p_dades ->> 'rol',
            p_dades ->> 'hash', coalesce((p_dades ->> 'ha_de_canviar')::boolean, true))
    on conflict (email) do nothing
    returning * into v;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'email_existent');
    end if;

  elsif p_accio = 'hash' then
    update comunitat.usuaris
       set hash = p_dades ->> 'hash',
           ha_de_canviar = coalesce((p_dades ->> 'ha_de_canviar')::boolean, false),
           intents = 0, bloquejat_fins = null,
           sessio_versio = sessio_versio + 1
     where id = p_id
    returning * into v;

  elsif p_accio = 'actiu' then
    update comunitat.usuaris
       set actiu = (p_dades ->> 'actiu')::boolean,
           sessio_versio = sessio_versio + 1
     where id = p_id
    returning * into v;

  elsif p_accio = 'rol' then
    update comunitat.usuaris
       set rol = p_dades ->> 'rol',
           sessio_versio = sessio_versio + 1
     where id = p_id
    returning * into v;

  else
    return jsonb_build_object('ok', false, 'error', 'accio_desconeguda');
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_trobat');
  end if;
  return jsonb_build_object('ok', true, 'usuari', to_jsonb(v) - 'hash');
end $$;

-- Neteja del hash a l'auditoria, just després d'escriure-la
drop trigger if exists trg_auditoria_usuaris_net on comunitat.usuaris;
create trigger trg_auditoria_usuaris_net
  after insert or update on comunitat.usuaris
  for each row execute function comunitat.fn_auditoria_sense_hash();

-- ── 8. IMATGES ──────────────────────────────────────────────────
-- Bucket públic de lectura: les fotos de les activitats són
-- públiques per definició. Només el backend hi pot escriure.
-- ⚠ NOMÉS per a fotos d'activitats. Mai documents de persones:
-- un bucket públic és accessible per URL directa a qui la tingui.
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('comunitat-media', 'comunitat-media', true, 5242880,
          array['image/jpeg','image/webp','image/png'])
  on conflict (id) do nothing;
exception when undefined_table or undefined_column then
  raise notice 'storage.buckets no disponible: crea el bucket "comunitat-media" (públic) a mà';
end $$;

-- ── 9. PERMISOS ─────────────────────────────────────────────────
revoke all on all tables    in schema comunitat from anon, authenticated;
revoke all on all sequences in schema comunitat from anon, authenticated;
revoke execute on all functions in schema comunitat from public, anon, authenticated;

grant all     on all tables    in schema comunitat to service_role;
grant all     on all sequences in schema comunitat to service_role;
grant execute on all functions in schema comunitat to service_role;

-- L'auditoria no és editable ni per al service_role (ho impedeix el
-- trigger), però deixem el permís mínim explícit.
revoke update, delete on comunitat.auditoria from service_role;

alter table comunitat.contingut enable row level security;
alter table comunitat.usuaris   enable row level security;
-- Sense cap policy: anon i authenticated no hi llegeixen res.

-- ── 10. COMPROVACIÓ ─────────────────────────────────────────────
--   select table_name from information_schema.tables where table_schema = 'comunitat';
--     → auditoria, contingut, events, recursos, reserves, usuaris
--   select count(*) from comunitat.usuaris;   → 0 (encara no n'hi ha cap)

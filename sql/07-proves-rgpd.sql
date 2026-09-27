-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · MIGRACIÓ v15 — prova d'informació i consentiment
--
-- Responsabilitat proactiva (art. 5.2 RGPD): poder demostrar, per a cada
-- inscripció, QUÈ se li va informar, QUAN, PER QUIN CANAL i QUI ho va fer.
--
--   · textos_legals: el text exacte de cada versió, amb empremta SHA-256.
--     Inalterable: no es pot editar ni esborrar (com l'auditoria).
--   · reserves: canal, data i autor de la informació.
--       web          → la persona marca la casella (automàtic)
--       telefon /
--       presencial   → l'equip marca "li he llegit la clàusula" en donar d'alta
--       llista_centre→ ve del centre cívic: queda PENDENT fins que l'equip
--                      marca que l'ha informada (art. 14 RGPD)
--
-- Requereix v10–v14. És idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. TEXTOS LEGALS VERSIONATS ───────────────────────────────
create table if not exists comunitat.textos_legals (
  versio      text not null,
  idioma      text not null check (idioma in ('ca','es')),
  tipus       text not null,          -- 'formulari_web' | 'clausula_verbal' | 'politica'
  text        text not null,
  empremta    text not null,          -- sha256 del text
  vigent_des  timestamptz not null default now(),
  primary key (versio, idioma, tipus)
);
alter table comunitat.textos_legals enable row level security;

create or replace function comunitat.fn_textos_legals_immutables()
returns trigger language plpgsql as $$
begin
  raise exception 'Els textos legals publicats no es poden modificar ni esborrar: crea una versió nova.';
end $$;
drop trigger if exists trg_textos_legals_immutables on comunitat.textos_legals;
create trigger trg_textos_legals_immutables
  before update or delete on comunitat.textos_legals
  for each row execute function comunitat.fn_textos_legals_immutables();

insert into comunitat.textos_legals (versio, idioma, tipus, text, empremta)
select v.versio, v.idioma, v.tipus, v.text, encode(sha256(convert_to(v.text, 'UTF8')), 'hex')
from (values
  ('privacitat-v2-2026-09', 'ca', 'formulari_web',
   E'Protecció de dades — informació bàsica\nResponsable: NexSocial SCCL.\nFinalitat: gestionar la teva inscripció, contactar-te sobre l''activitat i fer el seguiment d''assistència. No enviem publicitat.\nDestinataris: no cedim les dades a ningú, tret d''obligació legal. Proveïdors tècnics (allotjament i base de dades) amb contracte de tractament.\nDrets: accés, rectificació, supressió, oposició, limitació i portabilitat a infonex@nexsocial.org.\nSi ens dones dades d''una altra persona (per exemple, el telèfon d''un familiar), confirmes que l''has informada i que hi està d''acord.\n[Casella] He llegit la informació bàsica i la política de privacitat (https://comunitat.nexsocial.org/legal.html#privacitat).'),
  ('privacitat-v2-2026-09', 'es', 'formulari_web',
   E'Protección de datos — información básica\nResponsable: NexSocial SCCL.\nFinalidad: gestionar tu inscripción, contactarte sobre la actividad y hacer el seguimiento de asistencia. No enviamos publicidad.\nDestinatarios: no cedemos los datos a nadie, salvo obligación legal. Proveedores técnicos (alojamiento y base de datos) con contrato de tratamiento.\nDerechos: acceso, rectificación, supresión, oposición, limitación y portabilidad en infonex@nexsocial.org.\nSi nos das datos de otra persona (por ejemplo, el teléfono de un familiar), confirmas que la has informado y que está de acuerdo.\n[Casilla] He leído la información básica y la política de privacidad (https://comunitat.nexsocial.org/legal.html#privacitat).'),
  ('clausula-v2-2026-09', 'ca', 'clausula_verbal',
   E'Les teves dades les farem servir només per gestionar la inscripció a aquesta activitat, trucar-te si hi ha canvis i portar el control d''assistència. Les tracta NexSocial i no les donem a ningú. Pots demanar veure-les, corregir-les o esborrar-les quan vulguis a infonex@nexsocial.org o al 660 435 871. Tens tota la informació a comunitat.nexsocial.org, a l''apartat Privacitat.\n[Si ve d''un centre cívic] Les teves dades ens les ha passat el centre cívic perquè organitzem el taller.\n[Si el telèfon és d''un familiar] Apuntem el teu telèfon com a contacte d''aquesta persona. Només el farem servir per parlar d''aquesta activitat.'),
  ('clausula-v2-2026-09', 'es', 'clausula_verbal',
   E'Tus datos los usaremos solo para gestionar la inscripción en esta actividad, llamarte si hay cambios y llevar el control de asistencia. Los trata NexSocial y no los damos a nadie. Puedes pedir verlos, corregirlos o borrarlos cuando quieras en infonex@nexsocial.org o en el 660 435 871. Tienes toda la información en comunitat.nexsocial.org, en el apartado Privacidad.\n[Si viene de un centro cívico] Tus datos nos los ha pasado el centro cívico para que organicemos el taller.\n[Si el teléfono es de un familiar] Apuntamos tu teléfono como contacto de esta persona. Solo lo usaremos para hablar de esta actividad.')
) as v(versio, idioma, tipus, text)
on conflict do nothing;

-- ── 2. RESERVES: canal i prova d'informació ───────────────────
alter table comunitat.reserves
  add column if not exists info_canal  text,
  add column if not exists info_versio text,
  add column if not exists informada_at  timestamptz,
  add column if not exists informada_per text;

alter table comunitat.reserves drop constraint if exists reserves_info_canal_check;
alter table comunitat.reserves add constraint reserves_info_canal_check
  check (info_canal is null or info_canal in ('web','telefon','presencial','llista_centre','altres'));

-- Inscripcions de la web: la casella ja s'ha marcat (el servidor no
-- l'accepta sense). Es completa sola, sense tocar crear_reserva_v2.
create or replace function comunitat.fn_reserva_info_web()
returns trigger language plpgsql as $$
begin
  if new.consent_versio is not null and new.info_canal is null then
    new.info_canal    := 'web';
    new.info_versio   := new.consent_versio;
    new.informada_at  := coalesce(new.consent_rgpd_at, now());
    new.informada_per := 'la mateixa persona (formulari web)';
  end if;
  return new;
end $$;
drop trigger if exists trg_reserva_info_web on comunitat.reserves;
create trigger trg_reserva_info_web
  before insert on comunitat.reserves
  for each row execute function comunitat.fn_reserva_info_web();

-- Inscripcions antigues de la web (anteriors a v15)
update comunitat.reserves
   set info_canal = 'web', info_versio = consent_versio,
       informada_at = consent_rgpd_at, informada_per = 'la mateixa persona (formulari web)'
 where info_canal is null and consent_versio is not null and origen = 'web';

-- Les de l'alta massiva de llistes dels centres (setembre 2026)
update comunitat.reserves r
   set info_canal = 'llista_centre'
 where info_canal is null
   and exists (select 1 from comunitat.auditoria a
               where a.taula = 'reserves' and a.registre_id = r.id and a.accio = 'insert'
                 and a.actor = 'importació llistes centres');

-- Les que venen de llistes o del panell sense marca: pendents d'informar
update comunitat.reserves
   set info_canal = case when origen in ('telefon','presencial') then origen else 'llista_centre' end
 where info_canal is null;

-- ── 3. AFEGIR PERSONA: amb la prova d'informació ──────────────
drop function if exists comunitat.admin_afegir_persona(text,text,text,text,text,jsonb,integer,integer,boolean,text,boolean,text,text,text);
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
  p_contacte     text    default null,
  p_informada    boolean default false,   -- l'equip li ha llegit la clàusula
  p_info_canal   text    default null,    -- telefon | presencial | llista_centre
  p_info_versio  text    default 'clausula-v2-2026-09'
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
    contacte, confirmed_at,
    info_canal, info_versio, informada_at, informada_per
  ) values (
    p_ref, p_event_id, p_nom, coalesce(p_telefon, ''), p_email, p_places, null,
    coalesce(v_ev.preu_cents, 0), coalesce(p_total_cents, 0),
    v_status, 'ca', coalesce(p_linies, '[]'::jsonb), coalesce(p_consultar, false),
    coalesce(v_ev.pagament, 'reserva'), 'none', coalesce(p_origen, 'telefon'), p_observacions,
    nullif(trim(coalesce(p_contacte, '')), ''),
    case when v_status = 'confirmed' then now() end,
    coalesce(p_info_canal, case when p_origen in ('telefon','presencial') then p_origen else 'altres' end),
    case when p_informada then p_info_versio end,
    case when p_informada then now() end,
    case when p_informada then p_actor end
  ) returning * into v_r;

  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r), 'disponibles', v_disp);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'ref_collision');
end $$;

-- ── 4. MARCAR COM A INFORMADA (llistes dels centres, altes antigues) ──
create or replace function comunitat.admin_marcar_informada(
  p_id     text,
  p_actor  text,
  p_canal  text default null,      -- per on se li ha llegit: telefon | presencial
  p_versio text default 'clausula-v2-2026-09'
)
returns jsonb
language plpgsql security definer set search_path = comunitat, public
as $$
declare v_r comunitat.reserves%rowtype;
begin
  perform set_config('app.actor', coalesce(p_actor, 'admin'), true);
  perform set_config('app.motiu', 'informada de la clàusula de protecció de dades' ||
                     coalesce(' (' || p_canal || ')', ''), true);
  update comunitat.reserves set
    informada_at  = now(),
    informada_per = p_actor,
    info_versio   = p_versio
  where id = p_id and informada_at is null
  returning * into v_r;
  if not found then return jsonb_build_object('ok', false, 'error', 'ja_informada_o_no_trobada'); end if;
  return jsonb_build_object('ok', true, 'reserva', to_jsonb(v_r));
end $$;

-- ── 5. PERMISOS ───────────────────────────────────────────────
revoke all on comunitat.textos_legals from anon, authenticated;
grant select, insert on comunitat.textos_legals to service_role;
revoke execute on function comunitat.admin_afegir_persona(text,text,text,text,text,jsonb,integer,integer,boolean,text,boolean,text,text,text,boolean,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_afegir_persona(text,text,text,text,text,jsonb,integer,integer,boolean,text,boolean,text,text,text,boolean,text,text) to service_role;
revoke execute on function comunitat.admin_marcar_informada(text,text,text,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_marcar_informada(text,text,text,text) to service_role;

-- ── 6. COMPROVACIÓ ────────────────────────────────────────────
select versio, idioma, tipus, left(empremta, 16) || '…' as empremta from comunitat.textos_legals order by 1, 3, 2;
select info_canal, count(*) as reserves, count(informada_at) as informades,
       count(*) - count(informada_at) as pendents_informar
from comunitat.reserves where status not in ('cancelled')
group by info_canal order by 1;

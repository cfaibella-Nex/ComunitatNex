-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · MIGRACIÓ v12 — cartell oficial per activitat
--
-- Dues imatges per activitat, com a BookingFEB:
--   cartell → cartell oficial (centres cívics). Si hi és, és el que
--             es veu a la web: portada, agenda, reserves i detall.
--   imatge  → la imatge de NexSocial. Es veu al final de la reserva
--             (resum del pas de dades). Sense cartell, es veu a tot arreu.
--
-- Requereix v10. És idempotent.
-- ═══════════════════════════════════════════════════════════════

alter table comunitat.events add column if not exists cartell text;

-- ── Alta/edició amb el camp nou ───────────────────────────────
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
    data_label, estat, model, pagament, tarifes, extres
  )
  select id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
         data, hora, durada, coalesce(cupo, 20), coalesce(preu_cents, 0),
         coalesce(tipo_iva, 'exempt'), imatge, imatge_lloc, nullif(cartell, ''), data_label,
         coalesce(estat, 'proximament'),
         coalesce(model, 'puntual'), coalesce(pagament, 'reserva'),
         coalesce(tarifes, '[]'::jsonb), coalesce(extres, '[]'::jsonb)
  from jsonb_populate_record(null::comunitat.events, p_event)
  on conflict (id) do update set
    tipo = excluded.tipo, titol = excluded.titol, descripcio = excluded.descripcio,
    entitat = excluded.entitat, ubicacio = excluded.ubicacio, mapa_url = excluded.mapa_url,
    data = excluded.data, hora = excluded.hora, durada = excluded.durada,
    cupo = excluded.cupo, preu_cents = excluded.preu_cents, tipo_iva = excluded.tipo_iva,
    imatge = excluded.imatge, imatge_lloc = excluded.imatge_lloc, cartell = excluded.cartell,
    data_label = excluded.data_label, estat = excluded.estat,
    model = excluded.model, pagament = excluded.pagament,
    tarifes = excluded.tarifes, extres = excluded.extres
  returning * into v_e;

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_e));
end $$;

revoke execute on function comunitat.admin_upsert_event(jsonb,text) from public, anon, authenticated;
grant  execute on function comunitat.admin_upsert_event(jsonb,text) to service_role;

-- ── Cartells per a les activitats que ja existeixen ───────────
-- Només omple les que no en tenen: no trepitja res posat des del panell.
-- Si algun id no existeix, simplement no fa res.
update comunitat.events set cartell = '/assets/cartells/ccstroc-mobil.jpg'
 where id = 'taller-mobil-santroc'        and cartell is null;
update comunitat.events set cartell = '/assets/cartells/ccstroc-autodefensa.jpg'
 where id = 'taller-autodefensa-santroc'  and cartell is null;
update comunitat.events set cartell = '/assets/cartells/ccstroc-castella.jpg'
 where id = 'taller-castellano-santroc'   and cartell is null;
update comunitat.events set cartell = '/assets/cartells/csbcanpepus-autodefensa.jpg'
 where id = 'taller-autodefensa-canpepus' and cartell is null;
update comunitat.events set cartell = '/assets/cartells/csbcanpepus-conversaenangles.jpg'
 where id = 'taller-angles-canpepus'      and cartell is null;

-- ── Comprovació: quines activitats tenen cartell ──────────────
select id, titol->>'ca' as titol, cartell
from comunitat.events
where estat <> 'arxivat'
order by cartell nulls last, data;

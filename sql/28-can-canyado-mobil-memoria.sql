-- ═══════════════════════════════════════════════════════════════════
-- 28 · Centre nou: Centre de Cultura Tradicional Can Canyadó (Sala Bar)
--   Tallerista: Raúl Carrillo · dimecres al matí · setmanals · PRÒXIMAMENT
--   1. "Mòbil al teu ritme"  10:00–11:00 · gratuït
--   2. "Memòria lúdica"      11:00–12:00 · 10 € (intern; a la web "a consultar")
-- Descripció, places i model copiats dels tallers de mòbil (Sant Roc) i
-- memòria (Can Pepus). Només foto (sense cartell). Data = dimecres 25/11:
-- només fixa el dia de la setmana. Quan comencin: data real + "Visible".
-- Idempotent: es pot executar més d'un cop i no trepitja els canvis del panell.
-- ═══════════════════════════════════════════════════════════════════
begin;
select set_config('app.actor', 'sql-28', true);

-- 1. Mòbil al teu ritme (base: taller-mobil-santroc)
insert into comunitat.events (
  id, tipo, titol, descripcio, entitat, ubicacio, mapa_url, data, hora, durada, cupo,
  preu_cents, tipo_iva, imatge, imatge_lloc, cartell, data_label, estat, model, pagament,
  tarifes, extres, recurrencia)
select 'taller-mobil-cancanyado', 'taller',
  '{"ca":"Mòbil al teu ritme","es":"Móvil a tu ritmo"}'::jsonb,
  b.descripcio,
  '{"ca":"Centre de Cultura Tradicional Can Canyadó","es":"Centre de Cultura Tradicional Can Canyadó"}'::jsonb,
  '{"ca":"Sala Bar · Centre de Cultura Tradicional Can Canyadó, Badalona","es":"Sala Bar · Centre de Cultura Tradicional Can Canyadó, Badalona"}'::jsonb,
  'https://maps.google.com/?q=Can+Canyad%C3%B3+Badalona',
  date '2026-11-25', '10:00', 60, b.cupo, 0, 'exempt',
  coalesce(b.imatge, '/assets/taller-mobil.jpg'), '/assets/can-canyado.jpg', null, null,
  'proximament', 'puntual', 'presencial',
  '[{"id":"inscripcio","nom":{"ca":"Inscripció","es":"Inscripción"},"detall":{"ca":"Dimecres 10:00 – 11:00","es":"Miércoles 10:00 – 11:00"},"preu_mode":"gratuit","preu_cents":0,"places":null,"estat":"disponible"}]'::jsonb,
  '[]'::jsonb, 'setmanal'
from comunitat.events b
where b.id = 'taller-mobil-santroc'
on conflict (id) do nothing;

-- 2. Memòria lúdica (base: taller-memoria-canpepus; mateix model de cobrament)
insert into comunitat.events (
  id, tipo, titol, descripcio, entitat, ubicacio, mapa_url, data, hora, durada, cupo,
  preu_cents, tipo_iva, imatge, imatge_lloc, cartell, data_label, estat, model, pagament,
  tarifes, extres, recurrencia)
select 'taller-memoria-cancanyado', 'taller',
  '{"ca":"Memòria lúdica","es":"Memoria lúdica"}'::jsonb,
  b.descripcio,
  '{"ca":"Centre de Cultura Tradicional Can Canyadó","es":"Centre de Cultura Tradicional Can Canyadó"}'::jsonb,
  '{"ca":"Sala Bar · Centre de Cultura Tradicional Can Canyadó, Badalona","es":"Sala Bar · Centre de Cultura Tradicional Can Canyadó, Badalona"}'::jsonb,
  'https://maps.google.com/?q=Can+Canyad%C3%B3+Badalona',
  date '2026-11-25', '11:00', 60, b.cupo, 0, b.tipo_iva,
  b.imatge, '/assets/can-canyado.jpg', null, null,
  'proximament', coalesce(b.model, 'puntual'), 'presencial',
  '[{"id":"inscripcio","nom":{"ca":"Inscripció","es":"Inscripción"},"detall":{"ca":"Dimecres 11:00 – 12:00","es":"Miércoles 11:00 – 12:00"},"preu_mode":"consultar","preu_cents":0,"preu_intern_cents":1000,"places":null,"estat":"disponible"}]'::jsonb,
  -- mesos (si n'hi ha): mateix preu intern de 10 €
  coalesce((select jsonb_agg(case when x ? 'preu_intern_cents' or x->>'preu_mode' = 'consultar'
                                  then x || '{"preu_mode":"consultar","preu_cents":0,"preu_intern_cents":1000}'::jsonb
                                  else x end)
              from jsonb_array_elements(b.extres) x), '[]'::jsonb),
  'setmanal'
from comunitat.events b
where b.id = 'taller-memoria-canpepus'
on conflict (id) do nothing;

-- Comprovació (han de sortir 2 files)
select id, titol->>'ca' as titol, data, to_char(data, 'TMDay') as dia, hora, durada, cupo, estat, model,
       (select string_agg(t->>'preu_mode' || coalesce(' ' || (t->>'preu_intern_cents'), ''), ',') from jsonb_array_elements(tarifes) t) as preus,
       jsonb_array_length(extres) as extres, imatge, imatge_lloc
  from comunitat.events
 where id in ('taller-mobil-cancanyado', 'taller-memoria-cancanyado')
 order by hora;

commit;

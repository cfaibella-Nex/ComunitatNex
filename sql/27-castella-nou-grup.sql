-- 27 · Sant Roc: el grup antic de castellà es torna a dir "Taller de castellà bàsic"
--      (per arxivar-lo amb els seus inscrits) i es crea "Conversa en castellà" net.
-- 1. Grup antic: només el nom (inscrits, assistència i pagaments es conserven)
update comunitat.events
   set titol = '{"ca":"Taller de castellà bàsic","es":"Taller de castellano básico"}'::jsonb
 where id = 'taller-castellano-santroc' and titol->>'ca' = 'Conversa en castellà';

-- 2. Taller nou, sense inscrits ni historial: dijous 16:00-16:45, des del 12/11
insert into comunitat.events (
  id, tipo, titol, descripcio, entitat, ubicacio, mapa_url, data, hora, durada, cupo,
  preu_cents, tipo_iva, imatge, imatge_lloc, cartell, data_label, estat, model, pagament,
  tarifes, extres, recurrencia)
select 'conversa-castella-santroc', o.tipo,
  '{"ca":"Conversa en castellà","es":"Conversación en castellano"}'::jsonb,
  jsonb_build_object(
    'ca', 'Espai per practicar el castellà parlant: converses del dia a dia, en grup i sense pressa, per guanyar confiança i autonomia.',
    'es', 'Espacio para practicar el castellano hablando: conversaciones del día a día, en grupo y sin prisa, para ganar confianza y autonomía.'),
  o.entitat, o.ubicacio, o.mapa_url, date '2026-11-12', '16:00', 45, o.cupo,
  0, o.tipo_iva, o.imatge, o.imatge_lloc, null, null, o.estat, o.model, 'presencial',
  '[{"id":"inscripcio","nom":{"ca":"Inscripció","es":"Inscripción"},"detall":{"ca":"Dijous 16:00 – 16:45","es":"Jueves 16:00 – 16:45"},"preu_mode":"gratuit","preu_cents":0,"places":null,"estat":"disponible"}]'::jsonb,
  '[]'::jsonb, 'setmanal'
from comunitat.events o
where o.id = 'taller-castellano-santroc'
on conflict (id) do nothing;

select id, titol->>'ca' as titol, data, hora, durada, cupo, estat,
       (select count(*) from comunitat.reserves r where r.event_id = e.id) as inscrits
  from comunitat.events e
 where id in ('taller-castellano-santroc', 'conversa-castella-santroc') order by id;

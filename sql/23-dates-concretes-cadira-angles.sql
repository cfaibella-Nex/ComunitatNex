-- ═══════════════════════════════════════════════════════════════════
-- 23 · Dates concretes + "Una cadira més" (AVV Canyadó) + anglès Can Pepus
--   1. Nou tipus de repetició 'dates': els dies són sessions_afegides
--      (es posen i es treuen al Seguiment). Ex.: 1r i 3r dijous de mes.
--   2. "Una cadira més · Tardeos veïnals", AVV Canyadó, 17:30–19:30,
--      gratuïta, 25 places, PRÒXIMAMENT. Dinamització a càrrec de NexSocial.
--   3. Conversa en anglès Can Pepus (Nidhi Nagdev), dimarts, Sala Polivalent,
--      15 € (intern, a la web "a consultar"): bàsic 16:30–17:30 · intermedi 18:00–19:00
-- Idempotent i no trepitja els canvis fets després al panell.
-- ═══════════════════════════════════════════════════════════════════
begin;
select set_config('app.actor', 'sql-23', true);

-- 1. Tipus de repetició nou
alter table comunitat.events drop constraint if exists events_recurrencia_check;
alter table comunitat.events add constraint events_recurrencia_check
  check (recurrencia in ('cap','setmanal','dates'));

-- 2. Una cadira més (12/11 i 26/11, 3/12 i 17/12; des del gener, 1r i 3r dijous fins al juny)
insert into comunitat.events (
  id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
  data, hora, durada, cupo, preu_cents, tipo_iva, imatge, imatge_lloc, cartell,
  data_label, estat, model, pagament, tarifes, extres, recurrencia, sessions_afegides
) values (
  'una-cadira-mes-canyado', 'mensual',          -- tipus "Activitat" a la web (no és un taller)
  '{"ca":"Una cadira més · Tardeos veïnals","es":"Una cadira més · Tardeos vecinales"}',
  jsonb_build_object(
    'ca', 'Espai de dinamització comunitària a la seu de l''AVV Canyadó, a càrrec de NexSocial. Cada tardeo té tres temps: berenar i xerrada per posar-nos al dia del barri (17:30), l''activitat del dia (18:15: jocs de taula, contacontes, xerrades i tallers, participació ciutadana…) i tancament amb la propera cita (19:00). Hi ha racó infantil i Racó NexSocial per a consultes. Vine i porta un veí que no hagi vingut mai!',
    'es', 'Espacio de dinamización comunitaria en la sede de la AVV Canyadó, a cargo de NexSocial. Cada tardeo tiene tres tiempos: merienda y charla para ponernos al día del barrio (17:30), la actividad del día (18:15: juegos de mesa, cuentacuentos, charlas y talleres, participación ciudadana…) y cierre con la próxima cita (19:00). Hay rincón infantil y Rincón NexSocial para consultas. ¡Ven y trae a un vecino que no haya venido nunca!'),
  '{"ca":"AVV Canyadó","es":"AVV Canyadó"}',
  '{"ca":"Seu de l''AVV Canyadó · c/ Eduard Marquina, 25-27, Badalona","es":"Sede de la AVV Canyadó · c/ Eduard Marquina, 25-27, Badalona"}',
  'https://maps.google.com/?q=Carrer+Eduard+Marquina+25+Badalona',
  date '2026-11-12', '17:30', 120, 25, 0, 'exempt',
  '/assets/taller-cadira-mes.jpg', '/assets/canyado.jpg', '/assets/cartells/avv-canyado-cadira-mes.jpg',
  '{"ca":"1r i 3r dijous de mes","es":"1.º y 3.º jueves de mes"}',
  'proximament', 'puntual', 'presencial',
  '[{"id":"inscripcio","nom":{"ca":"Inscripció","es":"Inscripción"},"detall":{"ca":"1r i 3r dijous de mes · 17:30 – 19:30","es":"1.º y 3.º jueves de mes · 17:30 – 19:30"},"preu_mode":"gratuit","preu_cents":0,"places":null,"estat":"disponible"}]',
  '[]', 'dates',
  '["2026-11-12","2026-11-26","2026-12-03","2026-12-17",
    "2027-01-07","2027-01-21","2027-02-04","2027-02-18","2027-03-04","2027-03-18",
    "2027-04-01","2027-04-15","2027-05-06","2027-05-20","2027-06-03","2027-06-17"]'
) on conflict (id) do nothing;

-- Cartell (portada) i tipus "Activitat": també si ja s'havia creat amb la primera versió d'aquest script
update comunitat.events set cartell = coalesce(cartell, '/assets/cartells/avv-canyado-cadira-mes.jpg'),
                            tipo = case when tipo = 'taller' then 'mensual' else tipo end
 where id = 'una-cadira-mes-canyado' and (cartell is null or tipo = 'taller');

-- Foto del local de l'AVV Canyadó a totes les activitats d'aquest centre que no en tinguin
update comunitat.events set imatge_lloc = '/assets/canyado.jpg'
 where entitat->>'ca' = 'AVV Canyadó' and imatge_lloc is null;

-- 3a. Anglès bàsic (el taller de sempre)
update comunitat.events e set
  titol    = '{"ca":"Conversa en anglès bàsic","es":"Conversación en inglés básico"}'::jsonb,
  hora     = '16:30',
  durada   = 60,
  data     = case when e.data is null or extract(isodow from e.data) = 2 then e.data
                  else e.data + ((9 - extract(isodow from e.data)::int) % 7) end,
  ubicacio = case when e.ubicacio::text ilike '%polivalent%' then e.ubicacio
                  else jsonb_build_object('ca', 'Sala Polivalent · ' || coalesce(e.ubicacio->>'ca', 'Casal de la Solidaritat Can Pepus'),
                                          'es', 'Sala Polivalente · ' || coalesce(e.ubicacio->>'es', e.ubicacio->>'ca', 'Casal de la Solidaritat Can Pepus')) end,
  tarifes  = coalesce((select jsonb_agg(t || '{"preu_mode":"consultar","preu_cents":0,"preu_intern_cents":1500,
                         "detall":{"ca":"Dimarts 16:30 – 17:30","es":"Martes 16:30 – 17:30"}}'::jsonb)
                         from jsonb_array_elements(e.tarifes) t), e.tarifes)
where e.id = 'taller-angles-canpepus'
  and not exists (select 1 from comunitat.auditoria a
                   where a.taula = 'events' and a.registre_id = e.id and a.actor = 'sql-23');

-- 3b. Anglès intermedi (SQL normal, sense bloc DO: l'editor de Supabase el tallava)
--     Si ja s'ha creat amb "Duplicar" (taller-angles-canpepus-xxxx), s'arregla aquella...
with cand as (
  select id from comunitat.events
   where estat <> 'arxivat' and id <> 'taller-angles-canpepus'
     and (id like 'taller-angles-canpepus-%' or id = 'taller-angles-intermedi-canpepus')
   order by (titol->>'ca' ilike '%intermedi%') desc, created_at desc
   limit 1
), base as (
  select descripcio, ubicacio from comunitat.events where id = 'taller-angles-canpepus'
)
update comunitat.events e set
  titol       = '{"ca":"Conversa en anglès intermedi","es":"Conversación en inglés intermedio"}'::jsonb,
  descripcio  = base.descripcio,
  ubicacio    = base.ubicacio,
  hora        = '18:00',
  durada      = 60,
  recurrencia = 'setmanal',
  data        = case when e.data is null then date '2026-11-03'
                     when extract(isodow from e.data) = 2 then e.data
                     else e.data + ((9 - extract(isodow from e.data)::int) % 7) end,
  tarifes     = coalesce((select jsonb_agg(t || '{"preu_mode":"consultar","preu_cents":0,"preu_intern_cents":1500,
                            "detall":{"ca":"Dimarts 18:00 – 19:00","es":"Martes 18:00 – 19:00"}}'::jsonb)
                            from jsonb_array_elements(e.tarifes) t), e.tarifes)
from cand, base
where e.id = cand.id
  and not exists (select 1 from comunitat.auditoria a
                   where a.taula = 'events' and a.registre_id = e.id and a.actor = 'sql-23');

--     ... i si no n'hi ha cap, se'n crea una copiant el bàsic (des del dimarts 3/11)
insert into comunitat.events (
  id, tipo, titol, descripcio, entitat, ubicacio, mapa_url, data, hora, durada, cupo,
  preu_cents, tipo_iva, imatge, imatge_lloc, cartell, data_label, estat, model, pagament,
  tarifes, extres, recurrencia)
select
  'taller-angles-intermedi-canpepus', b.tipo,
  '{"ca":"Conversa en anglès intermedi","es":"Conversación en inglés intermedio"}'::jsonb,
  b.descripcio, b.entitat, b.ubicacio, b.mapa_url,
  date '2026-11-03', '18:00', 60, b.cupo, 0, b.tipo_iva, b.imatge, b.imatge_lloc, null, null,
  b.estat, b.model, b.pagament,
  coalesce((select jsonb_agg(t || '{"detall":{"ca":"Dimarts 18:00 – 19:00","es":"Martes 18:00 – 19:00"}}'::jsonb)
              from jsonb_array_elements(b.tarifes) t), b.tarifes),
  b.extres, 'setmanal'
from comunitat.events b
where b.id = 'taller-angles-canpepus'
  and not exists (select 1 from comunitat.events c
                   where c.estat <> 'arxivat' and c.id <> 'taller-angles-canpepus'
                     and (c.id like 'taller-angles-canpepus-%' or c.id = 'taller-angles-intermedi-canpepus'))
on conflict (id) do nothing;

-- Comprovació
select id, tipo, titol->>'ca' as titol, recurrencia, data, to_char(data, 'TMDay') as dia, hora, durada, cupo, estat,
       ubicacio->>'ca' as lloc,
       (select string_agg(t->>'preu_mode' || coalesce(' ' || (t->>'preu_intern_cents'), ''), ',') from jsonb_array_elements(tarifes) t) as preus,
       jsonb_array_length(sessions_afegides) as dies, cartell
  from comunitat.events
 where id in ('una-cadira-mes-canyado', 'taller-angles-canpepus')
    or id like 'taller-angles-canpepus-%' or id = 'taller-angles-intermedi-canpepus'
 order by id;

commit;

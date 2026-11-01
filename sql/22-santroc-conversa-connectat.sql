-- ═══════════════════════════════════════════════════════════════════
-- 22 · Centre Cívic Sant Roc, dijous a la tarda (tallerista: Ilham)
--   Dos tallers nous, tots dos gratuïts, setmanals i en PRÒXIMAMENT:
--   1. "Conversa en castellà" (substitueix el taller de castellà bàsic) · 16:00–17:00
--   2. "Conéctate · Vida comunitaria" · 17:00–18:00, atenció individual amb cita prèvia
-- Només foto (sense cartell). Data = darrer dijous: només fixa el dia de la
-- setmana. Quan comencin: data real d'inici + estat "Visible" al panell.
-- Idempotent: es pot executar més d'un cop i no trepitja els canvis del panell.
-- ═══════════════════════════════════════════════════════════════════
begin;
select set_config('app.actor', 'sql-22', true);

-- 1. Castellà → Conversa en castellà (mateix id: es conserven inscrits i assistència)
update comunitat.events e set
  titol      = '{"ca":"Conversa en castellà","es":"Conversación en castellano"}'::jsonb,
  descripcio = jsonb_build_object(
    'ca', 'Espai per practicar el castellà parlant: converses del dia a dia, en grup i sense pressa, per guanyar confiança i autonomia.',
    'es', 'Espacio para practicar el castellano hablando: conversaciones del día a día, en grupo y sin prisa, para ganar confianza y autonomía.'),
  hora       = '16:00',
  durada     = 60,
  -- el dia de la setmana surt de la data: si no és dijous, el primer dijous següent
  data       = case when e.data is null or extract(isodow from e.data) = 4 then e.data
                    else e.data + ((11 - extract(isodow from e.data)::int) % 7) end,
  estat      = 'proximament',
  preu_cents = 0,
  -- gratuït i horari nou a les tarifes (mateixos ids: les inscripcions continuen apuntant-hi)
  tarifes    = coalesce((select jsonb_agg((t - 'preu_intern_cents') || '{"preu_mode":"gratuit","preu_cents":0,
                           "detall":{"ca":"Dijous 16:00 – 17:00","es":"Jueves 16:00 – 17:00"}}'::jsonb)
                           from jsonb_array_elements(e.tarifes) t), '[]'::jsonb),
  extres     = coalesce((select jsonb_agg((x - 'preu_intern_cents') || '{"preu_mode":"gratuit","preu_cents":0}'::jsonb)
                           from jsonb_array_elements(e.extres) x), '[]'::jsonb),
  cartell    = null
where e.id = 'taller-castellano-santroc'
  -- un sol cop: si ja l'ha passat aquest script, no es toca (els canvis del panell es respecten)
  and not exists (select 1 from comunitat.auditoria a
                   where a.taula = 'events' and a.registre_id = e.id
                     and a.actor = 'sql-22' and a.canvis ? 'estat');

-- Versió anterior d'aquest script (id "connectat-recursos-santroc", amb cartell):
-- s'esborra si ningú s'hi ha apuntat; si no, s'arxiva
delete from comunitat.events
 where id = 'connectat-recursos-santroc'
   and not exists (select 1 from comunitat.reserves r where r.event_id = 'connectat-recursos-santroc');
update comunitat.events set estat = 'arxivat'
 where id = 'connectat-recursos-santroc' and estat <> 'arxivat';

-- 2. Conéctate · Vida comunitaria (lloc copiat del castellà de Sant Roc)
insert into comunitat.events (
  id, tipo, titol, descripcio, entitat, ubicacio, mapa_url,
  data, hora, durada, cupo, preu_cents, tipo_iva, imatge, imatge_lloc, cartell,
  data_label, estat, model, pagament, tarifes, extres, recurrencia
)
select
  'conectate-vida-comunitaria-santroc', 'taller',
  '{"ca":"Connecta''t · Vida comunitària","es":"Conéctate · Vida comunitaria"}'::jsonb,
  jsonb_build_object(
    'ca', 'Atenció individual amb cita prèvia. Ens expliques què busques (un dubte, una necessitat o ganes de fer alguna cosa nova) i t''orientem sobre els equipaments, les activitats, les entitats i els recursos de Sant Roc que t''hi encaixen. No fem gestions ni substituïm cap servei: t''ajudem a trobar el que necessites. Demana cita aquí o al 660 435 871 (trucada o WhatsApp).',
    'es', 'Atención individual con cita previa. Nos cuentas qué buscas (una duda, una necesidad o ganas de hacer algo nuevo) y te orientamos sobre los equipamientos, las actividades, las entidades y los recursos de Sant Roc que te encajan. No hacemos gestiones ni sustituimos ningún servicio: te ayudamos a encontrar el que necesitas. Pide cita aquí o en el 660 435 871 (llamada o WhatsApp).'),
  c.entitat, c.ubicacio, c.mapa_url,
  date '2026-10-29', '17:00', 60, 4, 0, 'exempt',
  '/assets/connectat-recursos.jpg', c.imatge_lloc, null,
  null, 'proximament', 'puntual', 'presencial',
  '[{"id":"cita","nom":{"ca":"Cita individual","es":"Cita individual"},"detall":{"ca":"Dijous 17:00 – 18:00","es":"Jueves 17:00 – 18:00"},"preu_mode":"gratuit","preu_cents":0,"places":null,"estat":"disponible"}]'::jsonb,
  '[]'::jsonb, 'setmanal'
from comunitat.events c
where c.id = 'taller-castellano-santroc'
on conflict (id) do nothing;

-- Comprovació
select id, titol->>'ca' as titol, data, to_char(data, 'TMDay') as dia, hora, durada, cupo, estat,
       (select string_agg(t->>'preu_mode', ',') from jsonb_array_elements(tarifes) t) as preus,
       imatge, cartell
  from comunitat.events
 where id in ('taller-castellano-santroc', 'conectate-vida-comunitaria-santroc', 'connectat-recursos-santroc')
 order by hora;

commit;

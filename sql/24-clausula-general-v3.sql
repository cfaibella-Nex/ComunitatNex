-- ═══════════════════════════════════════════════════════════════════
-- 24 · Clàusula verbal de protecció de dades v3 (general)
--   La v2 deia "la inscripció a aquesta activitat". La v3 cobreix totes les
--   inscripcions de la persona a activitats de NexSocial: un cop llegida,
--   no cal tornar-la a llegir quan s'apunta a un altre taller.
--   La v2 es conserva (taula només d'inserció): les inscripcions informades
--   amb la v2 continuen dient quin text se'ls va llegir.
--   El panell i l'API passen a desar 'clausula-v3-2026-11' a les noves.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════
insert into comunitat.textos_legals (versio, idioma, tipus, text, empremta)
select v.versio, v.idioma, v.tipus, v.text, encode(sha256(convert_to(v.text, 'UTF8')), 'hex')
from (values
  ('clausula-v3-2026-11', 'ca', 'clausula_verbal',
   E'Les teves dades les farem servir només per gestionar les teves inscripcions a les activitats de NexSocial, trucar-te si hi ha canvis i portar el control d''assistència. Les tracta NexSocial i no les donem a ningú. Pots demanar veure-les, corregir-les o esborrar-les quan vulguis a infonex@nexsocial.org o al 660 435 871. Tens tota la informació a comunitat.nexsocial.org, a l''apartat Privacitat.\n[Si ve d''un centre cívic] Les teves dades ens les ha passat el centre cívic perquè organitzem les activitats.\n[Si el telèfon és d''un familiar] Apuntem el teu telèfon com a contacte d''aquesta persona. Només el farem servir per parlar de les seves activitats amb NexSocial.'),
  ('clausula-v3-2026-11', 'es', 'clausula_verbal',
   E'Tus datos los usaremos solo para gestionar tus inscripciones en las actividades de NexSocial, llamarte si hay cambios y llevar el control de asistencia. Los trata NexSocial y no los damos a nadie. Puedes pedir verlos, corregirlos o borrarlos cuando quieras en infonex@nexsocial.org o en el 660 435 871. Tienes toda la información en comunitat.nexsocial.org, en el apartado Privacidad.\n[Si viene de un centro cívico] Tus datos nos los ha pasado el centro cívico para que organicemos las actividades.\n[Si el teléfono es de un familiar] Apuntamos tu teléfono como contacto de esta persona. Solo lo usaremos para hablar de sus actividades con NexSocial.')
) as v(versio, idioma, tipus, text)
on conflict do nothing;

select versio, idioma, left(text, 70) as inici from comunitat.textos_legals
 where tipus = 'clausula_verbal' order by versio, idioma;

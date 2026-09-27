-- ═══════════════════════════════════════════════════════════════
-- Comunitat NexSocial · v16 — text de protecció de dades v3
--
-- Canvis respecte a la v2:
--   · Destinataris: es treu la frase dels proveïdors tècnics (és a la
--     política completa, 2a capa).
--   · Ja no hi ha casella: la informació es mostra en una finestra en
--     guardar la reserva, i "D'acord, reservar" és l'acte afirmatiu.
-- Requereix v15 (taula textos_legals). És idempotent.
-- ═══════════════════════════════════════════════════════════════
insert into comunitat.textos_legals (versio, idioma, tipus, text, empremta)
select v.versio, v.idioma, v.tipus, v.text, encode(sha256(convert_to(v.text, 'UTF8')), 'hex')
from (values
  ('privacitat-v3-2026-09', 'ca', 'formulari_web',
   E'[Finestra en prémer Reservar]\nProtecció de dades — informació bàsica\nResponsable: NexSocial SCCL.\nFinalitat: gestionar la teva inscripció, contactar-te sobre l''activitat i fer el seguiment d''assistència. No enviem publicitat.\nDestinataris: no cedim les dades a ningú, tret d''obligació legal.\nDrets: accés, rectificació, supressió, oposició, limitació i portabilitat a infonex@nexsocial.org.\nSi ens dones dades d''una altra persona (per exemple, el telèfon d''un familiar), confirmes que l''has informada i que hi està d''acord.\nMés informació a la política de privacitat (https://comunitat.nexsocial.org/legal.html#privacitat).\n[Botons] Tornar · D''acord, reservar (o: D''acord, anar a pagar)'),
  ('privacitat-v3-2026-09', 'es', 'formulari_web',
   E'[Ventana al pulsar Reservar]\nProtección de datos — información básica\nResponsable: NexSocial SCCL.\nFinalidad: gestionar tu inscripción, contactarte sobre la actividad y hacer el seguimiento de asistencia. No enviamos publicidad.\nDestinatarios: no cedemos los datos a nadie, salvo obligación legal.\nDerechos: acceso, rectificación, supresión, oposición, limitación y portabilidad en infonex@nexsocial.org.\nSi nos das datos de otra persona (por ejemplo, el teléfono de un familiar), confirmas que la has informado y que está de acuerdo.\nMás información en la política de privacidad (https://comunitat.nexsocial.org/legal.html#privacitat).\n[Botones] Volver · De acuerdo, reservar (o: De acuerdo, ir a pagar)')
) as v(versio, idioma, tipus, text)
on conflict do nothing;

select versio, idioma, left(empremta, 16) || '…' as empremta from comunitat.textos_legals
where tipus = 'formulari_web' order by versio, idioma;

-- Que l'API (PostgREST) vegi de seguida les funcions noves
notify pgrst, 'reload schema';

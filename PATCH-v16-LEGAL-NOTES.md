# Patch v16 · Blindatge legal (esborrany per revisar)

Sense SQL.

## Valors per defecte aplicats a legal.html (confirmar)
Domicili "Badalona (Barcelonès)" sense adreça · Registre de Cooperatives sense número ·
Supabase sense regió · conservació 12 mesos després de l'activitat · autoritat AEPD ·
activitats per a adults (menors només si s'indica) · il·lustracions "amb llicència" ·
sense comunicació de llistes al centre/Ajuntament · data 27/09/2026.

## Canvis
- **Mapa**: ja no s'incrusta Google Maps (posava cookies de Google i enviava la IP sense consentiment).
  Ara és un enllaç "Obrir el mapa ↗" que diu que s'obre fora de la web.
  → La web ja no instal·la cap cookie no exempta: no cal bàner.
- **Formulari d'inscripció**: primera capa d'informació (responsable, finalitat, destinataris, drets),
  avís sobre dades de terceres persones (familiars) i **casella obligatòria no marcada**.
  El servidor rebutja inscripcions sense la casella i desa versió (`privacitat-v2-2026-09`) i data.
- **legal.html** reescrit en català i castellà: avís legal (art. 10 LSSI), protecció de dades per
  finalitats i bases jurídiques, origen de les dades (centres cívics, familiars), encarregats i
  transferències, conservació, drets, menors, seguretat, i política de cookies amb taula.
- Peu de pàgina: Avís legal · Privacitat · Cookies.
- Panell: recordatori de llegir la clàusula quan s'apunta algú per telèfon o en persona.
- Text "En continuar acceptes les condicions" eliminat (no hi ha condicions generals).

## Document a part (no va al repo)
`clausules-informatives-comunitat.md`: clàusula telefònica, full per imprimir, llistes dels centres
(art. 14), procediment d'exercici de drets i llista de pendents.

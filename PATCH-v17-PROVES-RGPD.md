# Patch v17 · Registre de proves de protecció de dades

## Instal·lació
1. Supabase → `api/schema-v15-proves-rgpd.sql` → Run (després de la v14).
   Al final mostra els textos legals desats (amb empremta) i quantes inscripcions hi ha
   pendents d'informar per canal.
2. Push i Ctrl+Shift+R.

## Què queda registrat, per a cada inscripció
| Canal | Com | Qui consta |
|---|---|---|
| Web | Casella obligatòria no marcada. El servidor no accepta la inscripció sense | "la mateixa persona (formulari web)" |
| Trucada / presencial | Casella obligatòria al panell: "Li he llegit la clàusula" | L'usuari del panell que la dona d'alta |
| Llista del centre cívic | Entra PENDENT. Es marca al Seguiment (columna "Dades") quan se li llegeix | L'usuari del panell que ho marca |

Es desen el canal, la data i hora, la persona i la versió del text. A la taula `textos_legals`
hi ha el text exacte de cada versió (CA i ES) amb la seva empremta SHA-256. Aquesta taula no es
pot modificar ni esborrar: per canviar un text, cal crear una versió nova. Qualsevol canvi queda
també a l'auditoria.

## Al panell
- Seguiment (una activitat i "Totes"): columna **Dades**, amb "✓ data" (en passar-hi el ratolí es
  veu el canal, qui ho va fer i la versió) o el selector "⚠ Pendent", que demana confirmació i no
  es pot desfer.
- Xifra **"Pendents d'informar"**, amb el botó "Veure només aquestes".
- Passar llista: avís "⚠ Dades: pendent d'informar", per llegir-la el primer dia.
- Afegir persona: opció "Llista enviada pel centre cívic" (entra com a pendent). Amb la resta
  d'opcions la casella és obligatòria. Es pot desplegar la clàusula per llegir-la.
- CSV i Excel inclouen canal, data, persona i versió.

## Cookies
No es registra cap consentiment de cookies perquè no n'hi ha cap que en necessiti (art. 22.2 LSSI):
registrar-ne un seria tractar dades sense necessitat. La política ho explica.

## legal.html
Alineat amb l'avís legal de nexsocial.org: denominació, forma jurídica, domicili social, registre,
web, clàusula de responsabilitat i AEPD. Hi consta Supabase a Frankfurt (UE) i un apartat nou,
"Com acreditem que t'hem informat".

# Patch v1 — Auditoria i reserves atòmiques (Sprint 1)

Descomprimir sobre l'arrel del clon local i fer commit. **Ordre d'instal·lació important.**

## 1. Primer la base de dades

Supabase → SQL Editor → enganxar `api/schema-v2.sql` **sencer** → Run.
És idempotent (es pot tornar a executar). Ha de córrer **abans** del desplegament:
el codi nou crida funcions que encara no existeixen.

Comprovació ràpida després d'executar-lo:

```sql
select proname from pg_proc where proname in
  ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
-- han de sortir 5 files
```

## 2. Després el codi

Fitxers d'aquest ZIP:

| Fitxer | Canvi |
|---|---|
| `api/schema-v2.sql` | **NOU** — migració completa |
| `api/reserva.js` | Reserva atòmica via RPC, honeypot, reintent de referència, llista d'espera |
| `api/_lib/auth.js` | Retorna el nom d'usuari (per registrar-lo com a actor) |
| `api/admin/orders.js` | El canvi d'estat passa per RPC auditada |
| `api/admin/events.js` | Alta/edició/arxiu per RPC auditada |
| `api/admin/audit.js` | **NOU** — `GET /api/admin/audit` |
| `js/checkout.js` | Respecta la resposta de l'API; WhatsApp només si falla |
| `js/admin.js` | Pestanya Auditoria, estat "llista d'espera", export CSV, comptador d'ocupació |
| `js/main.js` | 3 claus noves CA+ES; text legal actualitzat |
| `checkout.html`, `admin.html`, `reserves.html` | Cache-busting a `?v=29` |

## 3. Esborrat manual (els ZIP no poden esborrar)

- **`js/reserva.js`** — codi mort. Es carregava a `reserves.html` però la funció
  `bindReservaForm()` no la cridava ningú. Ja he tret l'etiqueta `<script>`;
  esborra el fitxer a mà des de GitHub Desktop.

## 4. Comprovacions després del desplegament

1. Fer una reserva de prova des de la web → ha de redirigir a `/confirmacio.html`.
2. Panel → pestanya **Auditoria** → hi ha d'haver una línia `insert` amb actor `web-publica`.
3. Canviar-li l'estat a "Confirmada" → nova línia `update` amb actor `admin` i el canvi `status: "pending" → "confirmed"`.
4. Intentar repetir la mateixa reserva amb el mateix telèfon → ha de dir que ja en consta una.
5. Posar `cupo` a 1 en un event de prova i reservar dues places → la segona ha d'anar a llista d'espera.

## 5. Notes de funcionament

- **Les reserves pendents bloquegen plaça indefinidament.** Si algú no contesta el
  telèfon, cal cancel·lar-la des del panel perquè la plaça torni a estar lliure.
- **L'estat "Esgotat" de l'event continua sent manual.** El comptador real el
  calcula la base de dades; l'estat només serveix per tancar inscripcions abans d'hora.
- **La taula `auditoria` no es pot editar ni esborrar**, ni des de l'SQL Editor.
  Hi ha un trigger que ho impedeix. Si algun dia cal purgar per retenció, s'ha de
  desactivar explícitament (i això també queda registrat als logs de Supabase).
- **`admin_upsert_event` sobreescriu tots els camps** que rep. El panel envia
  sempre el formulari sencer, així que no hi ha problema; però no facis PATCH
  parcials contra aquest endpoint des de fora.

## ⚑ [VERIFICAR]

- **L'SQL no s'ha pogut executar contra un Postgres real** (no en tinc cap a mà en
  aquest entorn). Enganxa'l a l'SQL Editor i, si peta en alguna línia, passa'm
  l'error i ho corregeixo al moment.
- **Consentiment RGPD**: he afegit les columnes `consent_rgpd_at` i `consent_versio`
  i les omplo automàticament amb la versió `form-legal-v1` del text que ja mostra
  el formulari. Si vols una casella marcable explícita, digues-me el text exacte i
  l'afegeixo — no me l'invento jo.
- **Camp "notes" del formulari**: continua sent text lliure on algú pot escriure
  dades de salut, just el que el vostre README prohibeix. Proposta per l'Sprint 2:
  avís visible sota el camp i nota al panel.
- **Actor únic**: amb `ADMIN_USER` compartit, tot l'historial dirà el mateix nom.
  La columna ja existeix; el dia que vulguis separar tu i la Nidhi és canviar la
  variable d'entorn, sense migració.

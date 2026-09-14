# Patch v2 — Auditoria de reserves + pàgina de Recursos

Acumulatiu: inclou tot el de la v1. Descomprimir sobre l'arrel del clon local.

## ⚠️ Ordre d'instal·lació

**1r — Base de dades.** Supabase → SQL Editor → enganxar `api/schema-v2.sql` sencer → Run.
És idempotent. Ha de córrer ABANS del desplegament: el codi nou crida funcions que
encara no existeixen.

```sql
-- comprovació: han de sortir 5 files
select proname from pg_proc where proname in
  ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
```

**2n — Codi.** Commit i push. Vercel desplega sol.

---

## BLOC A · Reserves i auditoria

| Fitxer | Canvi |
|---|---|
| `api/schema-v2.sql` | **NOU** — migració completa |
| `api/reserva.js` | Reserva atòmica via RPC, honeypot, reintent de referència, llista d'espera |
| `api/_lib/auth.js` | Retorna el nom d'usuari (actor de l'auditoria) |
| `api/admin/orders.js` | Canvi d'estat per RPC auditada |
| `api/admin/events.js` | Alta/edició/arxiu per RPC auditada |
| `api/admin/audit.js` | **NOU** — `GET /api/admin/audit` |
| `js/checkout.js` | Respecta la resposta de l'API; WhatsApp només si falla |
| `js/admin.js` | Pestanya Auditoria, llista d'espera, export CSV, comptador d'ocupació |

**Com funciona ara:**
- Les reserves pendents bloquegen plaça **fins que les cancel·leu** des del panel.
- Si no queden places, la persona va automàticament a **llista d'espera** amb referència.
- Mateix telèfon + mateixa activitat = reserva duplicada rebutjada.
- Màxim 5 reserves per telèfon i hora (anti-bot), més un camp trampa al formulari.
- Tot canvi a `events` i `reserves` queda a `public.auditoria`, **que no es pot editar
  ni esborrar** ni des de l'SQL Editor (hi ha un trigger que ho impedeix).

---

## BLOC B · 404 de `/admin`

No era cap error de codi: Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

Mentre no facis el push, `comunitat.nexsocial.org/admin.html` ja funciona.

---

## BLOC C · Pàgina de Recursos

Abans: 6 targetes amb `enllaç: '#'`. Cap enllaç portava enlloc.
Ara: **12 recursos oficials reals**, tots amb URL verificada i amb la font visible
a la targeta (que qui el publica es vegi és el que ens diferencia d'un blog).

| Fitxer | Canvi |
|---|---|
| `recursos.html` | Reescrita: estructura nova + estils propis de la pàgina |
| `js/recursos-data.js` | **NOU** — catàleg d'enllaços oficials |
| `js/recursos.js` | **NOU** — render i filtres |

**Interactivitat**, en dos nivells perquè funcioni per a qui no sap què busca:
1. *Què vols fer?* — Vull moure'm · conèixer gent · aprendre · informació · memòria ·
   sentir-me acompanyat. És el llenguatge de la persona, no el nostre.
2. *O busca per tema* — Salut, Alimentació, Moviment, Tràmits i ajuts, Tecnologia,
   Cultura, Vida comunitària.

Els filtres es combinen, es desactiven clicant-los altra vegada i hi ha un botó
"Mostra-ho tot". Tanca la pàgina un bloc de contacte: telèfon + enllaç a l'agenda.

**Recursos inclosos** (Canal Salut gent gran · alimentació 65+ · com moure's més ·
Aquí sí Actius i Salut, cercador i marc conceptual · Sóc una persona gran ·
Drets Socials · Punts Òmnia · Biblioteques de Badalona · Casals de Gent Gran ·
Casals Cívics · La Teranyina).

Cap d'ells és competència: són administracions. Quan tinguem guies pròpies s'afegeixen
al mateix fitxer amb `propi: true` i destaquen visualment.

---

## Esborrat manual (els ZIP no poden esborrar)

- **`js/reserva.js`** — codi mort. Ja he tret l'etiqueta `<script>` de `reserves.html`.
- **`RECURSOS_DATA`** dins `js/data.js` (línies ~167-207) — ja no el carrega ningú.
  No fa cap mal deixar-lo, però és brossa.

## Comprovacions després del push

1. `/admin` carrega el panel (no 404).
2. Reserva de prova → redirigeix a `/confirmacio.html`.
3. Panel → Auditoria → hi ha una línia `insert` amb actor `web-publica`.
4. Canviar l'estat a "Confirmada" → línia `update` amb el canvi `pending → confirmed`.
5. Repetir la reserva amb el mateix telèfon → avís de duplicada.
6. `cupo` a 1 i reservar 2 places → llista d'espera.
7. Recursos → provar un filtre i obrir un parell d'enllaços.

## ⚑ [VERIFICAR]

- **L'SQL no s'ha executat contra un Postgres real** (no en tinc a l'entorn). Si peta
  alguna línia a l'SQL Editor, passa'm l'error i ho corregeixo.
- **Enllaços en castellà**: les targetes tenen el text traduït, però l'URL és la
  mateixa en tots dos idiomes (les pàgines de la Generalitat són en català, algunes
  amb traducció automàtica). No he inventat cap URL `/es/`. Si vols, ho reviso un per un.
- **Consentiment RGPD**: columnes creades i omplertes amb la versió `form-legal-v1`
  del text que ja mostra el formulari. Si vols casella marcable, passa'm el text.
- **Camp "notes"**: continua sent text lliure on algú pot escriure dades de salut.
  Pendent d'avís visible.
- **Actor únic**: amb `ADMIN_USER` compartit tot l'historial dirà el mateix nom.

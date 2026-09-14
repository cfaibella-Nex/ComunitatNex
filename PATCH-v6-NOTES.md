# Patch v6 — Auditoria + admin operatiu + Recursos + contingut (foto i taller nou)

Acumulatiu: inclou tot el de la v1. Descomprimir sobre l'arrel del clon local.

## ⚠️ Ordre d'instal·lació

**1r — Base de dades.** Veure **`SUPABASE-SETUP.md`**, que ho explica pas a pas.
Resum: enganxar **`api/schema-full.sql`** sencer a l'SQL Editor (conté l'esquema base
i la migració en ordre) i executar-lo. És idempotent. Ha de córrer ABANS del
desplegament: el codi nou crida funcions que encara no existeixen.

Fitxers SQL del patch:
- `api/schema-full.sql` — **el que has d'executar**. Base + v2 en ordre.
- `api/schema-v2.sql` — només la migració, si ja tenies l'esquema base.
- `api/seed-events.sql` — opcional: passa les 10 activitats de `data.js` a la BD.

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
| `api/schema-full.sql` | **NOU** — instal·lació completa d'un sol cop |
| `api/schema-v2.sql` | **NOU** — migració: auditoria, reserva atòmica, columnes `imatge_lloc` i `data_label` |
| `api/seed-events.sql` | **NOU** — dades inicials opcionals |
| `SUPABASE-SETUP.md` | **NOU** — guia de posada en marxa |
| `api/reserva.js` | Reserva atòmica via RPC, honeypot, reintent de referència, llista d'espera |
| `api/_lib/auth.js` | Retorna el nom d'usuari (actor de l'auditoria) |
| `api/admin/orders.js` | Canvi d'estat per RPC auditada |
| `api/admin/events.js` | Alta/edició/arxiu per RPC auditada |
| `api/admin/audit.js` | **NOU** — `GET /api/admin/audit` |
| `js/checkout.js` | Respecta la resposta de l'API; WhatsApp només si falla |
| `js/admin.js` | Camps "Imatge del lloc" i "Etiqueta de data", login propi, pestanya Auditoria, llista d'espera, export CSV, comptador d'ocupació |
| `admin.html` | Estils de la pantalla de login · cache-busting a `?v=30` |

**Com funciona ara:**
- Les reserves pendents bloquegen plaça **fins que les cancel·leu** des del panel.
- Si no queden places, la persona va automàticament a **llista d'espera** amb referència.
- Mateix telèfon + mateixa activitat = reserva duplicada rebutjada.
- Màxim 5 reserves per telèfon i hora (anti-bot), més un camp trampa al formulari.
- Tot canvi a `events` i `reserves` queda a `public.auditoria`, **que no es pot editar
  ni esborrar** ni des de l'SQL Editor (hi ha un trigger que ho impedeix).

---

## BLOC B · L'admin sortia en blanc

Dos problemes diferents, tots dos arreglats.

**1) El 404 de `/admin`** — Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

**2) `admin.js` no s'executava gens** — la causa real de la pàgina en blanc, present
des del primer dia. `main.js` declara `esc()`, `qs()`, `qsa()`, `formatDate()`,
`formatPrice()` i `tipoLabel()` com a funcions globals. Els scripts clàssics
comparteixen àmbit global, de manera que la primera línia d'`admin.js`

```js
const { esc, formatDate, formatPrice, tipoLabel, qs, qsa } = window.NX;
```

provocava `SyntaxError: Identifier 'esc' has already been declared` i el navegador
avortava el fitxer sencer abans d'executar-ne cap línia. Cap error a la pantalla,
només la capçalera estàtica.

Solució: `admin.js` va dins d'una IIFE, igual que `agenda.js`, `checkout.js` i
`recursos.js`. **Si algun dia afegeixes un script nou a aquest projecte, embolcalla'l
sempre en `(function() { ... })();`.**

**3) El bucle de recàrrega** — a més, `apiGet()` feia `location.reload()` en rebre un
401 confiant que el navegador obriria el diàleg de Basic Auth. `apiGet()` feia
`location.reload()` en rebre un 401, confiant que el navegador obriria el diàleg de
Basic Auth. Però `fetch()` no obre mai aquest diàleg: hauria recarregat en bucle. Amb el punt 2
arreglat, aquest també ho havia d'estar.

Ara el panel té **pantalla de login pròpia**: usuari i contrasenya, el token es guarda
a `sessionStorage` (es perd en tancar la pestanya) i s'envia com a capçalera
`Authorization` a cada crida. Hi ha botó "Sortir" i, si el token deixa de ser vàlid,
torna al login amb un missatge en lloc de quedar-se penjat.

Les variables `ADMIN_USER` i `ADMIN_PASS` a Vercel segueixen sent les mateixes.

### El 404 original

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

## BLOC D · Contingut

| Fitxer | Canvi |
|---|---|
| `assets/taller-emocional.jpg` | Foto nova del taller de benestar emocional (1200px, q85) |
| `assets/taller-emocional.webp` | Versió WebP de la mateixa foto |
| `js/data.js` | Nou taller "Conversa en anglès" a Can Pepus |

La foto substitueix l'anterior amb el mateix nom, així que no cal tocar cap referència.
El taller nou fa servir `assets/taller-idioma.jpg`, que ja era al repo.

Dades confirmades: gratuït, 12 places, grup setmanal estable. Com que el model no
té un tipus "setmanal", es queda com a `taller` i el caràcter setmanal es comunica
amb `data_label: 'Cada setmana'` i a la descripció. La data `2026-10-08` només
serveix per ordenar; ⚑ falta saber quin dia de la setmana és.

⚑ Pendent de decidir: una reserva d'aquest taller = plaça al grup per a tot el curs
(model actual, coherent amb cupo 12) o inscripció sessió a sessió.

---

## Esborrat manual (els ZIP no poden esborrar)

- **`js/reserva.js`** — codi mort. Ja he tret l'etiqueta `<script>` de `reserves.html`.
- **`RECURSOS_DATA`** dins `js/data.js` (línies ~167-207) — ja no el carrega ningú.
  No fa cap mal deixar-lo, però és brossa.

## Comprovacions després del push

1. `/admin` demana usuari i contrasenya i entra al panel (ni 404 ni pàgina en blanc).
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
- **El login és Basic Auth amb el token a `sessionStorage`.** És prou per a dues
  persones i un panel intern, i és el que ja hi havia al servidor; però no té caducitat
  de sessió ni bloqueig per intents fallits. Quan el panel guardi dades de més gent,
  toca passar a Supabase Auth amb JWT. No urgeix, però que consti.

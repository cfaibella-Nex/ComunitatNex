# Patch v13 · Usuaris del panell i full de seguiment

## 1. Usuaris del panell (com BookingFEB)

Cada persona entra amb el seu correu i contrasenya. L'auditoria diu qui ha fet cada canvi.

| Rol | Pot fer |
|---|---|
| Administració | Tot, inclosos els usuaris |
| Responsable | Activitats, reserves, cobraments, seguiment, passar llista, auditoria |
| Editor | Només preparar i editar activitats |

- Pestanya **Usuaris** (només admin): crear, canviar rol, desactivar, contrasenya temporal nova.
- La contrasenya temporal es mostra **un sol cop** a qui crea l'usuari; la web no envia res.
  En entrar per primer cop, la persona n'ha de triar una de pròpia.
- 5 intents fallits → bloqueig de 15 minuts. No es pot deixar el panell sense cap admin.
- **L'accés compartit d'ara funciona fins que es crea el primer usuari**; després es tanca sol.

### Activació (una vegada)

1. Vercel → Settings → Environment Variables (Production):
   - `GESTOR_SECRET` = 48 caràcters aleatoris (signa les sessions; si canvia, tothom torna a entrar)
   - `GESTOR_SETUP_KEY` = 20+ caràcters aleatoris (només per crear el primer admin)
   Genera-les amb el gestor de contrasenyes o `openssl rand -base64 48`. **Diferents entre elles i de qualsevol altra clau.**
2. Redeploy.
3. `/admin` → **Crear el primer administrador** → clau d'instal·lació + nom + correu + contrasenya.
4. Pestanya Usuaris → crea la Nidhi i el Raúl (rol Responsable) i passa'ls la temporal.
5. Opcional: esborra `GESTOR_SETUP_KEY` de Vercel (ja no serveix: només funciona amb 0 usuaris).

## 2. Seguiment (pestanya nova, i botó a cada activitat)

Full editable per activitat, una fila per persona:

| Columna | Com funciona |
|---|---|
| Nom, Telèfon, Observacions | S'editen directament; es desa en sortir del camp |
| Nivell | La tarifa triada |
| Origen | Web · Trucada · Presencial · Altres |
| **Alta** | ✔ = confirmada per nosaltres (primer contacte fet) |
| **Pagat** | Triar el mètode registra el cobrament; "No pagat" l'anul·la. Les gratuïtes diuen "Gratuït" |
| **Sessions** | Una columna per sessió. Clic: buit → ✓ → ✗ → buit |
| Assist. | % de sessions ja fetes a les quals ha vingut |

- **Sessions automàtiques**: cada setmana, el mateix dia que la data de l'activitat, mes a mes (◀ ▶).
  **×** a la capçalera treu una sessió (festiu, etc.); **Afegir sessió** en posa una a mà.
  Les puntuals tenen una sola columna: el dia de l'activitat.
- **+ Afegir persona** per a qui truca al centre o ve en persona: nom, telèfon (opcional), nivell, places, origen, alta.
  Mateix control d'aforament que la web: si és ple, va a llista d'espera.
- Xifres: aforament ocupat, altes, pagades, assistència del mes.
- **⬇ Excel**: .xlsx real amb les mateixes columnes + full de resum.
- **🖨 Imprimir**: A4 horitzontal amb el que hi ha marcat. **🖨 Full en blanc**: només noms i caselles buides per marcar a mà.
  Peu per a responsable, signatura i data.

**Passar llista** continua com a vista ràpida per al mòbil: escriu a les mateixes dades.

## Instal·lació

1. Supabase → SQL Editor → `api/schema-v13-seguiment.sql` → Run
2. Variables de Vercel (punt 1) + push d'aquest ZIP
3. `/api/health` → `seguiment_v13: true` i `gestor.secret: true`

Funcions Vercel: 9 (nova `api/gestor.js`).

## Correcció inclosa

L'S1 intentava esborrar el hash de contrasenya de l'auditoria després d'escriure'l, però l'auditoria
és immutable i l'esborrat fallava en silenci. Ara el hash no s'hi escriu mai: només consta "canviada".

## Proves fetes

- SQL (Postgres 16): usuaris sense hash a l'auditoria; afegir persona (alta/pendent, sense telèfon);
  editar; sessions treure/afegir i tornar enrere.
- Servidor: accés compartit només sense usuaris; POST sense capçalera o d'un altre domini rebutjat.
- jsdom: primer admin → crear responsable → temporal → canvi obligatori → pestanyes per rol;
  seguiment amb sessions automàtiques i tretes, marcar, cobrar, alta, editar, afegir persona,
  Excel (validat amb openpyxl) i impressió A4 horitzontal.

## ⚑ [VERIFICAR]

- Els **responsables** poden veure l'auditoria i arxivar activitats. Si no ho vols, és una línia a `api/_lib/gestor/auth.js`.
- Treure una sessió no esborra les marques d'aquell dia: si la tornes a afegir, reapareixen.
- L'Excel conté telèfons i noms: tracta'l com a dades personals (no enviar-lo per canals oberts ni deixar-lo a descàrregues compartides).

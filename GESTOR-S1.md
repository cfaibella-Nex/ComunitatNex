# Gestor Comunitat · Sprint 1 — motor de dades i usuaris

Port del motor de BookingFEB. **No canvia res visible**: el panell actual segueix
funcionant igual. L'S1 només deixa la base preparada.

## Què entra

| Fitxer | Què fa |
|---|---|
| `api/gestor-schema.sql` | Taules `contingut` i `usuaris` + RPC dins l'esquema `comunitat` |
| `api/_lib/gestor/auth.js` | Contrasenyes scrypt, sessions signades, bloqueig per intents |
| `api/_lib/gestor/db.js` | Accés a l'esquema |
| `api/_lib/gestor/estat.js` | Diagnòstic |
| `api/_lib/gestor/config.js` | **Els camps editables de Comunitat.** L'únic fitxer que canvia per client |
| `api/_lib/http.js` | Nou `ambTimeout()` |
| `api/health.js` | Ara informa també de l'estat del gestor |

## Instal·lació

1. **SQL** — Supabase → SQL Editor → `api/gestor-schema.sql` sencer → Run.
   Requereix `schema-full.sql` ja executat: reutilitza l'auditoria existent.
2. **Variable a Vercel** — `GESTOR_SECRET`, 48 caràcters aleatoris
   (`openssl rand -base64 48` o el gestor de contrasenyes). Signa les sessions:
   si canvia, tothom ha de tornar a entrar. **Mai la mateixa que cap altra clau.**
3. **Redeploy** i obre `/api/health`: `gestor.taules_ok: true`, `gestor.usuaris: 0`.

Amb això l'S1 queda verificat. El primer usuari es crea a l'S2, quan hi hagi
pantalla per fer-ho.

## Decisions preses en el port

**Un sol esquema.** El gestor no va a un esquema `gestor` propi com a FEB, sinó dins
de `comunitat`, al costat de `events` i `reserves`. Així les consultes que creuen
activitats i reserves no han de saltar d'esquema. L'auditoria, `set_updated_at()` i
`fn_auditoria()` es reaprofiten: FEB les va generalitzar d'aquí, i són idèntiques.

**Rols.** `admin`, `responsable` i `editor`. L'editor pot preparar activitats però no
esborrar-les ni veure reserves: el rol es tria en crear cada persona, així que si la
Nidhi ha d'editar activitats o només gestionar reserves es decideix aquell dia i es
pot canviar.

**El hash de contrasenya no arriba a l'auditoria.** El trigger genèric hauria desat
el hash com qualsevol altre camp. Un trigger posterior el retira dels registres
d'usuaris.

**Cookie `comunitat_sessio`**, httpOnly + Secure + SameSite=Strict, limitada a `/api`.
El JavaScript de la pàgina no la pot llegir.

**Estil Node.** FEB fa servir l'API Web de Vercel (`request.headers.get`); Comunitat
fa servir `(req, res)`. La lectura de cookies s'ha adaptat.

## Comprovat en local

- scrypt: hash en ~94 ms, verifica bé i rebutja la incorrecta
- token de sessió: vàlid; manipulat, rebutjat
- permisos: l'editor pot editar contingut, no pot esborrar

## ⚑ [VERIFICAR]

- L'SQL no s'ha executat contra un Postgres real. Si peta, passa'm l'error.
- `GESTOR_SETUP_KEY` encara no cal: és de l'S2.
- El bucket `comunitat-media` es crea públic de lectura. És per a fotos d'activitats.
  **Mai documents de persones**: un bucket públic és accessible per URL directa.
  (IntraNex té aquest problema obert amb `case-arxius` i `case-fotos`.)

## Què ve després

- **S2** — API del gestor i panell: login, editor de camps, usuaris, desfer.
- **S3** — Catàleg des de la base de dades amb interruptor `CATALOG_SOURCE` i còpia
  de seguretat si Supabase cau. Aquí desapareix el problema de les dues fonts de
  veritat amb `data.js`. Hi entra l'agenda.
- **S4** — Stripe.

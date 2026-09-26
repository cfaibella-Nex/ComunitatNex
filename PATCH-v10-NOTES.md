# Patch v10 · Inscripcions al nivell de BookingFEB

Tarifes per nivell, tres models d'inscripció, extres (mesos, sessions vinculades)
i Stripe preparat però apagat. Els trets de Comunitat es mantenen: escala senior,
CA/ES, reserva sense compte, telèfon sempre visible, llista d'espera i auditoria.

## Instal·lació (en aquest ordre)

1. **Supabase → SQL Editor** → enganxa `api/schema-v10-inscripcions.sql` sencer → Run.
   És idempotent. No toca activitats ni reserves existents.
2. **Push** del patch a `main` (Vercel desplega sol).
3. Obre **`/api/health`** i comprova:
   - `inscripcions_v10: true`
   - `stripe: "off"` (normal fins que el connectem)
4. Prova a la web: una activitat antiga ha de funcionar igual que abans.

Si el pas 3 diu `FALTA`, el SQL no s'ha executat al projecte bo.

## Com es fa servir (panell)

Editar activitat → secció **Inscripció i preus**:

| Camp | Opcions |
|---|---|
| Model | Puntual · Mensual · Trimestral |
| Com es cobra | Només reserva · Presencial · Online |
| Tarifes | Un nivell o més. Preu fix / Gratuït / A consultar. Places pròpies opcionals. Estat Disponible/Complet |
| Extres | Mes (només mensual) · Sessió vinculada · Extra |

**Castellà amb nivells (novembre):** afegir nivell "Intermedi" amb el seu horari al
detall. Si cada grup té aforament propi, posa les places al nivell.

**Autodefensa 13/10 + 10/11:** crea les dues activitats (Can Pepus i Sant Roc).
A la primera, *+ Afegir sessió vinculada* → tria la segona. Qui s'hi apunti pot
afegir la segona sessió al pas 2; ocupa plaça a la segona activitat (reserva filla
`NX-XXXXXX-A`, visible a les seves reserves).

**Activitat mensual:** *+ Afegir mes* crea el mes següent amb nom automàtic i el
preu de la tarifa. Es pot editar tot.

## Flux públic

1. Detall → tria nivell i places (amb una sola tarifa es veu com abans).
2. Extres → només si l'activitat en té.
3. Dades → reservar, o pagar amb targeta si l'activitat és "Online" i Stripe està actiu.

Si hi ha alguna línia "a consultar", mai es cobra online: es reserva.

## Fitxers

| Nou | Què fa |
|---|---|
| `api/schema-v10-inscripcions.sql` | Columnes, reserva atòmica v2, pagament, ocupació per nivell |
| `api/_lib/tarifes.js` | Validació del panell i càlcul del preu al servidor |
| `api/_lib/stripe.js` | Stripe Checkout (un compte) i firma del webhook |
| `api/stripe/webhook.js` | Únic punt que marca una reserva com a pagada |
| `js/carret.js` | Carret, preus i textos CA/ES del procés |
| `extres.html`, `js/extres.js` | Pas 2 |

Modificats: `api/reserva.js` (POST v2 + GET estat), `api/events.js`, `api/admin/events.js`,
`api/health.js`, `js/agenda.js`, `js/checkout.js`, `js/admin.js`, `admin.html`,
`detall.html`, `checkout.html`, `confirmacio.html`, `css/styles.css`.

Funcions Vercel: 8 (límit Hobby 12).

## Proves fetes

- SQL en Postgres 16 real: instal·lació x2, nivell complet, nivell ple → espera,
  duplicat, sessió vinculada, sessió plena (no insereix res), pagament repetit (no fa res).
- Servidor: preu manipulat ignorat, límits de places i extres, validacions del panell,
  firma Stripe bona / falsa / caducada.
- jsdom: circuit sencer castellà (mensual + online), autodefensa (sessió vinculada),
  activitat antiga, confirmació ok/ko, editor del panell i taula de reserves.

## ⚑ [VERIFICAR]

- El webhook usa la signatura `export POST` (com BookingFEB). No provat desplegat a Comunitat.
- Pagament online + activitat plena → llista d'espera sense pagar (mateix criteri que ara).
- `js/carret.js` duplica `tarifesEvent`/`extresEvent` d'`api/_lib/tarifes.js`: si canvies un, canvia l'altre.

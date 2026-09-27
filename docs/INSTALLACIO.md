# Instal·lació i configuració

## 1. Base de dades (Supabase → SQL Editor)
Executa els fitxers de `sql/` **en ordre de número**. Tots són idempotents: es poden tornar a executar sense perill.

| Fitxer | Què fa |
|---|---|
| `00-schema-full.sql` | Esquema `comunitat`: activitats, reserves, auditoria |
| `01-inscripcions.sql` | Tarifes, nivells, extres, sessions vinculades, Stripe |
| `02-cobraments-llista.sql` | Cobraments, link de pagament, passar llista |
| `03-cartells.sql` | Cartell oficial per activitat |
| `04-usuaris-gestor.sql` | Usuaris del panell |
| `05-seguiment.sql` | Full de seguiment, altes manuals, sessions |
| `06-setmanals-contacte.sql` | Activitats setmanals, persona de contacte |
| `07-proves-rgpd.sql` | Registre de proves d'informació (art. 5.2 RGPD) |
| `08-textos-rgpd-v3.sql` | Text v3 de la informació bàsica |
| `09-baixa-esborrat.sql` | Baixa amb esborrat de dades personals (també de l'auditoria) |

⚠ Si algun dia tornes a executar un fitxer antic (p. ex. el 05), executa després **tots els següents fins al final**: alguns redefineixen la mateixa funció d'auditoria.

`sql/antic/` només és historial: **no s'executa**.

Comprovació: `/api/health` ha de dir `true` a totes les línies.

## 2. Variables de Vercel (Production)
| Variable | Per a què |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Base de dades |
| `GESTOR_SECRET` | Signa les sessions del panell (48 caràcters aleatoris) |
| `GESTOR_SETUP_KEY` | Només per crear el primer admin; després es pot esborrar |
| `ADMIN_USER`, `ADMIN_PASS` | Accés compartit antic: només funciona mentre no hi ha usuaris |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Pagament amb targeta (opcional, vegeu §4) |

## 3. Primer accés
`/admin` → **Crear el primer administrador** (clau = `GESTOR_SETUP_KEY`) → pestanya Usuaris.

## 4. Stripe (pagament amb targeta)

Només quan decidim cobrar online. Fins llavors no cal fer res.

1. Compte Stripe a nom de **NexSocial SCCL**. ⚑ [VERIFICAR] text de l'extracte bancari.
2. Stripe → Developers → **Webhooks** → Add endpoint:
   - URL: `https://comunitat.nexsocial.org/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
3. Vercel → Settings → Environment Variables (Production):
   - `STRIPE_SECRET_KEY` = `sk_test_…` (primer en test)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_…` (el del webhook del pas 2)
4. Redeploy. `/api/health` ha de dir `stripe: "test"`.
5. Activitat de prova amb "Com es cobra: Online" i preu fix → pagar amb `4242 4242 4242 4242`.
   Al panell la reserva ha de sortir **Pagat** i **Confirmada**.
6. Per passar a real: les dues variables en `live` (i un webhook nou en mode live).

Cal **les dues** variables: sense el secret del webhook no s'activa mai
(cobraria però la reserva no passaria a pagada).

### Links de pagament des del panell

Fan servir el mateix compte i el mateix webhook: no cal configurar res més.
Amb `stripe: "test"` al panell surt "Mode prova" i els links no cobren de debò.

## 5. Supabase (referència de la configuració inicial)

**No cal crear cap projecte nou.** Comunitat va dins del projecte de Supabase
d'IntraNex, en un esquema propi anomenat `comunitat`.

### Per què així

El pla gratuït permet dos projectes actius, i el límit compta per persona (Owner o
Admin) sumant totes les organitzacions: crear-ne una de nova no ho esquiva. Amb
IntraNex i NexlicitIA ja n'hi ha dos.

Compartir projecte és coherent: IntraNex i Comunitat són la mateixa cooperativa i el
mateix responsable del tractament. La separació que importa —respecte a BookingFEB,
que és una altra entitat— es manté.

El que **no** es podia fer és instal·lar-ho a `public`: IntraNex hi té `persones`,
`casos`, `clients` i probablement una funció `set_updated_at()`. El nostre
`create or replace` l'hauria sobreescrita.

---

### 1. Crear les taules

Supabase → projecte **IntraNex** → **SQL Editor** → *New query* → enganxa
**`sql/00-schema-full.sql`** sencer → *Run*.

Ha de dir "Success. No rows returned". No toca res d'IntraNex: tot va dins de
`comunitat`. És idempotent.

Comprovació:

```sql
select table_name from information_schema.tables where table_schema = 'comunitat';
-- events, reserves, recursos, auditoria
```

I que IntraNex segueix intacte:

```sql
select count(*) from public.persones;
```

---

### 2. Exposar l'esquema a l'API

**Aquest pas és imprescindible i és el que es descuida tothom.**

Supabase → **Settings** → **API** → *Exposed schemas* → afegir **`comunitat`** al
costat de `public` → *Save*.

Sense això, totes les crides responen 404 encara que les taules existeixin.

---

### 3. Copiar les claus a Vercel

Són les **mateixes** claus del projecte IntraNex: Supabase → *Settings* → *API Keys*.

A Vercel → projecte de ComunitatNex → *Settings* → *Environment Variables*.
Els noms han de ser exactament aquests:

| Variable | D'on surt |
|---|---|
| `SUPABASE_URL` | Project URL d'IntraNex (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | clau **`service_role`**, no la `anon` |
| `ADMIN_USER` | la tries tu (per defecte `admin`) |
| `ADMIN_PASS` | la tries tu |

Marca Production, Preview i Development.

---

### 4. Redesplegar

Vercel → *Deployments* → el darrer → `···` → **Redeploy**.

Les funcions llegeixen les variables en arrencar. Sense redeploy, res no canvia.

---

### Comprovació final

1. `/admin` → entra amb `ADMIN_USER` / `ADMIN_PASS`.
2. **Events** → buida (o amb 10 activitats si has fet el seed).
3. **Auditoria** → "Cap moviment registrat encara". Si dona error, o falta el pas 2
   o l'SQL no s'ha executat.
4. Reserva de prova des de la web → apareix a Reserves i genera una línia `insert`
   a Auditoria amb actor `web-publica`.

---

### Opcional: passar les activitats a la base de dades

`api/seed-events.sql` posa les 10 activitats actuals de `data.js` dins de
`comunitat.events`. Llegeix abans "Dues fonts de veritat".

---

### Dues fonts de veritat

Amb Supabase en marxa, `api/events.js` mana i `data.js` queda com a xarxa de
seguretat quan l'API no respon.

Si afegeixes una activitat al panel i una altra a `data.js`, tindràs duplicats o
absències segons si l'API respon. Tria:

- **Recomanat** — fes el seed, gestiona-ho tot des del panel, no tornis a tocar
  `data.js`.
- **Alternativa** — no facis el seed i segueix amb `data.js`. El panel serveix
  igualment per a les reserves.

---

### Dos riscos que has de tenir presents

**La clau `service_role` obre tot el projecte.** És la mateixa d'IntraNex, i qui la
tingui pot llegir `casos` i `persones`, no només les reserves. El codi només toca
`comunitat`, però la clau no ho limita. Viu només a les variables d'entorn de Vercel:
mai al repositori, mai al navegador, mai per correu ni WhatsApp. Si alguna vegada
sospites que s'ha filtrat, es regenera des de Supabase i es torna a desplegar.

**La pausa automàtica.** Els projectes gratuïts es pausen als 7 dies sense activitat i
el primer accés triga entre 10 i 30 segons a despertar-los, prou perquè la funció de
Vercel expiri i una persona que intenti reservar vegi un error. Com que IntraNex
s'utilitza cada setmana, el projecte es manté despert i això juga a favor. Si un dia
les reserves són crítiques, el pla Pro (25 €/mes) elimina la pausa. Encara no toca.

# Posar Supabase en marxa

**No cal crear cap projecte nou.** Comunitat va dins del projecte de Supabase
d'IntraNex, en un esquema propi anomenat `comunitat`.

## Per què així

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

## 1. Crear les taules

Supabase → projecte **IntraNex** → **SQL Editor** → *New query* → enganxa
**`api/schema-full.sql`** sencer → *Run*.

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

## 2. Exposar l'esquema a l'API

**Aquest pas és imprescindible i és el que es descuida tothom.**

Supabase → **Settings** → **API** → *Exposed schemas* → afegir **`comunitat`** al
costat de `public` → *Save*.

Sense això, totes les crides responen 404 encara que les taules existeixin.

---

## 3. Copiar les claus a Vercel

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

## 4. Redesplegar

Vercel → *Deployments* → el darrer → `···` → **Redeploy**.

Les funcions llegeixen les variables en arrencar. Sense redeploy, res no canvia.

---

## Comprovació final

1. `/admin` → entra amb `ADMIN_USER` / `ADMIN_PASS`.
2. **Events** → buida (o amb 10 activitats si has fet el seed).
3. **Auditoria** → "Cap moviment registrat encara". Si dona error, o falta el pas 2
   o l'SQL no s'ha executat.
4. Reserva de prova des de la web → apareix a Reserves i genera una línia `insert`
   a Auditoria amb actor `web-publica`.

---

## Opcional: passar les activitats a la base de dades

`api/seed-events.sql` posa les 10 activitats actuals de `data.js` dins de
`comunitat.events`. Llegeix abans "Dues fonts de veritat".

---

## Dues fonts de veritat

Amb Supabase en marxa, `api/events.js` mana i `data.js` queda com a xarxa de
seguretat quan l'API no respon.

Si afegeixes una activitat al panel i una altra a `data.js`, tindràs duplicats o
absències segons si l'API respon. Tria:

- **Recomanat** — fes el seed, gestiona-ho tot des del panel, no tornis a tocar
  `data.js`.
- **Alternativa** — no facis el seed i segueix amb `data.js`. El panel serveix
  igualment per a les reserves.

---

## Dos riscos que has de tenir presents

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

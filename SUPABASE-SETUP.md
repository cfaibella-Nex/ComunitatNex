# Posar Supabase en marxa — guia curta

Quatre passos. Uns 10 minuts.

---

## 1. Crear el projecte

[supabase.com](https://supabase.com) → *New project*.

| Camp | Què posar-hi |
|---|---|
| Name | `comunitat-nexsocial` |
| Database password | **Genera-la i guarda-la al gestor de contrasenyes.** No és la del panel; és la del Postgres i no la podràs recuperar. |
| Region | **Frankfurt** o **Ireland** — cap altra. Són dades de persones i han de quedar a la UE. |
| Plan | Free |

Triga un parell de minuts a arrencar.

---

## 2. Crear les taules

Menú lateral → **SQL Editor** → *New query* → enganxa **`api/schema-full.sql`** sencer → *Run*.

Ha de dir "Success. No rows returned". Conté l'esquema base i la migració d'auditoria
en l'ordre correcte, així no cal recordar quin va primer. Es pot tornar a executar
sense perill.

Comprovació:

```sql
select proname from pg_proc where proname in
  ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
-- han de sortir 5 files
```

**Opcional:** si vols que les 10 activitats actuals passin a la base de dades i
gestionar-les des del panel, executa també **`api/seed-events.sql`**. Llegeix abans
l'apartat "Dues fonts de veritat" més avall.

---

## 3. Copiar les claus a Vercel

A Supabase: *Settings* → *API Keys*.

A Vercel, al projecte → *Settings* → *Environment Variables* → *Add New*.
Els noms han de ser **exactament** aquests:

| Variable | D'on surt |
|---|---|
| `SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | clau **`service_role`**, no la `anon` |
| `ADMIN_USER` | la tries tu (si no la poses, per defecte és `admin`) |
| `ADMIN_PASS` | la tries tu |

Marca els tres entorns (Production, Preview, Development).

La `service_role` salta el RLS: només pot viure a Vercel, mai al codi del navegador
ni al repositori.

---

## 4. Redesplegar

Vercel → *Deployments* → el darrer → `···` → **Redeploy**.

Les funcions llegeixen les variables en arrencar. Sense redeploy continuaràs veient
el mateix error i semblarà que no ha servit de res.

---

## Comprovació final

1. `/admin` → entra amb `ADMIN_USER` / `ADMIN_PASS`.
2. Pestanya **Events** → buida si no has fet el seed, amb 10 activitats si sí.
3. Pestanya **Auditoria** → "Cap moviment registrat encara" (ja no error).
4. Fes una reserva de prova des de la web → ha d'aparèixer a Reserves i generar una
   línia `insert` a Auditoria amb actor `web-publica`.

---

## Dues fonts de veritat

Ara mateix les activitats viuen a `js/data.js` i la web les llegeix d'allà quan l'API
no respon. Amb Supabase en marxa, `api/events.js` passa a manar i `data.js` queda com
a xarxa de seguretat.

**El risc:** si afegeixes una activitat al panel i una altra a `data.js`, tindràs la
mateixa activitat duplicada o desapareguda segons si l'API respon. Tria una de les dues:

- **Recomanat** — executa el seed, gestiona-ho tot des del panel i no tornis a tocar
  `data.js` excepte per mantenir el llistat de reserva actualitzat de tant en tant.
- **Alternativa** — no facis el seed i segueix amb `data.js` fins que tinguis més
  activitats. El panel serveix igualment per a les reserves.

---

## Límits del pla gratuït

500 MB de base de dades i pausa automàtica després d'una setmana sense cap petició.
Per al volum de reserves que tindreu, l'espai sobra. La pausa sí que importa: si el
projecte s'atura, la primera visita a la web triga uns segons a despertar-lo. Com que
la web rep visites cada dia, no hauria de passar.

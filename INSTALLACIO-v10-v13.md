# Comunitat · Paquet complet v10 → v13 (amb v12c)

Conté **només fitxers nous o modificats**. No n'esborra cap: les fotos pròpies de
NexSocial (`assets/*.jpg`, `*.webp`) i les pujades al panell (bucket `comunitat-media`)
es queden igual. Els cartells nous van a una carpeta a part: `assets/cartells/`.

## Ordre

1. **Supabase → SQL Editor**, un per un (tots es poden tornar a executar sense perill):
   1. `api/schema-v10-inscripcions.sql`
   2. `api/schema-v11-control.sql`
   3. `api/schema-v12-cartells.sql` — només omple `cartell` on és buit; **no toca `imatge`**
   4. `api/schema-v13-seguiment.sql`
2. **Vercel → Environment Variables**: `GESTOR_SECRET` (48 caràcters) i `GESTOR_SETUP_KEY` (20+). Diferents.
3. **Descomprimir sobre el repo i push** (sobreescriure quan ho demani).
4. `/api/health` → `inscripcions_v10`, `control_v11`, `cartells_v12`, `seguiment_v13`: tots `true`.
5. `/admin` → Crear el primer administrador → pestanya Usuaris.
6. Ctrl+Shift+R a la web.

Detall de cada part: `PATCH-v10-NOTES.md`, `PATCH-v11-NOTES.md`, `PATCH-v12-NOTES.md`,
`PATCH-v13-NOTES.md`, `STRIPE-SETUP.md`.

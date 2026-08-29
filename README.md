# Comunitat NexSocial — `comunitat.nexsocial.org`

Espai digital de vida comunitària de **NexSocial SCCL**. Agenda, reserves,
recursos i passatemps orientats a persones grans (senior-first, WCAG AA).

## Estat: Fase 1 (MVP navegable)
- ✅ Hero amb 4 accessos grans (Agenda / Tallers / Recursos / Passatemps)
- ✅ Llistat i detall d'events (activitats mensuals, tallers, esdeveniments)
- ✅ Reserva sense compte (nom + telèfon), sense pagament online
- ✅ Panell admin amb password (crear/editar events, veure reserves)
- ✅ Bilingüe CA / ES
- ✅ Fallback a dades estàtiques si Supabase no està configurat
- ⏳ Passatemps (placeholder — HTML estàtics quan es defineixin)
- ⏳ Pagament online (Fase 2, quan calgui per Autodefensa)

## Desplegament — pas a pas

### 1. Pujar a GitHub
1. Descomprimir aquest zip
2. GitHub Desktop → File → Add local repository → seleccionar la carpeta
3. Publish repository com `nexsocial-comunitat` (privat)

### 2. Connectar a Vercel
1. vercel.com → New Project → Import `nexsocial-comunitat`
2. Framework preset: **Other**
3. Deploy (sense env vars encara — funciona amb dades estàtiques de `js/data.js`)

### 3. Domini a IONOS
1. IONOS → Dominis → nexsocial.org → DNS
2. Afegir **CNAME**: `comunitat` → `cname.vercel-dns.com` (TTL 3600)
3. A Vercel → Settings → Domains → afegir `comunitat.nexsocial.org`
4. HTTPS s'activa sol (Let's Encrypt) en uns minuts

### 4. Activar Supabase (opcional per Fase 1, obligatori per reserves reals)
1. supabase.com → New project (regió EU-Frankfurt)
2. SQL Editor → enganxar `api/schema.sql` sencer i executar
3. A Vercel → Settings → Environment Variables afegir:
   - `SUPABASE_URL` = https://xxxxx.supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY` = eyJxxx... (Settings → API → service_role)
   - `ADMIN_USER` = admin
   - `ADMIN_PASS` = (una password llarga)
4. Redeploy

### 5. Foto hero
Substituir `assets/hero-placeholder.svg` per la foto real (`hero.jpg`) i
actualitzar la referència a `index.html`. Idealment 1920×1080, <300kB,
comprimida amb tinypng.com. 

## Estructura

```
├── index.html            Portada — hero + 4 blocs
├── agenda.html           Llistat filtrable per tipus
├── detall.html           Detall d'event + reserva
├── recursos.html         Fitxes (enllacen a YouTube/Drive)
├── passatemps.html       Placeholder
├── confirmacio.html      OK reserva
├── admin.html            Panell (protegit)
├── css/styles.css        Design system NexSocial (senior-first)
├── js/
│   ├── main.js           i18n, nav, helpers, boot
│   ├── data.js           Dades estàtiques (fallback + demo inicial)
│   ├── agenda.js         Renderitzat llistat + detall
│   ├── reserva.js        Flow reserva
│   └── admin.js          CRUD events + gestió reserves
└── api/
    ├── events.js         GET /api/events
    ├── reserva.js        POST /api/reserva
    ├── health.js         GET /api/health
    ├── schema.sql        Esquema Postgres
    ├── admin/
    │   ├── events.js     GET/POST/PATCH/DELETE
    │   └── orders.js     GET reserves
    └── _lib/
        ├── supabase.js
        ├── auth.js       Basic Auth admin
        └── http.js       Helpers CORS/JSON
```

## Gestió d'events (Fase 1)
Dues vies:
- **Sense Supabase**: editar `js/data.js` directament i redeploy (git push)
- **Amb Supabase**: entrar a `/admin.html`, login, crear/editar via UI

## Principis de disseny (no negociables)
- Base font 20px, headings 32-48px, cap text sota 16px
- Contrast AAA (INK #0F2D1E sobre CREAM #F5F0E8 = 14:1)
- Targets tàctils mínim 48×48px
- Cap carrusel automàtic, cap modal agressiu
- Cap registre obligatori, cap password per l'usuari final
- Sempre visible: "Prefereixes reservar per telèfon? Truca'ns al 900..."
- `prefers-reduced-motion`: respectat

## Separació TraçaNex
Aquest sistema **NO** té accés a TraçaNex ni a expedients de casos.
Guarda només: nom, telèfon, email opcional, reserves, notes públiques.
Cap dada de salut, cap UCLA, cap seguiment individualitzat.

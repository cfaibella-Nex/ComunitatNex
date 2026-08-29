# API — Comunitat NexSocial

Serverless functions per Vercel (Node 18+).

## Endpoints públics
| Mètode | Ruta | Descripció |
|---|---|---|
| GET | `/api/health` | Ping (mai falla) |
| GET | `/api/events` | Llista events actius |
| POST | `/api/reserva` | Crea reserva (nom+telèfon) |

## Endpoints admin (Basic Auth)
| Mètode | Ruta | Descripció |
|---|---|---|
| GET | `/api/admin/events` | Llista tots els events (inclou arxivats) |
| POST | `/api/admin/events` | Crea event |
| PATCH | `/api/admin/events` | Modifica event (body inclou `id`) |
| DELETE | `/api/admin/events` | Arxiva event (soft delete) |
| GET | `/api/admin/orders?event_id=X` | Reserves (opcional filtre per event) |
| PATCH | `/api/admin/orders` | Canvia status reserva |

## Variables d'entorn (Vercel → Settings → Environment Variables)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ADMIN_USER=admin
ADMIN_PASS=una-password-llarga-i-única
```

## Fallback estàtic
Si Supabase no està configurat, `/api/events` retorna 503 i el frontend
llegeix `js/data.js`. Això permet desplegar sense BD per fer proves.

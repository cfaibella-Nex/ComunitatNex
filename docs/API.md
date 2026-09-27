# API · Comunitat NexSocial

Funcions serverless de Vercel (Node 18+). Accés a Supabase amb `service_role`, sempre per RPC
quan hi ha escriptura (canvi + auditoria a la mateixa transacció).

## Públiques
| Mètode | Ruta | Què fa |
|---|---|---|
| GET | `/api/health` | Estat de la configuració i de cada migració |
| GET | `/api/events` | Activitats visibles, amb ocupació i com es cobra |
| POST | `/api/reserva` | Inscripció. Recalcula el preu, exigeix `consentiment: true` i desa la versió del text |
| GET | `/api/reserva?ref=` | Estat mínim d'una reserva (pàgina de confirmació) |
| POST | `/api/stripe/webhook` | Avís signat de Stripe: únic punt que marca "pagat" |

## Usuaris del panell · `/api/gestor?op=`
`estat` · `setup` (primer admin) · `login` · `logout` · `jo` · `contrasenya` · `usuaris` · `usuari`.
Els POST exigeixen la capçalera `x-gestor: 1` i el mateix origen. Sessió per cookie HttpOnly (12 h).

## Panell (sessió d'usuari; permís segons rol)
| Ruta | Permís | Què fa |
|---|---|---|
| `/api/admin/events` GET/POST/PATCH/DELETE | contingut / esborrar | Activitats (DELETE = arxivar) |
| `/api/admin/orders` GET | reserves | Reserves · `?llista=&data=` assistència · `?assistencia_totes=&des=&fins=` |
| `/api/admin/orders` PATCH | reserves | `status` · `pagament` · `anular_pagament` · `link` · `assistencia` · `afegir_persona` · `editar` · `sessio` · `informada` |
| `/api/admin/audit` GET | auditoria | Registre immutable |
| `/api/media` POST | contingut | Pujar imatges al bucket `comunitat-media` |

Rols: **admin** (tot) · **responsable** (activitats, reserves, cobraments, seguiment, llista, auditoria) · **editor** (activitats).

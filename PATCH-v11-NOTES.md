# Patch v11 · Control intern: cobraments, link de pagament i passar llista

La web **no envia res a ningú**. Tot és per a l'equip, des del panell.

## Instal·lació

Si encara no has aplicat el v10, aquest ZIP ja l'inclou. Ordre:

1. Supabase → SQL Editor → `api/schema-v10-inscripcions.sql` → Run (si no estava fet)
2. Supabase → SQL Editor → `api/schema-v11-control.sql` → Run
3. Push del patch
4. `/api/health` → `inscripcions_v10: true` i `control_v11: true`

## Què hi ha de nou al panell

**Reserves i cobraments** (pestanya reanomenada)
- Xifres a dalt: cobrat, pendent de cobrar (+ quantes a consultar), estat de Stripe.
- Filtres: Totes · Pendents de cobrar · Pagades · Llista d'espera.
- Botó **Cobrar** a cada reserva:
  - **Ja ha pagat** → import, com (efectiu, Bizum, transferència, targeta TPV, altres) i nota.
    La reserva passa a pagada i, si era pendent, a confirmada.
  - **Enviar link de pagament** → genera un link de Stripe per a aquella reserva i import.
    Botons *Copiar* i *Obrir WhatsApp* (amb el text ja escrit, l'envieu vosaltres).
    El link viu 23 h; si caduca, la reserva **no es cancel·la**: torna a "pendent" i se'n fa un altre.
    Serveix també per a reserves "a consultar": poses l'import que toqui.
  - **Anul·lar el registre** d'un cobrament mal apuntat (queda el motiu a l'auditoria).
    Si era amb targeta, el retorn de diners es fa al tauler de Stripe.
- CSV amb import cobrat, mètode i data de cobrament.

**Passar llista** (pestanya nova, i botó a cada activitat)
- Tria activitat i dia. Puntuals: per defecte el dia de l'activitat. Mensuals: avui.
- Botons grans *✔ Ha vingut* / *✗ No ha vingut*; tornar a prémer desmarca.
- Cada dia es guarda a part: a castellà es passa llista cada sessió.
- A les puntuals, marcar el dia de l'activitat canvia l'estat a *Va assistir* / *No va venir*.
- Es veu qui té pendent de pagar, per cobrar-ho allà mateix.
- **Imprimir**: full amb noms, telèfon i una casella per marcar a mà.

## Fitxers

Nous: `api/schema-v11-control.sql`, `PATCH-v11-NOTES.md`
Modificats: `api/admin/orders.js`, `api/_lib/stripe.js`, `api/stripe/webhook.js`,
`api/health.js`, `js/admin.js`, `admin.html`

Funcions Vercel: continuen sent 8 (tot va per `api/admin/orders.js`).

## Proves fetes

- SQL en Postgres 16: instal·lació x2; cobrament manual i anul·lació; link generat dues
  vegades i la caducitat del vell no toca el nou; un link caducat no cancel·la la reserva;
  pagament per link → pagada amb targeta; passar llista per dia, desmarcar, sincronia
  d'estat a les puntuals, bloqueig a llista d'espera; auditoria amb qui ho ha fet.
- jsdom: xifres, filtres, cobrament en efectiu, link amb Stripe en prova, WhatsApp amb
  el text i el 34 davant, passar llista marcar/desmarcar.

## ⚑ [VERIFICAR]

- Mètodes de cobrament: efectiu, Bizum, transferència, targeta (TPV), altres. Si en falta cap, digues-m'ho.
- Text del WhatsApp: "Hola {nom}! Aquí tens l'enllaç per pagar {activitat} (ref. …, import): {link}".
- El link de pagament només funciona amb Stripe connectat (`STRIPE-SETUP.md`); fins llavors el panell ho diu i deixa registrar cobraments manuals.

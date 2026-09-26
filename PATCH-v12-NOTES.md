# Patch v12 · Cartells oficials dels centres cívics

Dues imatges per activitat, com a BookingFEB:

| Camp | Què és | On es veu |
|---|---|---|
| **Cartell oficial** | El cartell del centre cívic (A4) | Portada, agenda, reserves i detall. Sencer, mai retallat. Al detall es pot obrir a mida completa. |
| **Imatge de NexSocial** | La nostra | Al final de la reserva (resum del pas de dades). Si l'activitat no té cartell, es veu a tot arreu com fins ara. |

## Instal·lació

1. Supabase → SQL Editor → `api/schema-v12-cartells.sql` → Run.
   Al final mostra quines activitats han quedat amb cartell.
2. Push del patch (inclou v10 i v11 si encara no hi són, i els 7 cartells a `assets/cartells/`).
3. `/api/health` → `cartells_v12: true`.

## Cartells inclosos (optimitzats a ~120–230 KB)

| Fitxer | Activitat existent | Assignat pel SQL |
|---|---|---|
| `ccstroc-mobil.jpg` | `taller-mobil-santroc` | ✔ |
| `ccstroc-autodefensa.jpg` | `taller-autodefensa-santroc` | ✔ |
| `ccstroc-castella.jpg` | `taller-castellano-santroc` | ✔ |
| `csbcanpepus-autodefensa.jpg` | `taller-autodefensa-canpepus` | ✔ |
| `csbcanpepus-conversaenangles.jpg` | `taller-angles-canpepus` | ✔ |
| `csbcanpepus-memoria.jpg` | — (no existeix l'activitat) | Posa-la des del panell en crear-la |
| `csbcanpepus-mobil.jpg` | — (no existeix l'activitat) | Posa-la des del panell en crear-la |

Per a activitats noves: Editar → **Cartell oficial (centre cívic)** → Pujar una foto,
o escriure la ruta `/assets/cartells/…jpg`.

## Nivells

Cada activitat pot tenir els nivells que calgui des de v10: Editar → Inscripció i
preus → **+ Afegir nivell** (ex. castellà Intermedi al novembre, amb el seu horari
al detall i places pròpies si és un grup a part).

## ⚑ [VERIFICAR] — el que diuen els cartells vs. el que hi ha a la web

- **Autodefensa Can Pepus**: el cartell diu 13/10 **i** 10/11, totes dues a Can Pepus, de 18 a 19.30 h.
  Abans es parlava d'una sessió a cada centre. Si és així, la sessió vinculada es fa entre dues activitats de Can Pepus.
- **Autodefensa Sant Roc**: "una sessió al mes", sense dates → encaixa com a activitat mensual.
- **Horaris** a revisar al panell: castellà Sant Roc dimarts 16.30–17.30 · mòbil Sant Roc dimarts 11–12 ·
  anglès Can Pepus dimarts 16.30–17.30 · memòria Can Pepus dijous 11–12 · mòbil Can Pepus dijous 10–11.
- Els cartells porten el text "Vecteezy.com" al marge (crèdit de la il·lustració): comprovar que la llicència ho cobreix.

## v12b · Cartells a la mateixa mida que la resta

- Targetes, portada i agenda: el cartell es retalla a la mida de sempre i es veu la part de dalt
  (títol i il·lustració). Totes les targetes queden iguals.
- **Lupa 🔍** a cada cartell (48 px): l'obre sencer a pantalla completa, sense sortir de la pàgina.
  Es tanca amb ×, Esc o clicant fora; el focus torna a la lupa (teclat i lector de pantalla).
- Detall: capçalera de mida normal amb el botó "🔍 Veure el cartell".
- Sense canvis a la base de dades.

# Comunitat NexSocial · Historial de canvis

De més recent a més antic. **Cada sprint afegeix una entrada a dalt d'aquest fitxer**: no es creen fitxers de notes nous.

---

## v32 · Peu: logo de NexSocial més gran i correu en una línia

- `js/main.js` + `css/styles.css`: la columna de logos passa de 170 a 240 px; el de NexSocial
  ocupa tota l'amplada (240 px) i l'Aquí sí! fins a 200 px. A Contacte, la icona i el telèfon o
  el correu van a la mateixa línia (el correu saltava sota la icona).
- Inclou la v31 (no publicada per separat). Segell `?v=59`.

---

## v31 · Calendari: les activitats amb dia a l'etiqueta hi surten

- `js/agenda.js`: una activitat només queda fora de la graella si l'etiqueta és "Pròximament" o no
  porta número de dia ("Octubre 2026"). Amb "23/10/2026" o "Dissabte 24" va al calendari.
- `js/admin.js`: ajuda del camp "Etiqueta de data": deixar-lo buit si l'activitat té dia.
- Segell de caché de tots els HTML: `?v=58` → `?v=59`.

---

## v30 · Seguiment: filtres i ordre per columna

- `js/admin.js` + `admin.html`: barra de filtres a sobre de la taula (vista d'una activitat i
  "Totes"): cerca per nom, contacte o telèfon (des de 3 xifres, sense espais ni accents), estat de
  trucada (inclou "Per trucar" = pendent + no contesta) i pagat (pendents, pagats, no han de pagar).
  Comptador "X de Y" i "Treure filtres".
- Capçaleres ordenables amb clic (Nom, Telèfon, Activitat, Trucada, Pagat, Assist.): segon clic
  inverteix l'ordre. `aria-sort` per a lectors de pantalla.
- Els filtres es mantenen en canviar d'activitat o de mes. S'apliquen a la taula, a la impressió i
  a l'Excel; les xifres de dalt continuen comptant tothom.
- "Veure només aquestes" (per trucar) ara fa servir el mateix filtre de trucada.
- Segell de caché de tots els HTML: `?v=57` → `?v=58`.

---

## v29 · Seguiment: "No s'hi apunta" sense esborrar, botó Actualitzar i més velocitat

Dades: **executar `sql/16-no-sapunta.sql`** a Supabase abans de publicar.
- "✗ No s'hi apunta" ja no fa la baixa ni esborra res: allibera la plaça (`cancelled`) i la
  persona passa a un bloc "No s'hi apunten" sota la taula, amb qui i quan l'ha marcat. Es pot
  desfer canviant l'estat (torna a pendent o inscrita). Esborrar dades continua sent "Baixa".
- Botó "⟳ Actualitzar" al Seguiment (activitat i totes), amb l'hora de les dades, per veure el
  que ha fet una altra persona.
- Velocitat:
  · `vercel.json`: funcions a `fra1` (Frankfurt), al costat de Supabase. Abans anaven als EUA i
    cada consulta creuava l'Atlàntic.
  · `api/admin/orders.js`: reserves i pagaments mensuals en paral·lel.
  · `js/admin.js`: activitats reaprofitades 60 s entre pestanyes (qualsevol canvi d'activitat o
    "Actualitzar" les torna a llegir); reserves i assistència en paral·lel; canviar l'estat de
    trucada ja no recarrega tot el panell.
- Segell de caché de tots els HTML: `?v=56` → `?v=57`.

---

## v28 · Calendari mensual a l'Agenda

- `agenda.html` + `js/agenda.js`: a dalt, filtres (cerca per nom, lloc o entitat, sense accents
  ni majúscules, i tipus d'activitat) i calendari mensual dl→dg; a sota, el llistat de sempre.
  Els filtres s'apliquen a tots dos.
- Calendari: comença al mes actual, no deixa anar enrere i arriba fins a 12 mesos endavant.
  Les setmanals es repeteixen cada setmana des de la data d'inici i se salten les sessions tretes
  al panell (`sessions_tretes`). Només surten sessions d'avui endavant. Avui queda marcat.
  Cada activitat porta al detall per reservar; les plenes surten ratllades amb "Ple".
- Les activitats amb etiqueta en lloc de dia ("Octubre 2026", "Pròximament") no entren a la
  graella: surten sota el calendari com a "data per confirmar".
- Mòbil (≤720px): la graella passa a llista dels dies que tenen activitat, amb la data sencera.
- `js/main.js`: textos nous `agenda.*` (CA/ES) i subtítol "mes a mes".
- `css/styles.css`: bloc `.cal-*` i `.agenda-filtres`. Contrastos ≥ 5,4:1.
- Segell de caché de tots els HTML: `?v=55` → `?v=56`.

---

## v27 · Textos legals iguals que nexsocial.org

- `legal.html`: avís legal, política de privacitat i política de cookies passen al mateix model i
  redactat que els de www.nexsocial.org (`js/nexsocial.js`, modals), CA/ES. Únics canvis respecte
  a l'original: "formulari d'inscripció" en lloc de "formularis de contacte" i "panell intern de
  l'equip" en lloc de "NexlicitIA". Fora la taula de claus del navegador, el telèfon i la línia de versió.
- Anclatges `#avis`, `#privacitat`, `#cookies` (i `-es`) es mantenen: els enllaços del peu i del formulari no canvien.

---

## v26 · Avís d'imatges generades amb IA (art. 50 Reglament d'IA)

- `js/main.js` + `css/styles.css`: línia discreta al peu de totes les pàgines (CA/ES):
  "Fotografies generades amb IA amb finalitat il·lustrativa. No representen persones reals."
- `legal.html`: apartat "Ús de la intel·ligència artificial" a l'avís legal (CA/ES): compliment del Reglament d'IA, fotos sintètiques, revisió humana, cap dada personal a eines d'IA i fora la frase dels cartells
  dels centres cívics (ja no se'n mostren des de la v25).
- `accessibilitat.html`: fora la frase d'ampliar cartells.
- Segell de caché de tots els HTML: `?v=54` → `?v=55`.
- Sense opacitat ni lletra reduïda: l'art. 50.5 exigeix que l'avís compleixi accessibilitat (contrast ≥ 4,5:1).

---

## v25 · Fora els cartells dels centres cívics

Els centres cívics no permeten fer servir els seus cartells a la web. Tornen les fotos de NexSocial.
Dades (fora del repo): `15-treure-cartells.sql` — buida `cartell` a totes les activitats; les que no
tenien foto pròpia (o tenien el placeholder) reben la de NexSocial segons el taller.
- `js/data.js` (dades de reserva si falla l'API): fora els 5 cartells.
- S'esborra la carpeta `assets/cartells/` sencera (8 fitxers).
- El camp "Cartell" del panell es manté, buit.

---

## v24 · Un sol botó per al Casal de Gent Gran Centre

Dades (fora del repo): `14-unificar-casal-centre.sql`.
- "Casal Centre" i "Casal de Gent Gran Centre (ASJP)" són el mateix equipament i al filtre per centre
  (web i panell) sortien dos botons. Totes les activitats passen a l'entitat amb el nom oficial,
  mantenint el "NexSocial · " del davant on hi era.
- `js/data.js` (dades de reserva si falla l'API): mateix canvi a la Vivioteca.

---

## v23 · Horaris correctes i cartell nou de castellà

Dades (fora del repo): `13-horaris-setmanals.sql`, segons la taula oficial de tallers.
- Setmanals amb dia i hora bons: Can Pepus (anglès dimarts 16:30, memòria dijous 10:00, mòbil dijous 11:00),
  Casal Centre (benestar emocional dimarts 18:00), Sant Roc (castellà dijous 16:30, mòbil dimarts 11:00).
- Nova: Memòria al Casal Centre, dimecres 11:00–12:00.
- L'autodefensa no es toca (horaris per concretar).
- Cartell de castellà corregit (dijous): `assets/cartells/ccstroc-castella-v2.jpg` (nom nou perquè els
  navegadors no mostrin el vell de memòria cau). S'esborra `ccstroc-castella.jpg`.
- Els cartells de Memòria i Mòbil de Can Pepus tenen l'hora intercanviada: l'SQL porta una línia opcional
  per amagar-los fins que arribin els bons.

---

## v22 · Auditoria d'accessibilitat, mida de lletra i hero

Sense SQL.

**Auditoria** (navegador, 8 pàgines, contrast mesurat sobre el DOM real) i correccions:
- Botó d'idioma inactiu (ES) a 3,75:1 → sense opacitat, a 5,17:1.
- Etiquetes TALLER / ESDEVENIMENT / ACTIVITAT MENSUAL: d'11 a 13 px en negreta; ESDEVENIMENT (4,19:1) i
  MENSUAL (3,06:1) ara són de 5,61:1 i 7,17:1.
- Comptadors de les pestanyes de Reserves (3,37:1) → sense opacitat.
- Passatemps "Una mica més" (4,28:1) → 5,76:1.
- Peu de pàgina: els títols passen d'`h4` a `h2` perquè no se salti cap nivell de títol.
- Sense problemes: imatges sense `alt`, camps sense etiqueta, botons buits, idioma de la pàgina, enllaç "anar al contingut".

**Botons A− / A+** al menú de totes les pàgines: tres mides de lletra (normal, gran, molt gran), que es
recorden al navegador (`nx-lletra`, afegit a la política de cookies). Anuncia el canvi als lectors de pantalla.

**Foto de portada**: més baixa (420 → 340 px; 480 → 380 px en pantalles grans; 260 px al mòbil). Corregit un
error: el `<picture>` no ocupava l'alçada i l'`object-position` no feia res, per això es veia el mig de la
foto (esquenes). Ara es veuen els caps i l'abraçada.

**Revisió al mòbil** (simulació a 390 px de portada, agenda, reserves, detall i reserva):
- Capçalera: el botó A− trepitjava el logo → logo, A−/A+ i CA/ES en una fila compacta.
- Reserves: el filtre de centre (7 botons, mitja pantalla) és un desplegable al mòbil.
- Reserva: al mòbil, el botó de reservar quedava a dalt, abans dels camps → ara primer les dades i després
  el resum amb el botó; la foto del resum és més baixa.
- Finestra de protecció de dades: al mòbil surt des de baix, més compacta, amb els botons sempre visibles.

**Eficiència**: `/api/events` feia tres consultes una darrere l'altra (1,75 s en fred) → ara en paral·lel i
amb memòria cau a la CDN (20 s; la reserva sempre comprova l'aforament real).

**Declaració d'accessibilitat** reescrita (CA/ES): "inspirada en" WCAG 2.2 AA i EN 301 549, sense declarar
conformitat total. Treu la llista de coses pendents, el telèfon provisional 900 000 000 i la referència legal
incorrecta.

---

## v21 · Preu intern i pagaments mensuals

SQL: `sql/11-pagaments-mensuals.sql`.

- **Preu intern**: una tarifa "A consultar" pot tenir un preu que només veu el panell (ex. anglès 15 €).
  La web continua dient "A consultar", i `api/events.js` treu aquest preu de les dades públiques.
  Els inscrits que ja hi havia l'agafen automàticament: l'import es calcula amb la configuració actual.
- **Activitats mensuals** (Model = Mensual): un pagament per persona i mes (taula `pagaments_mes`, amb
  un únic registre per mes i tot a l'auditoria).
  - Cobraments: selector ◀ mes ▶. Surten les persones **✓ Inscrit/a** que no han pagat aquell mes.
    "Cobrar oct" → import (quota), com i nota. Historial a la fila: set ✓ · oct ⏳. Botó "Anul·lar".
  - Seguiment: la columna Pagat mostra i cobra el mes que es mira ("⏳ Pendent oct").
- Cobraments només mostra persones inscrites (✓ Inscrit/a al Seguiment) o que ja han pagat.
- Avís si hi ha inscripcions d'activitats "a consultar" sense preu intern.

---

## v20 · Seguiment de trucades i cobraments simplificats

SQL: `sql/10-trucades.sql`.

Cada pantalla fa una sola cosa:
- **📋 Seguiment**: amb qui s'ha parlat. Un desplegable **Trucada** per persona: ☎ Pendent de trucar · 📵 No contesta ·
  ✓ Inscrit/a · ✗ No s'hi apunta (fa la baixa i esborra les dades). Substitueix la casella "Alta" i la
  columna "Dades". Xifres: inscrits, per trucar (amb el filtre "Veure només aquestes"), pendents de pagar
  i assistència. La columna "Pagat" només surt a les activitats de pagament ("⏳ Pendent de pagar").
- **💶 Cobraments**: només activitats de pagament. Per defecte, "Falten per pagar": qui paga desapareix
  d'aquesta vista. Ja no hi ha l'estat de la reserva, perquè l'assistència és al Seguiment i a Passar llista.
- La targeta d'activitat té "Seguiment (N)" i, si és de pagament, "Cobraments".

Protecció de dades: marcar "✓ Inscrit/a" registra que se li ha llegit la frase de dades del guió de
trucada (qui i quan). La prova es manté sense cap columna ni clic de més.

---

## v19 · Baixa amb esborrat de dades i cercador

SQL: `sql/09-baixa-esborrat.sql`.

**Baixa i esborrar dades** (Seguiment → "Baixa", Cobrar → "Baixa i esborrar dades", Cercar → "Baixa")
- S'esborren el nom, el telèfon, el correu, el contacte, les observacions i les notes de la reserva
  **i del seu historial d'auditoria**. Si la persona tenia sessions vinculades, també s'hi aplica.
- Es conserven l'activitat, les places, l'assistència (sense noms) i la prova d'haver-la informat.
- Si havia pagat, es conserven el nom i l'import per obligació fiscal; la resta s'esborra.
- Demana el motiu, queda a l'auditoria (qui, quan i per què) i no es pot desfer.
- L'auditoria continua sent immutable: només les funcions d'esborrat hi poden treure dades personals.

**Activitat acabada** (arxivada, o puntual amb la data passada): botó a la targeta
"Esborrar dades de les inscripcions (N)", amb doble confirmació (cal escriure ESBORRAR).
Compleix la política: "quan l'activitat s'acaba, les eliminem".

**🔍 Cercar** (pestanya nova): per nom, telèfon (3 xifres o més, amb o sense espais) o persona de
contacte, sense tenir en compte els accents. Agrupa per persona i mostra totes les seves
inscripcions: activitat, centre, horari, estat, pagament i dades pendents d'informar. Té accés
directe a Seguiment, Cobrar i Baixa.

---

## v18 · Ordre al repositori

- Les notes de cada patch (`PATCH-v*.md`, `GESTOR-S*.md`…) es fusionen en `docs/`:
  `CHANGELOG.md`, `INSTALLACIO.md`, `GESTOR.md` i `API.md`.
- Els SQL passen a `sql/`, numerats en ordre d'execució. Els obsolets van a `sql/antic/`.
- `.vercelignore`: `docs/`, `sql/` i els `.md` ja no es publiquen a la web. Abans, `api/*.sql`
  i les notes eren descarregables per qualsevol.
- A partir d'ara, **cada sprint afegeix una entrada a dalt d'aquest fitxer**, sense fitxers nous.


---

## Patch v17 · Registre de proves de protecció de dades

### Instal·lació
1. Supabase → `api/schema-v15-proves-rgpd.sql` i després `api/schema-v16-textos-v3.sql` → Run (després de la v14).
   Al final mostra els textos legals desats (amb empremta) i quantes inscripcions hi ha
   pendents d'informar per canal.
2. Push i Ctrl+Shift+R.

### Què queda registrat, per a cada inscripció
| Canal | Com | Qui consta |
|---|---|---|
| Web | En prémer Reservar s'obre una finestra amb la informació bàsica. Només es guarda si prem "D'acord, reservar" (el servidor no l'accepta sense) | "la mateixa persona (formulari web)" |
| Trucada / presencial | Casella obligatòria al panell: "Li he llegit la clàusula" | L'usuari del panell que la dona d'alta |
| Llista del centre cívic | Entra PENDENT. Es marca al Seguiment (columna "Dades") quan se li llegeix | L'usuari del panell que ho marca |

Es desen el canal, la data i hora, la persona i la versió del text. A la taula `textos_legals`
hi ha el text exacte de cada versió (CA i ES) amb la seva empremta SHA-256. Aquesta taula no es
pot modificar ni esborrar: per canviar un text, cal crear una versió nova. Qualsevol canvi queda
també a l'auditoria.

### Al panell
- Seguiment (una activitat i "Totes"): columna **Dades**, amb "✓ data" (en passar-hi el ratolí es
  veu el canal, qui ho va fer i la versió) o el selector "⚠ Pendent", que demana confirmació i no
  es pot desfer.
- Xifra **"Pendents d'informar"**, amb el botó "Veure només aquestes".
- Passar llista: avís "⚠ Dades: pendent d'informar", per llegir-la el primer dia.
- Afegir persona: opció "Llista enviada pel centre cívic" (entra com a pendent). Amb la resta
  d'opcions la casella és obligatòria. Es pot desplegar la clàusula per llegir-la.
- CSV i Excel inclouen canal, data, persona i versió.

### Cookies
No es registra cap consentiment de cookies perquè no n'hi ha cap que en necessiti (art. 22.2 LSSI):
registrar-ne un seria tractar dades sense necessitat. La política ho explica.

### legal.html
Alineat amb l'avís legal de nexsocial.org: denominació, forma jurídica, domicili social, registre,
web, clàusula de responsabilitat i AEPD. Hi consta Supabase a Frankfurt (UE) i un apartat nou,
"Com acreditem que t'hem informat".

### v3 del text (finestra en guardar)
La informació bàsica ja no és al formulari: surt en una finestra en prémer Reservar, amb els botons
"Tornar" i "D'acord, reservar". A "Destinataris" ja no hi ha la frase dels proveïdors tècnics: consta a la
política completa (segona capa). Versió `privacitat-v3-2026-09`, desada a `textos_legals`.

---

## Patch v16 · Blindatge legal (esborrany per revisar)

Sense SQL.

### Valors per defecte aplicats a legal.html (confirmar)
Domicili "Badalona (Barcelonès)" sense adreça · Registre de Cooperatives sense número ·
Supabase sense regió · conservació 12 mesos després de l'activitat · autoritat AEPD ·
activitats per a adults (menors només si s'indica) · il·lustracions "amb llicència" ·
sense comunicació de llistes al centre/Ajuntament · data 27/09/2026.

### Canvis
- **Mapa**: ja no s'incrusta Google Maps (posava cookies de Google i enviava la IP sense consentiment).
  Ara és un enllaç "Obrir el mapa ↗" que diu que s'obre fora de la web.
  → La web ja no instal·la cap cookie no exempta: no cal bàner.
- **Formulari d'inscripció**: primera capa d'informació (responsable, finalitat, destinataris, drets),
  avís sobre dades de terceres persones (familiars) i **casella obligatòria no marcada**.
  El servidor rebutja inscripcions sense la casella i desa versió (`privacitat-v2-2026-09`) i data.
- **legal.html** reescrit en català i castellà: avís legal (art. 10 LSSI), protecció de dades per
  finalitats i bases jurídiques, origen de les dades (centres cívics, familiars), encarregats i
  transferències, conservació, drets, menors, seguretat, i política de cookies amb taula.
- Peu de pàgina: Avís legal · Privacitat · Cookies.
- Panell: recordatori de llegir la clàusula quan s'apunta algú per telèfon o en persona.
- Text "En continuar acceptes les condicions" eliminat (no hi ha condicions generals).

### Document a part (no va al repo)
`clausules-informatives-comunitat.md`: clàusula telefònica, full per imprimir, llistes dels centres
(art. 14), procediment d'exercici de drets i llista de pendents.

---

## Patch v15 · Filtres al panell

Sense SQL. Push i Ctrl+Shift+R.

**Reserves i cobraments**
- Filtres **Centre** i **Taller o activitat** (el segon només mostra les del centre triat).
- Les xifres (cobrat, pendent, espera) i el **CSV** fan servir el que està filtrat.
- "Treure filtres" torna a tot.

**Seguiment**
- Per defecte s'obre a **Totes les activitats**: una fila per inscripció amb activitat, centre,
  nivell, alta, pagat, % d'assistència del mes i observacions (tot editable com a la vista d'una activitat).
- Filtre **Centre** (també a la vista d'una activitat).
- Clicar el nom d'una activitat obre el seu full amb les columnes de sessions.
- Excel de "Totes": full d'inscripcions + full de llista d'espera. Imprimir: A4 horitzontal.

---

## Patch v14 · Millores de la revisió amb navegador + horaris setmanals + contacte

### Instal·lació
1. Supabase → `api/schema-v14-recurrencia-contacte.sql` → Run. Al final mostra cada activitat
   amb el **dia de la setmana que surt de la seva data**: comprova que quadra amb el cartell.
2. (Opcional, prova) l'SQL d'alta massiva que et vaig passar a part — **no el pugis a GitHub**.
3. Push del ZIP. Ctrl+Shift+R.

### Nou
**Activitats setmanals** — camp "Es repeteix: Cada setmana" al panell, amb vista prèvia
("La web dirà: Cada dimarts · 16:30–17:30").
- La web mostra "Cada dimarts · 16:30–17:30" (dia de la data + hora + durada) en lloc de "Trimestral 2026".
- Continuen visibles encara que la data d'inici hagi passat, fins que s'arxivin. La reserva també.
- Agenda: secció "Cada setmana" a dalt, amb el requadre "DT · cada setmana".
- Seguiment: les setmanals generen una columna per setmana, com les mensuals.
- Primer cop: castellà i mòbil de Sant Roc, memòria i anglès de Can Pepus queden marcades com a setmanals.

**Persona de contacte** — "De qui és el telèfon" quan és d'un familiar (camp propi, no Observacions).
Surt a Seguiment (editable), Afegir persona, Reserves, Passar llista, Excel i CSV. El WhatsApp del
link de pagament s'adreça al contacte ("Hola Cecilia! … per pagar Memòria de Juana Rodríguez").

**Duplicats des del panell** — només si coincideix nom i telèfon (famílies amb un sol telèfon).

**Filtre per centre** a Reserves: Tots · Can Pepus · Centre Cívic Sant Roc… (es recorda a l'enllaç).

### Correccions visuals
- Fitxa amb cartell: cartell sencer centrat sobre el mateix cartell difuminat; clic per ampliar.
- Portada: etiqueta TALLER a mida del text; franja fosca sota el títol als cartells.
- Lupa: icona blanca en SVG (l'emoji de colors no es veia).
- Reserva sense extres: "Pas 2 de 2" (abans deia 3 de 3).
- "Carregant activitats…" a Agenda, Reserves, Portada i Fitxa (abans quedava en blanc).
- Foto de portada: es veuen els caps.

### Proves
SQL en Postgres 16 (instal·lació neta i damunt d'una importació feta, dues vegades).
jsdom: agenda, reserves amb filtre, fitxa, checkout, portada, panell (seguiment, afegir amb contacte, Excel).

### ⚑ [VERIFICAR]
- El dia de la setmana surt de la **data**: si una setmanal té una data d'un altre dia, dirà un dia equivocat. Revisa la taula final del SQL.
- Les setmanals no desapareixen soles: arxiva-les quan acabi el curs.
- La web pública encara bloqueja dos registres amb el mateix telèfon a la mateixa activitat.

---

## Patch v13 · Usuaris del panell i full de seguiment

### 1. Usuaris del panell (com BookingFEB)

Cada persona entra amb el seu correu i contrasenya. L'auditoria diu qui ha fet cada canvi.

| Rol | Pot fer |
|---|---|
| Administració | Tot, inclosos els usuaris |
| Responsable | Activitats, reserves, cobraments, seguiment, passar llista, auditoria |
| Editor | Només preparar i editar activitats |

- Pestanya **Usuaris** (només admin): crear, canviar rol, desactivar, contrasenya temporal nova.
- La contrasenya temporal es mostra **un sol cop** a qui crea l'usuari; la web no envia res.
  En entrar per primer cop, la persona n'ha de triar una de pròpia.
- 5 intents fallits → bloqueig de 15 minuts. No es pot deixar el panell sense cap admin.
- **L'accés compartit d'ara funciona fins que es crea el primer usuari**; després es tanca sol.

### Activació (una vegada)

1. Vercel → Settings → Environment Variables (Production):
   - `GESTOR_SECRET` = 48 caràcters aleatoris (signa les sessions; si canvia, tothom torna a entrar)
   - `GESTOR_SETUP_KEY` = 20+ caràcters aleatoris (només per crear el primer admin)
   Genera-les amb el gestor de contrasenyes o `openssl rand -base64 48`. **Diferents entre elles i de qualsevol altra clau.**
2. Redeploy.
3. `/admin` → **Crear el primer administrador** → clau d'instal·lació + nom + correu + contrasenya.
4. Pestanya Usuaris → crea la Nidhi i el Raúl (rol Responsable) i passa'ls la temporal.
5. Opcional: esborra `GESTOR_SETUP_KEY` de Vercel (ja no serveix: només funciona amb 0 usuaris).

### 2. Seguiment (pestanya nova, i botó a cada activitat)

Full editable per activitat, una fila per persona:

| Columna | Com funciona |
|---|---|
| Nom, Telèfon, Observacions | S'editen directament; es desa en sortir del camp |
| Nivell | La tarifa triada |
| Origen | Web · Trucada · Presencial · Altres |
| **Alta** | ✔ = confirmada per nosaltres (primer contacte fet) |
| **Pagat** | Triar el mètode registra el cobrament; "No pagat" l'anul·la. Les gratuïtes diuen "Gratuït" |
| **Sessions** | Una columna per sessió. Clic: buit → ✓ → ✗ → buit |
| Assist. | % de sessions ja fetes a les quals ha vingut |

- **Sessions automàtiques**: cada setmana, el mateix dia que la data de l'activitat, mes a mes (◀ ▶).
  **×** a la capçalera treu una sessió (festiu, etc.); **Afegir sessió** en posa una a mà.
  Les puntuals tenen una sola columna: el dia de l'activitat.
- **+ Afegir persona** per a qui truca al centre o ve en persona: nom, telèfon (opcional), nivell, places, origen, alta.
  Mateix control d'aforament que la web: si és ple, va a llista d'espera.
- Xifres: aforament ocupat, altes, pagades, assistència del mes.
- **⬇ Excel**: .xlsx real amb les mateixes columnes + full de resum.
- **🖨 Imprimir**: A4 horitzontal amb el que hi ha marcat. **🖨 Full en blanc**: només noms i caselles buides per marcar a mà.
  Peu per a responsable, signatura i data.

**Passar llista** continua com a vista ràpida per al mòbil: escriu a les mateixes dades.

### Instal·lació

1. Supabase → SQL Editor → `api/schema-v13-seguiment.sql` → Run
2. Variables de Vercel (punt 1) + push d'aquest ZIP
3. `/api/health` → `seguiment_v13: true` i `gestor.secret: true`

Funcions Vercel: 9 (nova `api/gestor.js`).

### Correcció inclosa

L'S1 intentava esborrar el hash de contrasenya de l'auditoria després d'escriure'l, però l'auditoria
és immutable i l'esborrat fallava en silenci. Ara el hash no s'hi escriu mai: només consta "canviada".

### Proves fetes

- SQL (Postgres 16): usuaris sense hash a l'auditoria; afegir persona (alta/pendent, sense telèfon);
  editar; sessions treure/afegir i tornar enrere.
- Servidor: accés compartit només sense usuaris; POST sense capçalera o d'un altre domini rebutjat.
- jsdom: primer admin → crear responsable → temporal → canvi obligatori → pestanyes per rol;
  seguiment amb sessions automàtiques i tretes, marcar, cobrar, alta, editar, afegir persona,
  Excel (validat amb openpyxl) i impressió A4 horitzontal.

### ⚑ [VERIFICAR]

- Els **responsables** poden veure l'auditoria i arxivar activitats. Si no ho vols, és una línia a `api/_lib/gestor/auth.js`.
- Treure una sessió no esborra les marques d'aquell dia: si la tornes a afegir, reapareixen.
- L'Excel conté telèfons i noms: tracta'l com a dades personals (no enviar-lo per canals oberts ni deixar-lo a descàrregues compartides).

---

## Patch v12 · Cartells oficials dels centres cívics

Dues imatges per activitat, com a BookingFEB:

| Camp | Què és | On es veu |
|---|---|---|
| **Cartell oficial** | El cartell del centre cívic (A4) | Portada, agenda, reserves i detall. Sencer, mai retallat. Al detall es pot obrir a mida completa. |
| **Imatge de NexSocial** | La nostra | Al final de la reserva (resum del pas de dades). Si l'activitat no té cartell, es veu a tot arreu com fins ara. |

### Instal·lació

1. Supabase → SQL Editor → `api/schema-v12-cartells.sql` → Run.
   Al final mostra quines activitats han quedat amb cartell.
2. Push del patch (inclou v10 i v11 si encara no hi són, i els 7 cartells a `assets/cartells/`).
3. `/api/health` → `cartells_v12: true`.

### Cartells inclosos (optimitzats a ~120–230 KB)

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

### Nivells

Cada activitat pot tenir els nivells que calgui des de v10: Editar → Inscripció i
preus → **+ Afegir nivell** (ex. castellà Intermedi al novembre, amb el seu horari
al detall i places pròpies si és un grup a part).

### ⚑ [VERIFICAR] — el que diuen els cartells vs. el que hi ha a la web

- **Autodefensa Can Pepus**: el cartell diu 13/10 **i** 10/11, totes dues a Can Pepus, de 18 a 19.30 h.
  Abans es parlava d'una sessió a cada centre. Si és així, la sessió vinculada es fa entre dues activitats de Can Pepus.
- **Autodefensa Sant Roc**: "una sessió al mes", sense dates → encaixa com a activitat mensual.
- **Horaris** a revisar al panell: castellà Sant Roc dimarts 16.30–17.30 · mòbil Sant Roc dimarts 11–12 ·
  anglès Can Pepus dimarts 16.30–17.30 · memòria Can Pepus dijous 11–12 · mòbil Can Pepus dijous 10–11.
- Els cartells porten el text "Vecteezy.com" al marge (crèdit de la il·lustració): comprovar que la llicència ho cobreix.

### v12b · Cartells a la mateixa mida que la resta

- Targetes, portada i agenda: el cartell es retalla a la mida de sempre i es veu la part de dalt
  (títol i il·lustració). Totes les targetes queden iguals.
- **Lupa 🔍** a cada cartell (48 px): l'obre sencer a pantalla completa, sense sortir de la pàgina.
  Es tanca amb ×, Esc o clicant fora; el focus torna a la lupa (teclat i lector de pantalla).
- Detall: capçalera de mida normal amb el botó "🔍 Veure el cartell".
- Sense canvis a la base de dades.

---

## Patch v11 · Control intern: cobraments, link de pagament i passar llista

La web **no envia res a ningú**. Tot és per a l'equip, des del panell.

### Instal·lació

Si encara no has aplicat el v10, aquest ZIP ja l'inclou. Ordre:

1. Supabase → SQL Editor → `api/schema-v10-inscripcions.sql` → Run (si no estava fet)
2. Supabase → SQL Editor → `api/schema-v11-control.sql` → Run
3. Push del patch
4. `/api/health` → `inscripcions_v10: true` i `control_v11: true`

### Què hi ha de nou al panell

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

### Fitxers

Nous: `api/schema-v11-control.sql`, `PATCH-v11-NOTES.md`
Modificats: `api/admin/orders.js`, `api/_lib/stripe.js`, `api/stripe/webhook.js`,
`api/health.js`, `js/admin.js`, `admin.html`

Funcions Vercel: continuen sent 8 (tot va per `api/admin/orders.js`).

### Proves fetes

- SQL en Postgres 16: instal·lació x2; cobrament manual i anul·lació; link generat dues
  vegades i la caducitat del vell no toca el nou; un link caducat no cancel·la la reserva;
  pagament per link → pagada amb targeta; passar llista per dia, desmarcar, sincronia
  d'estat a les puntuals, bloqueig a llista d'espera; auditoria amb qui ho ha fet.
- jsdom: xifres, filtres, cobrament en efectiu, link amb Stripe en prova, WhatsApp amb
  el text i el 34 davant, passar llista marcar/desmarcar.

### ⚑ [VERIFICAR]

- Mètodes de cobrament: efectiu, Bizum, transferència, targeta (TPV), altres. Si en falta cap, digues-m'ho.
- Text del WhatsApp: "Hola {nom}! Aquí tens l'enllaç per pagar {activitat} (ref. …, import): {link}".
- El link de pagament només funciona amb Stripe connectat (`STRIPE-SETUP.md`); fins llavors el panell ho diu i deixa registrar cobraments manuals.

---

## Patch v10 · Inscripcions al nivell de BookingFEB

Tarifes per nivell, tres models d'inscripció, extres (mesos, sessions vinculades)
i Stripe preparat però apagat. Els trets de Comunitat es mantenen: escala senior,
CA/ES, reserva sense compte, telèfon sempre visible, llista d'espera i auditoria.

### Instal·lació (en aquest ordre)

1. **Supabase → SQL Editor** → enganxa `api/schema-v10-inscripcions.sql` sencer → Run.
   És idempotent. No toca activitats ni reserves existents.
2. **Push** del patch a `main` (Vercel desplega sol).
3. Obre **`/api/health`** i comprova:
   - `inscripcions_v10: true`
   - `stripe: "off"` (normal fins que el connectem)
4. Prova a la web: una activitat antiga ha de funcionar igual que abans.

Si el pas 3 diu `FALTA`, el SQL no s'ha executat al projecte bo.

### Com es fa servir (panell)

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

### Flux públic

1. Detall → tria nivell i places (amb una sola tarifa es veu com abans).
2. Extres → només si l'activitat en té.
3. Dades → reservar, o pagar amb targeta si l'activitat és "Online" i Stripe està actiu.

Si hi ha alguna línia "a consultar", mai es cobra online: es reserva.

### Fitxers

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

### Proves fetes

- SQL en Postgres 16 real: instal·lació x2, nivell complet, nivell ple → espera,
  duplicat, sessió vinculada, sessió plena (no insereix res), pagament repetit (no fa res).
- Servidor: preu manipulat ignorat, límits de places i extres, validacions del panell,
  firma Stripe bona / falsa / caducada.
- jsdom: circuit sencer castellà (mensual + online), autodefensa (sessió vinculada),
  activitat antiga, confirmació ok/ko, editor del panell i taula de reserves.

### ⚑ [VERIFICAR]

- El webhook usa la signatura `export POST` (com BookingFEB). No provat desplegat a Comunitat.
- Pagament online + activitat plena → llista d'espera sense pagar (mateix criteri que ara).
- `js/carret.js` duplica `tarifesEvent`/`extresEvent` d'`api/_lib/tarifes.js`: si canvies un, canvia l'altre.

---

## Patch v9 — Auditoria + admin operatiu + Recursos + contingut (foto i taller nou)

Acumulatiu: inclou tot el de la v1. Descomprimir sobre l'arrel del clon local.

### ⚠️ Ordre d'instal·lació

**1r — Base de dades.** Veure **`SUPABASE-SETUP.md`**, que ho explica pas a pas.
Resum: enganxar **`api/schema-full.sql`** sencer a l'SQL Editor (conté l'esquema base
i la migració en ordre) i executar-lo. És idempotent. Ha de córrer ABANS del
desplegament: el codi nou crida funcions que encara no existeixen.

Tot viu a l'esquema **`comunitat`** dins del projecte de Supabase d'IntraNex, no a
`public` i no en un projecte nou (el pla gratuït només permet dos projectes actius).

Fitxers SQL del patch:
- `api/schema-full.sql` — **l'únic que has d'executar**. Crea l'esquema `comunitat` sencer.
- `api/seed-events.sql` — opcional: passa les 10 activitats de `data.js` a la BD.
- `api/schema-v2.sql` — **obsolet**, buidat. Instal·lava a `public` i hauria sobreescrit
  funcions d'IntraNex. Es pot esborrar del repo.

**Pas que no es pot saltar:** Supabase → Settings → API → *Exposed schemas* → afegir
`comunitat`. Sense això l'API respon 404 encara que les taules hi siguin.

```sql
-- comprovació: han de sortir 5 files
select proname from pg_proc where proname in
  ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
```

**2n — Codi.** Commit i push. Vercel desplega sol.

---

### BLOC 0 · Arreglar el FUNCTION_INVOCATION_FAILED (llegir primer)

`api/admin/events.js` creava el client de Supabase **fora** del `try`. Si
`createClient` llançava —URL mal formada, clau amb un salt de línia enganxat del
panell de Vercel— ningú no ho capturava i la funció petava amb un 500 opac en lloc
de dir què passava.

Tres canvis, portats de BookingFEB, que ja ho tenia resolt:

1. `api/_lib/supabase.js` neteja la clau (`\s+`), treu cometes de la URL i valida
   els dos formats abans de crear el client, amb missatges concrets.
2. El client es crea dins del `try` a tots els endpoints.
3. **`api/health.js` (NOU)** — obre `/api/health` al navegador i et diu exactament
   què falta: variables, format de credencials, esquema exposat i nombre de files
   per taula. Sense mostrar cap secret.
4. La pantalla de login ara mostra el missatge real del servidor, no només el número.
5. Els missatges d'error **no tornen mai el valor de la variable**: `/api/health` és
   públic i, si algú enganxa la clau al camp equivocat, el missatge n'hauria filtrat
   un tros. Ara només diu què hi ha trobat ("sembla que hi has enganxat la clau en
   lloc de la URL"). Detecta els dos intercanvis possibles.

---

### BLOC A · Reserves i auditoria

| Fitxer | Canvi |
|---|---|
| `api/schema-full.sql` | **NOU** — esquema `comunitat` complet: taules, auditoria, reserva atòmica, `imatge_lloc` i `data_label` |
| `api/_lib/supabase.js` | Esquema `comunitat` + validació de credencials |
| `api/health.js` | **NOU** — diagnòstic de configuració |
| `api/seed-events.sql` | **NOU** — dades inicials opcionals |
| `SUPABASE-SETUP.md` | **NOU** — guia de posada en marxa |
| `api/reserva.js` | Reserva atòmica via RPC, honeypot, reintent de referència, llista d'espera |
| `api/_lib/auth.js` | Retorna el nom d'usuari (actor de l'auditoria) |
| `api/admin/orders.js` | Canvi d'estat per RPC auditada |
| `api/admin/events.js` | Alta/edició/arxiu per RPC auditada |
| `api/admin/audit.js` | **NOU** — `GET /api/admin/audit` |
| `js/checkout.js` | Respecta la resposta de l'API; WhatsApp només si falla |
| `js/admin.js` | Camps "Imatge del lloc" i "Etiqueta de data", login propi, pestanya Auditoria, llista d'espera, export CSV, comptador d'ocupació |
| `admin.html` | Estils de la pantalla de login · cache-busting a `?v=30` |

**Com funciona ara:**
- Les reserves pendents bloquegen plaça **fins que les cancel·leu** des del panel.
- Si no queden places, la persona va automàticament a **llista d'espera** amb referència.
- Mateix telèfon + mateixa activitat = reserva duplicada rebutjada.
- Màxim 5 reserves per telèfon i hora (anti-bot), més un camp trampa al formulari.
- Tot canvi a `events` i `reserves` queda a `public.auditoria`, **que no es pot editar
  ni esborrar** ni des de l'SQL Editor (hi ha un trigger que ho impedeix).

---

### BLOC B · L'admin sortia en blanc

Dos problemes diferents, tots dos arreglats.

**1) El 404 de `/admin`** — Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

**2) `admin.js` no s'executava gens** — la causa real de la pàgina en blanc, present
des del primer dia. `main.js` declara `esc()`, `qs()`, `qsa()`, `formatDate()`,
`formatPrice()` i `tipoLabel()` com a funcions globals. Els scripts clàssics
comparteixen àmbit global, de manera que la primera línia d'`admin.js`

```js
const { esc, formatDate, formatPrice, tipoLabel, qs, qsa } = window.NX;
```

provocava `SyntaxError: Identifier 'esc' has already been declared` i el navegador
avortava el fitxer sencer abans d'executar-ne cap línia. Cap error a la pantalla,
només la capçalera estàtica.

Solució: `admin.js` va dins d'una IIFE, igual que `agenda.js`, `checkout.js` i
`recursos.js`. **Si algun dia afegeixes un script nou a aquest projecte, embolcalla'l
sempre en `(function() { ... })();`.**

**3) El bucle de recàrrega** — a més, `apiGet()` feia `location.reload()` en rebre un
401 confiant que el navegador obriria el diàleg de Basic Auth. `apiGet()` feia
`location.reload()` en rebre un 401, confiant que el navegador obriria el diàleg de
Basic Auth. Però `fetch()` no obre mai aquest diàleg: hauria recarregat en bucle. Amb el punt 2
arreglat, aquest també ho havia d'estar.

Ara el panel té **pantalla de login pròpia**: usuari i contrasenya, el token es guarda
a `sessionStorage` (es perd en tancar la pestanya) i s'envia com a capçalera
`Authorization` a cada crida. Hi ha botó "Sortir" i, si el token deixa de ser vàlid,
torna al login amb un missatge en lloc de quedar-se penjat.

Les variables `ADMIN_USER` i `ADMIN_PASS` a Vercel segueixen sent les mateixes.

### El 404 original

No era cap error de codi: Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

Mentre no facis el push, `comunitat.nexsocial.org/admin.html` ja funciona.

---

### BLOC C · Pàgina de Recursos

Abans: 6 targetes amb `enllaç: '#'`. Cap enllaç portava enlloc.
Ara: **12 recursos oficials reals**, tots amb URL verificada i amb la font visible
a la targeta (que qui el publica es vegi és el que ens diferencia d'un blog).

| Fitxer | Canvi |
|---|---|
| `recursos.html` | Reescrita: estructura nova + estils propis de la pàgina |
| `js/recursos-data.js` | **NOU** — catàleg d'enllaços oficials |
| `js/recursos.js` | **NOU** — render i filtres |

**Interactivitat**, en dos nivells perquè funcioni per a qui no sap què busca:
1. *Què vols fer?* — Vull moure'm · conèixer gent · aprendre · informació · memòria ·
   sentir-me acompanyat. És el llenguatge de la persona, no el nostre.
2. *O busca per tema* — Salut, Alimentació, Moviment, Tràmits i ajuts, Tecnologia,
   Cultura, Vida comunitària.

Els filtres es combinen, es desactiven clicant-los altra vegada i hi ha un botó
"Mostra-ho tot". Tanca la pàgina un bloc de contacte: telèfon + enllaç a l'agenda.

**Recursos inclosos** (Canal Salut gent gran · alimentació 65+ · com moure's més ·
Aquí sí Actius i Salut, cercador i marc conceptual · Sóc una persona gran ·
Drets Socials · Punts Òmnia · Biblioteques de Badalona · Casals de Gent Gran ·
Casals Cívics · La Teranyina).

Cap d'ells és competència: són administracions. Quan tinguem guies pròpies s'afegeixen
al mateix fitxer amb `propi: true` i destaquen visualment.

---

### BLOC D · Contingut

| Fitxer | Canvi |
|---|---|
| `assets/taller-emocional.jpg` | Foto nova del taller de benestar emocional (1200px, q85) |
| `assets/taller-emocional.webp` | Versió WebP de la mateixa foto |
| `js/data.js` | Nou taller "Conversa en anglès" a Can Pepus |

La foto substitueix l'anterior amb el mateix nom, així que no cal tocar cap referència.
El taller nou fa servir `assets/taller-idioma.jpg`, que ja era al repo.

Dades confirmades: gratuït, 12 places, grup setmanal estable. Com que el model no
té un tipus "setmanal", es queda com a `taller` i el caràcter setmanal es comunica
amb `data_label: 'Cada setmana'` i a la descripció. La data `2026-10-08` només
serveix per ordenar; ⚑ falta saber quin dia de la setmana és.

⚑ Pendent de decidir: una reserva d'aquest taller = plaça al grup per a tot el curs
(model actual, coherent amb cupo 12) o inscripció sessió a sessió.

---

### Esborrat manual (els ZIP no poden esborrar)

- **`js/reserva.js`** — codi mort. Ja he tret l'etiqueta `<script>` de `reserves.html`.
- **`RECURSOS_DATA`** dins `js/data.js` (línies ~167-207) — ja no el carrega ningú.
  No fa cap mal deixar-lo, però és brossa.

### Comprovacions després del push

1. `/admin` demana usuari i contrasenya i entra al panel (ni 404 ni pàgina en blanc).
2. Reserva de prova → redirigeix a `/confirmacio.html`.
3. Panel → Auditoria → hi ha una línia `insert` amb actor `web-publica`.
4. Canviar l'estat a "Confirmada" → línia `update` amb el canvi `pending → confirmed`.
5. Repetir la reserva amb el mateix telèfon → avís de duplicada.
6. `cupo` a 1 i reservar 2 places → llista d'espera.
7. Recursos → provar un filtre i obrir un parell d'enllaços.

### ⚑ [VERIFICAR]

- **L'SQL no s'ha executat contra un Postgres real** (no en tinc a l'entorn). Si peta
  alguna línia a l'SQL Editor, passa'm l'error i ho corregeixo.
- **Enllaços en castellà**: les targetes tenen el text traduït, però l'URL és la
  mateixa en tots dos idiomes (les pàgines de la Generalitat són en català, algunes
  amb traducció automàtica). No he inventat cap URL `/es/`. Si vols, ho reviso un per un.
- **Consentiment RGPD**: columnes creades i omplertes amb la versió `form-legal-v1`
  del text que ja mostra el formulari. Si vols casella marcable, passa'm el text.
- **Camp "notes"**: continua sent text lliure on algú pot escriure dades de salut.
  Pendent d'avís visible.
- **Actor únic**: amb `ADMIN_USER` compartit tot l'historial dirà el mateix nom.
- **El login és Basic Auth amb el token a `sessionStorage`.** És prou per a dues
  persones i un panel intern, i és el que ja hi havia al servidor; però no té caducitat
  de sessió ni bloqueig per intents fallits. Quan el panel guardi dades de més gent,
  toca passar a Supabase Auth amb JWT. No urgeix, però que consti.

---

## Patch v8 — Auditoria + admin operatiu + Recursos + contingut (foto i taller nou)

Acumulatiu: inclou tot el de la v1. Descomprimir sobre l'arrel del clon local.

### ⚠️ Ordre d'instal·lació

**1r — Base de dades.** Veure **`SUPABASE-SETUP.md`**, que ho explica pas a pas.
Resum: enganxar **`api/schema-full.sql`** sencer a l'SQL Editor (conté l'esquema base
i la migració en ordre) i executar-lo. És idempotent. Ha de córrer ABANS del
desplegament: el codi nou crida funcions que encara no existeixen.

Tot viu a l'esquema **`comunitat`** dins del projecte de Supabase d'IntraNex, no a
`public` i no en un projecte nou (el pla gratuït només permet dos projectes actius).

Fitxers SQL del patch:
- `api/schema-full.sql` — **l'únic que has d'executar**. Crea l'esquema `comunitat` sencer.
- `api/seed-events.sql` — opcional: passa les 10 activitats de `data.js` a la BD.
- `api/schema-v2.sql` — **obsolet**, buidat. Instal·lava a `public` i hauria sobreescrit
  funcions d'IntraNex. Es pot esborrar del repo.

**Pas que no es pot saltar:** Supabase → Settings → API → *Exposed schemas* → afegir
`comunitat`. Sense això l'API respon 404 encara que les taules hi siguin.

```sql
-- comprovació: han de sortir 5 files
select proname from pg_proc where proname in
  ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
```

**2n — Codi.** Commit i push. Vercel desplega sol.

---

### BLOC 0 · Arreglar el FUNCTION_INVOCATION_FAILED (llegir primer)

`api/admin/events.js` creava el client de Supabase **fora** del `try`. Si
`createClient` llançava —URL mal formada, clau amb un salt de línia enganxat del
panell de Vercel— ningú no ho capturava i la funció petava amb un 500 opac en lloc
de dir què passava.

Tres canvis, portats de BookingFEB, que ja ho tenia resolt:

1. `api/_lib/supabase.js` neteja la clau (`\s+`), treu cometes de la URL i valida
   els dos formats abans de crear el client, amb missatges concrets.
2. El client es crea dins del `try` a tots els endpoints.
3. **`api/health.js` (NOU)** — obre `/api/health` al navegador i et diu exactament
   què falta: variables, format de credencials, esquema exposat i nombre de files
   per taula. Sense mostrar cap secret.
4. La pantalla de login ara mostra el missatge real del servidor, no només el número.

---

### BLOC A · Reserves i auditoria

| Fitxer | Canvi |
|---|---|
| `api/schema-full.sql` | **NOU** — esquema `comunitat` complet: taules, auditoria, reserva atòmica, `imatge_lloc` i `data_label` |
| `api/_lib/supabase.js` | Esquema `comunitat` + validació de credencials |
| `api/health.js` | **NOU** — diagnòstic de configuració |
| `api/seed-events.sql` | **NOU** — dades inicials opcionals |
| `SUPABASE-SETUP.md` | **NOU** — guia de posada en marxa |
| `api/reserva.js` | Reserva atòmica via RPC, honeypot, reintent de referència, llista d'espera |
| `api/_lib/auth.js` | Retorna el nom d'usuari (actor de l'auditoria) |
| `api/admin/orders.js` | Canvi d'estat per RPC auditada |
| `api/admin/events.js` | Alta/edició/arxiu per RPC auditada |
| `api/admin/audit.js` | **NOU** — `GET /api/admin/audit` |
| `js/checkout.js` | Respecta la resposta de l'API; WhatsApp només si falla |
| `js/admin.js` | Camps "Imatge del lloc" i "Etiqueta de data", login propi, pestanya Auditoria, llista d'espera, export CSV, comptador d'ocupació |
| `admin.html` | Estils de la pantalla de login · cache-busting a `?v=30` |

**Com funciona ara:**
- Les reserves pendents bloquegen plaça **fins que les cancel·leu** des del panel.
- Si no queden places, la persona va automàticament a **llista d'espera** amb referència.
- Mateix telèfon + mateixa activitat = reserva duplicada rebutjada.
- Màxim 5 reserves per telèfon i hora (anti-bot), més un camp trampa al formulari.
- Tot canvi a `events` i `reserves` queda a `public.auditoria`, **que no es pot editar
  ni esborrar** ni des de l'SQL Editor (hi ha un trigger que ho impedeix).

---

### BLOC B · L'admin sortia en blanc

Dos problemes diferents, tots dos arreglats.

**1) El 404 de `/admin`** — Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

**2) `admin.js` no s'executava gens** — la causa real de la pàgina en blanc, present
des del primer dia. `main.js` declara `esc()`, `qs()`, `qsa()`, `formatDate()`,
`formatPrice()` i `tipoLabel()` com a funcions globals. Els scripts clàssics
comparteixen àmbit global, de manera que la primera línia d'`admin.js`

```js
const { esc, formatDate, formatPrice, tipoLabel, qs, qsa } = window.NX;
```

provocava `SyntaxError: Identifier 'esc' has already been declared` i el navegador
avortava el fitxer sencer abans d'executar-ne cap línia. Cap error a la pantalla,
només la capçalera estàtica.

Solució: `admin.js` va dins d'una IIFE, igual que `agenda.js`, `checkout.js` i
`recursos.js`. **Si algun dia afegeixes un script nou a aquest projecte, embolcalla'l
sempre en `(function() { ... })();`.**

**3) El bucle de recàrrega** — a més, `apiGet()` feia `location.reload()` en rebre un
401 confiant que el navegador obriria el diàleg de Basic Auth. `apiGet()` feia
`location.reload()` en rebre un 401, confiant que el navegador obriria el diàleg de
Basic Auth. Però `fetch()` no obre mai aquest diàleg: hauria recarregat en bucle. Amb el punt 2
arreglat, aquest també ho havia d'estar.

Ara el panel té **pantalla de login pròpia**: usuari i contrasenya, el token es guarda
a `sessionStorage` (es perd en tancar la pestanya) i s'envia com a capçalera
`Authorization` a cada crida. Hi ha botó "Sortir" i, si el token deixa de ser vàlid,
torna al login amb un missatge en lloc de quedar-se penjat.

Les variables `ADMIN_USER` i `ADMIN_PASS` a Vercel segueixen sent les mateixes.

### El 404 original

No era cap error de codi: Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

Mentre no facis el push, `comunitat.nexsocial.org/admin.html` ja funciona.

---

### BLOC C · Pàgina de Recursos

Abans: 6 targetes amb `enllaç: '#'`. Cap enllaç portava enlloc.
Ara: **12 recursos oficials reals**, tots amb URL verificada i amb la font visible
a la targeta (que qui el publica es vegi és el que ens diferencia d'un blog).

| Fitxer | Canvi |
|---|---|
| `recursos.html` | Reescrita: estructura nova + estils propis de la pàgina |
| `js/recursos-data.js` | **NOU** — catàleg d'enllaços oficials |
| `js/recursos.js` | **NOU** — render i filtres |

**Interactivitat**, en dos nivells perquè funcioni per a qui no sap què busca:
1. *Què vols fer?* — Vull moure'm · conèixer gent · aprendre · informació · memòria ·
   sentir-me acompanyat. És el llenguatge de la persona, no el nostre.
2. *O busca per tema* — Salut, Alimentació, Moviment, Tràmits i ajuts, Tecnologia,
   Cultura, Vida comunitària.

Els filtres es combinen, es desactiven clicant-los altra vegada i hi ha un botó
"Mostra-ho tot". Tanca la pàgina un bloc de contacte: telèfon + enllaç a l'agenda.

**Recursos inclosos** (Canal Salut gent gran · alimentació 65+ · com moure's més ·
Aquí sí Actius i Salut, cercador i marc conceptual · Sóc una persona gran ·
Drets Socials · Punts Òmnia · Biblioteques de Badalona · Casals de Gent Gran ·
Casals Cívics · La Teranyina).

Cap d'ells és competència: són administracions. Quan tinguem guies pròpies s'afegeixen
al mateix fitxer amb `propi: true` i destaquen visualment.

---

### BLOC D · Contingut

| Fitxer | Canvi |
|---|---|
| `assets/taller-emocional.jpg` | Foto nova del taller de benestar emocional (1200px, q85) |
| `assets/taller-emocional.webp` | Versió WebP de la mateixa foto |
| `js/data.js` | Nou taller "Conversa en anglès" a Can Pepus |

La foto substitueix l'anterior amb el mateix nom, així que no cal tocar cap referència.
El taller nou fa servir `assets/taller-idioma.jpg`, que ja era al repo.

Dades confirmades: gratuït, 12 places, grup setmanal estable. Com que el model no
té un tipus "setmanal", es queda com a `taller` i el caràcter setmanal es comunica
amb `data_label: 'Cada setmana'` i a la descripció. La data `2026-10-08` només
serveix per ordenar; ⚑ falta saber quin dia de la setmana és.

⚑ Pendent de decidir: una reserva d'aquest taller = plaça al grup per a tot el curs
(model actual, coherent amb cupo 12) o inscripció sessió a sessió.

---

### Esborrat manual (els ZIP no poden esborrar)

- **`js/reserva.js`** — codi mort. Ja he tret l'etiqueta `<script>` de `reserves.html`.
- **`RECURSOS_DATA`** dins `js/data.js` (línies ~167-207) — ja no el carrega ningú.
  No fa cap mal deixar-lo, però és brossa.

### Comprovacions després del push

1. `/admin` demana usuari i contrasenya i entra al panel (ni 404 ni pàgina en blanc).
2. Reserva de prova → redirigeix a `/confirmacio.html`.
3. Panel → Auditoria → hi ha una línia `insert` amb actor `web-publica`.
4. Canviar l'estat a "Confirmada" → línia `update` amb el canvi `pending → confirmed`.
5. Repetir la reserva amb el mateix telèfon → avís de duplicada.
6. `cupo` a 1 i reservar 2 places → llista d'espera.
7. Recursos → provar un filtre i obrir un parell d'enllaços.

### ⚑ [VERIFICAR]

- **L'SQL no s'ha executat contra un Postgres real** (no en tinc a l'entorn). Si peta
  alguna línia a l'SQL Editor, passa'm l'error i ho corregeixo.
- **Enllaços en castellà**: les targetes tenen el text traduït, però l'URL és la
  mateixa en tots dos idiomes (les pàgines de la Generalitat són en català, algunes
  amb traducció automàtica). No he inventat cap URL `/es/`. Si vols, ho reviso un per un.
- **Consentiment RGPD**: columnes creades i omplertes amb la versió `form-legal-v1`
  del text que ja mostra el formulari. Si vols casella marcable, passa'm el text.
- **Camp "notes"**: continua sent text lliure on algú pot escriure dades de salut.
  Pendent d'avís visible.
- **Actor únic**: amb `ADMIN_USER` compartit tot l'historial dirà el mateix nom.
- **El login és Basic Auth amb el token a `sessionStorage`.** És prou per a dues
  persones i un panel intern, i és el que ja hi havia al servidor; però no té caducitat
  de sessió ni bloqueig per intents fallits. Quan el panel guardi dades de més gent,
  toca passar a Supabase Auth amb JWT. No urgeix, però que consti.

---

## Patch v7 — Auditoria + admin operatiu + Recursos + contingut (foto i taller nou)

Acumulatiu: inclou tot el de la v1. Descomprimir sobre l'arrel del clon local.

### ⚠️ Ordre d'instal·lació

**1r — Base de dades.** Veure **`SUPABASE-SETUP.md`**, que ho explica pas a pas.
Resum: enganxar **`api/schema-full.sql`** sencer a l'SQL Editor (conté l'esquema base
i la migració en ordre) i executar-lo. És idempotent. Ha de córrer ABANS del
desplegament: el codi nou crida funcions que encara no existeixen.

Tot viu a l'esquema **`comunitat`** dins del projecte de Supabase d'IntraNex, no a
`public` i no en un projecte nou (el pla gratuït només permet dos projectes actius).

Fitxers SQL del patch:
- `api/schema-full.sql` — **l'únic que has d'executar**. Crea l'esquema `comunitat` sencer.
- `api/seed-events.sql` — opcional: passa les 10 activitats de `data.js` a la BD.
- `api/schema-v2.sql` — **obsolet**, buidat. Instal·lava a `public` i hauria sobreescrit
  funcions d'IntraNex. Es pot esborrar del repo.

**Pas que no es pot saltar:** Supabase → Settings → API → *Exposed schemas* → afegir
`comunitat`. Sense això l'API respon 404 encara que les taules hi siguin.

```sql
-- comprovació: han de sortir 5 files
select proname from pg_proc where proname in
  ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
```

**2n — Codi.** Commit i push. Vercel desplega sol.

---

### BLOC A · Reserves i auditoria

| Fitxer | Canvi |
|---|---|
| `api/schema-full.sql` | **NOU** — esquema `comunitat` complet: taules, auditoria, reserva atòmica, `imatge_lloc` i `data_label` |
| `api/_lib/supabase.js` | El client apunta a l'esquema `comunitat` |
| `api/seed-events.sql` | **NOU** — dades inicials opcionals |
| `SUPABASE-SETUP.md` | **NOU** — guia de posada en marxa |
| `api/reserva.js` | Reserva atòmica via RPC, honeypot, reintent de referència, llista d'espera |
| `api/_lib/auth.js` | Retorna el nom d'usuari (actor de l'auditoria) |
| `api/admin/orders.js` | Canvi d'estat per RPC auditada |
| `api/admin/events.js` | Alta/edició/arxiu per RPC auditada |
| `api/admin/audit.js` | **NOU** — `GET /api/admin/audit` |
| `js/checkout.js` | Respecta la resposta de l'API; WhatsApp només si falla |
| `js/admin.js` | Camps "Imatge del lloc" i "Etiqueta de data", login propi, pestanya Auditoria, llista d'espera, export CSV, comptador d'ocupació |
| `admin.html` | Estils de la pantalla de login · cache-busting a `?v=30` |

**Com funciona ara:**
- Les reserves pendents bloquegen plaça **fins que les cancel·leu** des del panel.
- Si no queden places, la persona va automàticament a **llista d'espera** amb referència.
- Mateix telèfon + mateixa activitat = reserva duplicada rebutjada.
- Màxim 5 reserves per telèfon i hora (anti-bot), més un camp trampa al formulari.
- Tot canvi a `events` i `reserves` queda a `public.auditoria`, **que no es pot editar
  ni esborrar** ni des de l'SQL Editor (hi ha un trigger que ho impedeix).

---

### BLOC B · L'admin sortia en blanc

Dos problemes diferents, tots dos arreglats.

**1) El 404 de `/admin`** — Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

**2) `admin.js` no s'executava gens** — la causa real de la pàgina en blanc, present
des del primer dia. `main.js` declara `esc()`, `qs()`, `qsa()`, `formatDate()`,
`formatPrice()` i `tipoLabel()` com a funcions globals. Els scripts clàssics
comparteixen àmbit global, de manera que la primera línia d'`admin.js`

```js
const { esc, formatDate, formatPrice, tipoLabel, qs, qsa } = window.NX;
```

provocava `SyntaxError: Identifier 'esc' has already been declared` i el navegador
avortava el fitxer sencer abans d'executar-ne cap línia. Cap error a la pantalla,
només la capçalera estàtica.

Solució: `admin.js` va dins d'una IIFE, igual que `agenda.js`, `checkout.js` i
`recursos.js`. **Si algun dia afegeixes un script nou a aquest projecte, embolcalla'l
sempre en `(function() { ... })();`.**

**3) El bucle de recàrrega** — a més, `apiGet()` feia `location.reload()` en rebre un
401 confiant que el navegador obriria el diàleg de Basic Auth. `apiGet()` feia
`location.reload()` en rebre un 401, confiant que el navegador obriria el diàleg de
Basic Auth. Però `fetch()` no obre mai aquest diàleg: hauria recarregat en bucle. Amb el punt 2
arreglat, aquest també ho havia d'estar.

Ara el panel té **pantalla de login pròpia**: usuari i contrasenya, el token es guarda
a `sessionStorage` (es perd en tancar la pestanya) i s'envia com a capçalera
`Authorization` a cada crida. Hi ha botó "Sortir" i, si el token deixa de ser vàlid,
torna al login amb un missatge en lloc de quedar-se penjat.

Les variables `ADMIN_USER` i `ADMIN_PASS` a Vercel segueixen sent les mateixes.

### El 404 original

No era cap error de codi: Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

Mentre no facis el push, `comunitat.nexsocial.org/admin.html` ja funciona.

---

### BLOC C · Pàgina de Recursos

Abans: 6 targetes amb `enllaç: '#'`. Cap enllaç portava enlloc.
Ara: **12 recursos oficials reals**, tots amb URL verificada i amb la font visible
a la targeta (que qui el publica es vegi és el que ens diferencia d'un blog).

| Fitxer | Canvi |
|---|---|
| `recursos.html` | Reescrita: estructura nova + estils propis de la pàgina |
| `js/recursos-data.js` | **NOU** — catàleg d'enllaços oficials |
| `js/recursos.js` | **NOU** — render i filtres |

**Interactivitat**, en dos nivells perquè funcioni per a qui no sap què busca:
1. *Què vols fer?* — Vull moure'm · conèixer gent · aprendre · informació · memòria ·
   sentir-me acompanyat. És el llenguatge de la persona, no el nostre.
2. *O busca per tema* — Salut, Alimentació, Moviment, Tràmits i ajuts, Tecnologia,
   Cultura, Vida comunitària.

Els filtres es combinen, es desactiven clicant-los altra vegada i hi ha un botó
"Mostra-ho tot". Tanca la pàgina un bloc de contacte: telèfon + enllaç a l'agenda.

**Recursos inclosos** (Canal Salut gent gran · alimentació 65+ · com moure's més ·
Aquí sí Actius i Salut, cercador i marc conceptual · Sóc una persona gran ·
Drets Socials · Punts Òmnia · Biblioteques de Badalona · Casals de Gent Gran ·
Casals Cívics · La Teranyina).

Cap d'ells és competència: són administracions. Quan tinguem guies pròpies s'afegeixen
al mateix fitxer amb `propi: true` i destaquen visualment.

---

### BLOC D · Contingut

| Fitxer | Canvi |
|---|---|
| `assets/taller-emocional.jpg` | Foto nova del taller de benestar emocional (1200px, q85) |
| `assets/taller-emocional.webp` | Versió WebP de la mateixa foto |
| `js/data.js` | Nou taller "Conversa en anglès" a Can Pepus |

La foto substitueix l'anterior amb el mateix nom, així que no cal tocar cap referència.
El taller nou fa servir `assets/taller-idioma.jpg`, que ja era al repo.

Dades confirmades: gratuït, 12 places, grup setmanal estable. Com que el model no
té un tipus "setmanal", es queda com a `taller` i el caràcter setmanal es comunica
amb `data_label: 'Cada setmana'` i a la descripció. La data `2026-10-08` només
serveix per ordenar; ⚑ falta saber quin dia de la setmana és.

⚑ Pendent de decidir: una reserva d'aquest taller = plaça al grup per a tot el curs
(model actual, coherent amb cupo 12) o inscripció sessió a sessió.

---

### Esborrat manual (els ZIP no poden esborrar)

- **`js/reserva.js`** — codi mort. Ja he tret l'etiqueta `<script>` de `reserves.html`.
- **`RECURSOS_DATA`** dins `js/data.js` (línies ~167-207) — ja no el carrega ningú.
  No fa cap mal deixar-lo, però és brossa.

### Comprovacions després del push

1. `/admin` demana usuari i contrasenya i entra al panel (ni 404 ni pàgina en blanc).
2. Reserva de prova → redirigeix a `/confirmacio.html`.
3. Panel → Auditoria → hi ha una línia `insert` amb actor `web-publica`.
4. Canviar l'estat a "Confirmada" → línia `update` amb el canvi `pending → confirmed`.
5. Repetir la reserva amb el mateix telèfon → avís de duplicada.
6. `cupo` a 1 i reservar 2 places → llista d'espera.
7. Recursos → provar un filtre i obrir un parell d'enllaços.

### ⚑ [VERIFICAR]

- **L'SQL no s'ha executat contra un Postgres real** (no en tinc a l'entorn). Si peta
  alguna línia a l'SQL Editor, passa'm l'error i ho corregeixo.
- **Enllaços en castellà**: les targetes tenen el text traduït, però l'URL és la
  mateixa en tots dos idiomes (les pàgines de la Generalitat són en català, algunes
  amb traducció automàtica). No he inventat cap URL `/es/`. Si vols, ho reviso un per un.
- **Consentiment RGPD**: columnes creades i omplertes amb la versió `form-legal-v1`
  del text que ja mostra el formulari. Si vols casella marcable, passa'm el text.
- **Camp "notes"**: continua sent text lliure on algú pot escriure dades de salut.
  Pendent d'avís visible.
- **Actor únic**: amb `ADMIN_USER` compartit tot l'historial dirà el mateix nom.
- **El login és Basic Auth amb el token a `sessionStorage`.** És prou per a dues
  persones i un panel intern, i és el que ja hi havia al servidor; però no té caducitat
  de sessió ni bloqueig per intents fallits. Quan el panel guardi dades de més gent,
  toca passar a Supabase Auth amb JWT. No urgeix, però que consti.

---

## Patch v6 — Auditoria + admin operatiu + Recursos + contingut (foto i taller nou)

Acumulatiu: inclou tot el de la v1. Descomprimir sobre l'arrel del clon local.

### ⚠️ Ordre d'instal·lació

**1r — Base de dades.** Veure **`SUPABASE-SETUP.md`**, que ho explica pas a pas.
Resum: enganxar **`api/schema-full.sql`** sencer a l'SQL Editor (conté l'esquema base
i la migració en ordre) i executar-lo. És idempotent. Ha de córrer ABANS del
desplegament: el codi nou crida funcions que encara no existeixen.

Fitxers SQL del patch:
- `api/schema-full.sql` — **el que has d'executar**. Base + v2 en ordre.
- `api/schema-v2.sql` — només la migració, si ja tenies l'esquema base.
- `api/seed-events.sql` — opcional: passa les 10 activitats de `data.js` a la BD.

```sql
-- comprovació: han de sortir 5 files
select proname from pg_proc where proname in
  ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
```

**2n — Codi.** Commit i push. Vercel desplega sol.

---

### BLOC A · Reserves i auditoria

| Fitxer | Canvi |
|---|---|
| `api/schema-full.sql` | **NOU** — instal·lació completa d'un sol cop |
| `api/schema-v2.sql` | **NOU** — migració: auditoria, reserva atòmica, columnes `imatge_lloc` i `data_label` |
| `api/seed-events.sql` | **NOU** — dades inicials opcionals |
| `SUPABASE-SETUP.md` | **NOU** — guia de posada en marxa |
| `api/reserva.js` | Reserva atòmica via RPC, honeypot, reintent de referència, llista d'espera |
| `api/_lib/auth.js` | Retorna el nom d'usuari (actor de l'auditoria) |
| `api/admin/orders.js` | Canvi d'estat per RPC auditada |
| `api/admin/events.js` | Alta/edició/arxiu per RPC auditada |
| `api/admin/audit.js` | **NOU** — `GET /api/admin/audit` |
| `js/checkout.js` | Respecta la resposta de l'API; WhatsApp només si falla |
| `js/admin.js` | Camps "Imatge del lloc" i "Etiqueta de data", login propi, pestanya Auditoria, llista d'espera, export CSV, comptador d'ocupació |
| `admin.html` | Estils de la pantalla de login · cache-busting a `?v=30` |

**Com funciona ara:**
- Les reserves pendents bloquegen plaça **fins que les cancel·leu** des del panel.
- Si no queden places, la persona va automàticament a **llista d'espera** amb referència.
- Mateix telèfon + mateixa activitat = reserva duplicada rebutjada.
- Màxim 5 reserves per telèfon i hora (anti-bot), més un camp trampa al formulari.
- Tot canvi a `events` i `reserves` queda a `public.auditoria`, **que no es pot editar
  ni esborrar** ni des de l'SQL Editor (hi ha un trigger que ho impedeix).

---

### BLOC B · L'admin sortia en blanc

Dos problemes diferents, tots dos arreglats.

**1) El 404 de `/admin`** — Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

**2) `admin.js` no s'executava gens** — la causa real de la pàgina en blanc, present
des del primer dia. `main.js` declara `esc()`, `qs()`, `qsa()`, `formatDate()`,
`formatPrice()` i `tipoLabel()` com a funcions globals. Els scripts clàssics
comparteixen àmbit global, de manera que la primera línia d'`admin.js`

```js
const { esc, formatDate, formatPrice, tipoLabel, qs, qsa } = window.NX;
```

provocava `SyntaxError: Identifier 'esc' has already been declared` i el navegador
avortava el fitxer sencer abans d'executar-ne cap línia. Cap error a la pantalla,
només la capçalera estàtica.

Solució: `admin.js` va dins d'una IIFE, igual que `agenda.js`, `checkout.js` i
`recursos.js`. **Si algun dia afegeixes un script nou a aquest projecte, embolcalla'l
sempre en `(function() { ... })();`.**

**3) El bucle de recàrrega** — a més, `apiGet()` feia `location.reload()` en rebre un
401 confiant que el navegador obriria el diàleg de Basic Auth. `apiGet()` feia
`location.reload()` en rebre un 401, confiant que el navegador obriria el diàleg de
Basic Auth. Però `fetch()` no obre mai aquest diàleg: hauria recarregat en bucle. Amb el punt 2
arreglat, aquest també ho havia d'estar.

Ara el panel té **pantalla de login pròpia**: usuari i contrasenya, el token es guarda
a `sessionStorage` (es perd en tancar la pestanya) i s'envia com a capçalera
`Authorization` a cada crida. Hi ha botó "Sortir" i, si el token deixa de ser vàlid,
torna al login amb un missatge en lloc de quedar-se penjat.

Les variables `ADMIN_USER` i `ADMIN_PASS` a Vercel segueixen sent les mateixes.

### El 404 original

No era cap error de codi: Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

Mentre no facis el push, `comunitat.nexsocial.org/admin.html` ja funciona.

---

### BLOC C · Pàgina de Recursos

Abans: 6 targetes amb `enllaç: '#'`. Cap enllaç portava enlloc.
Ara: **12 recursos oficials reals**, tots amb URL verificada i amb la font visible
a la targeta (que qui el publica es vegi és el que ens diferencia d'un blog).

| Fitxer | Canvi |
|---|---|
| `recursos.html` | Reescrita: estructura nova + estils propis de la pàgina |
| `js/recursos-data.js` | **NOU** — catàleg d'enllaços oficials |
| `js/recursos.js` | **NOU** — render i filtres |

**Interactivitat**, en dos nivells perquè funcioni per a qui no sap què busca:
1. *Què vols fer?* — Vull moure'm · conèixer gent · aprendre · informació · memòria ·
   sentir-me acompanyat. És el llenguatge de la persona, no el nostre.
2. *O busca per tema* — Salut, Alimentació, Moviment, Tràmits i ajuts, Tecnologia,
   Cultura, Vida comunitària.

Els filtres es combinen, es desactiven clicant-los altra vegada i hi ha un botó
"Mostra-ho tot". Tanca la pàgina un bloc de contacte: telèfon + enllaç a l'agenda.

**Recursos inclosos** (Canal Salut gent gran · alimentació 65+ · com moure's més ·
Aquí sí Actius i Salut, cercador i marc conceptual · Sóc una persona gran ·
Drets Socials · Punts Òmnia · Biblioteques de Badalona · Casals de Gent Gran ·
Casals Cívics · La Teranyina).

Cap d'ells és competència: són administracions. Quan tinguem guies pròpies s'afegeixen
al mateix fitxer amb `propi: true` i destaquen visualment.

---

### BLOC D · Contingut

| Fitxer | Canvi |
|---|---|
| `assets/taller-emocional.jpg` | Foto nova del taller de benestar emocional (1200px, q85) |
| `assets/taller-emocional.webp` | Versió WebP de la mateixa foto |
| `js/data.js` | Nou taller "Conversa en anglès" a Can Pepus |

La foto substitueix l'anterior amb el mateix nom, així que no cal tocar cap referència.
El taller nou fa servir `assets/taller-idioma.jpg`, que ja era al repo.

Dades confirmades: gratuït, 12 places, grup setmanal estable. Com que el model no
té un tipus "setmanal", es queda com a `taller` i el caràcter setmanal es comunica
amb `data_label: 'Cada setmana'` i a la descripció. La data `2026-10-08` només
serveix per ordenar; ⚑ falta saber quin dia de la setmana és.

⚑ Pendent de decidir: una reserva d'aquest taller = plaça al grup per a tot el curs
(model actual, coherent amb cupo 12) o inscripció sessió a sessió.

---

### Esborrat manual (els ZIP no poden esborrar)

- **`js/reserva.js`** — codi mort. Ja he tret l'etiqueta `<script>` de `reserves.html`.
- **`RECURSOS_DATA`** dins `js/data.js` (línies ~167-207) — ja no el carrega ningú.
  No fa cap mal deixar-lo, però és brossa.

### Comprovacions després del push

1. `/admin` demana usuari i contrasenya i entra al panel (ni 404 ni pàgina en blanc).
2. Reserva de prova → redirigeix a `/confirmacio.html`.
3. Panel → Auditoria → hi ha una línia `insert` amb actor `web-publica`.
4. Canviar l'estat a "Confirmada" → línia `update` amb el canvi `pending → confirmed`.
5. Repetir la reserva amb el mateix telèfon → avís de duplicada.
6. `cupo` a 1 i reservar 2 places → llista d'espera.
7. Recursos → provar un filtre i obrir un parell d'enllaços.

### ⚑ [VERIFICAR]

- **L'SQL no s'ha executat contra un Postgres real** (no en tinc a l'entorn). Si peta
  alguna línia a l'SQL Editor, passa'm l'error i ho corregeixo.
- **Enllaços en castellà**: les targetes tenen el text traduït, però l'URL és la
  mateixa en tots dos idiomes (les pàgines de la Generalitat són en català, algunes
  amb traducció automàtica). No he inventat cap URL `/es/`. Si vols, ho reviso un per un.
- **Consentiment RGPD**: columnes creades i omplertes amb la versió `form-legal-v1`
  del text que ja mostra el formulari. Si vols casella marcable, passa'm el text.
- **Camp "notes"**: continua sent text lliure on algú pot escriure dades de salut.
  Pendent d'avís visible.
- **Actor únic**: amb `ADMIN_USER` compartit tot l'historial dirà el mateix nom.
- **El login és Basic Auth amb el token a `sessionStorage`.** És prou per a dues
  persones i un panel intern, i és el que ja hi havia al servidor; però no té caducitat
  de sessió ni bloqueig per intents fallits. Quan el panel guardi dades de més gent,
  toca passar a Supabase Auth amb JWT. No urgeix, però que consti.

---

## Patch v5 — Auditoria + admin operatiu + Recursos + contingut (foto i taller nou)

Acumulatiu: inclou tot el de la v1. Descomprimir sobre l'arrel del clon local.

### ⚠️ Ordre d'instal·lació

**1r — Base de dades.** Supabase → SQL Editor → enganxar `api/schema-v2.sql` sencer → Run.
És idempotent. Ha de córrer ABANS del desplegament: el codi nou crida funcions que
encara no existeixen.

```sql
-- comprovació: han de sortir 5 files
select proname from pg_proc where proname in
  ('crear_reserva','canviar_estat_reserva','admin_upsert_event','admin_arxivar_event','fn_auditoria');
```

**2n — Codi.** Commit i push. Vercel desplega sol.

---

### BLOC A · Reserves i auditoria

| Fitxer | Canvi |
|---|---|
| `api/schema-v2.sql` | **NOU** — migració completa |
| `api/reserva.js` | Reserva atòmica via RPC, honeypot, reintent de referència, llista d'espera |
| `api/_lib/auth.js` | Retorna el nom d'usuari (actor de l'auditoria) |
| `api/admin/orders.js` | Canvi d'estat per RPC auditada |
| `api/admin/events.js` | Alta/edició/arxiu per RPC auditada |
| `api/admin/audit.js` | **NOU** — `GET /api/admin/audit` |
| `js/checkout.js` | Respecta la resposta de l'API; WhatsApp només si falla |
| `js/admin.js` | Login propi, pestanya Auditoria, llista d'espera, export CSV, comptador d'ocupació |
| `admin.html` | Estils de la pantalla de login · cache-busting a `?v=30` |

**Com funciona ara:**
- Les reserves pendents bloquegen plaça **fins que les cancel·leu** des del panel.
- Si no queden places, la persona va automàticament a **llista d'espera** amb referència.
- Mateix telèfon + mateixa activitat = reserva duplicada rebutjada.
- Màxim 5 reserves per telèfon i hora (anti-bot), més un camp trampa al formulari.
- Tot canvi a `events` i `reserves` queda a `public.auditoria`, **que no es pot editar
  ni esborrar** ni des de l'SQL Editor (hi ha un trigger que ho impedeix).

---

### BLOC B · L'admin sortia en blanc

Dos problemes diferents, tots dos arreglats.

**1) El 404 de `/admin`** — Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

**2) `admin.js` no s'executava gens** — la causa real de la pàgina en blanc, present
des del primer dia. `main.js` declara `esc()`, `qs()`, `qsa()`, `formatDate()`,
`formatPrice()` i `tipoLabel()` com a funcions globals. Els scripts clàssics
comparteixen àmbit global, de manera que la primera línia d'`admin.js`

```js
const { esc, formatDate, formatPrice, tipoLabel, qs, qsa } = window.NX;
```

provocava `SyntaxError: Identifier 'esc' has already been declared` i el navegador
avortava el fitxer sencer abans d'executar-ne cap línia. Cap error a la pantalla,
només la capçalera estàtica.

Solució: `admin.js` va dins d'una IIFE, igual que `agenda.js`, `checkout.js` i
`recursos.js`. **Si algun dia afegeixes un script nou a aquest projecte, embolcalla'l
sempre en `(function() { ... })();`.**

**3) El bucle de recàrrega** — a més, `apiGet()` feia `location.reload()` en rebre un
401 confiant que el navegador obriria el diàleg de Basic Auth. `apiGet()` feia
`location.reload()` en rebre un 401, confiant que el navegador obriria el diàleg de
Basic Auth. Però `fetch()` no obre mai aquest diàleg: hauria recarregat en bucle. Amb el punt 2
arreglat, aquest també ho havia d'estar.

Ara el panel té **pantalla de login pròpia**: usuari i contrasenya, el token es guarda
a `sessionStorage` (es perd en tancar la pestanya) i s'envia com a capçalera
`Authorization` a cada crida. Hi ha botó "Sortir" i, si el token deixa de ser vàlid,
torna al login amb un missatge en lloc de quedar-se penjat.

Les variables `ADMIN_USER` i `ADMIN_PASS` a Vercel segueixen sent les mateixes.

### El 404 original

No era cap error de codi: Vercel no serveix `admin.html` quan demanes `/admin`.
`vercel.json` ara té `rewrites` per a `/admin`, `/agenda`, `/reserves`, `/recursos`,
`/passatemps`, `/legal` i `/accessibilitat`. Es conserven els `headers` i `redirects`
que ja hi havia.

Mentre no facis el push, `comunitat.nexsocial.org/admin.html` ja funciona.

---

### BLOC C · Pàgina de Recursos

Abans: 6 targetes amb `enllaç: '#'`. Cap enllaç portava enlloc.
Ara: **12 recursos oficials reals**, tots amb URL verificada i amb la font visible
a la targeta (que qui el publica es vegi és el que ens diferencia d'un blog).

| Fitxer | Canvi |
|---|---|
| `recursos.html` | Reescrita: estructura nova + estils propis de la pàgina |
| `js/recursos-data.js` | **NOU** — catàleg d'enllaços oficials |
| `js/recursos.js` | **NOU** — render i filtres |

**Interactivitat**, en dos nivells perquè funcioni per a qui no sap què busca:
1. *Què vols fer?* — Vull moure'm · conèixer gent · aprendre · informació · memòria ·
   sentir-me acompanyat. És el llenguatge de la persona, no el nostre.
2. *O busca per tema* — Salut, Alimentació, Moviment, Tràmits i ajuts, Tecnologia,
   Cultura, Vida comunitària.

Els filtres es combinen, es desactiven clicant-los altra vegada i hi ha un botó
"Mostra-ho tot". Tanca la pàgina un bloc de contacte: telèfon + enllaç a l'agenda.

**Recursos inclosos** (Canal Salut gent gran · alimentació 65+ · com moure's més ·
Aquí sí Actius i Salut, cercador i marc conceptual · Sóc una persona gran ·
Drets Socials · Punts Òmnia · Biblioteques de Badalona · Casals de Gent Gran ·
Casals Cívics · La Teranyina).

Cap d'ells és competència: són administracions. Quan tinguem guies pròpies s'afegeixen
al mateix fitxer amb `propi: true` i destaquen visualment.

---

### BLOC D · Contingut

| Fitxer | Canvi |
|---|---|
| `assets/taller-emocional.jpg` | Foto nova del taller de benestar emocional (1200px, q85) |
| `assets/taller-emocional.webp` | Versió WebP de la mateixa foto |
| `js/data.js` | Nou taller "Conversa en anglès" a Can Pepus |

La foto substitueix l'anterior amb el mateix nom, així que no cal tocar cap referència.
El taller nou fa servir `assets/taller-idioma.jpg`, que ja era al repo.

Dades confirmades: gratuït, 12 places, grup setmanal estable. Com que el model no
té un tipus "setmanal", es queda com a `taller` i el caràcter setmanal es comunica
amb `data_label: 'Cada setmana'` i a la descripció. La data `2026-10-08` només
serveix per ordenar; ⚑ falta saber quin dia de la setmana és.

⚑ Pendent de decidir: una reserva d'aquest taller = plaça al grup per a tot el curs
(model actual, coherent amb cupo 12) o inscripció sessió a sessió.

---

### Esborrat manual (els ZIP no poden esborrar)

- **`js/reserva.js`** — codi mort. Ja he tret l'etiqueta `<script>` de `reserves.html`.
- **`RECURSOS_DATA`** dins `js/data.js` (línies ~167-207) — ja no el carrega ningú.
  No fa cap mal deixar-lo, però és brossa.

### Comprovacions després del push

1. `/admin` demana usuari i contrasenya i entra al panel (ni 404 ni pàgina en blanc).
2. Reserva de prova → redirigeix a `/confirmacio.html`.
3. Panel → Auditoria → hi ha una línia `insert` amb actor `web-publica`.
4. Canviar l'estat a "Confirmada" → línia `update` amb el canvi `pending → confirmed`.
5. Repetir la reserva amb el mateix telèfon → avís de duplicada.
6. `cupo` a 1 i reservar 2 places → llista d'espera.
7. Recursos → provar un filtre i obrir un parell d'enllaços.

### ⚑ [VERIFICAR]

- **L'SQL no s'ha executat contra un Postgres real** (no en tinc a l'entorn). Si peta
  alguna línia a l'SQL Editor, passa'm l'error i ho corregeixo.
- **Enllaços en castellà**: les targetes tenen el text traduït, però l'URL és la
  mateixa en tots dos idiomes (les pàgines de la Generalitat són en català, algunes
  amb traducció automàtica). No he inventat cap URL `/es/`. Si vols, ho reviso un per un.
- **Consentiment RGPD**: columnes creades i omplertes amb la versió `form-legal-v1`
  del text que ja mostra el formulari. Si vols casella marcable, passa'm el text.
- **Camp "notes"**: continua sent text lliure on algú pot escriure dades de salut.
  Pendent d'avís visible.
- **Actor únic**: amb `ADMIN_USER` compartit tot l'historial dirà el mateix nom.
- **El login és Basic Auth amb el token a `sessionStorage`.** És prou per a dues
  persones i un panel intern, i és el que ja hi havia al servidor; però no té caducitat
  de sessió ni bloqueig per intents fallits. Quan el panel guardi dades de més gent,
  toca passar a Supabase Auth amb JWT. No urgeix, però que consti.

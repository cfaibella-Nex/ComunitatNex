# Gestor i panell d'administració

Documentació tècnica del panell (`/admin`): usuaris, activitats i imatges.

---

## Gestor Comunitat · Sprint 1 — motor de dades i usuaris

Port del motor de BookingFEB. **No canvia res visible**: el panell actual segueix
funcionant igual. L'S1 només deixa la base preparada.

### Què entra

| Fitxer | Què fa |
|---|---|
| `sql/04-usuaris-gestor.sql` | Taules `contingut` i `usuaris` + RPC dins l'esquema `comunitat` |
| `api/_lib/gestor/auth.js` | Contrasenyes scrypt, sessions signades, bloqueig per intents |
| `api/_lib/gestor/db.js` | Accés a l'esquema |
| `api/_lib/gestor/estat.js` | Diagnòstic |
| `api/_lib/gestor/config.js` | **Els camps editables de Comunitat.** L'únic fitxer que canvia per client |
| `api/_lib/http.js` | Nou `ambTimeout()` |
| `api/health.js` | Ara informa també de l'estat del gestor |

### Instal·lació

1. **SQL** — Supabase → SQL Editor → `sql/04-usuaris-gestor.sql` sencer → Run.
   Requereix `schema-full.sql` ja executat: reutilitza l'auditoria existent.
2. **Variable a Vercel** — `GESTOR_SECRET`, 48 caràcters aleatoris
   (`openssl rand -base64 48` o el gestor de contrasenyes). Signa les sessions:
   si canvia, tothom ha de tornar a entrar. **Mai la mateixa que cap altra clau.**
3. **Redeploy** i obre `/api/health`: `gestor.taules_ok: true`, `gestor.usuaris: 0`.

Amb això l'S1 queda verificat. El primer usuari es crea a l'S2, quan hi hagi
pantalla per fer-ho.

### Decisions preses en el port

**Un sol esquema.** El gestor no va a un esquema `gestor` propi com a FEB, sinó dins
de `comunitat`, al costat de `events` i `reserves`. Així les consultes que creuen
activitats i reserves no han de saltar d'esquema. L'auditoria, `set_updated_at()` i
`fn_auditoria()` es reaprofiten: FEB les va generalitzar d'aquí, i són idèntiques.

**Rols.** `admin`, `responsable` i `editor`. L'editor pot preparar activitats però no
esborrar-les ni veure reserves: el rol es tria en crear cada persona, així que si la
Nidhi ha d'editar activitats o només gestionar reserves es decideix aquell dia i es
pot canviar.

**El hash de contrasenya no arriba a l'auditoria.** El trigger genèric hauria desat
el hash com qualsevol altre camp. Un trigger posterior el retira dels registres
d'usuaris.

**Cookie `comunitat_sessio`**, httpOnly + Secure + SameSite=Strict, limitada a `/api`.
El JavaScript de la pàgina no la pot llegir.

**Estil Node.** FEB fa servir l'API Web de Vercel (`request.headers.get`); Comunitat
fa servir `(req, res)`. La lectura de cookies s'ha adaptat.

### Comprovat en local

- scrypt: hash en ~94 ms, verifica bé i rebutja la incorrecta
- token de sessió: vàlid; manipulat, rebutjat
- permisos: l'editor pot editar contingut, no pot esborrar

### ⚑ [VERIFICAR]

- L'SQL no s'ha executat contra un Postgres real. Si peta, passa'm l'error.
- `GESTOR_SETUP_KEY` encara no cal: és de l'S2.
- El bucket `comunitat-media` es crea públic de lectura. És per a fotos d'activitats.
  **Mai documents de persones**: un bucket públic és accessible per URL directa.
  (IntraNex té aquest problema obert amb `case-arxius` i `case-fotos`.)

### Què ve després

- **S2** — API del gestor i panell: login, editor de camps, usuaris, desfer.
- **S3** — Catàleg des de la base de dades amb interruptor `CATALOG_SOURCE` i còpia
  de seguretat si Supabase cau. Aquí desapareix el problema de les dues fonts de
  veritat amb `data.js`. Hi entra l'agenda.
- **S4** — Stripe.

---

## Gestor Comunitat · Sprint 2a — magatzem i validació

Decisió aplicada: **el gestor escriu sobre `comunitat.events`**, la taula que ja
funciona i on pengen les reserves per clau forana. No es migra res. `contingut`
queda per a textos, recursos i imatges, com vas demanar.

Segueix sense canviar res visible: encara no hi ha pantalla nova.

### Què entra

| Fitxer | Què fa |
|---|---|
| `api/gestor-schema-s2.sql` | `versio` a events + RPC `desar_event` i `restaurar_event` |
| `api/_lib/gestor/contingut.js` | Motor de validació i fusió de canvis |
| `api/_lib/gestor/config.js` | Ampliat amb les dues col·leccions i el bucket |

### Instal·lació

Supabase → SQL Editor → `api/gestor-schema-s2.sql` sencer → Run.
Requereix `schema-full.sql` i `gestor-schema.sql` ja executats.

### Com protegeix això les dades

El servidor **mai** parteix del que envia el navegador. Carrega l'activitat de la
base de dades i hi aplica només els camps que `config.js` declara editables. Tot
el que no hi és declarat s'ignora en silenci.

Comprovat en local:

| Prova | Resultat |
|---|---|
| Canviar títol, cupo (20) i preu (7,50 €) | Desa i converteix a 750 cèntims |
| Manipular `id`, `tipo_iva`, `reservades` | Ignorats; l'id no es mou |
| Cupo 5000, hora `25:99`, data "ahir", estat inventat | Quatre errors clars, no desa |
| Imatge apuntant a una web aliena | Rebutjada |
| Imatge `/assets/taller-idioma.jpg` | Acceptada |

Aquesta última importa: sense la comprovació, qualsevol podria fer que la pàgina
carregués imatges d'un altre servidor.

### Control de versió

`events` guanya una columna `versio`. Si tu i la Nidhi editeu la mateixa activitat
alhora, el segon desat no trepitja el primer: rep un avís amb la versió actual i
decideix.

### Desfer

`restaurar_event(id_del_canvi)` torna una activitat a l'estat anterior a qualsevol
canvi de l'auditoria. **Les reserves no es toquen mai**: només el contingut de
l'activitat.

### ⚑ [VERIFICAR]

- L'SQL no s'ha executat contra un Postgres real.
- El preu al panell s'escriu en euros i es desa en cèntims. La conversió es fa al
  servidor, no al navegador.
- Els camps de la col·lecció `recursos` són una proposta meva a partir del que ja
  tens a `recursos-data.js`. Revisa'ls quan vegis el panell; canviar-los és editar
  una llista a `config.js`.

### Què queda

- **S2b** — API `/api/gestor` i panell: login real, editor de camps, usuaris, desfer,
  pujada d'imatges.
- **S3** — Catàleg des de la base de dades amb interruptor i còpia de seguretat.
- **S4** — Stripe.

---

## Pujada d'imatges (avançat de l'S2b)

Abans: dos camps de text on calia enganxar una ruta a mà, i només funcionava si la
foto ja era al repositori. Ara: botó **Pujar una foto**, vista prèvia i prou.

### Què entra

| Fitxer | Què fa |
|---|---|
| `api/media.js` | **NOU** — `POST /api/media`, puja al bucket `comunitat-media` |
| `js/admin.js` | Els dos camps d'imatge passen a ser selector de fitxer amb vista prèvia |
| `admin.html` | Cache-busting a `?v=31` |

### Requisit

El bucket `comunitat-media` el crea `sql/04-usuaris-gestor.sql`. Si encara no l'has
executat, la pujada et dirà exactament això.

### Com funciona

1. Tries la foto del mòbil o de l'ordinador.
2. **El navegador la redueix abans d'enviar-la**: màxim 1600 px d'ample, JPEG al
   85 %. Una foto de mòbil de 6 MB queda en uns 300 KB.
3. S'envia al servidor, que la torna a validar i la puja al bucket.
4. El camp s'omple sol amb l'adreça i apareix la vista prèvia.

La reducció al navegador no és només comoditat: les funcions de Vercel tenen un
límit de 4,5 MB de cos de petició. Sense reduir, mitja dotzena de fotos de mòbil
fallarien. I de passada tots els assets queden a la mateixa mida, que és l'estàndard
que ja segueix la resta del repositori.

### Validacions al servidor

Mai es confia en el que diu el navegador sobre el seu propi fitxer:

| Prova | Resultat |
|---|---|
| JPG, PNG, WebP de debò | Acceptats |
| PDF amb l'extensió canviada a `.jpg` | Rebutjat |
| Executable | Rebutjat |
| Més de 3 MB | Rebutjat amb la mida exacta |

Es comproven els primers bytes del fitxer, no l'extensió ni el que declara el
navegador. I el nom es neteja abans de desar-lo:

| Nom enviat | Nom desat |
|---|---|
| `Taller Benestar Emocional.JPG` | `2026/taller-benestar-emocional-a3f9k2.jpg` |
| `../../../etc/passwd` | `2026/imatge-x7k2p1.jpg` |
| `foto amb accents àèí.png` | `2026/foto-amb-accents-aei-m4q8.jpg` |

### Es pot seguir escrivint la ruta a mà

El camp de text continua sent editable per a les fotos que ja són al repositori
(`/assets/taller-idioma.jpg`). El validador accepta les dues procedències i cap
altra: una adreça d'una web externa es rebutja.

### ⚑ [VERIFICAR]

- El bucket és **públic de lectura**, que és el que toca per a fotos d'activitats.
  Mai hi posis documents de persones.
- Les fotos pujades no s'esborren mai del bucket, ni quan treus la imatge de
  l'activitat. Si algun dia cal netejar, es fa des de Supabase → Storage.
- L'autenticació encara és la del panell actual. Quan arribi l'S2b sencer, el mateix
  endpoint passarà a demanar sessió de gestor.

---

## Panell d'activitats visual + avisos de places

La pestanya d'activitats deixa de ser una taula i passa a ser una graella de
targetes amb foto, estat, ocupació real i edició ràpida.

### Abans de veure-hi res: omplir la base de dades

El panell només pot editar el que és a `comunitat.events`, i ara mateix les deu
activitats viuen a `js/data.js`. Ordre:

1. `sql/04-usuaris-gestor.sql` → taules del gestor i bucket de fotos
2. `api/gestor-schema-s2.sql` → versió i RPC
3. `api/seed-events.sql` → **les deu activitats passen a la base de dades**

A partir d'aquí el panell és l'únic lloc on tocar-les. No editis `data.js`, que
queda com a còpia de seguretat per si l'API cau.

### Què fa cada targeta

- **Foto, tipus, estat i ubicació** d'un cop d'ull
- **Barra d'ocupació**: places reservades de debò sobre el total, comptant només
  reserves vives (pendents, confirmades i assistides)
- **Edició ràpida sense obrir res**: data, hora, places i estat es canvien des de
  la mateixa targeta i es desen al moment
- **Editar** obre el formulari complet · **Duplicar** · **Reserves** amb el nombre ·
  **Arxivar**
- Les activitats amb data passada surten amb vora discontínua i l'avís
  "no surt a la web"

### Quatre vistes

`Properes` (per defecte) · `Passades` · `Arxivades` · `Totes`, cadascuna amb el
compte. Si hi ha activitats passades, la vista de properes t'avisa.

### Duplicar en lloc de reescriure la data

El botó **Duplicar** crea una edició nova, oculta, amb data buida i sense reserves.

És el camí correcte per repetir un taller. Canviar la data a l'activitat antiga
arrossega les persones que s'hi van apuntar: qui es va inscriure al taller de
setembre apareixeria inscrit al de desembre sense haver-ho demanat, i a l'auditoria
constaria com un canvi teu. Mentre no hi hagi reserves, tant se val; a partir de la
primera, importa.

### Comprovat en local

- Les quatre vistes compten bé i ordenen per data
- L'ocupació ignora les cancel·lades: 3 confirmades + 2 pendents = 5 de 20
- Canviar la data des de la targeta envia el PATCH de l'activitat correcta
- Si el desat falla, el valor torna enrere sol i surt l'error

### Avisos de places: "Últimes places" i "Ple"

Ja existien a la portada, però **no a l'agenda**, i el llindar estava escrit a mà
dins d'`agenda.js`. Ara hi ha una sola funció a `main.js`, `estatPlaces()`, que fan
servir la portada, l'agenda i el panell. Canviar el llindar és canviar un número.

| Situació | Resultat |
|---|---|
| 20 places, 0 reserves | Sense avís, "en queden 20" |
| 20 places, 17 reserves | **Últimes places** (queden 3 o menys) |
| 20 places, 20 reserves | **Ple** |
| Marcada "Esgotat" a mà amb places lliures | **Ple** — l'estat manual mana sempre |

L'important és que el panell ensenya el mateix que veu la gent a la web, no un
càlcul diferent.

### Tipografia del panell

La web pública fa servir 20 px de base perquè la llegeixin persones grans. Al
panell hi treballeu tu, la Nidhi i en Raúl, així que baixa a 15 px: un 25 % menys,
i hi cap molta més informació a la pantalla. Botons, camps i taules també s'ajusten.

Només afecta `admin.html`. La web pública no es toca.

### ⚑ [VERIFICAR]

- El llindar d'últimes places és 3. Per a una activitat de 40 places potser hauria
  de ser proporcional (un 10 %). Digue'm i ho canvio: és una línia.
- El canvi ràpid envia l'activitat sencera, perquè l'API fa un upsert complet. Amb
  tres persones al panell això acabarà important: el control de versió de
  `desar_event` (S2a) ho resol, i el connecto a l'S2b.
- El duplicat genera l'id afegint un sufix aleatori a l'original. Si vols ids més
  nets (`taller-angles-2027`), canvia'l al formulari abans de desar.

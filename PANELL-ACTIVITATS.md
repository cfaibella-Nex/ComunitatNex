# Panell d'activitats visual + avisos de places

La pestanya d'activitats deixa de ser una taula i passa a ser una graella de
targetes amb foto, estat, ocupació real i edició ràpida.

## Abans de veure-hi res: omplir la base de dades

El panell només pot editar el que és a `comunitat.events`, i ara mateix les deu
activitats viuen a `js/data.js`. Ordre:

1. `api/gestor-schema.sql` → taules del gestor i bucket de fotos
2. `api/gestor-schema-s2.sql` → versió i RPC
3. `api/seed-events.sql` → **les deu activitats passen a la base de dades**

A partir d'aquí el panell és l'únic lloc on tocar-les. No editis `data.js`, que
queda com a còpia de seguretat per si l'API cau.

## Què fa cada targeta

- **Foto, tipus, estat i ubicació** d'un cop d'ull
- **Barra d'ocupació**: places reservades de debò sobre el total, comptant només
  reserves vives (pendents, confirmades i assistides)
- **Edició ràpida sense obrir res**: data, hora, places i estat es canvien des de
  la mateixa targeta i es desen al moment
- **Editar** obre el formulari complet · **Duplicar** · **Reserves** amb el nombre ·
  **Arxivar**
- Les activitats amb data passada surten amb vora discontínua i l'avís
  "no surt a la web"

## Quatre vistes

`Properes` (per defecte) · `Passades` · `Arxivades` · `Totes`, cadascuna amb el
compte. Si hi ha activitats passades, la vista de properes t'avisa.

## Duplicar en lloc de reescriure la data

El botó **Duplicar** crea una edició nova, oculta, amb data buida i sense reserves.

És el camí correcte per repetir un taller. Canviar la data a l'activitat antiga
arrossega les persones que s'hi van apuntar: qui es va inscriure al taller de
setembre apareixeria inscrit al de desembre sense haver-ho demanat, i a l'auditoria
constaria com un canvi teu. Mentre no hi hagi reserves, tant se val; a partir de la
primera, importa.

## Comprovat en local

- Les quatre vistes compten bé i ordenen per data
- L'ocupació ignora les cancel·lades: 3 confirmades + 2 pendents = 5 de 20
- Canviar la data des de la targeta envia el PATCH de l'activitat correcta
- Si el desat falla, el valor torna enrere sol i surt l'error

## Avisos de places: "Últimes places" i "Ple"

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

## Tipografia del panell

La web pública fa servir 20 px de base perquè la llegeixin persones grans. Al
panell hi treballeu tu, la Nidhi i en Raúl, així que baixa a 15 px: un 25 % menys,
i hi cap molta més informació a la pantalla. Botons, camps i taules també s'ajusten.

Només afecta `admin.html`. La web pública no es toca.

## ⚑ [VERIFICAR]

- El llindar d'últimes places és 3. Per a una activitat de 40 places potser hauria
  de ser proporcional (un 10 %). Digue'm i ho canvio: és una línia.
- El canvi ràpid envia l'activitat sencera, perquè l'API fa un upsert complet. Amb
  tres persones al panell això acabarà important: el control de versió de
  `desar_event` (S2a) ho resol, i el connecto a l'S2b.
- El duplicat genera l'id afegint un sufix aleatori a l'original. Si vols ids més
  nets (`taller-angles-2027`), canvia'l al formulari abans de desar.

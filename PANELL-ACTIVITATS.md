# Panell d'activitats visual

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

## ⚑ [VERIFICAR]

- El canvi ràpid envia l'activitat sencera, perquè l'API fa un upsert complet. Si
  dues persones editen la mateixa activitat alhora, l'última guanya. El control de
  versió de `desar_event` (S2a) ho resoldrà quan el panell hi passi, a l'S2b.
- El duplicat genera l'id afegint un sufix aleatori a l'original. Si vols ids més
  nets (`taller-angles-2027`), canvia'l al formulari abans de desar.

# Patch v14 · Millores de la revisió amb navegador + horaris setmanals + contacte

## Instal·lació
1. Supabase → `api/schema-v14-recurrencia-contacte.sql` → Run. Al final mostra cada activitat
   amb el **dia de la setmana que surt de la seva data**: comprova que quadra amb el cartell.
2. (Opcional, prova) l'SQL d'alta massiva que et vaig passar a part — **no el pugis a GitHub**.
3. Push del ZIP. Ctrl+Shift+R.

## Nou
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

## Correccions visuals
- Fitxa amb cartell: cartell sencer centrat sobre el mateix cartell difuminat; clic per ampliar.
- Portada: etiqueta TALLER a mida del text; franja fosca sota el títol als cartells.
- Lupa: icona blanca en SVG (l'emoji de colors no es veia).
- Reserva sense extres: "Pas 2 de 2" (abans deia 3 de 3).
- "Carregant activitats…" a Agenda, Reserves, Portada i Fitxa (abans quedava en blanc).
- Foto de portada: es veuen els caps.

## Proves
SQL en Postgres 16 (instal·lació neta i damunt d'una importació feta, dues vegades).
jsdom: agenda, reserves amb filtre, fitxa, checkout, portada, panell (seguiment, afegir amb contacte, Excel).

## ⚑ [VERIFICAR]
- El dia de la setmana surt de la **data**: si una setmanal té una data d'un altre dia, dirà un dia equivocat. Revisa la taula final del SQL.
- Les setmanals no desapareixen soles: arxiva-les quan acabi el curs.
- La web pública encara bloqueja dos registres amb el mateix telèfon a la mateixa activitat.

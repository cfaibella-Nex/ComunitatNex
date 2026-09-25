# Gestor Comunitat · Sprint 2a — magatzem i validació

Decisió aplicada: **el gestor escriu sobre `comunitat.events`**, la taula que ja
funciona i on pengen les reserves per clau forana. No es migra res. `contingut`
queda per a textos, recursos i imatges, com vas demanar.

Segueix sense canviar res visible: encara no hi ha pantalla nova.

## Què entra

| Fitxer | Què fa |
|---|---|
| `api/gestor-schema-s2.sql` | `versio` a events + RPC `desar_event` i `restaurar_event` |
| `api/_lib/gestor/contingut.js` | Motor de validació i fusió de canvis |
| `api/_lib/gestor/config.js` | Ampliat amb les dues col·leccions i el bucket |

## Instal·lació

Supabase → SQL Editor → `api/gestor-schema-s2.sql` sencer → Run.
Requereix `schema-full.sql` i `gestor-schema.sql` ja executats.

## Com protegeix això les dades

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

## Control de versió

`events` guanya una columna `versio`. Si tu i la Nidhi editeu la mateixa activitat
alhora, el segon desat no trepitja el primer: rep un avís amb la versió actual i
decideix.

## Desfer

`restaurar_event(id_del_canvi)` torna una activitat a l'estat anterior a qualsevol
canvi de l'auditoria. **Les reserves no es toquen mai**: només el contingut de
l'activitat.

## ⚑ [VERIFICAR]

- L'SQL no s'ha executat contra un Postgres real.
- El preu al panell s'escriu en euros i es desa en cèntims. La conversió es fa al
  servidor, no al navegador.
- Els camps de la col·lecció `recursos` són una proposta meva a partir del que ja
  tens a `recursos-data.js`. Revisa'ls quan vegis el panell; canviar-los és editar
  una llista a `config.js`.

## Què queda

- **S2b** — API `/api/gestor` i panell: login real, editor de camps, usuaris, desfer,
  pujada d'imatges.
- **S3** — Catàleg des de la base de dades amb interruptor i còpia de seguretat.
- **S4** — Stripe.

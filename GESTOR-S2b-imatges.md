# Pujada d'imatges (avançat de l'S2b)

Abans: dos camps de text on calia enganxar una ruta a mà, i només funcionava si la
foto ja era al repositori. Ara: botó **Pujar una foto**, vista prèvia i prou.

## Què entra

| Fitxer | Què fa |
|---|---|
| `api/media.js` | **NOU** — `POST /api/media`, puja al bucket `comunitat-media` |
| `js/admin.js` | Els dos camps d'imatge passen a ser selector de fitxer amb vista prèvia |
| `admin.html` | Cache-busting a `?v=31` |

## Requisit

El bucket `comunitat-media` el crea `api/gestor-schema.sql`. Si encara no l'has
executat, la pujada et dirà exactament això.

## Com funciona

1. Tries la foto del mòbil o de l'ordinador.
2. **El navegador la redueix abans d'enviar-la**: màxim 1600 px d'ample, JPEG al
   85 %. Una foto de mòbil de 6 MB queda en uns 300 KB.
3. S'envia al servidor, que la torna a validar i la puja al bucket.
4. El camp s'omple sol amb l'adreça i apareix la vista prèvia.

La reducció al navegador no és només comoditat: les funcions de Vercel tenen un
límit de 4,5 MB de cos de petició. Sense reduir, mitja dotzena de fotos de mòbil
fallarien. I de passada tots els assets queden a la mateixa mida, que és l'estàndard
que ja segueix la resta del repositori.

## Validacions al servidor

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

## Es pot seguir escrivint la ruta a mà

El camp de text continua sent editable per a les fotos que ja són al repositori
(`/assets/taller-idioma.jpg`). El validador accepta les dues procedències i cap
altra: una adreça d'una web externa es rebutja.

## ⚑ [VERIFICAR]

- El bucket és **públic de lectura**, que és el que toca per a fotos d'activitats.
  Mai hi posis documents de persones.
- Les fotos pujades no s'esborren mai del bucket, ni quan treus la imatge de
  l'activitat. Si algun dia cal netejar, es fa des de Supabase → Storage.
- L'autenticació encara és la del panell actual. Quan arribi l'S2b sencer, el mateix
  endpoint passarà a demanar sessió de gestor.

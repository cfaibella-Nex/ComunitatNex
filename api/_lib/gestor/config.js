/* gestor/config.js — CONFIGURACIÓ DEL CLIENT
   ─────────────────────────────────────────────────────────
   Aquest és l'ÚNIC fitxer del gestor que canvia d'un client a
   un altre. La resta (motor, panell, SQL) es copia tal qual.

   Defineix:
     · quins tipus d'activitat hi ha i com s'anomenen
     · quins camps pot editar l'entitat, de quin tipus són i
       a quins tipus d'activitat s'apliquen

   El que NO surt aquí no es pot modificar des del panell. El
   servidor ignora qualsevol camp no declarat, encara que algú
   manipuli la petició.

   Tipus de camp disponibles:
     text · textarea · text-i18n · textarea-i18n · data · hora
     enter · preu · imatge · estat

   L'idioma del panell és el de l'entitat (aquí, català). */

export const GESTOR = {
  versio: '1.0.0',
  client: 'Comunitat NexSocial',
  idiomes: ['ca', 'es'],
  idiomaBase: 'ca',                 // obligatori; l'altre hi cau si és buit
  idiomaEtiquetes: { ca: 'Català', es: 'Castellano' },

  tipus: {
    mensual:      { nom: 'Activitat periòdica', plural: 'Activitats periòdiques' },
    taller:       { nom: 'Taller',              plural: 'Tallers' },
    esdeveniment: { nom: 'Esdeveniment',        plural: 'Esdeveniments' }
  },

  /* Estats de l'activitat. L'ordre és el del selector del panell.
     Es corresponen amb els de comunitat.events. */
  estats: [
    { id: 'actiu',       nom: 'Visible',      ajuda: 'Es veu i s\'hi pot reservar' },
    { id: 'proximament', nom: 'Pròximament',  ajuda: 'Es veu, però encara no s\'hi pot reservar' },
    { id: 'esgotat',     nom: 'Esgotat',      ajuda: 'Es veu amb la franja de complet; no s\'hi pot reservar' },
    { id: 'arxivat',     nom: 'Arxivat',      ajuda: 'No apareix a la web. Les reserves fetes es conserven' }
  ],

  camps: [
    { path: 'titol',      tipus: 'text-i18n',     nom: 'Títol', requerit: true, max: 120 },
    { path: 'descripcio', tipus: 'textarea-i18n', nom: 'Descripció', max: 1500 },

    { path: 'data',       tipus: 'data',  nom: 'Data',
      ajuda: 'Serveix per ordenar l\'agenda encara que no es mostri' },
    { path: 'hora',       tipus: 'hora',  nom: 'Hora' },
    { path: 'durada',     tipus: 'enter', nom: 'Durada (min)', min: 0, max: 600 },
    { path: 'data_label', tipus: 'text-i18n', nom: 'Etiqueta de data', max: 60,
      ajuda: 'Substitueix la data a la targeta: "Octubre 2026", "Cada setmana". Buit = es mostra la data' },

    { path: 'cupo',       tipus: 'enter', nom: 'Places totals', min: 0, max: 999, rapid: true,
      ajuda: 'Quan s\'omplen, les noves peticions van a llista d\'espera' },
    { path: 'preu_cents', tipus: 'preu',  nom: 'Preu', min: 0, max: 500,
      ajuda: '0 = gratuït' },

    { path: 'entitat',     tipus: 'text-i18n', nom: 'Entitat que acull', max: 120 },
    { path: 'ubicacio',    tipus: 'text-i18n', nom: 'Lloc', max: 200 },
    { path: 'mapa_url',    tipus: 'text',      nom: 'Enllaç al mapa', max: 400 },

    { path: 'imatge',      tipus: 'imatge', nom: 'Imatge de l\'activitat' },
    { path: 'imatge_lloc', tipus: 'imatge', nom: 'Imatge del lloc',
      ajuda: 'Foto de l\'edifici; surt a "On es fa"' }
  ],

  /* Camps que el panell NO deixa tocar mai, encara que arribin a la
     petició: es calculen o es gestionen des d'un altre lloc. */
  prohibits: ['id', 'reservades', 'tipo_iva', 'created_at', 'updated_at']
};

/* Camps aplicables a un tipus d'activitat */
export function campsPerTipus(tipus) {
  return GESTOR.camps.filter(c => !c.nomes || c.nomes.includes(tipus));
}

export function esEstatValid(id) {
  return GESTOR.estats.some(e => e.id === id);
}

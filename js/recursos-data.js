/* recursos-data.js — Comunitat NexSocial
   ────────────────────────────────────────
   Catàleg d'enllaços oficials i gratuïts. NO són recursos propis:
   són administracions i serveis públics. Quan tinguem guies pròpies
   s'afegiran aquí mateix amb `propi: true`.

   Camps:
     intencions → per al filtre "Què vols fer?"
     font       → qui és responsable del recurs (es mostra a la targeta)
     url        → enllaç oficial. Cap enllaç pot quedar buit. */

const RECURSOS_LINKS = [
  {
    id: 'canalsalut-gent-gran',
    categoria: 'salut',
    intencions: ['informacio', 'exercici'],
    font: 'Canal Salut · Generalitat de Catalunya',
    titol: {
      ca: 'Salut i benestar per a persones grans',
      es: 'Salud y bienestar para personas mayores'
    },
    descripcio: {
      ca: "Activitat física, alimentació, benestar emocional, prevenció i hàbits saludables, explicat de manera clara pel Departament de Salut.",
      es: 'Actividad física, alimentación, bienestar emocional, prevención y hábitos saludables, explicado de forma clara por el Departament de Salut.'
    },
    url: 'https://canalsalut.gencat.cat/ca/vida-saludable/etapes-de-la-vida/gent-gran/'
  },
  {
    id: 'canalsalut-alimentacio',
    categoria: 'alimentacio',
    intencions: ['informacio'],
    font: 'Canal Salut · Generalitat de Catalunya',
    titol: {
      ca: 'Menjar bé a partir dels 65',
      es: 'Comer bien a partir de los 65'
    },
    descripcio: {
      ca: "Consells senzills sobre hidratació, proteïnes, fruita i verdura, fibra, sal, sucre, calci i vitamina D.",
      es: 'Consejos sencillos sobre hidratación, proteínas, fruta y verdura, fibra, sal, azúcar, calcio y vitamina D.'
    },
    url: 'https://canalsalut.gencat.cat/ca/vida-saludable/alimentacio/saludable/persones-grans/'
  },
  {
    id: 'canalsalut-moure-se',
    categoria: 'moviment',
    intencions: ['exercici'],
    font: 'Canal Salut · Generalitat de Catalunya',
    titol: {
      ca: 'Com moure\'s més cada dia',
      es: 'Cómo moverse más cada día'
    },
    descripcio: {
      ca: "Idees per mantenir-se actiu i treballar la força, l'equilibri i la flexibilitat sense sortir de la rutina del dia a dia.",
      es: 'Ideas para mantenerse activo y trabajar la fuerza, el equilibrio y la flexibilidad sin salir de la rutina diaria.'
    },
    url: 'https://canalsalut.gencat.cat/ca/vida-saludable/activitat-fisica/com-ser-actiu/persona-gran/'
  },
  {
    id: 'actius-i-salut',
    categoria: 'comunitat',
    intencions: ['gent', 'acompanyament', 'informacio'],
    font: 'Aquí sí. Actius i salut · Agència de Salut Pública',
    destacat: true,
    titol: {
      ca: 'Cercador d\'activitats comunitàries del teu barri',
      es: 'Buscador de actividades comunitarias de tu barrio'
    },
    descripcio: {
      ca: "El mapa oficial dels actius de salut de Catalunya: activitats, grups i recursos comunitaris a prop teu. Busca per municipi i mira què hi ha a Badalona.",
      es: 'El mapa oficial de los activos de salud de Cataluña: actividades, grupos y recursos comunitarios cerca de ti. Busca por municipio y mira qué hay en Badalona.'
    },
    url: 'https://salutpublica.gencat.cat/ca/agencia/plans-estrategics/pinsap/accions-eines-projectes-relacionats/actius-salut/cercador-actius-salut/'
  },
  {
    id: 'actius-i-salut-que-es',
    categoria: 'comunitat',
    intencions: ['informacio'],
    font: 'Agència de Salut Pública de Catalunya',
    titol: {
      ca: 'Què són els actius de salut',
      es: 'Qué son los activos de salud'
    },
    descripcio: {
      ca: "Un actiu és qualsevol recurs que dona salut i benestar a una comunitat: persones, entorns, equipaments i activitats. És la mirada des de la qual treballem.",
      es: 'Un activo es cualquier recurso que da salud y bienestar a una comunidad: personas, entornos, equipamientos y actividades. Es la mirada desde la que trabajamos.'
    },
    url: 'https://salutpublica.gencat.cat/ca/agencia/plans-estrategics/pinsap/accions-eines-projectes-relacionats/actius-salut/'
  },
  {
    id: 'gencat-soc-persona-gran',
    categoria: 'tramits',
    intencions: ['informacio'],
    font: 'Generalitat de Catalunya',
    titol: {
      ca: 'Sóc una persona gran: per on començo?',
      es: 'Soy una persona mayor: ¿por dónde empiezo?'
    },
    descripcio: {
      ca: "Punt de partida oficial per trobar informació sobre jubilació, ajuts, serveis socials, transport, drets i lleure.",
      es: 'Punto de partida oficial para encontrar información sobre jubilación, ayudas, servicios sociales, transporte, derechos y ocio.'
    },
    url: 'https://web.gencat.cat/ca/ciutadania/serveis-socials/persones-grans'
  },
  {
    id: 'drets-socials-grans',
    categoria: 'tramits',
    intencions: ['informacio'],
    font: 'Departament de Drets Socials',
    titol: {
      ca: 'Prestacions i serveis socials',
      es: 'Prestaciones y servicios sociales'
    },
    descripcio: {
      ca: "Informació sobre prestacions econòmiques, serveis i recursos per a persones grans i les seves famílies.",
      es: 'Información sobre prestaciones económicas, servicios y recursos para personas mayores y sus familias.'
    },
    url: 'https://dretssocials.gencat.cat/ca/ambits_tematics/persones_grans/'
  },
  {
    id: 'punts-omnia',
    categoria: 'tecnologia',
    intencions: ['aprendre', 'gent'],
    font: 'Xarxa Òmnia · Generalitat de Catalunya',
    titol: {
      ca: 'Aprendre a fer servir el mòbil i Internet',
      es: 'Aprender a usar el móvil e Internet'
    },
    descripcio: {
      ca: "Els Punts Òmnia són espais gratuïts d'aprenentatge digital: mòbil, Internet, tràmits en línia i altres eines. Busca el més proper.",
      es: 'Los Puntos Òmnia son espacios gratuitos de aprendizaje digital: móvil, Internet, trámites en línea y otras herramientas. Busca el más cercano.'
    },
    url: 'https://xarxaomnia.gencat.cat/'
  },
  {
    id: 'biblioteques-badalona',
    categoria: 'cultura',
    intencions: ['aprendre', 'memoria', 'gent'],
    font: 'Biblioteques de Badalona · Diputació de Barcelona',
    titol: {
      ca: 'Les biblioteques de Badalona',
      es: 'Las bibliotecas de Badalona'
    },
    descripcio: {
      ca: "Lectura, activitats, formació i espais de trobada. L'entrada és lliure i el carnet és gratuït.",
      es: 'Lectura, actividades, formación y espacios de encuentro. La entrada es libre y el carné es gratuito.'
    },
    url: 'https://bibliotecavirtual.diba.cat/biblioteques/badalona'
  },
  {
    id: 'casals-gent-gran-badalona',
    categoria: 'comunitat',
    intencions: ['gent', 'exercici', 'aprendre'],
    font: 'Ajuntament de Badalona',
    destacat: true,
    titol: {
      ca: 'Casals de Gent Gran de Badalona',
      es: 'Casals de Gent Gran de Badalona'
    },
    descripcio: {
      ca: "Activitats, tallers, exercici, cultura i tecnologia al teu barri. Consulta els casals de la ciutat i el que ofereix cadascun.",
      es: 'Actividades, talleres, ejercicio, cultura y tecnología en tu barrio. Consulta los casals de la ciudad y lo que ofrece cada uno.'
    },
    url: 'https://www.badalona.cat/ca/serveis-ajuntament/gent-gran/casals-de-gent-gran-de-badalona'
  },
  {
    id: 'casals-civics',
    categoria: 'comunitat',
    intencions: ['gent', 'aprendre'],
    font: 'Departament de Drets Socials',
    titol: {
      ca: 'Casals Cívics i Comunitaris',
      es: 'Casals Cívicos y Comunitarios'
    },
    descripcio: {
      ca: "Equipaments oberts a tothom amb activitats, tallers i espais de relació. Programació que canvia cada trimestre.",
      es: 'Equipamientos abiertos a todo el mundo con actividades, talleres y espacios de relación. Programación que cambia cada trimestre.'
    },
    url: 'https://dretssocials.gencat.cat/ca/serveis/equipaments_civics_i_activitats/casals_civics_i_comunitaris/'
  },
  {
    id: 'teranyina-badalona',
    categoria: 'comunitat',
    intencions: ['gent', 'exercici', 'informacio'],
    font: 'Ajuntament de Badalona',
    titol: {
      ca: 'La Teranyina: salut i benestar a Badalona',
      es: 'La Teranyina: salud y bienestar en Badalona'
    },
    descripcio: {
      ca: "Xarxa comunitària de Badalona que impulsa xerrades, tallers i activitats de salut, benestar i participació.",
      es: 'Red comunitaria de Badalona que impulsa charlas, talleres y actividades de salud, bienestar y participación.'
    },
    url: 'https://www.badalona.cat/ca/serveis-ajuntament/sanitat-i-salut/promocio-salut/alimentacio-saludable/per-a-tothom/la-teranyina'
  }
];

window.RECURSOS_LINKS = RECURSOS_LINKS;

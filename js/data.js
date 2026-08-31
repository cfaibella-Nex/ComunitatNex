/* data.js — Comunitat NexSocial · font estàtica
   ────────────────────────────────────────
   Model d'imatges:
   - imatge      → foto comercial de l'activitat (cards, agenda, hero del detall)
   - imatge_lloc → foto de l'edifici on es fa (mostrada al detall > "On es fa")
*/

const EVENTS_DATA = [
  /* ═══ ACTIVITATS MENSUALS ═══ */
  {
    id: 'passejada-badalona-2026-10', tipo: 'mensual',
    titol: { ca: "Passejades a l'aire lliure", es: 'Paseos al aire libre' },
    descripcio: {
      ca: "Passejades tranquil·les i itinerants pel litoral de Badalona. Cada mes canviem l'itinerari per descobrir plegats el barri, l'aire lliure i la companyia. Ritme adaptat, pauses les que calguin.",
      es: "Paseos tranquilos e itinerantes por el litoral de Badalona. Cada mes cambiamos el itinerario para descubrir juntas el barrio, el aire libre y la compañía. Ritmo adaptado, pausas las que hagan falta."
    },
    entitat: { ca: 'NexSocial', es: 'NexSocial' },
    ubicacio: { ca: "Punt de trobada: Fàbrica Anís del Mono, Badalona", es: 'Punto de encuentro: Fábrica Anís del Mono, Badalona' },
    mapa_url: 'https://maps.google.com/?q=F%C3%A0brica+Anis+del+Mono+Badalona',
    data: '2026-10-05', hora: '10:30', durada: 90,
    data_label: { ca: 'Octubre 2026', es: 'Octubre 2026' },
    cupo: 20, reservades: 0, preu_cents: 0, tipo_iva: 'exempt',
    imatge: '/assets/passeig.jpg',
    imatge_lloc: '/assets/passeig.jpg',
    estat: 'actiu'
  },
  {
    id: 'vivioteca-2026-10', tipo: 'mensual',
    titol: { ca: 'Vivioteca · Trobada mensual', es: 'Vivioteca · Encuentro mensual' },
    descripcio: {
      ca: 'Trobada mensual per compartir vivències, lectures i experiències. Un espai relaxat per parlar, escoltar i teixir vincle.',
      es: 'Encuentro mensual para compartir vivencias, lecturas y experiencias. Un espacio relajado para hablar, escuchar y tejer vínculo.'
    },
    entitat: { ca: 'NexSocial · Casal Centre', es: 'NexSocial · Casal Centre' },
    ubicacio: { ca: 'Casal de Gent Gran Centre, Badalona', es: 'Casal de Gent Gran Centre, Badalona' },
    mapa_url: 'https://maps.google.com/?q=Casal+Gent+Gran+Centre+Badalona',
    data: '2026-10-15', hora: '17:00', durada: 90,
    data: '2026-10-15', hora: '17:00', data_label: { ca: 'Octubre 2026', es: 'Octubre 2026' },
    cupo: 25, reservades: 0, preu_cents: 0, tipo_iva: 'exempt',
    imatge: '/assets/vivioteca.jpg',
    imatge_lloc: '/assets/casal-centre.jpg',
    estat: 'actiu'
  },
  {
    id: 'tablao-canyado-2026-10', tipo: 'esdeveniment',
    titol: { ca: 'Tablao Flamenc a Canyadó', es: 'Tablao Flamenco en Canyadó' },
    descripcio: {
      ca: 'Vetllada de flamenc en directe al barri de Canyadó. Guitarra, cant i ball en un espai íntim. Aforament limitat.',
      es: 'Velada de flamenco en directo en el barrio de Canyadó. Guitarra, cante y baile en un espacio íntimo. Aforo limitado.'
    },
    entitat: { ca: 'NexSocial · Canyadó', es: 'NexSocial · Canyadó' },
    ubicacio: { ca: 'Local del barri de Canyadó, Badalona', es: 'Local del barrio de Canyadó, Badalona' },
    mapa_url: 'https://maps.google.com/?q=Canyad%C3%B3+Badalona',
    data: '2026-10-24', hora: '18:30', durada: 90,
    data: '2026-10-24', hora: '18:30', data_label: { ca: 'Pròximament', es: 'Próximamente' },
    cupo: 40, reservades: 0, preu_cents: 1000, tipo_iva: 'iva10',
    imatge: '/assets/flamenco.jpg',
    imatge_lloc: '/assets/flamenco.jpg',
    estat: 'proximament'
  },
  /* ═══ TALLERS ═══ */
  {
    id: 'taller-emocional-centre', tipo: 'taller',
    titol: { ca: "Taller d'acompanyament emocional", es: 'Taller de acompañamiento emocional' },
    descripcio: {
      ca: 'Espai per compartir com estem, aprendre eines per gestionar emocions i teixir xarxa amb altres persones del barri. Grup reduït.',
      es: 'Espacio para compartir cómo estamos, aprender herramientas para gestionar emociones y tejer red con otras personas del barrio. Grupo reducido.'
    },
    entitat: { ca: 'Casal de Gent Gran Centre (ASJP)', es: 'Casal de Gent Gran Centre (ASJP)' },
    ubicacio: { ca: 'Casal Centre, Badalona', es: 'Casal Centre, Badalona' },
    mapa_url: 'https://maps.google.com/?q=Casal+Gent+Gran+Centre+Badalona',
    data: '2026-09-15', hora: '17:00', durada: 90,
    data: '2026-09-15', hora: '17:00', data_label: { ca: 'Setembre 2026', es: 'Septiembre 2026' },
    cupo: 15, reservades: 0, preu_cents: 0, tipo_iva: 'exempt',
    imatge: '/assets/taller-emocional.jpg',
    imatge_lloc: '/assets/casal-centre.jpg',
    estat: 'proximament'
  },
  {
    id: 'taller-mobil-centre', tipo: 'taller',
    titol: { ca: 'Taller de mòbil bàsic', es: 'Taller de móvil básico' },
    descripcio: {
      ca: 'Aprèn a fer servir el mòbil sense por: trucades, WhatsApp, càmera, cita al metge... Va al teu ritme.',
      es: 'Aprende a usar el móvil sin miedo: llamadas, WhatsApp, cámara, cita médica... A tu ritmo.'
    },
    entitat: { ca: 'Casal de Gent Gran Centre (ASJP)', es: 'Casal de Gent Gran Centre (ASJP)' },
    ubicacio: { ca: 'Casal Centre, Badalona', es: 'Casal Centre, Badalona' },
    mapa_url: 'https://maps.google.com/?q=Casal+Gent+Gran+Centre+Badalona',
    data: '2026-09-17', hora: '17:00', durada: 90,
    data: '2026-09-17', hora: '17:00', data_label: { ca: 'Setembre 2026', es: 'Septiembre 2026' },
    cupo: 12, reservades: 0, preu_cents: 0, tipo_iva: 'exempt',
    imatge: '/assets/taller-mobil.jpg',
    imatge_lloc: '/assets/casal-centre.jpg',
    estat: 'proximament'
  },
  {
    id: 'taller-autodefensa-canpepus', tipo: 'taller',
    titol: { ca: "Taller d'autodefensa", es: 'Taller de autodefensa' },
    descripcio: {
      ca: 'Recursos pràctics per sentir-nos més segures al carrer i a casa. Postura, veu, tècniques bàsiques i confiança.',
      es: 'Recursos prácticos para sentirnos más seguras en la calle y en casa. Postura, voz, técnicas básicas y confianza.'
    },
    entitat: { ca: 'Casal de la Solidaritat Can Pepus', es: 'Casal de la Solidaritat Can Pepus' },
    ubicacio: { ca: 'Can Pepus, Raval (Badalona)', es: 'Can Pepus, Raval (Badalona)' },
    mapa_url: 'https://maps.google.com/?q=Casal+Can+Pepus+Badalona',
    data: '2026-09-22', hora: '18:00', durada: 90,
    data: '2026-09-22', hora: '18:00', data_label: { ca: 'Setembre 2026', es: 'Septiembre 2026' },
    cupo: 15, reservades: 0, preu_cents: 2500, tipo_iva: 'exempt',
    imatge: '/assets/taller-autodefensa.jpg',
    imatge_lloc: '/assets/canpepus.jpg',
    estat: 'proximament'
  },
  {
    id: 'taller-autodefensa-santroc', tipo: 'taller',
    titol: { ca: "Taller d'autodefensa", es: 'Taller de autodefensa' },
    descripcio: {
      ca: 'Recursos pràctics per sentir-nos més segures al carrer i a casa. Postura, veu, tècniques bàsiques i confiança.',
      es: 'Recursos prácticos para sentirnos más seguras en la calle y en casa. Postura, voz, técnicas básicas y confianza.'
    },
    entitat: { ca: 'Centre Cívic Sant Roc', es: 'Centre Cívic Sant Roc' },
    ubicacio: { ca: 'Centre Cívic Sant Roc, Badalona', es: 'Centre Cívic Sant Roc, Badalona' },
    mapa_url: 'https://maps.google.com/?q=Centre+Civic+Sant+Roc+Badalona',
    data: '2026-09-24', hora: '18:00', durada: 90,
    data: '2026-09-24', hora: '18:00', data_label: { ca: 'Setembre 2026', es: 'Septiembre 2026' },
    cupo: 15, reservades: 0, preu_cents: 2500, tipo_iva: 'exempt',
    imatge: '/assets/taller-autodefensa.jpg',
    imatge_lloc: '/assets/sant-roc.jpg',
    estat: 'proximament'
  },
  {
    id: 'taller-castellano-santroc', tipo: 'taller',
    titol: { ca: 'Taller de castellà bàsic', es: 'Taller de castellano básico' },
    descripcio: {
      ca: "Espai per practicar castellà i guanyar autonomia al dia a dia. Adaptat i sense pressa.",
      es: 'Espacio para practicar castellano y ganar autonomía en el día a día. Adaptado y sin prisa.'
    },
    entitat: { ca: 'Centre Cívic Sant Roc', es: 'Centre Cívic Sant Roc' },
    ubicacio: { ca: 'Centre Cívic Sant Roc, Badalona', es: 'Centre Cívic Sant Roc, Badalona' },
    mapa_url: 'https://maps.google.com/?q=Centre+Civic+Sant+Roc+Badalona',
    data: '2026-09-16', hora: '17:00', durada: 90,
    data: '2026-09-16', hora: '17:00', data_label: { ca: 'Setembre 2026', es: 'Septiembre 2026' },
    cupo: 15, reservades: 0, preu_cents: 0, tipo_iva: 'exempt',
    imatge: '/assets/taller-idioma.jpg',
    imatge_lloc: '/assets/sant-roc.jpg',
    estat: 'proximament'
  },
  {
    id: 'taller-mobil-santroc', tipo: 'taller',
    titol: { ca: 'Taller de mòbil bàsic', es: 'Taller de móvil básico' },
    descripcio: {
      ca: 'Aprèn a fer servir el mòbil sense por: trucades, WhatsApp, càmera, cita al metge... Va al teu ritme.',
      es: 'Aprende a usar el móvil sin miedo: llamadas, WhatsApp, cámara, cita médica... A tu ritmo.'
    },
    entitat: { ca: 'Centre Cívic Sant Roc', es: 'Centre Cívic Sant Roc' },
    ubicacio: { ca: 'Centre Cívic Sant Roc, Badalona', es: 'Centre Cívic Sant Roc, Badalona' },
    mapa_url: 'https://maps.google.com/?q=Centre+Civic+Sant+Roc+Badalona',
    data: '2026-09-18', hora: '17:00', durada: 90,
    data: '2026-09-18', hora: '17:00', data_label: { ca: 'Setembre 2026', es: 'Septiembre 2026' },
    cupo: 12, reservades: 0, preu_cents: 0, tipo_iva: 'exempt',
    imatge: '/assets/taller-mobil.jpg',
    imatge_lloc: '/assets/sant-roc.jpg',
    estat: 'proximament'
  },
  /* ═══ ESDEVENIMENTS (buit — quan hi hagi jornades, 50è aniv, etc.) ═══ */
];

const RECURSOS_DATA = [
  { id: 'com-demanar-hora-cap', categoria: 'salut',
    titol: { ca: 'Com demanar hora al CAP', es: 'Cómo pedir cita en el CAP' },
    descripcio: {
      ca: 'Guia pas a pas per demanar cita al CAP per telèfon, per app o presencial.',
      es: 'Guía paso a paso para pedir cita en el CAP por teléfono, por app o presencial.'
    }, tipus: 'guia', enllaç: '#' },
  { id: 'sms-fraudulents', categoria: 'seguretat',
    titol: { ca: 'Com detectar un SMS fraudulent', es: 'Cómo detectar un SMS fraudulento' },
    descripcio: {
      ca: 'Els senyals més clars per no caure en missatges de correus, bancs o Hisenda falsos.',
      es: 'Las señales más claras para no caer en mensajes falsos de correos, bancos o Hacienda.'
    }, tipus: 'video', enllaç: '#' },
  { id: 'lletra-mobil-gran', categoria: 'tecnologia',
    titol: { ca: 'Com augmentar la lletra al mòbil', es: 'Cómo aumentar la letra en el móvil' },
    descripcio: {
      ca: 'Ajusta la mida del text al teu mòbil per llegir-ho tot bé, en Android i iPhone.',
      es: 'Ajusta el tamaño del texto en tu móvil para verlo todo bien, en Android y iPhone.'
    }, tipus: 'video', enllaç: '#' },
  { id: 'teleassistencia', categoria: 'salut',
    titol: { ca: 'Què és la teleassistència?', es: '¿Qué es la teleasistencia?' },
    descripcio: {
      ca: "Un botó al coll que et pot ajudar en cas d'emergència. Qui hi té dret i com demanar-la.",
      es: 'Un botón en el cuello que puede ayudarte en caso de emergencia. Quién tiene derecho y cómo pedirla.'
    }, tipus: 'guia', enllaç: '#' },
  { id: 'ajudes-badalona', categoria: 'tramits',
    titol: { ca: 'Ajudes a Badalona per a persones grans', es: 'Ayudas en Badalona para personas mayores' },
    descripcio: {
      ca: "Recull d'ajuts municipals i autonòmics que pots demanar aquest any.",
      es: 'Recopilación de ayudas municipales y autonómicas que puedes solicitar este año.'
    }, tipus: 'guia', enllaç: '#' },
  { id: 'sentir-solo', categoria: 'vida-comunitaria',
    titol: { ca: 'Què puc fer si em sento sol o sola?', es: '¿Qué puedo hacer si me siento solo o sola?' },
    descripcio: {
      ca: 'Petites accions que ajuden a reconnectar amb altres persones. I com trobar acompanyament al barri.',
      es: 'Pequeñas acciones que ayudan a reconectar con otras personas. Y cómo encontrar acompañamiento en el barrio.'
    }, tipus: 'guia', enllaç: '#' },
];

window.EVENTS_DATA = EVENTS_DATA;
window.RECURSOS_DATA = RECURSOS_DATA;

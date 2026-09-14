/* recursos.js — Comunitat NexSocial
   ────────────────────────────────────────
   Filtre per intenció ("Què vols fer?") + per tema, sobre el catàleg
   d'enllaços oficials de recursos-data.js. Sense dependències. */

(function() {

const { esc, L, getLang, qs, qsa, PHONE, PHONE_TEL } = window.NX;

const TXT = {
  ca: {
    intro: 'Hem seleccionat recursos gratuïts i de confiança perquè puguis aprendre, cuidar-te i trobar informació útil sense sortir de casa. Tots són oficials i s\'obren en una pàgina nova.',
    quevols: 'Què vols fer?',
    tema: 'O busca per tema',
    tot: 'Mostra-ho tot',
    obrir: 'Obrir el recurs',
    extern: 'S\'obre en una pàgina nova',
    resultats: n => n === 1 ? '1 recurs' : `${n} recursos`,
    cap: 'No hi ha cap recurs amb aquest filtre. Prova amb una altra opció.',
    ajuda_t: 'No saps per on començar?',
    ajuda_d: 'Digue\'ns què busques i t\'ajudem a trobar l\'activitat o el recurs que et va bé. Sense compromís.',
    ajuda_c: 'Truca\'ns al',
    agenda: 'Veure les nostres activitats',
    intencions: {
      exercici: 'Vull moure\'m',
      gent: 'Vull conèixer gent',
      aprendre: 'Vull aprendre',
      informacio: 'Necessito informació',
      memoria: 'Vull activar la memòria',
      acompanyament: 'Vull sentir-me acompanyat'
    },
    categories: {
      salut: 'Salut', alimentacio: 'Alimentació', moviment: 'Moviment',
      tramits: 'Tràmits i ajuts', tecnologia: 'Tecnologia',
      cultura: 'Cultura', comunitat: 'Vida comunitària'
    }
  },
  es: {
    intro: 'Hemos seleccionado recursos gratuitos y de confianza para que puedas aprender, cuidarte y encontrar información útil sin salir de casa. Todos son oficiales y se abren en una página nueva.',
    quevols: '¿Qué quieres hacer?',
    tema: 'O busca por tema',
    tot: 'Mostrarlo todo',
    obrir: 'Abrir el recurso',
    extern: 'Se abre en una página nueva',
    resultats: n => n === 1 ? '1 recurso' : `${n} recursos`,
    cap: 'No hay ningún recurso con este filtro. Prueba con otra opción.',
    ajuda_t: '¿No sabes por dónde empezar?',
    ajuda_d: 'Dinos qué buscas y te ayudamos a encontrar la actividad o el recurso que te vaya bien. Sin compromiso.',
    ajuda_c: 'Llámanos al',
    agenda: 'Ver nuestras actividades',
    intencions: {
      exercici: 'Quiero moverme',
      gent: 'Quiero conocer gente',
      aprendre: 'Quiero aprender',
      informacio: 'Necesito información',
      memoria: 'Quiero activar la memoria',
      acompanyament: 'Quiero sentirme acompañado'
    },
    categories: {
      salut: 'Salud', alimentacio: 'Alimentación', moviment: 'Movimiento',
      tramits: 'Trámites y ayudas', tecnologia: 'Tecnología',
      cultura: 'Cultura', comunitat: 'Vida comunitaria'
    }
  }
};

const ICONA_CAT = {
  salut: '❤️', alimentacio: '🥗', moviment: '🚶', tramits: '📋',
  tecnologia: '💻', cultura: '📚', comunitat: '🤝'
};

const ORDRE_INTENCIONS = ['exercici', 'gent', 'aprendre', 'informacio', 'memoria', 'acompanyament'];

let filtreIntencio = null;
let filtreCategoria = null;

function dominiDe(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function targeta(r, t, lang) {
  const cat = t.categories[r.categoria] || r.categoria;
  return `
  <article class="resource-card${r.destacat ? ' resource-card--destacat' : ''}">
    <span class="resource-tag">${ICONA_CAT[r.categoria] || '💡'} ${esc(cat)}</span>
    <h3 class="resource-title">${esc(L(r.titol))}</h3>
    <p class="resource-desc">${esc(L(r.descripcio))}</p>
    <p class="resource-font">${esc(r.font)}</p>
    <a class="btn btn-primary resource-cta" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">
      ${t.obrir} ↗
      <span class="sr-only"> · ${t.extern}</span>
    </a>
    <span class="resource-domini">${esc(dominiDe(r.url))}</span>
  </article>`;
}

function render() {
  const lang = getLang();
  const t = TXT[lang] || TXT.ca;
  const app = qs('#recursos-app');
  if (!app) return;

  const dades = window.RECURSOS_LINKS || [];
  const categories = [...new Set(dades.map(r => r.categoria))];

  const visibles = dades.filter(r =>
    (!filtreIntencio || (r.intencions || []).includes(filtreIntencio)) &&
    (!filtreCategoria || r.categoria === filtreCategoria)
  );

  const chipsIntencio = ORDRE_INTENCIONS
    .filter(i => dades.some(r => (r.intencions || []).includes(i)))
    .map(i => `
      <button type="button" class="filter-btn filter-btn--gran ${filtreIntencio === i ? 'active' : ''}"
              data-intencio="${i}" aria-pressed="${filtreIntencio === i}">
        ${esc(t.intencions[i])}
      </button>`).join('');

  const chipsCategoria = categories.map(c => `
      <button type="button" class="filter-btn ${filtreCategoria === c ? 'active' : ''}"
              data-categoria="${c}" aria-pressed="${filtreCategoria === c}">
        ${ICONA_CAT[c] || '💡'} ${esc(t.categories[c] || c)}
      </button>`).join('');

  const hiHaFiltre = filtreIntencio || filtreCategoria;

  app.innerHTML = `
  <p class="lead">${t.intro}</p>

  <div class="recursos-filtres">
    <h2 class="recursos-filtres-title">${t.quevols}</h2>
    <div class="filters">${chipsIntencio}</div>

    <h2 class="recursos-filtres-title">${t.tema}</h2>
    <div class="filters">${chipsCategoria}</div>

    <div class="recursos-estat">
      <span class="muted">${t.resultats(visibles.length)}</span>
      ${hiHaFiltre ? `<button type="button" class="btn btn-ghost" id="neteja">${t.tot}</button>` : ''}
    </div>
  </div>

  ${visibles.length
    ? `<div class="events-grid">${visibles.map(r => targeta(r, t, lang)).join('')}</div>`
    : `<div class="alert alert-info">${t.cap}</div>`}

  <section class="recursos-ajuda">
    <h2>${t.ajuda_t}</h2>
    <p>${t.ajuda_d}</p>
    <p class="recursos-ajuda-tel">${t.ajuda_c} <a href="tel:${PHONE_TEL}"><strong>${PHONE}</strong></a></p>
    <a href="/agenda.html" class="btn btn-secondary">${t.agenda}</a>
  </section>`;

  qsa('[data-intencio]').forEach(b => b.addEventListener('click', () => {
    filtreIntencio = (filtreIntencio === b.dataset.intencio) ? null : b.dataset.intencio;
    render();
  }));
  qsa('[data-categoria]').forEach(b => b.addEventListener('click', () => {
    filtreCategoria = (filtreCategoria === b.dataset.categoria) ? null : b.dataset.categoria;
    render();
  }));
  const neteja = qs('#neteja');
  if (neteja) neteja.addEventListener('click', () => {
    filtreIntencio = null; filtreCategoria = null; render();
  });
}

document.addEventListener('DOMContentLoaded', render);

})();

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
    guies_t: 'Guies NexSocial',
    guies_d: 'El material dels nostres tallers, perquè el tinguis a casa i el puguis repassar quan vulguis.',
    guia_veure: 'Veure la guia',
    guia_baixar: 'Descarregar',
    guia_meta: (n, mida) => `PDF · ${n} pàgines · ${mida}`,
    guia_idioma: '',
    guia_comprovada: 'Informació comprovada el',
    guia_alt: 'Portada de la guia',
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
    guies_t: 'Guías NexSocial',
    guies_d: 'El material de nuestros talleres, para que lo tengas en casa y lo puedas repasar cuando quieras.',
    guia_veure: 'Ver la guía',
    guia_baixar: 'Descargar',
    guia_meta: (n, mida) => `PDF · ${n} páginas · ${mida}`,
    guia_idioma: 'Guía en catalán',
    guia_comprovada: 'Información comprobada el',
    guia_alt: 'Portada de la guía',
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

/* Bloc "Guies NexSocial": material propi, sempre visible (no depèn dels filtres) */
function dataCurta(iso, lang) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'ca-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d, 12));
}
function guiaHTML(g, t, lang) {
  const nomFitxer = g.pdf.split('/').pop();
  const punts = (g.punts?.[lang] || g.punts?.ca || []);
  return `
  <article class="guia">
    <a class="guia-portada" href="${esc(g.pdf)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
      <picture>
        <source srcset="${esc(g.portada)}.webp" type="image/webp">
        <img src="${esc(g.portada)}.jpg" alt="" width="1200" height="675" loading="lazy">
      </picture>
    </a>
    <div class="guia-cos">
      <span class="guia-etiqueta">${esc(L(g.taller))}</span>
      <h3 class="guia-titol">${esc(L(g.titol))}</h3>
      <p class="guia-subtitol">${esc(L(g.subtitol))}</p>
      ${punts.length ? `<ul class="guia-punts">${punts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      <p class="guia-meta">${esc(t.guia_meta(g.pagines, g.mida))}${g.idioma !== lang && t.guia_idioma ? ` · <strong>${esc(t.guia_idioma)}</strong>` : ''}${g.comprovada ? `<br>${esc(t.guia_comprovada)} ${esc(dataCurta(g.comprovada, lang))}` : ''}</p>
      <div class="guia-botons">
        <a class="btn btn-primary" href="${esc(g.pdf)}" target="_blank" rel="noopener">
          ${t.guia_veure} ↗<span class="sr-only"> · ${esc(L(g.titol))} (PDF) · ${t.extern}</span>
        </a>
        <a class="btn btn-secondary" href="${esc(g.pdf)}" download="${esc(nomFitxer)}">
          ⬇ ${t.guia_baixar}<span class="sr-only"> · ${esc(L(g.titol))} (PDF, ${esc(g.mida)})</span>
        </a>
      </div>
    </div>
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

  const guies = window.GUIES_NEXSOCIAL || [];

  app.innerHTML = `
  <p class="lead">${t.intro}</p>

  ${guies.length ? `
  <section class="guies" aria-labelledby="guies-titol">
    <h2 id="guies-titol" class="guies-titol">${t.guies_t}</h2>
    <p class="guies-desc">${t.guies_d}</p>
    ${guies.map(g => guiaHTML(g, t, lang)).join('')}
  </section>` : ''}

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

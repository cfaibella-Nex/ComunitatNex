/* reserves.js — Comunitat NexSocial
   ────────────────────────────────────────
   3 tabs (Esdeveniments · Tallers · Activitats mensuals),
   cada tab mostra el catàleg de la seva categoria.
   Reutilitza eventCardHTML() d'agenda.js. */

(function() {

const RESERVES_TABS = [
  { id: 'esdeveniment', label: 'reserves.tab.esdev',    empty: 'reserves.empty.esdev',    cls: 'tab-esdev' },
  { id: 'taller',       label: 'reserves.tab.tallers',  empty: 'reserves.empty.tallers',  cls: 'tab-taller' },
  { id: 'mensual',      label: 'reserves.tab.mensual',  empty: 'reserves.empty.mensual',  cls: 'tab-mensual' }
];

async function fetchEventsReserves() {
  try {
    const r = await fetch('/api/events', { cache: 'no-store' });
    if (!r.ok) throw new Error('API error');
    const data = await r.json();
    if (Array.isArray(data.events) && data.events.length) return data.events;
    throw new Error('empty');
  } catch {
    return window.EVENTS_DATA || [];
  }
}

function sortReservesEvents(events) {
  const today = new Date().toISOString().slice(0, 10);
  return [...events]
    .filter(e => (e.data || '') >= today && e.estat !== 'arxivat')
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));
}

async function renderReserves() {
  const { T, qs, qsa } = window.NX;
  const app = qs('#reserves-app');
  if (!app) return;

  const events = sortReservesEvents(await fetchEventsReserves());
  const counts = {
    esdeveniment: events.filter(e => e.tipo === 'esdeveniment').length,
    taller:       events.filter(e => e.tipo === 'taller').length,
    mensual:      events.filter(e => e.tipo === 'mensual').length
  };

  // Tab actiu: query param o defecte "taller" (categoria amb més contingut)
  const params = new URLSearchParams(location.search);
  const requested = params.get('cat');
  const active = ['esdeveniment','taller','mensual'].includes(requested)
    ? requested
    : (counts.taller > 0 ? 'taller' : counts.mensual > 0 ? 'mensual' : 'esdeveniment');

  const tabsHTML = `
    <div class="tabs" role="tablist">
      ${RESERVES_TABS.map(t => `
        <button
          class="tab ${t.cls}"
          role="tab"
          aria-selected="${active === t.id}"
          aria-controls="panel-${t.id}"
          data-cat="${t.id}">
          ${T(t.label)}<span class="tab-count">${counts[t.id]}</span>
        </button>
      `).join('')}
    </div>`;

  const panelsHTML = RESERVES_TABS.map(t => {
    const items = events.filter(e => e.tipo === t.id);
    const inner = items.length === 0
      ? `<div class="alert alert-info">${T(t.empty)}</div>`
      : `<div class="events-grid">${items.map(window.eventCardHTML).join('')}</div>`;
    return `
      <div id="panel-${t.id}" role="tabpanel" class="${active === t.id ? '' : 'hidden'}">
        ${inner}
      </div>`;
  }).join('');

  app.innerHTML = tabsHTML + panelsHTML + window.NX.phoneBannerHTML();

  // Bind tabs
  qsa('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      qsa('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.cat === cat));
      RESERVES_TABS.forEach(t => {
        const panel = qs('#panel-' + t.id);
        if (panel) panel.classList.toggle('hidden', t.id !== cat);
      });
      const url = new URL(location.href);
      url.searchParams.set('cat', cat);
      history.replaceState(null, '', url);
    });
  });
}

// Necessitem que eventCardHTML estigui exposada globalment (a agenda.js)
// però reserves.js pot arribar abans que agenda.js carregui.
// Solució: definim aquí una versió pròpia si no existeix.
if (typeof window.eventCardHTML !== 'function') {
  window.eventCardHTML = function(ev) {
    const { T, L, esc, formatDate, formatPrice, tipoLabel, tipoBadgeClass, placesRestants } = window.NX;
    const places = placesRestants(ev);
    const isFree = !ev.preu_cents || ev.preu_cents === 0;
    const status = ev.estat === 'esgotat' || places === 0
      ? `<span class="event-badge" style="position:static;background:var(--danger)">${T('ev.esgotat')}</span>`
      : places <= 3 && places > 0
        ? `<span class="event-badge" style="position:static;background:var(--warning)">${T('ev.ultimes')}</span>`
        : `<span class="muted" style="font-size:var(--fs-sm)">${places} ${T('ev.places')}</span>`;

    return `
<article class="event-card">
  <div class="event-card-img">
    <span class="event-badge ${tipoBadgeClass(ev.tipo)}">${esc(tipoLabel(ev.tipo))}</span>
    <img src="${esc(ev.imatge)}" alt="" loading="lazy">
  </div>
  <div class="event-card-body">
    <h3 class="event-title">${esc(L(ev.titol))}</h3>
    <div class="event-meta">
      <span class="event-meta-item">📅 ${esc(formatDate(ev.data))}</span>
      <span class="event-meta-item">🕐 ${esc(ev.hora || '')}</span>
    </div>
    <div class="event-meta">
      <span class="event-meta-item">📍 ${esc(L(ev.ubicacio))}</span>
    </div>
    <p class="event-desc">${esc(L(ev.descripcio)).slice(0, 140)}${L(ev.descripcio).length > 140 ? '…' : ''}</p>
  </div>
  <div class="event-card-footer">
    <span class="event-price ${isFree ? 'free' : ''}">${formatPrice(ev.preu_cents)}</span>
    <a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="btn btn-primary">
      ${T('ev.reservar')} →
    </a>
  </div>
  <div style="padding: 0 var(--sp-3) var(--sp-2); font-size: var(--fs-sm)">${status}</div>
</article>`;
  };
}

renderReserves();

})();

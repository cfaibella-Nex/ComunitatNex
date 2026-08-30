/* agenda.js — Comunitat NexSocial
   ────────────────────────────────────────
   Tres vistes:
   1. Cards grid (per Reserves i secció home "Properes activitats")
   2. Llistat horitzontal cronològic (per pàgina Agenda)
   3. Detall FEB-style amb foto comercial + secció lloc + booking dinàmic */

(function() {

const { T, L, esc, formatDate, formatPrice,
        tipoLabel, tipoBadgeClass, placesRestants,
        phoneBannerHTML, qs, qsa } = window.NX;

/* ── Fetch events (Supabase → fallback data.js) ─────────── */
async function fetchEvents() {
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

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const estatOrder = { actiu: 0, proximament: 1, esgotat: 2 };
    const ea = estatOrder[a.estat] ?? 3;
    const eb = estatOrder[b.estat] ?? 3;
    if (ea !== eb) return ea - eb;
    return (a.data || '').localeCompare(b.data || '');
  });
}

/* ═══ Vista 1: Targeta d'event (per grid Reserves) ═══ */
function eventCardHTML(ev) {
  const places = placesRestants(ev);
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
    <a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="btn btn-primary btn-block">
      ${T('ev.reservar')} →
    </a>
  </div>
  <div style="padding: 0 var(--sp-3) var(--sp-2); font-size: var(--fs-sm)">${status}</div>
</article>`;
}
window.eventCardHTML = eventCardHTML;

/* ═══ Vista 1b: POSTER gran (portada · foto amb títol overlay) ═══ */
function eventPosterHTML(ev) {
  return `
<a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="event-poster">
  <img src="${esc(ev.imatge)}" alt="${esc(L(ev.titol))}" loading="lazy">
  <div class="event-poster-overlay">
    <span class="event-badge ${tipoBadgeClass(ev.tipo)}" style="position:static;display:inline-block;margin-bottom:8px">${esc(tipoLabel(ev.tipo))}</span>
    <h3 class="event-poster-title">${esc(L(ev.titol))}</h3>
  </div>
</a>`;
}

/* ═══ Vista 2: Fila horitzontal (per Agenda) ═══ */
function eventRowHTML(ev) {
  const d = new Date(ev.data);
  const dia = d.getDate();
  const mesLabel = new Intl.DateTimeFormat(window.NX.getLang() === 'ca' ? 'ca-ES' : 'es-ES',
    { month: 'short' }).format(d).replace('.', '');
  const diaSetm = new Intl.DateTimeFormat(window.NX.getLang() === 'ca' ? 'ca-ES' : 'es-ES',
    { weekday: 'long' }).format(d);
  const places = placesRestants(ev);
  const esgotat = ev.estat === 'esgotat' || places === 0;

  return `
<a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="event-row ${esgotat ? 'is-esgotat' : ''}">
  <div class="event-row-date">
    <span class="event-row-day">${dia}</span>
    <span class="event-row-month">${esc(mesLabel)}</span>
  </div>
  <div class="event-row-info">
    <div class="event-row-meta">
      <span class="event-badge ${tipoBadgeClass(ev.tipo)}" style="position:static">${esc(tipoLabel(ev.tipo))}</span>
      <span class="muted" style="font-size:var(--fs-sm)">${esc(diaSetm)} · ${esc(ev.hora || '')}</span>
    </div>
    <h3 class="event-row-title">${esc(L(ev.titol))}</h3>
    <div class="event-row-loc">📍 ${esc(L(ev.ubicacio))}</div>
    <div class="event-row-cta">
      <span class="event-row-arrow">${esgotat ? T('ev.esgotat') : T('ev.reservar') + ' →'}</span>
    </div>
  </div>
  <div class="event-row-img">
    <img src="${esc(ev.imatge)}" alt="" loading="lazy">
  </div>
</a>`;
}

/* ═══ Render llistat cronològic (Agenda) ═══ */
async function renderAgenda() {
  const container = qs('#events-list');
  if (!container) return;

  const events = sortEvents(await fetchEvents());
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => (e.data || '') >= today && e.estat !== 'arxivat');

  if (upcoming.length === 0) {
    container.innerHTML = `<div class="alert alert-info">${T('agenda.empty')}</div>`;
    return;
  }

  const groups = {};
  const monthNames = {
    ca: ['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'],
    es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  };
  const lang = window.NX.getLang();

  upcoming.forEach(ev => {
    const d = new Date(ev.data);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = `${monthNames[lang][d.getMonth()]} ${d.getFullYear()}`;
    if (!groups[key]) groups[key] = { label, items: [] };
    groups[key].items.push(ev);
  });

  const html = Object.keys(groups).sort().map(k => {
    const g = groups[k];
    return `
    <div class="agenda-month">
      <h2 class="agenda-month-title">${esc(g.label.charAt(0).toUpperCase() + g.label.slice(1))}</h2>
      <div class="events-list-horizontal">${g.items.map(eventRowHTML).join('')}</div>
    </div>`;
  }).join('');

  container.innerHTML = html + phoneBannerHTML();
}

/* ═══ Render POSTERS (per home "Properes activitats") ═══ */
async function renderGrid() {
  const container = qs('#events-grid-list');
  if (!container) return;
  const events = sortEvents(await fetchEvents());
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => (e.data || '') >= today && e.estat !== 'arxivat').slice(0, 3);
  if (upcoming.length === 0) {
    container.innerHTML = `<div class="alert alert-info">${T('agenda.empty')}</div>`;
    return;
  }
  container.innerHTML = `<div class="poster-grid">${upcoming.map(eventPosterHTML).join('')}</div>`;
}

/* ═══ Vista 3: Detall FEB-style (PAS 1: selecció + Continuar) ═══ */
async function renderDetail() {
  const container = qs('#event-detail');
  if (!container) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    container.innerHTML = `<div class="alert alert-warning">${T('ev.no_trobat')}</div>`;
    return;
  }

  const events = await fetchEvents();
  const ev = events.find(e => e.id === id);
  if (!ev) {
    container.innerHTML = `<div class="alert alert-warning">${T('ev.no_trobat')}</div>
      <a href="/agenda.html" class="btn btn-secondary">${T('ev.tornar')}</a>`;
    return;
  }

  const places = placesRestants(ev);
  const isFree = !ev.preu_cents || ev.preu_cents === 0;
  const esgotat = ev.estat === 'esgotat' || places === 0;
  const maxPlaces = Math.min(6, places);

  document.title = `${L(ev.titol)} · Comunitat NexSocial`;

  // URL de Google Maps embed (sense API key, gratuït)
  const mapaEmbed = ev.mapa_url
    ? `https://maps.google.com/maps?q=${encodeURIComponent(L(ev.ubicacio))}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : null;

  container.innerHTML = `
<div class="detail-hero">
  <img src="${esc(ev.imatge)}" alt="${esc(L(ev.titol))}">
</div>
<div class="container mt-4">
  <a href="/agenda.html" class="detail-back">${T('ev.tornar')}</a>

  <span class="event-badge ${tipoBadgeClass(ev.tipo)}" style="position:static;display:inline-block;margin-bottom:var(--sp-2)">${esc(tipoLabel(ev.tipo))}</span>
  <h1>${esc(L(ev.titol))}</h1>

  <div class="detail-layout">
    <div>
      <!-- Info principal -->
      <div class="detail-info">
        <dl>
          <dt>${T('ev.data')}</dt>
          <dd>${esc(formatDate(ev.data, { weekday: 'long' }))}</dd>
          <dt>${T('ev.hora')}</dt>
          <dd>${esc(ev.hora || '—')}</dd>
          <dt>${T('ev.durada')}</dt>
          <dd>${ev.durada || 90} min</dd>
          <dt>${T('ev.entitat')}</dt>
          <dd>${esc(L(ev.entitat))}</dd>
          <dt>${T('ev.preu')}</dt>
          <dd class="event-price ${isFree ? 'free' : ''}" style="font-size:var(--fs-lg)">${formatPrice(ev.preu_cents)}${!isFree ? ' <span class="muted" style="font-size:var(--fs-sm)">/ plaça</span>' : ''}</dd>
        </dl>
      </div>

      <!-- Descripció -->
      <h2 style="font-size:var(--fs-xl); margin-top:var(--sp-4)">${T('ev.desc')}</h2>
      <p style="font-size:var(--fs-md); line-height:1.7">${esc(L(ev.descripcio))}</p>

      <!-- On es fa: foto lloc + mapa embedit -->
      <h2 style="font-size:var(--fs-xl); margin-top:var(--sp-5)">${T('ev.como_llegar')}</h2>
      <div class="location-block">
        ${ev.imatge_lloc ? `
          <div class="location-img">
            <img src="${esc(ev.imatge_lloc)}" alt="${esc(L(ev.ubicacio))}" loading="lazy">
          </div>` : ''}
        <div class="location-info">
          <div style="font-size:var(--fs-md); font-weight:600; margin-bottom:var(--sp-1)">${esc(L(ev.entitat))}</div>
          <div style="color:var(--text-muted); margin-bottom:var(--sp-3)">📍 ${esc(L(ev.ubicacio))}</div>
          ${ev.mapa_url ? `
            <a href="${esc(ev.mapa_url)}" target="_blank" rel="noopener" class="btn btn-secondary">
              🗺️ ${T('ev.abrir_mapa')}
            </a>` : ''}
        </div>
      </div>
      ${mapaEmbed ? `
        <div class="map-embed">
          <iframe src="${esc(mapaEmbed)}"
                  width="100%" height="360" frameborder="0"
                  style="border:0; border-radius: var(--radius-lg); margin-top: var(--sp-3);"
                  loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                  title="${T('ev.como_llegar')}"></iframe>
        </div>` : ''}
    </div>

    <!-- Booking card (PAS 1: selector + Continuar) -->
    <aside class="booking-card">
      <h3 style="margin-top:0">${T('form.title')}</h3>
      <p class="muted" style="margin-bottom:var(--sp-3); font-size:var(--fs-sm)">${T('form.step1')}</p>

      ${esgotat
        ? `<div class="alert alert-warning">${T('ev.esgotat')}</div>`
        : `
        <div class="form-group">
          <label class="form-label" for="places">${T('form.places')}</label>
          <div class="places-selector">
            <button type="button" class="places-btn" data-op="dec" aria-label="Restar">−</button>
            <input class="form-input places-input" id="places" type="number"
                   min="1" max="${maxPlaces}" value="1" inputmode="numeric" readonly>
            <button type="button" class="places-btn" data-op="inc" aria-label="Sumar">+</button>
          </div>
          <div class="form-help">${places} ${T('ev.places')}</div>
        </div>

        ${isFree ? `
          <div class="total-box">
            <span>${T('form.total')}</span>
            <strong>${T('ev.gratis')}</strong>
          </div>
        ` : `
          <div class="total-box">
            <span>${T('form.total')}</span>
            <strong id="total-display">${formatPrice(ev.preu_cents)}</strong>
          </div>
        `}

        <button type="button" id="btn-continuar" class="btn btn-primary btn-lg btn-block">
          ${T('form.continuar')} →
        </button>
      `}

      <div class="booking-phone">
        <div class="muted" style="font-size:var(--fs-sm)">${T('phone.text')}</div>
        <a href="tel:${window.NX.PHONE_TEL}">📞 ${window.NX.PHONE}</a>
      </div>
    </aside>
  </div>
</div>`;

  if (!esgotat) {
    bindPlacesSelector(ev);
    const btn = qs('#btn-continuar');
    btn?.addEventListener('click', () => {
      const places = parseInt(qs('#places').value, 10) || 1;
      // Guardem selecció al sessionStorage per al pas 2
      sessionStorage.setItem('nx-checkout', JSON.stringify({
        event_id: ev.id,
        places,
        preu_cents: ev.preu_cents || 0,
        total_cents: (ev.preu_cents || 0) * places
      }));
      location.href = `/checkout.html?id=${encodeURIComponent(ev.id)}`;
    });
  }
}

function bindPlacesSelector(ev) {
  const input = qs('#places');
  const total = qs('#total-display');
  const preuUnit = ev.preu_cents || 0;
  const max = parseInt(input.max, 10);

  function refresh() {
    let val = parseInt(input.value, 10) || 1;
    if (val < 1) val = 1;
    if (val > max) val = max;
    input.value = val;
    if (total) {
      const totalCents = preuUnit * val;
      total.textContent = formatPrice(totalCents);
    }
    // Actualitzar disabled state dels botons
    qsa('.places-btn').forEach(b => {
      b.disabled = (b.dataset.op === 'dec' && val <= 1) || (b.dataset.op === 'inc' && val >= max);
    });
  }

  qsa('.places-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cur = parseInt(input.value, 10) || 1;
      input.value = btn.dataset.op === 'inc' ? cur + 1 : cur - 1;
      refresh();
    });
  });
  refresh();
}

// Auto-init segons pàgina
if (qs('#events-list'))     renderAgenda();
if (qs('#events-grid-list')) renderGrid();
if (qs('#event-detail'))    renderDetail();

})();

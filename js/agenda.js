/* agenda.js — Comunitat NexSocial
   ────────────────────────────────────────
   Renderitza llistat filtrable + detall d'event. */

const { T, L, esc, formatDate, formatPrice,
        tipoLabel, tipoBadgeClass, placesRestants,
        phoneBannerHTML, qs, qsa } = window.NX;

/* ── Fetch events (Supabase → fallback a data.js) ─────────── */
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

/* ── Ordena: primer estat actiu, després data ─────────────── */
function sortEvents(events) {
  return [...events].sort((a, b) => {
    const estatOrder = { actiu: 0, proximament: 1, esgotat: 2 };
    const ea = estatOrder[a.estat] ?? 3;
    const eb = estatOrder[b.estat] ?? 3;
    if (ea !== eb) return ea - eb;
    return (a.data || '').localeCompare(b.data || '');
  });
}

/* ── Render targeta d'event (exposada globalment per reutilitzar) ── */
function eventCardHTML(ev) {
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
}
window.eventCardHTML = eventCardHTML;

/* ── Render llistat cronològic (sense filtres) ────────────── */
async function renderAgenda() {
  const container = qs('#events-list');
  if (!container) return;

  const events = sortEvents(await fetchEvents());
  // Només futurs o d'avui
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => (e.data || '') >= today && e.estat !== 'arxivat');

  if (upcoming.length === 0) {
    container.innerHTML = `<div class="alert alert-info">${T('agenda.empty')}</div>`;
    return;
  }

  // Agrupar per mes
  const groups = {};
  const monthNames = {
    ca: ['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'],
    es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  };
  const lang = getLang();

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
      <div class="events-grid">${g.items.map(eventCardHTML).join('')}</div>
    </div>`;
  }).join('');

  container.innerHTML = html + phoneBannerHTML();
}

/* ── Render detall ────────────────────────────────────────── */
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

  container.innerHTML = `
<div class="detail-hero">
  <img src="${esc(ev.imatge)}" alt="">
</div>
<div class="container mt-4">
  <a href="/agenda.html" class="detail-back">${T('ev.tornar')}</a>

  <div class="detail-layout">
    <div>
      <span class="event-badge ${tipoBadgeClass(ev.tipo)}" style="position:static;display:inline-block;margin-bottom:var(--sp-2)">${esc(tipoLabel(ev.tipo))}</span>
      <h1>${esc(L(ev.titol))}</h1>

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
          <dt>${T('ev.lloc')}</dt>
          <dd>${esc(L(ev.ubicacio))}
            ${ev.mapa_url ? `<br><a href="${esc(ev.mapa_url)}" target="_blank" rel="noopener">${T('ev.abrir_mapa')} →</a>` : ''}
          </dd>
          <dt>${T('ev.preu')}</dt>
          <dd class="event-price ${isFree ? 'free' : ''}">${formatPrice(ev.preu_cents)}</dd>
        </dl>
      </div>

      <h3>${T('ev.desc')}</h3>
      <p style="font-size: var(--fs-md)">${esc(L(ev.descripcio))}</p>
    </div>

    <aside class="booking-card">
      <h3>${T('form.title')}</h3>
      <p class="muted">${T('form.sub')}</p>

      ${esgotat
        ? `<div class="alert alert-warning">${T('ev.esgotat')}</div>`
        : `
        <form id="reserva-form" novalidate>
          <input type="hidden" name="event_id" value="${esc(ev.id)}">

          <div class="form-group">
            <label class="form-label" for="nom">${T('form.nom')}<span class="form-required">*</span></label>
            <input class="form-input" id="nom" name="nom" type="text" required autocomplete="name">
          </div>

          <div class="form-group">
            <label class="form-label" for="tel">${T('form.tel')}<span class="form-required">*</span></label>
            <input class="form-input" id="tel" name="telefon" type="tel" required autocomplete="tel" inputmode="tel">
          </div>

          <div class="form-group">
            <label class="form-label" for="email">${T('form.email')}</label>
            <input class="form-input" id="email" name="email" type="email" autocomplete="email">
          </div>

          <div class="form-group">
            <label class="form-label" for="places">${T('form.places')}<span class="form-required">*</span></label>
            <select class="form-select" id="places" name="places" required>
              ${Array.from({length: Math.min(6, places)}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
            </select>
            <div class="form-help">${places} ${T('ev.places')}</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="notes">${T('form.notes')}</label>
            <textarea class="form-textarea" id="notes" name="notes" rows="3"></textarea>
          </div>

          <p class="form-help">${T('form.legal')}</p>

          <div id="form-msg" aria-live="polite" aria-atomic="true"></div>

          <button type="submit" class="btn btn-primary btn-lg btn-block">
            ${T('form.enviar')}
          </button>
        </form>
      `}

      <div style="margin-top: var(--sp-3); padding-top: var(--sp-3); border-top: 1px solid rgba(15,45,30,0.1); text-align: center;">
        <div class="muted" style="font-size: var(--fs-sm)">${T('phone.text')}</div>
        <a href="tel:${window.NX.PHONE_TEL}" style="font-size: var(--fs-lg); font-weight: 700; color: var(--forest); text-decoration: none;">
          📞 ${window.NX.PHONE}
        </a>
      </div>
    </aside>
  </div>
</div>`;

  // Bind formulari
  if (!esgotat) window.bindReservaForm(ev);
}

// Auto-init segons pàgina
if (qs('#events-list')) renderAgenda();
if (qs('#event-detail')) renderDetail();

/* agenda.js — Comunitat NexSocial
   ────────────────────────────────────────
   Tres vistes:
   1. Cards grid (per Reserves i secció home "Properes activitats")
   2. Llistat horitzontal cronològic (per pàgina Agenda)
   3. Detall FEB-style amb foto comercial + secció lloc + booking dinàmic */

(function() {

const { T, L, esc, formatDate, formatPrice,
        tipoLabel, tipoBadgeClass, placesRestants, estatPlaces,
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
  const label = ev.data_label ? L(ev.data_label) : formatDate(ev.data);
  const isProximament = ev.data_label && /pr[oò]xi/i.test(L(ev.data_label));
  const ep = estatPlaces(ev, places);
  const status = ep === 'esgotat'
    ? `<span class="event-badge" style="position:static;background:var(--danger)">${T('ev.esgotat')}</span>`
    : ep === 'ultimes'
      ? `<span class="event-badge" style="position:static;background:var(--warning)">${T('ev.ultimes')}</span>`
      : `<span class="muted" style="font-size:var(--fs-sm)">${places} ${T('ev.places')}</span>`;

  return `
<article class="event-card">
  <div class="event-card-img${ev.cartell ? ' event-card-img--cartell' : ''}">
    <span class="event-badge ${tipoBadgeClass(ev.tipo)}">${esc(tipoLabel(ev.tipo))}</span>
    <img src="${esc(window.NX.imatgePublica(ev))}" alt="${ev.cartell ? esc(T('ev.cartell_alt') + ': ' + L(ev.titol)) : ''}" loading="lazy">
  </div>
  <div class="event-card-body">
    <h3 class="event-title">${esc(L(ev.titol))}</h3>
    <div class="event-meta">
      <span class="event-meta-item">📅 ${esc(label)}</span>
      ${!isProximament && ev.hora ? `<span class="event-meta-item">🕐 ${esc(ev.hora)}</span>` : ''}
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
  /* El cartell oficial ja porta el títol: sense capa de text al damunt */
  if (ev.cartell) {
    return `
<a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="event-poster event-poster--cartell">
  <img src="${esc(ev.cartell)}" alt="${esc(T('ev.cartell_alt') + ': ' + L(ev.titol))}" loading="lazy">
</a>`;
  }
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
  const lang = window.NX.getLang();
  const d = new Date(ev.data);
  const mesLabel = new Intl.DateTimeFormat(lang === 'ca' ? 'ca-ES' : 'es-ES',
    { month: 'short' }).format(d).replace('.', '').toUpperCase();
  const dia = d.getDate();
  const label = ev.data_label ? L(ev.data_label) : '';
  const isProximament = label && /pr[oò]xi/i.test(label);
  const diaSetm = new Intl.DateTimeFormat(lang === 'ca' ? 'ca-ES' : 'es-ES',
    { weekday: 'long' }).format(d);
  const places = placesRestants(ev);
  const ep = estatPlaces(ev, places);
  const esgotat = ep === 'esgotat';

  // Bloc de data: si hi ha data_label, mostrem mes gran o "PRÒX"
  const dateBlock = label
    ? (isProximament
        ? `<span class="event-row-day event-row-day-sm">PRÒX</span>`
        : `<span class="event-row-day">${mesLabel}</span>`)
    : `<span class="event-row-day">${dia}</span><span class="event-row-month">${esc(mesLabel)}</span>`;

  // Línia meta: si hi ha label, el fem servir; sinó dia setmana + hora
  const metaText = label
    ? esc(label) + (isProximament ? '' : ` · ${esc(ev.hora || '')}`)
    : `${esc(diaSetm)} · ${esc(ev.hora || '')}`;

  return `
<a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="event-row ${esgotat ? 'is-esgotat' : ''}">
  <div class="event-row-date">${dateBlock}</div>
  <div class="event-row-info">
    <div class="event-row-meta">
      <span class="event-badge ${tipoBadgeClass(ev.tipo)}" style="position:static">${esc(tipoLabel(ev.tipo))}</span>
      <span class="muted" style="font-size:var(--fs-sm)">${metaText}</span>
      ${ep === 'ultimes'
        ? `<span class="event-badge" style="position:static;background:var(--warning)">${T('ev.ultimes')}</span>` : ''}
    </div>
    <h3 class="event-row-title">${esc(L(ev.titol))}</h3>
    <div class="event-row-loc">📍 ${esc(L(ev.ubicacio))}</div>
    <div class="event-row-cta">
      <span class="event-row-arrow">${esgotat ? T('ev.esgotat') : T('ev.reservar') + ' →'}</span>
    </div>
  </div>
  <div class="event-row-img${ev.cartell ? ' event-row-img--cartell' : ''}">
    <img src="${esc(window.NX.imatgePublica(ev))}" alt="" loading="lazy">
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
  const esgotat = ev.estat === 'esgotat' || places === 0;
  const NXC = window.NXC;
  const tarifes = NXC.tarifesEvent(ev);
  const unica = NXC.esTarifaUnica(ev);
  const preuResum = NXC.preuResum(ev);
  const gratuit = tarifes.every(x => x.preu_mode === 'gratuit');

  document.title = `${L(ev.titol)} · Comunitat NexSocial`;

  // URL de Google Maps embed (sense API key, gratuït)
  const mapaEmbed = ev.mapa_url
    ? `https://maps.google.com/maps?q=${encodeURIComponent(L(ev.ubicacio))}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : null;

  container.innerHTML = `
${ev.cartell ? `
<div class="detail-hero detail-hero--cartell">
  <a href="${esc(ev.cartell)}" target="_blank" rel="noopener" title="${esc(T('ev.cartell_veure'))}">
    <img src="${esc(ev.cartell)}" alt="${esc(T('ev.cartell_alt') + ': ' + L(ev.titol))}">
  </a>
</div>` : `
<div class="detail-hero">
  <img src="${esc(ev.imatge)}" alt="${esc(L(ev.titol))}">
</div>`}
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
          <dd>${esc(ev.data_label ? L(ev.data_label) : formatDate(ev.data, { weekday: 'long' }))}</dd>
          ${!(ev.data_label && /pr[oò]xi/i.test(L(ev.data_label))) ? `
            <dt>${T('ev.hora')}</dt>
            <dd>${esc(ev.hora || '—')}</dd>
            <dt>${T('ev.durada')}</dt>
            <dd>${ev.durada || 90} min</dd>
          ` : ''}
          <dt>${T('ev.entitat')}</dt>
          <dd>${esc(L(ev.entitat))}</dd>
          <dt>${T('ev.preu')}</dt>
          <dd class="event-price ${gratuit ? 'free' : ''}" style="font-size:var(--fs-lg)">${esc(preuResum)}</dd>
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
      <p class="muted" style="margin-bottom:var(--sp-3); font-size:var(--fs-sm)">${NXC.t(unica ? 'ins.tria' : 'ins.tria_nivell')}</p>

      ${esgotat
        ? `<div class="alert alert-warning">${T('ev.esgotat')}</div>`
        : `
        <div class="ins-tarifes" id="ins-tarifes">
          ${tarifes.map(x => tarifaHTML(ev, x, unica)).join('')}
        </div>
        <div class="form-help ins-queden">${places} ${T('ev.places')}</div>

        <div class="total-box">
          <span>${T('form.total')}</span>
          <strong id="total-display"></strong>
        </div>

        <p class="form-error" id="ins-error" hidden>${NXC.t('ins.cap')}</p>
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

  if (!esgotat) bindInscripcio(ev, events, places);
}

/* Una fila per tarifa (nivell). Amb una sola tarifa es veu com
   sempre: "Places" i el selector, sense parlar de nivells. */
function tarifaHTML(ev, tarifa, unica) {
  const NXC = window.NXC;
  const estat = NXC.estatTarifa(ev, tarifa);
  const complet = estat === 'complet';
  const restants = NXC.restantsTarifa(ev, tarifa);
  const nom = unica ? T('form.places') : L(tarifa.nom);
  const pill = complet
    ? `<span class="ins-pill ins-pill--ple">${NXC.t('nivell.complet')}</span>`
    : estat === 'ultimes'
      ? `<span class="ins-pill ins-pill--ultimes">${NXC.t('nivell.ultimes')}</span>` : '';
  return `
<div class="ins-tarifa${complet ? ' ins-tarifa--ple' : ''}" data-id="${esc(tarifa.id)}">
  <div class="ins-tarifa-cap">
    <span class="ins-tarifa-nom">${esc(nom)}</span>
    <span class="ins-tarifa-preu">${esc(NXC.preuTxt(tarifa, ev, true))}</span>
  </div>
  ${tarifa.detall && L(tarifa.detall) ? `<div class="ins-tarifa-detall">${esc(L(tarifa.detall))}</div>` : ''}
  ${pill || (restants !== null && !complet ? `<div class="ins-tarifa-detall">${esc(NXC.t('nivell.queden', { n: restants }))}</div>` : '')}
  ${NXC.selectorHTML({ id: tarifa.id, qty: 0, max: 0, nom: unica ? '' : L(tarifa.nom), desactivat: complet })}
</div>`;
}

/* Pas 1: quantitats per tarifa. Límits: places de l'activitat, places
   del nivell (si en té) i 10 per reserva, com fins ara. */
function bindInscripcio(ev, events, placesEv) {
  const NXC = window.NXC;
  const tarifes = NXC.tarifesEvent(ev);
  const MAX_RESERVA = 10;
  const prev = NXC.getCart(ev.id);
  const cart = { event_id: ev.id, linies: {}, extres: {} };
  if (prev) { cart.linies = prev.linies; cart.extres = prev.extres; }

  /* Un carret desat abans que el nivell s'omplís no el pot arrossegar */
  for (const x of tarifes) {
    if (NXC.estatTarifa(ev, x) === 'complet') delete cart.linies[x.id];
  }
  /* Amb una sola tarifa, 1 plaça preseleccionada: com abans */
  const obertes = tarifes.filter(x => NXC.estatTarifa(ev, x) !== 'complet');
  if (!NXC.cartPlaces(cart) && tarifes.length === 1 && obertes.length) cart.linies[obertes[0].id] = 1;

  const maxDe = (tarifa) => {
    if (NXC.estatTarifa(ev, tarifa) === 'complet') return 0;
    const altres = NXC.cartPlaces(cart) - (cart.linies[tarifa.id] || 0);
    let max = Math.min(placesEv, MAX_RESERVA) - altres;
    const rt = NXC.restantsTarifa(ev, tarifa);
    if (rt !== null) max = Math.min(max, rt);
    return Math.max(0, max);
  };

  function pinta() {
    for (const x of tarifes) {
      const box = qs(`.ins-qty[data-id="${CSS.escape(x.id)}"]`);
      if (!box) continue;
      const q = cart.linies[x.id] || 0;
      const max = maxDe(x);
      box.querySelector('.ins-qty-val').textContent = q;
      box.querySelector('[data-op="dec"]').disabled = q <= 0;
      box.querySelector('[data-op="inc"]').disabled = q >= max;
    }
    qs('#total-display').textContent = NXC.cartPlaces(cart) ? NXC.totalTxt(ev, cart) : '—';
  }

  qs('#ins-tarifes').addEventListener('click', (e) => {
    const btn = e.target.closest('.places-btn');
    if (!btn || btn.disabled) return;
    const id = btn.closest('.ins-qty').dataset.id;
    const tarifa = tarifes.find(x => x.id === id);
    let q = cart.linies[id] || 0;
    q = btn.dataset.op === 'inc' ? Math.min(q + 1, maxDe(tarifa)) : Math.max(0, q - 1);
    if (q <= 0) delete cart.linies[id]; else cart.linies[id] = q;
    qs('#ins-error').hidden = true;
    pinta();
  });

  qs('#btn-continuar').addEventListener('click', () => {
    if (!NXC.cartPlaces(cart)) {
      qs('#ins-error').hidden = false;
      return;
    }
    /* Els extres que ja no quadren amb les places triades es retallen */
    const places = NXC.cartPlaces(cart);
    for (const [k, v] of Object.entries(cart.extres)) {
      if (v > places) cart.extres[k] = places;
    }
    NXC.setCart(cart);
    const hiHaExtres = NXC.extresVisibles(ev, events).length > 0;
    location.href = `/${hiHaExtres ? 'extres' : 'checkout'}.html?id=${encodeURIComponent(ev.id)}`;
  });

  pinta();
}

// Auto-init segons pàgina
if (qs('#events-list'))     renderAgenda();
if (qs('#events-grid-list')) renderGrid();
if (qs('#event-detail'))    renderDetail();

})();

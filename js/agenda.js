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
    return window.NX.properaSessio(a).localeCompare(window.NX.properaSessio(b));
  });
}

/* ═══ Vista 1: Targeta d'event (per grid Reserves) ═══ */
function eventCardHTML(ev) {
  const places = placesRestants(ev);
  const label = window.NX.quanText(ev);
  const isProximament = !window.NX.esSetmanal(ev) && ev.data_label && /pr[oò]xi/i.test(L(ev.data_label));
  const hora = window.NX.franjaHoraria(ev);
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
    <img src="${esc(window.NX.imatgePublica(ev))}" alt="" loading="lazy">
    ${window.NX.botoCartell(ev)}
  </div>
  <div class="event-card-body">
    <h3 class="event-title">${esc(L(ev.titol))}</h3>
    <div class="event-meta">
      <span class="event-meta-item">📅 ${esc(label)}</span>
      ${!isProximament && hora ? `<span class="event-meta-item">🕐 ${esc(hora)}</span>` : ''}
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
<a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="event-poster${ev.cartell ? ' event-poster--cartell' : ''}">
  <img src="${esc(window.NX.imatgePublica(ev))}" alt="${esc(L(ev.titol))}" loading="lazy">
  ${window.NX.botoCartell(ev)}
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

  const setmanal = window.NX.esSetmanal(ev);
  const hora = window.NX.franjaHoraria(ev);

  // Bloc de data: setmanal → dia de la setmana; label → mes o "PRÒX"; si no, dia
  const dateBlock = setmanal
    ? `<span class="event-row-day event-row-day-sm">${window.NX.diaCurt(ev)}</span><span class="event-row-month">${esc(T('ev.cada_setmana'))}</span>`
    : label
    ? (isProximament
        ? `<span class="event-row-day event-row-day-sm">PRÒX</span>`
        : `<span class="event-row-day">${mesLabel}</span>`)
    : `<span class="event-row-day">${dia}</span><span class="event-row-month">${esc(mesLabel)}</span>`;

  // Línia meta: si hi ha label, el fem servir; sinó dia setmana + hora
  const metaText = setmanal
    ? `${esc(window.NX.quanText(ev))} · ${esc(hora)}`
    : label
    ? esc(label) + (isProximament ? '' : ` · ${esc(hora)}`)
    : `${esc(diaSetm)} · ${esc(hora)}`;

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
    ${window.NX.botoCartell(ev)}
  </div>
</a>`;
}

/* ═══ Agenda: filtres + calendari mensual + llistat ═══
   Els dos filtres (cerca i tipus) s'apliquen alhora al calendari i al
   llistat de sota. Al calendari només hi van les activitats amb dia
   fix; les que tenen etiqueta ("Octubre 2026", "Pròximament") surten
   en una línia sota la graella com a "data per confirmar". */
const MESOS = {
  ca: ['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'],
  es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
};
const CAP_SETMANA = {
  ca: ['DL','DT','DC','DJ','DV','DS','DG'],
  es: ['LU','MA','MI','JU','VI','SA','DO']
};
const MESOS_ENDAVANT = 12;
const majuscula = t => t.charAt(0).toUpperCase() + t.slice(1);
const pla = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/* Sense dia fix = etiqueta "Pròximament" o etiqueta sense número de dia
   ("Octubre 2026"). Una etiqueta amb el dia ("23/10/2026", "Dissabte 24")
   no treu l'activitat de la graella. */
const teEtiqueta = ev => {
  if (window.NX.esSetmanal(ev)) return false;
  const et = ev.data_label ? L(ev.data_label) : '';
  if (!et) return false;
  return /pr[oò]xim/i.test(et) || !/(^|\D)\d{1,2}(?!\d)/.test(et);
};

function passaFiltres(ev, f) {
  if (f.tipus && ev.tipo !== f.tipus) return false;
  if (!f.q) return true;
  return pla([L(ev.titol), L(ev.ubicacio), L(ev.entitat)].join(' ')).includes(f.q);
}

/* Sessions d'una activitat entre dues dates (ISO, incloses), a partir d'avui */
function sessionsRang(ev, des, fins, avui) {
  const ini = String(ev.data || '').slice(0, 10);
  if (!ini) return [];
  const desde = des > avui ? des : avui;
  if (!window.NX.esSetmanal(ev)) return ini >= desde && ini <= fins ? [ini] : [];
  const tretes = new Set(Array.isArray(ev.sessions_tretes) ? ev.sessions_tretes : []);
  const dow = new Date(ini + 'T12:00:00').getDay();
  const out = [];
  const d = new Date(desde + 'T12:00:00');
  for (let k = iso(d); k <= fins; d.setDate(d.getDate() + 1), k = iso(d)) {
    if (d.getDay() === dow && k >= ini && !tretes.has(k)) out.push(k);
  }
  return out;
}
const dilluns = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
const mesDe = d => d.getFullYear() * 12 + d.getMonth();

function chipHTML(ev) {
  const esgotat = estatPlaces(ev) === 'esgotat';
  const titol = L(ev.titol);
  return `<a class="cal-ev cal-ev--${esc(ev.tipo || 'altre')}${esgotat ? ' cal-ev--esgotat' : ''}"
    href="/detall.html?id=${encodeURIComponent(ev.id)}" title="${esc(titol)}">
    ${ev.hora ? `<span class="cal-ev-hora">${esc(ev.hora)}</span>` : ''}
    <span class="cal-ev-titol">${esc(titol)}</span>
    ${esgotat ? `<span class="cal-ev-esgotat">${esc(T('ev.esgotat'))}</span>` : ''}
  </a>`;
}

/* Vista "setmana" (per defecte: la setmana d'avui) o vista "mes".
   v = { vista, setmana (Date dilluns), mes (any*12+mes), minSet, maxDia, minMes, maxMes } */
function calendariHTML(events, v) {
  const lang = window.NX.getLang();
  const avui = window.NX.avuiISO();
  const locale = lang === 'ca' ? 'ca-ES' : 'es-ES';
  const esMes = v.vista === 'mes';

  /* Dies a pintar: amb el mes, buits al davant perquè el dia 1 caigui al seu dia */
  let dies = [], buits = 0, any, mes;
  if (esMes) {
    any = Math.floor(v.mes / 12); mes = v.mes % 12;
    buits = (new Date(any, mes, 1, 12).getDay() + 6) % 7;
    const n = new Date(any, mes + 1, 0).getDate();
    for (let i = 1; i <= n; i++) dies.push(new Date(any, mes, i, 12));
  } else {
    for (let i = 0; i < 7; i++) { const d = new Date(v.setmana); d.setDate(d.getDate() + i); dies.push(d); }
  }
  const des = iso(dies[0]), fins = iso(dies[dies.length - 1]);

  const perDia = {};
  for (const ev of events.filter(ev => !teEtiqueta(ev))) {
    for (const k of sessionsRang(ev, des, fins, avui)) (perDia[k] = perDia[k] || []).push(ev);
  }
  Object.values(perDia).forEach(l => l.sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || ''))));

  const nomDia = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  let celles = '';
  for (let i = 0; i < buits; i++) celles += '<li class="cal-dia cal-dia--fora" aria-hidden="true"></li>';
  for (const d of dies) {
    const k = iso(d);
    const evs = perDia[k] || [];
    const cls = ['cal-dia', evs.length ? 'cal-dia--amb' : 'cal-dia--sense',
                 k === avui ? 'cal-dia--avui' : '', k < avui ? 'cal-dia--passat' : ''].filter(Boolean).join(' ');
    celles += `<li class="${cls}">
      <div class="cal-data"><span class="cal-data-llarg">${esc(majuscula(nomDia.format(d)))}</span><span class="cal-data-num" aria-hidden="true">${d.getDate()}</span>${k === avui ? `<span class="cal-avui">${esc(T('agenda.avui'))}</span>` : ''}</div>
      ${evs.length ? `<div class="cal-evs">${evs.map(chipHTML).join('')}</div>` : ''}
    </li>`;
  }

  let titol, potAnt, potSeg, ant, seg;
  if (esMes) {
    titol = `${majuscula(MESOS[lang][mes])} ${any}`;
    potAnt = v.mes > v.minMes; potSeg = v.mes < v.maxMes;
    ant = T('agenda.mes_ant'); seg = T('agenda.mes_seg');
  } else {
    const curt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    titol = `${curt.format(dies[0])} – ${curt.format(dies[6])}`;
    potAnt = des > iso(v.minSet); potSeg = fins < v.maxDia;
    ant = T('agenda.set_ant'); seg = T('agenda.set_seg');
  }

  const senseDia = esMes ? events.filter(ev => {
    if (!teEtiqueta(ev)) return false;
    const d = new Date(String(ev.data).slice(0, 10) + 'T12:00:00');
    return d.getFullYear() === any && d.getMonth() === mes;
  }) : [];

  return `
<section class="cal cal--${esMes ? 'mes' : 'setmana'}" aria-labelledby="cal-titol">
  <div class="cal-cap">
    <button type="button" class="cal-nav" data-pas="-1" aria-label="${esc(ant)}" ${potAnt ? '' : 'disabled'}><span aria-hidden="true">‹</span></button>
    <h2 class="cal-titol" id="cal-titol" aria-live="polite"><span class="sr-only">${esc(T('agenda.calendari'))}: </span>${esc(titol)}</h2>
    <button type="button" class="cal-nav" data-pas="1" aria-label="${esc(seg)}" ${potSeg ? '' : 'disabled'}><span aria-hidden="true">›</span></button>
  </div>
  <div class="cal-setmana" aria-hidden="true">${CAP_SETMANA[lang].map(x => `<span>${x}</span>`).join('')}</div>
  <ol class="cal-graella">${celles}</ol>
  ${Object.keys(perDia).length ? '' : `<p class="cal-buit">${esc(T(esMes ? 'agenda.cal_buit' : 'agenda.cal_buit_set'))}</p>`}
  ${senseDia.length ? `<p class="cal-sense-dia">${esc(T('agenda.sense_dia'))} ${senseDia.map(ev =>
      `<a href="/detall.html?id=${encodeURIComponent(ev.id)}">${esc(L(ev.titol))}</a>`).join(' · ')}</p>` : ''}
  <div class="cal-peu">
    <button type="button" class="btn btn-secondary cal-vista" aria-expanded="${esMes}">
      ${esc(T(esMes ? 'agenda.veure_setmana' : 'agenda.veure_mes'))} <span aria-hidden="true">${esMes ? '▴' : '▾'}</span>
    </button>
  </div>
</section>`;
}

function llistatHTML(visibles) {
  if (!visibles.length) return `<div class="alert alert-info">${T('agenda.sense_res')}</div>`;
  const lang = window.NX.getLang();
  /* Les setmanals van a part, a dalt: no tenen "mes" */
  const setmanals = visibles.filter(window.NX.esSetmanal);
  const groups = {};
  visibles.filter(e => !window.NX.esSetmanal(e)).forEach(ev => {
    const d = new Date(ev.data);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = { label: `${MESOS[lang][d.getMonth()]} ${d.getFullYear()}`, items: [] };
    groups[key].items.push(ev);
  });
  const blocSetmanal = setmanals.length ? `
    <div class="agenda-month">
      <h3 class="agenda-month-title">${esc(majuscula(T('ev.cada_setmana')))}</h3>
      <div class="events-list-horizontal">${setmanals.map(eventRowHTML).join('')}</div>
    </div>` : '';
  return blocSetmanal + Object.keys(groups).sort().map(k => `
    <div class="agenda-month">
      <h3 class="agenda-month-title">${esc(majuscula(groups[k].label))}</h3>
      <div class="events-list-horizontal">${groups[k].items.map(eventRowHTML).join('')}</div>
    </div>`).join('');
}

async function renderAgenda() {
  const llista = qs('#events-list');
  if (!llista) return;
  const cal = qs('#agenda-calendari');
  const cerca = qs('#ag-cerca');
  const selTipus = qs('#ag-tipus');

  llista.innerHTML = window.NX.carregantHTML();
  const visibles = sortEvents(await fetchEvents()).filter(window.NX.visibleWeb);

  if (visibles.length === 0) {
    if (cal) cal.innerHTML = '';
    llista.innerHTML = `<div class="alert alert-info">${T('agenda.empty')}</div>`;
    return;
  }

  const ara = new Date();
  const minMes = mesDe(ara);
  const maxMes = minMes + MESOS_ENDAVANT;
  const minSet = dilluns(ara);
  const maxDia = iso(new Date(ara.getFullYear(), ara.getMonth() + MESOS_ENDAVANT + 1, 0, 12));
  const estat = { vista: 'setmana', setmana: new Date(minSet), mes: minMes, q: '', tipus: '' };

  if (cerca) cerca.placeholder = T('agenda.cerca_ph');
  if (selTipus) {
    const tipus = ['taller', 'esdeveniment', 'mensual'].filter(t => visibles.some(e => e.tipo === t));
    selTipus.innerHTML = `<option value="">${esc(T('agenda.tots'))}</option>`
      + tipus.map(t => `<option value="${t}">${esc(tipoLabel(t))}</option>`).join('');
  }

  function pinta(nomesCal) {
    const filtrats = visibles.filter(ev => passaFiltres(ev, estat));
    if (cal) cal.innerHTML = calendariHTML(filtrats, { ...estat, minSet, maxDia, minMes, maxMes });
    if (!nomesCal) llista.innerHTML = llistatHTML(filtrats) + phoneBannerHTML();
  }

  cerca?.addEventListener('input', () => { estat.q = pla(cerca.value.trim()); pinta(); });
  selTipus?.addEventListener('change', () => { estat.tipus = selTipus.value; pinta(); });
  cal?.addEventListener('click', (e) => {
    /* Setmana ⇄ mes. Obrir el mes porta al mes de la setmana que es mirava;
       tornar a la setmana sempre torna a la d'avui. */
    if (e.target.closest('.cal-vista')) {
      if (estat.vista === 'setmana') {
        const ref = estat.setmana < ara ? ara : estat.setmana;
        estat.vista = 'mes';
        estat.mes = Math.min(maxMes, Math.max(minMes, mesDe(ref)));
      } else {
        estat.vista = 'setmana';
        estat.setmana = new Date(minSet);
      }
      pinta(true);
      cal.querySelector('.cal-vista')?.focus();
      return;
    }
    const btn = e.target.closest('.cal-nav');
    if (!btn || btn.disabled) return;
    const pas = Number(btn.dataset.pas);
    if (estat.vista === 'mes') {
      estat.mes = Math.min(maxMes, Math.max(minMes, estat.mes + pas));
    } else {
      const d = new Date(estat.setmana); d.setDate(d.getDate() + 7 * pas);
      estat.setmana = d < minSet ? new Date(minSet) : d;
    }
    pinta(true);
    /* El focus es perd en repintar: el tornem al mateix botó (o a l'altre si aquest queda desactivat) */
    const mateix = cal.querySelector(`.cal-nav[data-pas="${btn.dataset.pas}"]`);
    (mateix && !mateix.disabled ? mateix : cal.querySelector('.cal-nav:not([disabled])'))?.focus();
  });

  pinta();
}

/* ═══ Render POSTERS (per home "Properes activitats") ═══ */
async function renderGrid() {
  const container = qs('#events-grid-list');
  if (!container) return;
  container.innerHTML = window.NX.carregantHTML();
  const events = sortEvents(await fetchEvents());
  const upcoming = events.filter(window.NX.visibleWeb).slice(0, 3);
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

  container.innerHTML = `<div class="container mt-4">${window.NX.carregantHTML()}</div>`;
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

  /* Mapa: NOMÉS un enllaç que s'obre a Google Maps. Un mapa incrustat
     posaria cookies de Google i li enviaria la IP del visitant sense
     consentiment previ (art. 22.2 LSSI). Amb l'enllaç no es carrega res
     de Google fins que la persona decideix obrir-lo. */
  const enllacMapa = ev.mapa_url
    || (L(ev.ubicacio) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(L(ev.ubicacio))}` : null);

  container.innerHTML = `
${ev.cartell ? `
<div class="detail-hero detail-hero--cartell" style="--fons:url('${esc(ev.cartell)}')">
  <button type="button" class="detail-cartell-obre" data-cartell="${esc(ev.cartell)}" data-cartell-alt="${esc(T('ev.cartell_alt') + ': ' + L(ev.titol))}">
    <img src="${esc(ev.cartell)}" alt="${esc(T('ev.cartell_alt') + ': ' + L(ev.titol))}">
    <span class="cartell-lupa-text">${esc(T('ev.cartell_veure'))}</span>
  </button>
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
          <dd>${esc(window.NX.quanText(ev, { llarg: true }))}${window.NX.esSetmanal(ev) && String(ev.data) > window.NX.avuiISO()
            ? ` <span class="muted">· ${esc(T('ev.des_de'))} ${esc(formatDate(ev.data, { day: 'numeric', month: 'long', year: undefined }))}</span>` : ''}</dd>
          ${!(!window.NX.esSetmanal(ev) && ev.data_label && /pr[oò]xi/i.test(L(ev.data_label))) ? `
            <dt>${T('ev.hora')}</dt>
            <dd>${esc(window.NX.franjaHoraria(ev) || '—')}</dd>
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

      <!-- On es fa: foto del lloc + enllaç al mapa (sense incrustar) -->
      <h2 style="font-size:var(--fs-xl); margin-top:var(--sp-5)">${T('ev.como_llegar')}</h2>
      <div class="location-block">
        ${ev.imatge_lloc ? `
          <div class="location-img">
            <img src="${esc(ev.imatge_lloc)}" alt="${esc(L(ev.ubicacio))}" loading="lazy">
          </div>` : ''}
        <div class="location-info">
          <div style="font-size:var(--fs-md); font-weight:600; margin-bottom:var(--sp-1)">${esc(L(ev.entitat))}</div>
          <div style="color:var(--text-muted); margin-bottom:var(--sp-3)">📍 ${esc(L(ev.ubicacio))}</div>
          ${enllacMapa ? `
            <a href="${esc(enllacMapa)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
              🗺️ ${T('ev.abrir_mapa')} <span aria-hidden="true">↗</span>
            </a>
            <div class="form-help" style="margin-top:var(--sp-1)">${T('ev.mapa_extern')}</div>` : ''}
        </div>
      </div>
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

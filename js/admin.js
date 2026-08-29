/* admin.js — Comunitat NexSocial
   ────────────────────────────────────────
   Panell admin. Basic Auth: el navegador demana user/pass. */

const { esc, formatDate, formatPrice, tipoLabel, qs, qsa } = window.NX;
const app = qs('#admin-app');

let state = {
  tab: 'events',
  events: [],
  reserves: [],
  eventFilter: null,
};

async function apiGet(path) {
  const r = await fetch(path, { credentials: 'include' });
  if (r.status === 401) { location.reload(); return null; }
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiSend(path, method, body) {
  const r = await fetch(path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function loadEvents() {
  try {
    const d = await apiGet('/api/admin/events');
    state.events = d?.events || [];
  } catch (e) {
    app.innerHTML = `<div class="alert alert-danger">Error carregant events: ${esc(e.message)}</div>
      <p>Comprova que Supabase estigui configurat i les vars ADMIN_USER/ADMIN_PASS.</p>`;
    return false;
  }
  return true;
}

async function loadReserves(eventId) {
  const q = eventId ? `?event_id=${encodeURIComponent(eventId)}` : '';
  const d = await apiGet('/api/admin/orders' + q);
  state.reserves = d?.reserves || [];
}

/* ── Render principal ─────────────────────────────────────── */
async function render() {
  if (state.tab === 'events') {
    if (!(await loadEvents())) return;
    renderEvents();
  } else if (state.tab === 'reserves') {
    if (!(await loadEvents())) return;
    await loadReserves(state.eventFilter);
    renderReserves();
  }
}

function tabsHTML() {
  return `
<div class="filters" style="margin-bottom: var(--sp-4);">
  <button class="filter-btn ${state.tab==='events'?'active':''}" onclick="setTab('events')">Events</button>
  <button class="filter-btn ${state.tab==='reserves'?'active':''}" onclick="setTab('reserves')">Reserves</button>
</div>`;
}

window.setTab = async function(t) {
  state.tab = t;
  await render();
};

/* ── EVENTS list + editor ─────────────────────────────────── */
function renderEvents() {
  const rows = state.events.map(ev => `
    <tr>
      <td><code>${esc(ev.id)}</code></td>
      <td><span class="event-badge" style="position:static">${esc(tipoLabel(ev.tipo))}</span></td>
      <td><strong>${esc(ev.titol?.ca || '')}</strong><br><span class="muted" style="font-size:var(--fs-sm)">${esc(ev.titol?.es || '')}</span></td>
      <td>${esc(formatDate(ev.data))}<br>${esc(ev.hora || '')}</td>
      <td>${ev.cupo}</td>
      <td>${formatPrice(ev.preu_cents)}</td>
      <td>${esc(ev.estat)}</td>
      <td>
        <button class="btn btn-secondary" onclick="editEvent('${esc(ev.id)}')">Editar</button>
        <button class="btn btn-ghost" onclick="viewReserves('${esc(ev.id)}')">Reserves</button>
        <button class="btn btn-ghost" style="color: var(--danger); border-color: var(--danger)" onclick="deleteEvent('${esc(ev.id)}')">Arxivar</button>
      </td>
    </tr>`).join('');

  app.innerHTML = `
${tabsHTML()}
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--sp-3);">
  <h1 style="margin:0">Events</h1>
  <button class="btn btn-primary" onclick="editEvent(null)">+ Nou event</button>
</div>
<table class="admin-table">
  <thead>
    <tr><th>ID</th><th>Tipus</th><th>Títol</th><th>Data</th><th>Cupo</th><th>Preu</th><th>Estat</th><th></th></tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="8" style="text-align:center; padding: var(--sp-4)" class="muted">Cap event encara. Crea el primer!</td></tr>'}</tbody>
</table>`;
}

window.editEvent = function(id) {
  const ev = id ? state.events.find(e => e.id === id) : {
    id: '', tipo: 'taller',
    titol: { ca: '', es: '' }, descripcio: { ca: '', es: '' },
    entitat: { ca: '', es: '' }, ubicacio: { ca: '', es: '' },
    mapa_url: '', data: '', hora: '17:00', durada: 90,
    cupo: 15, preu_cents: 0, tipo_iva: 'exempt',
    imatge: '/assets/placeholder-taller.svg', estat: 'proximament'
  };
  const isNew = !id;

  app.innerHTML = `
<button class="btn btn-secondary mb-3" onclick="setTab('events')">← Tornar</button>
<h1>${isNew ? 'Nou event' : 'Editar: ' + esc(ev.titol?.ca)}</h1>

<form id="ev-form" style="max-width: 800px;">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3);">
    <div class="form-group">
      <label class="form-label">ID (únic, sense espais)</label>
      <input class="form-input" name="id" value="${esc(ev.id)}" ${isNew ? '' : 'readonly'} required>
    </div>
    <div class="form-group">
      <label class="form-label">Tipus</label>
      <select class="form-select" name="tipo">
        <option value="mensual" ${ev.tipo==='mensual'?'selected':''}>Activitat mensual</option>
        <option value="taller" ${ev.tipo==='taller'?'selected':''}>Taller</option>
        <option value="esdeveniment" ${ev.tipo==='esdeveniment'?'selected':''}>Esdeveniment</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Títol CA</label>
      <input class="form-input" name="titol_ca" value="${esc(ev.titol?.ca)}" required>
    </div>
    <div class="form-group">
      <label class="form-label">Títol ES</label>
      <input class="form-input" name="titol_es" value="${esc(ev.titol?.es)}" required>
    </div>
    <div class="form-group" style="grid-column: 1/-1">
      <label class="form-label">Descripció CA</label>
      <textarea class="form-textarea" name="desc_ca" rows="3">${esc(ev.descripcio?.ca)}</textarea>
    </div>
    <div class="form-group" style="grid-column: 1/-1">
      <label class="form-label">Descripció ES</label>
      <textarea class="form-textarea" name="desc_es" rows="3">${esc(ev.descripcio?.es)}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Entitat CA</label>
      <input class="form-input" name="entitat_ca" value="${esc(ev.entitat?.ca)}">
    </div>
    <div class="form-group">
      <label class="form-label">Entitat ES</label>
      <input class="form-input" name="entitat_es" value="${esc(ev.entitat?.es)}">
    </div>
    <div class="form-group">
      <label class="form-label">Ubicació CA</label>
      <input class="form-input" name="ubi_ca" value="${esc(ev.ubicacio?.ca)}">
    </div>
    <div class="form-group">
      <label class="form-label">Ubicació ES</label>
      <input class="form-input" name="ubi_es" value="${esc(ev.ubicacio?.es)}">
    </div>
    <div class="form-group" style="grid-column: 1/-1">
      <label class="form-label">Mapa URL (Google Maps)</label>
      <input class="form-input" name="mapa_url" value="${esc(ev.mapa_url)}">
    </div>
    <div class="form-group">
      <label class="form-label">Data</label>
      <input class="form-input" name="data" type="date" value="${esc(ev.data)}" required>
    </div>
    <div class="form-group">
      <label class="form-label">Hora</label>
      <input class="form-input" name="hora" type="time" value="${esc(ev.hora)}" required>
    </div>
    <div class="form-group">
      <label class="form-label">Durada (min)</label>
      <input class="form-input" name="durada" type="number" min="15" step="15" value="${ev.durada}">
    </div>
    <div class="form-group">
      <label class="form-label">Cupo (places totals)</label>
      <input class="form-input" name="cupo" type="number" min="1" value="${ev.cupo}" required>
    </div>
    <div class="form-group">
      <label class="form-label">Preu (€)</label>
      <input class="form-input" name="preu_eur" type="number" min="0" step="0.5" value="${(ev.preu_cents/100).toFixed(2)}">
      <div class="form-help">0 = gratuït</div>
    </div>
    <div class="form-group">
      <label class="form-label">Tipus IVA</label>
      <select class="form-select" name="tipo_iva">
        <option value="exempt" ${ev.tipo_iva==='exempt'?'selected':''}>Exempt (assistència tercera edat, art. 20.Uno.8)</option>
        <option value="iva10" ${ev.tipo_iva==='iva10'?'selected':''}>IVA 10% (espectacle cultural)</option>
        <option value="iva21" ${ev.tipo_iva==='iva21'?'selected':''}>IVA 21% (altres)</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Imatge (URL)</label>
      <input class="form-input" name="imatge" value="${esc(ev.imatge)}">
    </div>
    <div class="form-group">
      <label class="form-label">Estat</label>
      <select class="form-select" name="estat">
        <option value="actiu" ${ev.estat==='actiu'?'selected':''}>Actiu</option>
        <option value="proximament" ${ev.estat==='proximament'?'selected':''}>Pròximament</option>
        <option value="esgotat" ${ev.estat==='esgotat'?'selected':''}>Esgotat</option>
      </select>
    </div>
  </div>

  <div id="ev-msg" class="mt-3"></div>

  <div style="display:flex; gap: var(--sp-2); margin-top: var(--sp-4);">
    <button type="submit" class="btn btn-primary btn-lg">💾 Desar</button>
    <button type="button" class="btn btn-secondary" onclick="setTab('events')">Cancel·lar</button>
  </div>
</form>`;

  qs('#ev-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const payload = {
      id: fd.id,
      tipo: fd.tipo,
      titol: { ca: fd.titol_ca, es: fd.titol_es },
      descripcio: { ca: fd.desc_ca, es: fd.desc_es },
      entitat: { ca: fd.entitat_ca, es: fd.entitat_es },
      ubicacio: { ca: fd.ubi_ca, es: fd.ubi_es },
      mapa_url: fd.mapa_url,
      data: fd.data,
      hora: fd.hora,
      durada: parseInt(fd.durada) || 90,
      cupo: parseInt(fd.cupo),
      preu_cents: Math.round(parseFloat(fd.preu_eur || 0) * 100),
      tipo_iva: fd.tipo_iva,
      imatge: fd.imatge,
      estat: fd.estat
    };
    try {
      if (isNew) await apiSend('/api/admin/events', 'POST', payload);
      else await apiSend('/api/admin/events', 'PATCH', payload);
      state.tab = 'events';
      await render();
    } catch (err) {
      qs('#ev-msg').innerHTML = `<div class="alert alert-danger">${esc(err.message)}</div>`;
    }
  });
};

window.deleteEvent = async function(id) {
  if (!confirm('Arxivar aquest event? No apareixerà més a la web pública.')) return;
  try {
    await apiSend('/api/admin/events', 'DELETE', { id });
    await render();
  } catch (e) { alert('Error: ' + e.message); }
};

window.viewReserves = function(eventId) {
  state.eventFilter = eventId;
  state.tab = 'reserves';
  render();
};

/* ── RESERVES ─────────────────────────────────────────────── */
function renderReserves() {
  const evMap = new Map(state.events.map(e => [e.id, e.titol?.ca || e.id]));
  const filterHTML = state.eventFilter
    ? `<div class="alert alert-info">Filtrant per: <strong>${esc(evMap.get(state.eventFilter) || state.eventFilter)}</strong>
       <button class="btn btn-ghost" style="margin-left: var(--sp-2)" onclick="clearFilter()">Veure totes</button></div>`
    : '';

  const rows = state.reserves.map(r => `
    <tr>
      <td><code>${esc(r.id)}</code></td>
      <td>${esc(evMap.get(r.event_id) || r.event_id)}</td>
      <td><strong>${esc(r.nom)}</strong></td>
      <td><a href="tel:${esc(r.telefon)}">${esc(r.telefon)}</a></td>
      <td>${r.places}</td>
      <td>${formatPrice(r.total_cents)}</td>
      <td>
        <select onchange="changeStatus('${esc(r.id)}', this.value)">
          ${['pending','confirmed','cancelled','attended','no-show'].map(s =>
            `<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${esc(formatDate(r.created_at, { day: '2-digit', month: '2-digit', year: '2-digit' }))}</td>
    </tr>`).join('');

  app.innerHTML = `
${tabsHTML()}
<h1>Reserves</h1>
${filterHTML}
<table class="admin-table">
  <thead>
    <tr><th>Ref</th><th>Event</th><th>Nom</th><th>Telèfon</th><th>Places</th><th>Total</th><th>Estat</th><th>Data</th></tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="8" style="text-align:center; padding: var(--sp-4)" class="muted">Cap reserva encara.</td></tr>'}</tbody>
</table>`;
}

window.clearFilter = function() {
  state.eventFilter = null;
  render();
};

window.changeStatus = async function(id, status) {
  try {
    await apiSend('/api/admin/orders', 'PATCH', { id, status });
  } catch (e) { alert('Error: ' + e.message); }
};

// Boot
render();

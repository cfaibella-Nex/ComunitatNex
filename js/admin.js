/* admin.js — Comunitat NexSocial
   ────────────────────────────────────────
   Panell admin. Login propi: el token Basic es guarda a sessionStorage
   (es perd en tancar la pestanya) i s'envia a cada crida a l'API.

   Abans es confiava que el navegador mostraria el diàleg de Basic Auth,
   però fetch() no l'obre mai: la resposta 401 feia location.reload() i
   la pàgina es quedava en blanc en un bucle.

   IMPORTANT: tot el fitxer va dins d'una IIFE. main.js declara esc(), qs(),
   qsa(), formatDate(), formatPrice() i tipoLabel() com a funcions globals, i
   els scripts clàssics comparteixen àmbit. Sense l'embolcall, el
   `const { esc, ... } = window.NX` peta amb "Identifier 'esc' has already
   been declared" i el fitxer no s'executa gens. agenda.js, checkout.js i
   recursos.js fan el mateix. */

(function() {

const { esc, formatDate, formatPrice, tipoLabel, qs, qsa } = window.NX;
const app = qs('#admin-app');

let state = {
  tab: 'events',
  events: [],
  reserves: [],
  auditoria: [],
  eventFilter: null,
};

const ESTATS = ['pending','confirmed','waitlist','cancelled','attended','no-show'];
const ESTAT_LABEL = {
  pending:   'Pendent',
  confirmed: 'Confirmada',
  waitlist:  "Llista d'espera",
  cancelled: 'Cancel·lada',
  attended:  'Va assistir',
  'no-show': 'No va venir'
};

/* ── Autenticació ─────────────────────────────────────────── */
const AUTH_KEY = 'nx-admin-auth';

class AuthError extends Error {}

const getAuth   = () => sessionStorage.getItem(AUTH_KEY);
const setAuth   = v  => sessionStorage.setItem(AUTH_KEY, v);
const clearAuth = () => sessionStorage.removeItem(AUTH_KEY);

function basicToken(user, pass) {
  // btoa no accepta caràcters no-ASCII: passem per UTF-8 abans
  return btoa(String.fromCharCode(...new TextEncoder().encode(`${user}:${pass}`)));
}

function authHeaders(extra) {
  const h = Object.assign({}, extra || {});
  const t = getAuth();
  if (t) h['Authorization'] = 'Basic ' + t;
  return h;
}

async function apiGet(path) {
  const r = await fetch(path, { headers: authHeaders() });
  if (r.status === 401) throw new AuthError('401');
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiSend(path, method, body) {
  const r = await fetch(path, {
    method,
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 401) throw new AuthError('401');
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ── Pantalla de login ────────────────────────────────────── */
function renderLogin(msg) {
  app.innerHTML = `
<div class="admin-login">
  <h1>Accés al panel</h1>
  <p class="muted">Panel de gestió d'activitats i reserves de Comunitat NexSocial.</p>
  ${msg ? `<div class="alert alert-danger">${esc(msg)}</div>` : ''}
  <form id="login-form">
    <div class="form-group">
      <label class="form-label" for="login-u">Usuari</label>
      <input class="form-input" id="login-u" type="text" autocomplete="username" required autofocus>
    </div>
    <div class="form-group">
      <label class="form-label" for="login-p">Contrasenya</label>
      <input class="form-input" id="login-p" type="password" autocomplete="current-password" required>
    </div>
    <button class="btn btn-primary btn-block" type="submit" id="login-btn">Entrar</button>
  </form>
</div>`;

  qs('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = qs('#login-btn');
    btn.disabled = true;
    btn.textContent = 'Comprovant…';

    const token = basicToken(qs('#login-u').value.trim(), qs('#login-p').value);
    try {
      const r = await fetch('/api/admin/events', { headers: { Authorization: 'Basic ' + token } });
      if (r.status === 401) { renderLogin('Usuari o contrasenya incorrectes.'); return; }
      if (!r.ok) {
        const detall = await r.json().catch(() => null);
        renderLogin(detall?.error
          ? `Error ${r.status}: ${detall.error}`
          : `Error del servidor ${r.status}. Obre /api/health per veure què falla.`);
        return;
      }
      setAuth(token);
      state.tab = 'events';
      await render();
    } catch (err) {
      renderLogin('No s\'ha pogut connectar amb el servidor.');
    }
  });
}

window.logout = function() {
  clearAuth();
  state.events = []; state.reserves = []; state.auditoria = [];
  renderLogin('Has tancat la sessió.');
};

async function loadEvents() {
  try {
    const d = await apiGet('/api/admin/events');
    state.events = d?.events || [];
  } catch (e) {
    if (e instanceof AuthError) throw e;
    app.innerHTML = `<div class="alert alert-danger">Error carregant events: ${esc(e.message)}</div>
      <p>Comprova que Supabase estigui configurat i les vars ADMIN_USER/ADMIN_PASS.</p>`;
    return false;
  }
  return true;
}

async function loadAuditoria() {
  const d = await apiGet('/api/admin/audit?limit=300');
  state.auditoria = d?.auditoria || [];
}

async function loadReserves(eventId) {
  const q = eventId ? `?event_id=${encodeURIComponent(eventId)}` : '';
  const d = await apiGet('/api/admin/orders' + q);
  state.reserves = d?.reserves || [];
}

/* ── Render principal ─────────────────────────────────────── */
async function render() {
  if (!getAuth()) { renderLogin(); return; }
  try {
    await renderTab();
  } catch (e) {
    if (e instanceof AuthError) {
      clearAuth();
      renderLogin('La sessió ha caducat. Torna a entrar.');
      return;
    }
    app.innerHTML = `<div class="alert alert-danger">${esc(e.message || 'Error inesperat')}</div>`;
  }
}

async function renderTab() {
  if (state.tab === 'events') {
    if (!(await loadEvents())) return;
    renderEvents();
  } else if (state.tab === 'reserves') {
    if (!(await loadEvents())) return;
    await loadReserves(state.eventFilter);
    renderReserves();
  } else if (state.tab === 'auditoria') {
    try {
      await loadAuditoria();
      renderAuditoria();
    } catch (e) {
      if (e instanceof AuthError) throw e;
      app.innerHTML = tabsHTML() + `<div class="alert alert-danger">Error carregant l'auditoria: ${esc(e.message)}</div>
        <p>Comprova que hagis executat <code>api/schema-v2.sql</code> a Supabase.</p>`;
    }
  }
}

function tabsHTML() {
  return `
<div class="filters" style="margin-bottom: var(--sp-4);">
  <button class="filter-btn ${state.tab==='events'?'active':''}" onclick="setTab('events')">Events</button>
  <button class="filter-btn ${state.tab==='reserves'?'active':''}" onclick="setTab('reserves')">Reserves</button>
  <button class="filter-btn ${state.tab==='auditoria'?'active':''}" onclick="setTab('auditoria')">Auditoria</button>
  <button class="filter-btn" onclick="logout()" style="margin-left:auto">Sortir</button>
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
    data_label: { ca: '', es: '' },
    cupo: 15, preu_cents: 0, tipo_iva: 'exempt',
    imatge: '/assets/placeholder-taller.svg', imatge_lloc: '', estat: 'proximament'
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
      <label class="form-label">Imatge de l'activitat (URL)</label>
      <input class="form-input" name="imatge" value="${esc(ev.imatge)}">
    </div>
    <div class="form-group">
      <label class="form-label">Imatge del lloc (URL)</label>
      <input class="form-input" name="imatge_lloc" value="${esc(ev.imatge_lloc)}">
      <div class="form-help">Foto de l'edifici, surt a "On es fa"</div>
    </div>
    <div class="form-group">
      <label class="form-label">Etiqueta de data CA</label>
      <input class="form-input" name="datalabel_ca" value="${esc(ev.data_label?.ca)}">
      <div class="form-help">Ex: "Octubre 2026", "Cada setmana". Buit = es mostra la data.</div>
    </div>
    <div class="form-group">
      <label class="form-label">Etiqueta de data ES</label>
      <input class="form-input" name="datalabel_es" value="${esc(ev.data_label?.es)}">
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
      imatge_lloc: fd.imatge_lloc || null,
      data_label: (fd.datalabel_ca || fd.datalabel_es)
        ? { ca: fd.datalabel_ca, es: fd.datalabel_es } : null,
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
          ${ESTATS.map(s =>
            `<option value="${s}" ${r.status===s?'selected':''}>${ESTAT_LABEL[s]}</option>`).join('')}
        </select>
      </td>
      <td>${esc(formatDate(r.created_at, { day: '2-digit', month: '2-digit', year: '2-digit' }))}</td>
    </tr>`).join('');

  const vives = state.reserves.filter(r => ['pending','confirmed','attended'].includes(r.status));
  const placesVives = vives.reduce((s, r) => s + (r.places || 0), 0);
  const enEspera = state.reserves.filter(r => r.status === 'waitlist').length;

  app.innerHTML = `
${tabsHTML()}
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--sp-3); gap: var(--sp-2); flex-wrap: wrap;">
  <h1 style="margin:0">Reserves</h1>
  <button class="btn btn-secondary" onclick="exportCSV()">⬇ Descarregar CSV</button>
</div>
<p class="muted">${vives.length} reserves actives · ${placesVives} places ocupades · ${enEspera} en llista d'espera</p>
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

/* ── EXPORT CSV ────────────────────────────────────────────── */
window.exportCSV = function() {
  const evMap = new Map(state.events.map(e => [e.id, e.titol?.ca || e.id]));
  const cap = ['Ref','Activitat','Data acte','Nom','Telefon','Email','Places','Total EUR','Estat','Creada','Confirmada'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const files = state.reserves.map(r => {
    const ev = state.events.find(e => e.id === r.event_id);
    return [
      r.id, evMap.get(r.event_id) || r.event_id, ev?.data || '',
      r.nom, r.telefon, r.email || '', r.places,
      ((r.total_cents || 0) / 100).toFixed(2).replace('.', ','),
      ESTAT_LABEL[r.status] || r.status,
      r.created_at || '', r.confirmed_at || ''
    ].map(cell).join(';');
  });
  const csv = '\uFEFF' + [cap.map(cell).join(';'), ...files].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reserves-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ── AUDITORIA ─────────────────────────────────────────────── */
function resumCanvis(row) {
  if (row.accio === 'insert') {
    const f = row.fila_despres || {};
    return esc([f.nom, f.telefon, f.places ? f.places + ' places' : null, f.status]
      .filter(Boolean).join(' · ') || 'registre creat');
  }
  if (row.accio === 'delete') return '<span style="color:var(--danger)">esborrat</span>';
  const c = row.canvis || {};
  return Object.keys(c).map(k => {
    const abans = JSON.stringify(c[k].abans), despres = JSON.stringify(c[k].despres);
    return `<code>${esc(k)}</code>: ${esc(abans)} → <strong>${esc(despres)}</strong>`;
  }).join('<br>') || '—';
}

function renderAuditoria() {
  const rows = state.auditoria.map(r => `
    <tr>
      <td style="white-space:nowrap">${esc(new Date(r.created_at).toLocaleString('ca-ES'))}</td>
      <td>${esc(r.taula)}</td>
      <td><code>${esc(r.registre_id)}</code></td>
      <td>${esc(r.accio)}</td>
      <td>${esc(r.actor)}</td>
      <td style="font-size:var(--fs-sm)">${resumCanvis(r)}${r.motiu ? `<br><em>${esc(r.motiu)}</em>` : ''}</td>
    </tr>`).join('');

  app.innerHTML = `
${tabsHTML()}
<h1>Auditoria</h1>
<p class="muted">Registre immutable de tot el que passa a events i reserves. No es pot editar ni esborrar.
Mostrant els ${state.auditoria.length} moviments més recents.</p>
<table class="admin-table">
  <thead>
    <tr><th>Quan</th><th>Taula</th><th>Registre</th><th>Acció</th><th>Qui</th><th>Què</th></tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="6" style="text-align:center; padding: var(--sp-4)" class="muted">Cap moviment registrat encara.</td></tr>'}</tbody>
</table>`;
}

// Boot
if (getAuth()) render(); else renderLogin();

})();

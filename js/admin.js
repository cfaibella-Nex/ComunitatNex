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

const { esc, formatDate, formatPrice, tipoLabel, estatPlaces, qs, qsa } = window.NX;
const app = qs('#admin-app');

let state = {
  tab: 'events',
  events: [],
  reserves: [],
  auditoria: [],
  eventFilter: null,
  eventVista: 'properes',
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
    try { await loadReserves(null); } catch { state.reserves = []; }
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
const ESTAT_EVENT = {
  actiu:       { nom: 'Visible',      color: 'var(--success)' },
  proximament: { nom: 'Pròximament',  color: 'var(--info)' },
  esgotat:     { nom: 'Esgotat',      color: 'var(--warning)' },
  arxivat:     { nom: 'Arxivat',      color: 'var(--text-muted)' }
};

function avui() { return new Date().toISOString().slice(0, 10); }

/* Places ocupades per activitat, a partir de les reserves vives */
function ocupacio() {
  const m = {};
  for (const r of state.reserves) {
    if (!['pending', 'confirmed', 'attended'].includes(r.status)) continue;
    m[r.event_id] = (m[r.event_id] || 0) + (r.places || 0);
  }
  return m;
}

function targetaEvent(ev, ocup) {
  const passat = (ev.data || '') < avui();
  const e = ESTAT_EVENT[ev.estat] || { nom: ev.estat, color: 'var(--text-muted)' };
  const ocupades = ocup[ev.id] || 0;
  const restants = Math.max(0, (ev.cupo || 0) - ocupades);
  const pct = ev.cupo ? Math.min(100, Math.round(ocupades * 100 / ev.cupo)) : 0;

  /* Mateix criteri que la web pública: així el panell ensenya el
     que la gent veu, no una altra cosa. */
  const ep = estatPlaces(ev, restants);
  const avisPlaces = ep === 'esgotat'
    ? '<span class="ev-places-avis" style="background:var(--danger)">Ple</span>'
    : ep === 'ultimes'
      ? '<span class="ev-places-avis" style="background:var(--warning)">Últimes places</span>'
      : '';
  const foto = ev.imatge || '/assets/placeholder-taller.svg';

  return `
  <article class="ev-card${passat ? ' ev-card--passat' : ''}">
    <img class="ev-foto" src="${esc(foto)}" alt="" loading="lazy">

    <div class="ev-cos">
      <div class="ev-dalt">
        <span class="event-badge" style="position:static">${esc(tipoLabel(ev.tipo))}</span>
        <span class="ev-estat" style="background:${e.color}">${esc(e.nom)}</span>
        ${avisPlaces}
        ${passat ? '<span class="ev-avis">Data passada: no surt a la web</span>' : ''}
      </div>

      <h3 class="ev-titol">${esc(ev.titol?.ca || ev.id)}</h3>
      <p class="ev-sub">${esc(ev.ubicacio?.ca || '')} · ${esc(window.NXC.preuResum(ev))} · ${esc(MODEL_NOM[ev.model] || MODEL_NOM.puntual)}${ev.pagament && ev.pagament !== 'reserva' ? ' · ' + esc(PAGAMENT_NOM[ev.pagament]) : ''}</p>

      <div class="ev-rapid">
        <label>Data
          <input type="date" value="${esc(ev.data || '')}"
                 onchange="canviRapid('${esc(ev.id)}','data',this.value)">
        </label>
        <label>Hora
          <input type="time" value="${esc(ev.hora || '')}"
                 onchange="canviRapid('${esc(ev.id)}','hora',this.value)">
        </label>
        <label>Places
          <input type="number" min="0" max="999" value="${ev.cupo}"
                 onchange="canviRapid('${esc(ev.id)}','cupo',parseInt(this.value,10))">
        </label>
        <label>Estat
          <select onchange="canviRapid('${esc(ev.id)}','estat',this.value)">
            ${Object.entries(ESTAT_EVENT).map(([k, v]) =>
              `<option value="${k}" ${ev.estat === k ? 'selected' : ''}>${v.nom}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="ev-places">
        <div class="ev-barra"><span style="width:${pct}%"></span></div>
        <span class="muted">${ocupades} de ${ev.cupo}${restants ? ` · en queden ${restants}` : ''}</span>
      </div>

      <div class="ev-accions">
        <button class="btn btn-secondary" onclick="editEvent('${esc(ev.id)}')">Editar</button>
        <button class="btn btn-ghost" onclick="duplicarEvent('${esc(ev.id)}')">Duplicar</button>
        <button class="btn btn-ghost" onclick="viewReserves('${esc(ev.id)}')">Reserves${ocupades ? ` (${ocupades})` : ''}</button>
        ${ev.estat !== 'arxivat'
          ? `<button class="btn btn-ghost ev-arxivar" onclick="deleteEvent('${esc(ev.id)}')">Arxivar</button>` : ''}
      </div>
      <p class="ev-id"><code>${esc(ev.id)}</code></p>
    </div>
  </article>`;
}

window.setFiltreEvents = function(f) { state.eventVista = f; renderEvents(); };

/* Canvi d'un sol camp sense obrir el formulari. Envia l'activitat
   sencera perquè l'API fa un upsert complet. */
window.canviRapid = async function(id, camp, valor) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  const abans = ev[camp];
  ev[camp] = valor;
  try {
    await apiSend('/api/admin/events', 'PATCH', ev);
    renderEvents();
  } catch (e) {
    ev[camp] = abans;
    alert('No s\'ha pogut desar: ' + e.message);
    renderEvents();
  }
};

/* Duplicar: edició nova amb data buida, oculta i sense reserves.
   És el camí correcte per repetir un taller, en lloc de canviar-li
   la data a l'antic i arrossegar-hi la gent que ja s'hi va apuntar. */
window.duplicarEvent = async function(id) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  const copia = JSON.parse(JSON.stringify(ev));
  delete copia.versio; delete copia.created_at; delete copia.updated_at;
  copia.id = `${ev.id}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 80);
  copia.estat = 'proximament';
  copia.data = '';
  if (copia.titol?.ca) copia.titol.ca = `${copia.titol.ca} (còpia)`.slice(0, 120);
  if (copia.titol?.es) copia.titol.es = `${copia.titol.es} (copia)`.slice(0, 120);
  try {
    await apiSend('/api/admin/events', 'POST', copia);
    await render();
  } catch (e) { alert('Error duplicant: ' + e.message); }
};

function renderEvents() {
  const vista = state.eventVista || 'properes';
  const hui = avui();
  const ocup = ocupacio();

  const filtres = {
    properes: e => (e.data || '') >= hui && e.estat !== 'arxivat',
    passades: e => (e.data || '') < hui && e.estat !== 'arxivat',
    arxivades: e => e.estat === 'arxivat',
    totes: () => true
  };
  const comptes = Object.fromEntries(
    Object.entries(filtres).map(([k, f]) => [k, state.events.filter(f).length]));

  const visibles = state.events.filter(filtres[vista] || filtres.totes)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  const etiquetes = { properes: 'Properes', passades: 'Passades', arxivades: 'Arxivades', totes: 'Totes' };

  app.innerHTML = `
${tabsHTML()}
<div class="ev-capcalera">
  <h1 style="margin:0">Activitats</h1>
  <button class="btn btn-primary" onclick="editEvent(null)">+ Nova activitat</button>
</div>

<div class="filters" style="margin-bottom: var(--sp-3)">
  ${Object.keys(filtres).map(k => `
    <button class="filter-btn ${vista === k ? 'active' : ''}" onclick="setFiltreEvents('${k}')">
      ${etiquetes[k]} (${comptes[k]})
    </button>`).join('')}
</div>

${comptes.passades && vista === 'properes'
  ? `<div class="alert alert-warning">${comptes.passades === 1
       ? 'Hi ha una activitat amb data passada que no surt a la web.'
       : `Hi ha ${comptes.passades} activitats amb data passada que no surten a la web.`}
     Mira-les a "Passades": pots posar-los data nova o duplicar-les per a una edició nova.</div>` : ''}

${visibles.length
  ? `<div class="ev-graella">${visibles.map(ev => targetaEvent(ev, ocup)).join('')}</div>`
  : `<div class="alert alert-info">Cap activitat en aquesta vista.</div>`}`;
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

  /* Configuració d'inscripció en edició. Es parteix de la mateixa
     lectura que fa la web: una activitat antiga surt amb una tarifa. */
  const cfg = {
    id: ev.id,
    model: ev.model || 'puntual',
    pagament: ev.pagament || 'reserva',
    tarifes: window.NXC.tarifesEvent(ev).map(x => ({ ...x })),
    extres: window.NXC.extresEvent(ev).map(x => ({ ...x }))
  };

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
      <label class="form-label">Tipus IVA</label>
      <select class="form-select" name="tipo_iva">
        <option value="exempt" ${ev.tipo_iva==='exempt'?'selected':''}>Exempt (assistència tercera edat, art. 20.Uno.8)</option>
        <option value="iva10" ${ev.tipo_iva==='iva10'?'selected':''}>IVA 10% (espectacle cultural)</option>
        <option value="iva21" ${ev.tipo_iva==='iva21'?'selected':''}>IVA 21% (altres)</option>
      </select>
    </div>
    ${campImatge('imatge', "Imatge de l'activitat", ev.imatge, 'Es veu a la targeta i a la pàgina de l\'activitat')}
    ${campImatge('imatge_lloc', 'Imatge del lloc', ev.imatge_lloc, 'Foto de l\'edifici, surt a "On es fa"')}
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

  <div id="ins-editor"></div>

  <div id="ev-msg" class="mt-3"></div>

  <div style="display:flex; gap: var(--sp-2); margin-top: var(--sp-4);">
    <button type="submit" class="btn btn-primary btn-lg">💾 Desar</button>
    <button type="button" class="btn btn-secondary" onclick="setTab('events')">Cancel·lar</button>
  </div>
</form>`;

  editorInscripcio(cfg, () => qs('#ev-form [name="data"]')?.value || ev.data);

  qs('#ev-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    cfg.id = qs('#ev-form [name="id"]').value.trim();
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
      /* preu_cents el calcula el servidor a partir de les tarifes */
      model: cfg.model,
      pagament: cfg.pagament,
      tarifes: cfg.tarifes.map(netejaItem),
      extres: cfg.extres.map(netejaItem),
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

/* ── EDITOR D'INSCRIPCIÓ (model, cobrament, tarifes, extres) ──
   Mateix plantejament que BookingFEB. Es re-pinta només quan canvia
   l'estructura (afegir, treure, canviar tipus o mode de preu); en
   escriure dins d'un camp s'actualitza l'objecte sense re-pintar,
   perquè el cursor no salti. */
const MODEL_NOM = { puntual: 'Puntual', mensual: 'Mensual', trimestral: 'Trimestral' };
const MODEL_AJUDA = {
  puntual:    "Una o poques sessions amb data. Pots oferir-hi una altra sessió com a extra (ex. autodefensa 13/10 + 10/11): cada sessió és una activitat amb les seves places.",
  mensual:    "La inscripció cobra el primer mes (si hi ha matrícula, suma-la al preu i explica-ho al detall). Els mesos següents s'afegeixen com a extres.",
  trimestral: "Es paga el període sencer d'un cop. Indica el període al detall de la tarifa (ex. \"Octubre – desembre\")."
};
const PAGAMENT_NOM = { reserva: 'Només reserva', presencial: 'Pagament presencial', online: 'Pagament online' };
const PAGAMENT_AJUDA = {
  reserva:    "Només es reserva la plaça. Per a activitats gratuïtes o amb preu a consultar.",
  presencial: "Es reserva i es paga el dia de l'activitat, al centre.",
  online:     "Pagament amb targeta (Stripe). Mentre Stripe no estigui connectat, es reserva igualment i surt l'avís de \"pagament aviat\"."
};
const PREU_NOM = { fix: 'Preu fix', gratuit: 'Gratuït', consultar: 'A consultar' };
const TIPUS_NOM = { mes: 'Mes', sessio: 'Sessió vinculada', extra: 'Extra' };

const nouId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 7)}`;

/* Treu camps que només fa servir l'editor i passa € a cèntims */
function netejaItem(x) {
  const o = { ...x };
  o.preu_cents = o.preu_mode === 'fix' ? Math.round(Number(o.preu_cents) || 0) : 0;
  if (o.places === '' || o.places == null) o.places = null;
  if ('tipus' in o) {            // extra
    if (o.tipus !== 'sessio') delete o.event_id;
    delete o.places; delete o.estat;
  }
  return o;
}

function nomMes(dataBase, desplacament, lang) {
  const d = dataBase ? new Date(dataBase + 'T12:00:00') : new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + desplacament);
  const txt = new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'ca-ES', { month: 'long', year: 'numeric' }).format(d);
  const net = txt.replace(/\s+(de|del)\s+/i, ' ').replace(/\s+d[’']/i, ' ');   // "gener del 2027" → "gener 2027"
  return net.charAt(0).toUpperCase() + net.slice(1);
}

function camp(etiqueta, html, ajuda) {
  return `<label class="ins-camp"><span>${etiqueta}</span>${html}${ajuda ? `<small>${ajuda}</small>` : ''}</label>`;
}
function inp(k, i, v, extra = '') {
  return `<input class="form-input" data-k="${k}" data-i="${i}" value="${esc(v ?? '')}" ${extra}>`;
}
function preuCamps(llista, i, x) {
  return `
    ${camp('Preu', `<select class="form-select" data-k="preu_mode" data-i="${i}" data-llista="${llista}" data-repinta>
      ${Object.entries(PREU_NOM).map(([k, v]) => `<option value="${k}" ${x.preu_mode === k ? 'selected' : ''}>${v}</option>`).join('')}
    </select>`)}
    ${x.preu_mode === 'fix'
      ? camp('Import (€)', `<input class="form-input" type="number" min="0.01" step="0.01" data-k="preu_eur" data-i="${i}" data-llista="${llista}" value="${((x.preu_cents || 0) / 100).toFixed(2)}">`)
      : ''}`;
}

function editorInscripcio(cfg, dataActivitat) {
  const box = qs('#ins-editor');

  function pinta() {
    const altres = state.events
      .filter(e => e.id !== cfg.id && e.estat !== 'arxivat')
      .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));

    const tarifa = (x, i) => `
<div class="ins-ed-fila">
  <div class="ins-ed-cap">
    <strong>${cfg.tarifes.length > 1 ? `Nivell ${i + 1}` : 'Tarifa'}</strong>
    <code>${esc(x.id)}</code>
    ${cfg.tarifes.length > 1 ? `<button type="button" class="btn btn-ghost ins-ed-treure" data-treure="tarifes" data-i="${i}">Treure</button>` : ''}
  </div>
  <div class="ins-ed-grid">
    ${camp('Nom CA *', inp('nom.ca', i, x.nom?.ca, 'data-llista="tarifes" placeholder="Ex. Bàsic"'))}
    ${camp('Nom ES', inp('nom.es', i, x.nom?.es, 'data-llista="tarifes" placeholder="Ex. Básico"'))}
    ${camp('Detall CA', inp('detall.ca', i, x.detall?.ca, 'data-llista="tarifes" placeholder="Ex. Dimarts 17:00 – 18:30"'))}
    ${camp('Detall ES', inp('detall.es', i, x.detall?.es, 'data-llista="tarifes" placeholder="Ex. Martes 17:00 – 18:30"'))}
    ${preuCamps('tarifes', i, x)}
    ${camp('Places del nivell', `<input class="form-input" type="number" min="1" max="999" data-k="places" data-i="${i}" data-llista="tarifes" value="${x.places ?? ''}" placeholder="Comparteix">`,
           'Buit = comparteix les places de l\'activitat')}
    ${camp('Estat', `<select class="form-select" data-k="estat" data-i="${i}" data-llista="tarifes">
      <option value="disponible" ${x.estat !== 'complet' ? 'selected' : ''}>Disponible</option>
      <option value="complet" ${x.estat === 'complet' ? 'selected' : ''}>Complet</option>
    </select>`)}
  </div>
</div>`;

    const extra = (x, i) => `
<div class="ins-ed-fila">
  <div class="ins-ed-cap">
    <strong>${TIPUS_NOM[x.tipus]}</strong>
    <code>${esc(x.id)}</code>
    <button type="button" class="btn btn-ghost ins-ed-treure" data-treure="extres" data-i="${i}">Treure</button>
  </div>
  <div class="ins-ed-grid">
    ${x.tipus === 'sessio' ? camp('Activitat de la sessió *', `<select class="form-select" data-k="event_id" data-i="${i}" data-llista="extres">
        <option value="">— Tria —</option>
        ${altres.map(e => `<option value="${esc(e.id)}" ${x.event_id === e.id ? 'selected' : ''}>${esc(e.data || 'sense data')} · ${esc(e.titol?.ca || e.id)} · ${esc(e.entitat?.ca || '')}</option>`).join('')}
      </select>`, 'Ocupa una plaça en aquesta altra activitat. La data es mostra sola.') : ''}
    ${camp('Nom CA *', inp('nom.ca', i, x.nom?.ca, 'data-llista="extres"'))}
    ${camp('Nom ES', inp('nom.es', i, x.nom?.es, 'data-llista="extres"'))}
    ${camp('Detall CA', inp('detall.ca', i, x.detall?.ca, 'data-llista="extres"'))}
    ${camp('Detall ES', inp('detall.es', i, x.detall?.es, 'data-llista="extres"'))}
    ${preuCamps('extres', i, x)}
  </div>
</div>`;

    box.innerHTML = `
<fieldset class="ins-ed">
  <legend>Inscripció i preus</legend>

  <div class="ins-ed-grid">
    ${camp('Model', `<select class="form-select" data-cfg="model" data-repinta>
      ${Object.entries(MODEL_NOM).map(([k, v]) => `<option value="${k}" ${cfg.model === k ? 'selected' : ''}>${v}</option>`).join('')}
    </select>`, MODEL_AJUDA[cfg.model])}
    ${camp('Com es cobra', `<select class="form-select" data-cfg="pagament" data-repinta>
      ${Object.entries(PAGAMENT_NOM).map(([k, v]) => `<option value="${k}" ${cfg.pagament === k ? 'selected' : ''}>${v}</option>`).join('')}
    </select>`, PAGAMENT_AJUDA[cfg.pagament])}
  </div>

  <h3>Tarifes${cfg.tarifes.length > 1 ? ' (nivells)' : ''}</h3>
  <p class="form-help">Amb una sola tarifa la web mostra "Places", com sempre. Amb més d'una, la persona tria el nivell.</p>
  ${cfg.tarifes.map(tarifa).join('')}
  <button type="button" class="btn btn-secondary" data-afegir="tarifa">+ Afegir nivell</button>

  <h3>Extres</h3>
  <p class="form-help">${cfg.model === 'mensual'
    ? 'Afegeix un extra per cada mes que es pugui reservar a més del primer.'
    : 'Opcional. Es mostren en un pas propi abans de les dades.'}</p>
  ${cfg.extres.map(extra).join('') || '<p class="muted">Cap extra.</p>'}
  <div style="display:flex; gap: var(--sp-1); flex-wrap: wrap;">
    ${cfg.model === 'mensual' ? '<button type="button" class="btn btn-secondary" data-afegir="mes">+ Afegir mes</button>' : ''}
    <button type="button" class="btn btn-secondary" data-afegir="sessio">+ Afegir sessió vinculada</button>
    <button type="button" class="btn btn-secondary" data-afegir="extra">+ Afegir extra</button>
  </div>
  ${cfg.model !== 'mensual' && cfg.extres.some(x => x.tipus === 'mes')
    ? '<div class="alert alert-warning mt-3">Hi ha mesos com a extra però l\'activitat no és mensual: treu-los o canvia el model.</div>' : ''}
</fieldset>`;
  }

  function assigna(el) {
    const { k, i, llista } = el.dataset;
    if (el.dataset.cfg) { cfg[el.dataset.cfg] = el.value; return; }
    const item = cfg[llista]?.[Number(i)];
    if (!item) return;
    if (k === 'preu_eur') { item.preu_cents = Math.round((parseFloat(el.value) || 0) * 100); return; }
    if (k === 'places') { item.places = el.value === '' ? null : parseInt(el.value, 10); return; }
    if (k.includes('.')) {
      const [a, b] = k.split('.');
      item[a] = { ...(item[a] || {}), [b]: el.value };
      return;
    }
    item[k] = el.value;
  }

  box.addEventListener('input', e => { if (e.target.matches('[data-k],[data-cfg]')) assigna(e.target); });
  box.addEventListener('change', e => {
    if (!e.target.matches('[data-k],[data-cfg]')) return;
    assigna(e.target);
    if ('repinta' in e.target.dataset) pinta();
  });

  box.addEventListener('click', e => {
    const tr = e.target.closest('[data-treure]');
    if (tr) {
      cfg[tr.dataset.treure].splice(Number(tr.dataset.i), 1);
      pinta();
      return;
    }
    const af = e.target.closest('[data-afegir]');
    if (!af) return;
    const quin = af.dataset.afegir;
    if (quin === 'tarifa') {
      cfg.tarifes.push({ id: nouId('t'), nom: { ca: '', es: '' }, detall: { ca: '', es: '' },
                         preu_mode: 'gratuit', preu_cents: 0, places: null, estat: 'disponible' });
    } else if (quin === 'mes') {
      /* Nom automàtic: el mes següent a l'últim afegit, comptant des de
         la data de l'activitat. Preu per defecte: el de la primera
         tarifa amb preu fix. Tot es pot canviar. */
      const n = cfg.extres.filter(x => x.tipus === 'mes').length + 1;
      const base = cfg.tarifes.find(x => x.preu_mode === 'fix');
      cfg.extres.push({ id: nouId('mes'), tipus: 'mes',
        nom: { ca: nomMes(dataActivitat(), n, 'ca'), es: nomMes(dataActivitat(), n, 'es') },
        detall: { ca: 'Quota mensual, pagada per endavant.', es: 'Cuota mensual, pagada por adelantado.' },
        preu_mode: base ? 'fix' : (cfg.tarifes[0]?.preu_mode || 'gratuit'), preu_cents: base ? base.preu_cents : 0 });
    } else if (quin === 'sessio') {
      cfg.extres.push({ id: nouId('s'), tipus: 'sessio', event_id: '',
        nom: { ca: 'Segona sessió', es: 'Segunda sesión' }, detall: { ca: '', es: '' },
        preu_mode: cfg.tarifes[0]?.preu_mode || 'gratuit', preu_cents: cfg.tarifes[0]?.preu_cents || 0 });
    } else {
      cfg.extres.push({ id: nouId('x'), tipus: 'extra', nom: { ca: '', es: '' }, detall: { ca: '', es: '' },
                        preu_mode: 'gratuit', preu_cents: 0 });
    }
    pinta();
  });

  pinta();
}

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

/* ── CAMPS D'IMATGE ────────────────────────────────────────
   Pujada directa al bucket. La foto es redueix al navegador abans
   d'enviar-la: una foto de mòbil de 6 MB baixa a uns 300 KB, i de
   pas tots els assets queden a la mateixa mida. */
function campImatge(clau, etiqueta, valor, ajuda) {
  const v = valor || '';
  return `
    <div class="form-group">
      <label class="form-label">${esc(etiqueta)}</label>
      <div style="display:flex; gap: var(--sp-2); align-items:flex-start;">
        <img id="prev-${clau}" src="${esc(v)}" alt=""
             style="${v ? '' : 'display:none;'} width:96px; height:64px; object-fit:cover; border-radius: var(--radius-sm); flex:none;">
        <div style="flex:1; min-width:0;">
          <input class="form-input" name="${clau}" id="camp-${clau}" value="${esc(v)}" placeholder="Cap imatge">
          <input type="file" id="file-${clau}" accept="image/jpeg,image/png,image/webp" style="display:none">
          <div style="display:flex; gap: var(--sp-2); align-items:center; margin-top: var(--sp-1);">
            <button type="button" class="btn btn-secondary" onclick="triarImatge('${clau}')">Pujar una foto</button>
            ${v ? `<button type="button" class="btn btn-ghost" onclick="treureImatge('${clau}')">Treure</button>` : ''}
            <span id="estat-${clau}" class="muted" style="font-size:var(--fs-sm)"></span>
          </div>
          <div class="form-help">${esc(ajuda)}</div>
        </div>
      </div>
    </div>`;
}

/* Redueix i recomprimeix abans de pujar */
function reduirImatge(file, maxAmple = 1600, qualitat = 0.85) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No s\'ha pogut llegir el fitxer'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El fitxer no és una imatge vàlida'));
      img.onload = () => {
        const ample = Math.min(img.width, maxAmple);
        const alt = Math.round(img.height * ample / img.width);
        const c = document.createElement('canvas');
        c.width = ample; c.height = alt;
        const ctx = c.getContext('2d');
        /* Els PNG amb transparència es tornarien negres en passar a
           JPEG: hi posem fons blanc abans de dibuixar. */
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, ample, alt);
        ctx.drawImage(img, 0, 0, ample, alt);
        resolve(c.toDataURL('image/jpeg', qualitat));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}

window.triarImatge = function(clau) {
  const input = qs(`#file-${clau}`);
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const estat = qs(`#estat-${clau}`);
    estat.textContent = 'Preparant la foto…';
    try {
      const dades = await reduirImatge(file);
      estat.textContent = 'Pujant…';
      const r = await fetch('/api/media', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nom: file.name, dades })
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) { estat.textContent = out.error || `Error ${r.status}`; return; }
      qs(`#camp-${clau}`).value = out.url;
      const prev = qs(`#prev-${clau}`);
      prev.src = out.url;
      prev.style.display = '';
      estat.textContent = `Pujada (${Math.round(out.bytes / 1024)} KB)`;
    } catch (e) {
      estat.textContent = e.message || 'Error pujant la foto';
    }
  };
  input.click();
};

window.treureImatge = function(clau) {
  qs(`#camp-${clau}`).value = '';
  const prev = qs(`#prev-${clau}`);
  prev.src = ''; prev.style.display = 'none';
  qs(`#estat-${clau}`).textContent = 'Imatge treta';
};

/* ── RESERVES ─────────────────────────────────────────────── */
const PAGAMENT_ESTAT = { none: '—', pending: 'Pendent de pagar', paid: 'Pagat', refunded: 'Retornat', failed: 'No pagat' };

/* "2× Bàsic · 1× Novembre 2026" · les sessions vinculades diuen de quina reserva venen */
function resumLinies(r) {
  const ls = Array.isArray(r.linies) ? r.linies : [];
  if (r.pare_id) return `Sessió vinculada a ${r.pare_id}`;
  return ls.map(l => `${l.qty}× ${l.nom?.ca || l.id}${l.preu_mode === 'consultar' ? ' (a consultar)' : ''}`).join(' · ');
}

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
      <td class="res-detall">${esc(resumLinies(r))}</td>
      <td>${formatPrice(r.total_cents)}${r.consultar ? ' <small class="muted">+ a consultar</small>' : ''}</td>
      <td>${esc(PAGAMENT_ESTAT[r.payment_status] || '—')}</td>
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
    <tr><th>Ref</th><th>Event</th><th>Nom</th><th>Telèfon</th><th>Places</th><th>Detall</th><th>Total</th><th>Pagament</th><th>Estat</th><th>Data</th></tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="10" style="text-align:center; padding: var(--sp-4)" class="muted">Cap reserva encara.</td></tr>'}</tbody>
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
  const cap = ['Ref','Activitat','Data acte','Nom','Telefon','Email','Places','Detall','Total EUR','Pagament','Estat','Creada','Confirmada'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const files = state.reserves.map(r => {
    const ev = state.events.find(e => e.id === r.event_id);
    return [
      r.id, evMap.get(r.event_id) || r.event_id, ev?.data || '',
      r.nom, r.telefon, r.email || '', r.places, resumLinies(r),
      ((r.total_cents || 0) / 100).toFixed(2).replace('.', ','),
      PAGAMENT_ESTAT[r.payment_status] || '',
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

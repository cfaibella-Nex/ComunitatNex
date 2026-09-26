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
  stripe: 'off',                 // 'off' | 'test' | 'live' (ho diu l'API)
  filtreReserves: 'totes',       // totes | cobrar | pagades | espera
  cobrant: null,                 // id de la reserva amb el panell de cobrament obert
  llista: { eventId: null, data: null, assistencia: {} },
  seguiment: { eventId: null, mes: null, assistencia: {} },   // assistencia[reserva][data] = true/false
  usuari: null,
  gestor: null
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
  if (r.status === 403) { const d = await r.clone().json().catch(() => ({})); if (d.codi === 'cal_canviar_contrasenya') throw new AuthError('canviar'); }
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

/* ── Entrada al panell ─────────────────────────────────────
   Cada persona entra amb el seu correu. L'accés compartit d'abans
   només surt mentre no hi hagi cap usuari creat. */
async function gestorEstat() {
  try {
    const r = await fetch('/api/gestor?op=estat', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function gestorPost(op, body) {
  const r = await fetch(`/api/gestor?op=${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-gestor': '1' },
    body: JSON.stringify(body || {})
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(out.error || `Error ${r.status}`); e.codi = out.codi; e.status = r.status; throw e; }
  return out;
}

const potFer = (permis) => {
  const rol = state.usuari?.rol || 'admin';
  const P = { contingut: ['admin', 'responsable', 'editor'], esborrar: ['admin', 'responsable'],
              reserves: ['admin', 'responsable'], auditoria: ['admin', 'responsable'], usuaris: ['admin'] };
  return P[permis]?.includes(rol);
};

function renderLogin(msg) {
  const g = state.gestor || {};
  app.innerHTML = `
<div class="admin-login">
  <h1>Accés al panell</h1>
  <p class="muted">Activitats, reserves, cobraments i seguiment de Comunitat NexSocial.</p>
  ${msg ? `<div class="alert alert-danger">${esc(msg)}</div>` : ''}

  ${g.gestor && g.inicialitzat ? `
  <form id="login-form">
    <div class="form-group">
      <label class="form-label" for="login-e">Correu</label>
      <input class="form-input" id="login-e" type="email" autocomplete="username" required autofocus>
    </div>
    <div class="form-group">
      <label class="form-label" for="login-p">Contrasenya</label>
      <input class="form-input" id="login-p" type="password" autocomplete="current-password" required>
    </div>
    <button class="btn btn-primary btn-block" type="submit" id="login-btn">Entrar</button>
  </form>` : ''}

  ${g.setup_disponible ? `
  <details class="mt-3" ${g.acces_antic ? '' : 'open'}>
    <summary><strong>Crear el primer administrador</strong></summary>
    <p class="form-help">Cal la clau d'instal·lació (GESTOR_SETUP_KEY de Vercel). Només es pot fer un cop.</p>
    <form id="setup-form">
      <div class="form-group"><label class="form-label">Clau d'instal·lació</label>
        <input class="form-input" id="st-clau" type="password" required autocomplete="off"></div>
      <div class="form-group"><label class="form-label">Nom</label>
        <input class="form-input" id="st-nom" required></div>
      <div class="form-group"><label class="form-label">Correu</label>
        <input class="form-input" id="st-email" type="email" required autocomplete="username"></div>
      <div class="form-group"><label class="form-label">Contrasenya (mínim 10 caràcters)</label>
        <input class="form-input" id="st-pw" type="password" minlength="10" required autocomplete="new-password"></div>
      <button class="btn btn-primary btn-block" type="submit">Crear i entrar</button>
    </form>
  </details>` : ''}

  ${g.gestor === false && g.falta ? `<div class="alert alert-info mt-3">Usuaris individuals encara no actius: falta <code>${esc(g.falta)}</code>. Mentrestant, accés compartit.</div>` : ''}

  ${g.acces_antic || !g.gestor ? `
  <details class="mt-3" ${g.gestor && g.inicialitzat ? '' : 'open'}>
    <summary>Accés compartit (fins que es creï el primer usuari)</summary>
    <form id="legacy-form">
      <div class="form-group"><label class="form-label" for="login-u">Usuari</label>
        <input class="form-input" id="login-u" type="text" autocomplete="username" required></div>
      <div class="form-group"><label class="form-label" for="login-lp">Contrasenya</label>
        <input class="form-input" id="login-lp" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-secondary btn-block" type="submit">Entrar</button>
    </form>
  </details>` : ''}
</div>`;

  qs('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = qs('#login-btn');
    btn.disabled = true; btn.textContent = 'Comprovant…';
    try {
      const out = await gestorPost('login', { email: qs('#login-e').value.trim(), contrasenya: qs('#login-p').value });
      clearAuth();
      state.usuari = out.usuari;
      if (out.usuari.ha_de_canviar) return renderContrasenya(true);
      state.tab = potFer('reserves') ? 'events' : 'events';
      await render();
    } catch (err) {
      renderLogin(err.message + (err.codi === 'credencials' && err.queden ? '' : ''));
    }
  });

  qs('#setup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const email = qs('#st-email').value.trim(), contrasenya = qs('#st-pw').value;
      await gestorPost('setup', { clau: qs('#st-clau').value, nom: qs('#st-nom').value.trim(), email, contrasenya });
      const out = await gestorPost('login', { email, contrasenya });
      clearAuth();
      state.usuari = out.usuari;
      state.gestor = await gestorEstat();
      state.tab = 'usuaris';
      await render();
    } catch (err) { renderLogin(err.message); }
  });

  qs('#legacy-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = basicToken(qs('#login-u').value.trim(), qs('#login-lp').value);
    try {
      const r = await fetch('/api/admin/events', { headers: { Authorization: 'Basic ' + token } });
      if (r.status === 401) {
        const d = await r.json().catch(() => ({}));
        return renderLogin(d.codi === 'acces_antic_tancat' ? d.error : 'Usuari o contrasenya incorrectes.');
      }
      if (!r.ok) return renderLogin(`Error del servidor ${r.status}. Obre /api/health per veure què falla.`);
      setAuth(token);
      state.usuari = { nom: 'Accés compartit', rol: 'admin', antic: true };
      state.tab = 'events';
      await render();
    } catch { renderLogin('No s\'ha pogut connectar amb el servidor.'); }
  });
}

/* Canvi de contrasenya: obligatori amb una de temporal */
function renderContrasenya(obligatori) {
  app.innerHTML = `
${obligatori ? '' : tabsHTML()}
<div class="admin-login">
  <h1>${obligatori ? 'Tria la teva contrasenya' : 'Canviar la contrasenya'}</h1>
  ${obligatori ? '<p class="muted">Has entrat amb una contrasenya temporal. Posa\'n una de teva per continuar.</p>' : ''}
  <div id="pw-msg"></div>
  <form id="pw-form">
    <div class="form-group"><label class="form-label">Contrasenya ${obligatori ? 'temporal' : 'actual'}</label>
      <input class="form-input" id="pw-actual" type="password" required autocomplete="current-password"></div>
    <div class="form-group"><label class="form-label">Nova (mínim 10 caràcters)</label>
      <input class="form-input" id="pw-nova" type="password" minlength="10" required autocomplete="new-password"></div>
    <div class="form-group"><label class="form-label">Repeteix la nova</label>
      <input class="form-input" id="pw-nova2" type="password" minlength="10" required autocomplete="new-password"></div>
    <button class="btn btn-primary btn-block" type="submit">Desar</button>
  </form>
  ${obligatori ? '<button class="btn btn-ghost btn-block mt-3" onclick="logout()">Sortir</button>' : ''}
</div>`;
  qs('#pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (qs('#pw-nova').value !== qs('#pw-nova2').value) {
      qs('#pw-msg').innerHTML = '<div class="alert alert-danger">Les dues contrasenyes noves no coincideixen.</div>'; return;
    }
    try {
      const out = await gestorPost('contrasenya', { actual: qs('#pw-actual').value, nova: qs('#pw-nova').value });
      state.usuari = out.usuari;
      state.tab = 'events';
      await render();
    } catch (err) { qs('#pw-msg').innerHTML = `<div class="alert alert-danger">${esc(err.message)}</div>`; }
  });
}
window.canviarContrasenya = () => renderContrasenya(false);

window.logout = async function() {
  try { await gestorPost('logout'); } catch { /* res */ }
  clearAuth();
  state.usuari = null;
  state.events = []; state.reserves = []; state.auditoria = [];
  state.gestor = await gestorEstat();
  renderLogin('Has tancat la sessió.');
};

/* ── USUARIS (només admin) ─────────────────────────────────── */
async function renderUsuaris(avis) {
  let d;
  try { d = await apiGet('/api/gestor?op=usuaris'); }
  catch (e) {
    if (e instanceof AuthError) throw e;
    app.innerHTML = tabsHTML() + `<div class="alert alert-danger">${esc(errText(e))}</div>`; return;
  }
  const rols = d.rols || {};
  const ROL_AJUDA = {
    admin: 'Tot, inclosos els usuaris.',
    responsable: 'Activitats, reserves, cobraments, passar llista i seguiment.',
    editor: 'Només preparar i editar activitats.'
  };
  const fila = u => `
    <tr${u.actiu ? '' : ' class="muted"'}>
      <td><strong>${esc(u.nom)}</strong>${u.id === state.usuari?.id ? ' <small>(tu)</small>' : ''}</td>
      <td>${esc(u.email)}</td>
      <td>${u.id === state.usuari?.id ? esc(rols[u.rol] || u.rol) : `
        <select onchange="usuariAccio('${esc(u.id)}','rol',this.value)">
          ${Object.entries(rols).map(([k, v]) => `<option value="${k}" ${u.rol === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
        </select>`}</td>
      <td>${!u.actiu ? 'Desactivat' : u.ha_de_canviar ? 'Pendent de primera entrada' : 'Actiu'}</td>
      <td>${u.ultim_acces ? esc(formatDate(u.ultim_acces, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })) : '—'}</td>
      <td class="usr-accions">
        <button class="btn btn-ghost btn-mini" onclick="usuariAccio('${esc(u.id)}','reiniciar')">Nova contrasenya temporal</button>
        ${u.id === state.usuari?.id ? '' : u.actiu
          ? `<button class="btn btn-ghost btn-mini ev-arxivar" onclick="usuariAccio('${esc(u.id)}','desactivar')">Desactivar</button>`
          : `<button class="btn btn-ghost btn-mini" onclick="usuariAccio('${esc(u.id)}','activar')">Activar</button>`}
      </td>
    </tr>`;

  app.innerHTML = `
${tabsHTML()}
<h1>Usuaris del panell</h1>
<p class="muted">Cada persona entra amb el seu correu. L'auditoria registra qui ha fet cada canvi.</p>
${avis || ''}
<table class="admin-table">
  <thead><tr><th>Nom</th><th>Correu</th><th>Rol</th><th>Estat</th><th>Últim accés</th><th></th></tr></thead>
  <tbody>${(d.usuaris || []).map(fila).join('')}</tbody>
</table>

<section class="cob mt-4">
  <h2>Afegir una persona</h2>
  <div id="usr-msg"></div>
  <form id="usr-form" class="cob-grid" style="align-items:end">
    <label class="ins-camp"><span>Nom</span><input class="form-input" id="usr-nom" required></label>
    <label class="ins-camp"><span>Correu</span><input class="form-input" id="usr-email" type="email" required></label>
    <label class="ins-camp"><span>Rol</span>
      <select class="form-select" id="usr-rol">
        ${Object.entries(rols).map(([k, v]) => `<option value="${k}" ${k === 'responsable' ? 'selected' : ''}>${esc(v)}</option>`).join('')}
      </select></label>
    <button class="btn btn-primary" type="submit">Crear</button>
  </form>
  <ul class="form-help">${Object.entries(ROL_AJUDA).map(([k, v]) => `<li><strong>${esc(rols[k] || k)}:</strong> ${esc(v)}</li>`).join('')}</ul>
</section>`;

  qs('#usr-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const out = await gestorPost('usuari', { accio: 'crear', nom: qs('#usr-nom').value.trim(),
        email: qs('#usr-email').value.trim(), rol: qs('#usr-rol').value });
      renderUsuaris(avisTemporal(out.usuari, out.temporal));
    } catch (err) { qs('#usr-msg').innerHTML = `<div class="alert alert-danger">${esc(err.message)}</div>`; }
  });
}

/* La contrasenya temporal es mostra una sola vegada: la web no envia res */
function avisTemporal(u, temporal) {
  return `<div class="alert alert-success">
    <strong>${esc(u.nom)}</strong> ja pot entrar a <code>${esc(location.origin)}/admin</code> amb el correu
    <strong>${esc(u.email)}</strong> i aquesta contrasenya temporal:
    <div class="usr-temporal"><code id="usr-temp">${esc(temporal)}</code>
      <button class="btn btn-secondary btn-mini" onclick="navigator.clipboard?.writeText('${esc(temporal)}')">Copiar</button></div>
    En entrar, haurà de triar-ne una de pròpia. <em>No es tornarà a mostrar.</em>
  </div>`;
}

window.usuariAccio = async function(id, accio, rol) {
  if (accio === 'desactivar' && !confirm('Desactivar aquest usuari? No podrà entrar fins que el tornis a activar.')) return;
  if (accio === 'reiniciar' && !confirm('Generar una contrasenya temporal nova? L\'actual deixarà de funcionar.')) return;
  try {
    const out = await gestorPost('usuari', { accio, id, rol });
    renderUsuaris(out.temporal ? avisTemporal(out.usuari, out.temporal) : '');
  } catch (err) { alert(err.message); renderUsuaris(); }
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
  if (d?.stripe) state.stripe = d.stripe;
}

/* ── Render principal ─────────────────────────────────────── */
async function render() {
  if (!getAuth() && !state.usuari) { renderLogin(); return; }
  try {
    await renderTab();
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.message === 'canviar') return renderContrasenya(true);
      clearAuth();
      state.usuari = null;
      state.gestor = await gestorEstat();
      renderLogin('La sessió ha caducat. Torna a entrar.');
      return;
    }
    app.innerHTML = `<div class="alert alert-danger">${esc(e.message || 'Error inesperat')}</div>`;
  }
}

async function renderTab() {
  if (state.tab === 'events') {
    if (!(await loadEvents())) return;
    if (potFer('reserves')) { try { await loadReserves(null); } catch (e) { if (e instanceof AuthError) throw e; state.reserves = []; } }
    else state.reserves = [];
    renderEvents();
  } else if (state.tab === 'reserves') {
    if (!(await loadEvents())) return;
    await loadReserves(state.eventFilter);
    renderReserves();
  } else if (state.tab === 'usuaris') {
    await renderUsuaris();
  } else if (state.tab === 'seguiment') {
    if (!(await loadEvents())) return;
    await carregaSeguiment();
    renderSeguiment();
  } else if (state.tab === 'llista') {
    if (!(await loadEvents())) return;
    await carregaLlista();
    renderLlista();
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
  const u = state.usuari || {};
  const b = (t, nom) => `<button class="filter-btn ${state.tab === t ? 'active' : ''}" onclick="setTab('${t}')">${nom}</button>`;
  return `
<div class="filters admin-tabs" style="margin-bottom: var(--sp-4);">
  ${b('events', 'Activitats')}
  ${potFer('reserves') ? b('reserves', 'Reserves i cobraments') + b('seguiment', 'Seguiment') + b('llista', 'Passar llista') : ''}
  ${potFer('auditoria') ? b('auditoria', 'Auditoria') : ''}
  ${potFer('usuaris') && !u.antic ? b('usuaris', 'Usuaris') : ''}
  <span class="admin-qui">${esc(u.nom || '')}${u.antic ? '' : ` · <button class="btn-link" onclick="canviarContrasenya()">Contrasenya</button>`}</span>
  <button class="filter-btn" onclick="logout()">Sortir</button>
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
  const foto = window.NX.imatgePublica(ev);

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
        ${potFer('reserves') ? `
        <button class="btn btn-ghost" onclick="viewReserves('${esc(ev.id)}')">Reserves${ocupades ? ` (${ocupades})` : ''}</button>
        <button class="btn btn-ghost" onclick="obrirSeguiment('${esc(ev.id)}')">Seguiment</button>
        <button class="btn btn-ghost" onclick="obrirLlista('${esc(ev.id)}')">Passar llista</button>` : ''}
        ${ev.estat !== 'arxivat' && potFer('esborrar')
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
    ${campImatge('cartell', 'Cartell oficial (centre cívic)', ev.cartell, 'Puja aquí el cartell del centre cívic (vertical). A la web es veu retallat a la mida de les targetes i s\'amplia amb la lupa 🔍.')}
    ${campImatge('imatge', 'Imatge de NexSocial', ev.imatge, 'Foto horitzontal pròpia. Es veu al final de la reserva i, si no hi ha cartell, també a la targeta.')}
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
      cartell: fd.cartell || null,
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

/* Import a cobrar d'una reserva: el que s'hagi fixat al panell o el total */
/* Imports en euros sempre (formatPrice diu "Gratuït" per a 0) */
const eur = c => window.NXC.euros(c || 0);
const aCobrar = r => (r.import_cobrar_cents ?? r.total_cents) || 0;
const reservaViva = r => ['pending', 'confirmed', 'attended', 'no-show'].includes(r.status);
/* Pendent de cobrar: viva, principal (les sessions filles no es cobren
   a part), no pagada i amb import o preu a consultar */
const pendentCobrar = r => reservaViva(r) && !r.pare_id && r.payment_status !== 'paid' && (aCobrar(r) > 0 || r.consultar);

const METODE_NOM = { efectiu: 'Efectiu', bizum: 'Bizum', transferencia: 'Transferència', targeta: 'Targeta', altres: 'Altres' };

function errText(e) {
  try { return JSON.parse(e.message).error || e.message; } catch { return e.message; }
}

function pagamentHTML(r) {
  if (r.pare_id) return '<span class="muted">—</span>';
  if (r.payment_status === 'paid') {
    return `<span class="pag pag--ok">Pagat ${eur(r.import_pagat_cents)}</span>
      <small class="muted">${esc(METODE_NOM[r.metode_pagament] || '')}</small>`;
  }
  const linkViu = r.link_pagament && r.link_caduca && new Date(r.link_caduca) > new Date();
  if (pendentCobrar(r)) {
    return `<span class="pag pag--pendent">${linkViu ? 'Link enviat' : 'Pendent'}${aCobrar(r) ? ' ' + eur(aCobrar(r)) : ''}${r.consultar && !r.import_cobrar_cents ? ' + a consultar' : ''}</span>`;
  }
  return '<span class="muted">—</span>';
}

function renderReserves() {
  const evMap = new Map(state.events.map(e => [e.id, e.titol?.ca || e.id]));
  const filterHTML = state.eventFilter
    ? `<div class="alert alert-info">Filtrant per: <strong>${esc(evMap.get(state.eventFilter) || state.eventFilter)}</strong>
       <button class="btn btn-ghost" style="margin-left: var(--sp-2)" onclick="clearFilter()">Veure totes</button></div>`
    : '';

  const FILTRES = {
    totes:   { nom: 'Totes',              f: () => true },
    cobrar:  { nom: 'Pendents de cobrar', f: pendentCobrar },
    pagades: { nom: 'Pagades',            f: r => r.payment_status === 'paid' },
    espera:  { nom: "Llista d'espera",    f: r => r.status === 'waitlist' }
  };
  const llista = state.reserves.filter(FILTRES[state.filtreReserves]?.f || (() => true));

  const rows = llista.map(r => `
    <tr${state.cobrant === r.id ? ' class="res-oberta"' : ''}>
      <td><code>${esc(r.id)}</code></td>
      <td>${esc(evMap.get(r.event_id) || r.event_id)}</td>
      <td><strong>${esc(r.nom)}</strong></td>
      <td><a href="tel:${esc(r.telefon)}">${esc(r.telefon)}</a></td>
      <td>${r.places}</td>
      <td class="res-detall">${esc(resumLinies(r))}</td>
      <td>${eur(r.total_cents)}${r.consultar ? ' <small class="muted">+ a consultar</small>' : ''}</td>
      <td class="res-pag">${pagamentHTML(r)}
        ${!r.pare_id && reservaViva(r) ? `<button class="btn btn-ghost btn-mini" onclick="obrirCobrament('${esc(r.id)}')">${r.payment_status === 'paid' ? 'Veure' : 'Cobrar'}</button>` : ''}
      </td>
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
  const cobrat = state.reserves.filter(r => r.payment_status === 'paid').reduce((s, r) => s + (r.import_pagat_cents || 0), 0);
  const pendents = state.reserves.filter(pendentCobrar);
  const pendent = pendents.reduce((s, r) => s + aCobrar(r), 0);
  const ambConsultar = pendents.filter(r => r.consultar && !r.import_cobrar_cents).length;

  app.innerHTML = `
${tabsHTML()}
<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--sp-3); gap: var(--sp-2); flex-wrap: wrap;">
  <h1 style="margin:0">Reserves i cobraments</h1>
  <button class="btn btn-secondary" onclick="exportCSV()">⬇ Descarregar CSV</button>
</div>
<p class="muted">${vives.length} reserves actives · ${placesVives} places ocupades · ${enEspera} en llista d'espera</p>
<div class="res-xifres">
  <div><span>Cobrat</span><strong>${eur(cobrat)}</strong></div>
  <div><span>Pendent de cobrar</span><strong>${eur(pendent)}</strong>
    ${ambConsultar ? `<small>+ ${ambConsultar} a consultar</small>` : ''}</div>
  <div><span>Pagament amb targeta</span><strong>${state.stripe === 'off' ? 'No connectat' : state.stripe === 'test' ? 'Mode prova' : 'Actiu'}</strong></div>
</div>
${filterHTML}
<div class="filters" style="margin-bottom: var(--sp-2);">
  ${Object.entries(FILTRES).map(([k, v]) =>
    `<button class="filter-btn ${state.filtreReserves === k ? 'active' : ''}" onclick="filtreReserves('${k}')">${v.nom}${k === 'cobrar' && pendents.length ? ` (${pendents.length})` : ''}</button>`).join('')}
</div>
<div id="cobrament"></div>
<table class="admin-table">
  <thead>
    <tr><th>Ref</th><th>Event</th><th>Nom</th><th>Telèfon</th><th>Places</th><th>Detall</th><th>Total</th><th>Pagament</th><th>Estat</th><th>Data</th></tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="10" style="text-align:center; padding: var(--sp-4)" class="muted">Cap reserva en aquesta vista.</td></tr>'}</tbody>
</table>`;

  if (state.cobrant) renderCobrament();
}

window.filtreReserves = function(f) { state.filtreReserves = f; state.cobrant = null; renderReserves(); };

/* ── PANELL DE COBRAMENT ───────────────────────────────────
   Dues vies: registrar un cobrament fet fora (efectiu, Bizum…) o
   generar un link de pagament amb targeta per enviar-lo nosaltres.
   La web no envia res a ningú. */
window.obrirCobrament = function(id) {
  state.cobrant = state.cobrant === id ? null : id;
  renderReserves();
  qs('#cobrament')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* 600 11 22 33 → 34600112233, per a wa.me */
function telWhatsApp(t) {
  const d = String(t || '').replace(/\D/g, '');
  return d.length === 9 ? '34' + d : d;
}

function renderCobrament() {
  const r = state.reserves.find(x => x.id === state.cobrant);
  const box = qs('#cobrament');
  if (!r || !box) return;
  const ev = state.events.find(e => e.id === r.event_id);
  const titol = ev?.titol?.ca || r.event_id;
  const linkViu = r.link_pagament && r.link_caduca && new Date(r.link_caduca) > new Date();
  const imp = aCobrar(r) - (r.import_pagat_cents || 0);
  const perDefecte = imp > 0 ? (imp / 100).toFixed(2) : '';
  const importLink = r.import_cobrar_cents || aCobrar(r);
  const textWA = `Hola ${r.nom.split(' ')[0]}! Aquí tens l'enllaç per pagar ${titol} (ref. ${r.id}, ${eur(importLink)}): ${r.link_pagament || ''}`;

  box.innerHTML = `
<section class="cob">
  <div class="cob-cap">
    <div>
      <h2>Cobrament · <code>${esc(r.id)}</code></h2>
      <p><strong>${esc(r.nom)}</strong> · <a href="tel:${esc(r.telefon)}">${esc(r.telefon)}</a> · ${esc(titol)}</p>
      <p class="muted">${esc(resumLinies(r))} · Total ${eur(r.total_cents)}${r.consultar ? ' + a consultar' : ''}</p>
    </div>
    <button class="btn btn-ghost" onclick="obrirCobrament('${esc(r.id)}')">Tancar</button>
  </div>
  <div id="cob-msg"></div>

  ${r.payment_status === 'paid' ? `
    <div class="alert alert-success">Pagat <strong>${eur(r.import_pagat_cents)}</strong>
      · ${esc(METODE_NOM[r.metode_pagament] || '')}
      ${r.pagat_at ? ' · ' + esc(formatDate(r.pagat_at, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })) : ''}
    </div>
    ${r.metode_pagament === 'targeta' ? '<p class="form-help">Pagat amb targeta: si cal retornar-lo, fes-ho des del tauler de Stripe i després anul·la aquí el registre.</p>' : ''}
    <button class="btn btn-ghost ev-arxivar" onclick="anularCobrament('${esc(r.id)}')">Anul·lar el registre del cobrament</button>
  ` : `
  <div class="cob-grid">
    <div class="cob-bloc">
      <h3>Ja ha pagat</h3>
      <label class="ins-camp"><span>Import cobrat (€)</span>
        <input class="form-input" id="cob-import" type="number" min="0" step="0.01" value="${perDefecte}"></label>
      <label class="ins-camp"><span>Com</span>
        <select class="form-select" id="cob-metode">
          ${['efectiu', 'bizum', 'transferencia', 'targeta', 'altres'].map(m => `<option value="${m}">${METODE_NOM[m]}${m === 'targeta' ? ' (TPV)' : ''}</option>`).join('')}
        </select></label>
      <label class="ins-camp"><span>Nota (opcional)</span>
        <input class="form-input" id="cob-nota" maxlength="200" placeholder="Ex. pagat al centre cívic"></label>
      <button class="btn btn-primary" onclick="registrarCobrament('${esc(r.id)}')">Registrar cobrament</button>
    </div>

    <div class="cob-bloc">
      <h3>Enviar link de pagament</h3>
      ${state.stripe === 'off' ? `
        <p class="muted">Cal connectar Stripe per generar links (mira <code>STRIPE-SETUP.md</code>). Mentrestant, registra els cobraments a l'esquerra.</p>
      ` : `
        <label class="ins-camp"><span>Import del link (€)</span>
          <input class="form-input" id="link-import" type="number" min="0.5" step="0.01" value="${importLink ? (importLink / 100).toFixed(2) : ''}"></label>
        <button class="btn btn-secondary" onclick="generarLink('${esc(r.id)}')">${linkViu ? 'Generar un link nou' : 'Generar link'}</button>
        ${state.stripe === 'test' ? '<p class="form-help">Stripe en mode prova: el link no cobra de debò.</p>' : ''}
      `}
      ${linkViu ? `
        <div class="cob-link">
          <input class="form-input" id="link-url" readonly value="${esc(r.link_pagament)}">
          <div class="cob-accions">
            <button class="btn btn-secondary" onclick="copiarLink()">Copiar</button>
            <a class="btn btn-secondary" target="_blank" rel="noopener"
               href="https://wa.me/${telWhatsApp(r.telefon)}?text=${encodeURIComponent(textWA)}">Obrir WhatsApp</a>
          </div>
          <p class="form-help">Import ${eur(importLink)} · caduca ${esc(formatDate(r.link_caduca, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', year: undefined }))}.
            Si caduca, la reserva es manté i en pots generar un altre.</p>
        </div>` : ''}
    </div>
  </div>`}
</section>`;
}

async function accioReserva(body) {
  const out = await apiSend('/api/admin/orders', 'PATCH', body);
  if (out?.reserva) {
    const i = state.reserves.findIndex(x => x.id === out.reserva.id);
    if (i >= 0) state.reserves[i] = out.reserva;
  }
  return out;
}

window.registrarCobrament = async function(id) {
  const euros = parseFloat(qs('#cob-import').value);
  if (!(euros >= 0)) { qs('#cob-msg').innerHTML = '<div class="alert alert-danger">Posa l\'import cobrat.</div>'; return; }
  try {
    await accioReserva({ accio: 'pagament', id, import_cents: Math.round(euros * 100),
                         metode: qs('#cob-metode').value, nota: qs('#cob-nota').value.trim() || null });
    renderReserves();
  } catch (e) { qs('#cob-msg').innerHTML = `<div class="alert alert-danger">${esc(errText(e))}</div>`; }
};

window.anularCobrament = async function(id) {
  const motiu = prompt('Per què s\'anul·la? (queda a l\'auditoria)');
  if (motiu === null) return;
  try {
    await accioReserva({ accio: 'anular_pagament', id, motiu: motiu || null });
    renderReserves();
  } catch (e) { qs('#cob-msg').innerHTML = `<div class="alert alert-danger">${esc(errText(e))}</div>`; }
};

window.generarLink = async function(id) {
  const euros = parseFloat(qs('#link-import').value);
  if (!(euros >= 0.5)) { qs('#cob-msg').innerHTML = '<div class="alert alert-danger">L\'import mínim amb targeta és 0,50 €.</div>'; return; }
  qs('#cob-msg').innerHTML = '<div class="alert alert-info">Generant el link…</div>';
  try {
    await accioReserva({ accio: 'link', id, import_cents: Math.round(euros * 100) });
    renderReserves();
  } catch (e) { qs('#cob-msg').innerHTML = `<div class="alert alert-danger">${esc(errText(e))}</div>`; }
};

window.copiarLink = async function() {
  const inp = qs('#link-url');
  try { await navigator.clipboard.writeText(inp.value); }
  catch { inp.select(); document.execCommand?.('copy'); }
  qs('#cob-msg').innerHTML = '<div class="alert alert-success">Link copiat.</div>';
};

window.clearFilter = function() {
  state.eventFilter = null;
  render();
};

window.changeStatus = async function(id, status) {
  try {
    await accioReserva({ id, status });
  } catch (e) { alert('Error: ' + errText(e)); }
};

/* ── EXPORT CSV ────────────────────────────────────────────── */
window.exportCSV = function() {
  const evMap = new Map(state.events.map(e => [e.id, e.titol?.ca || e.id]));
  const cap = ['Ref','Activitat','Data acte','Nom','Telefon','Email','Places','Detall','Total EUR','Pagament','Cobrat EUR','Metode','Data cobrament','Estat','Creada','Confirmada'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const files = state.reserves.map(r => {
    const ev = state.events.find(e => e.id === r.event_id);
    return [
      r.id, evMap.get(r.event_id) || r.event_id, ev?.data || '',
      r.nom, r.telefon, r.email || '', r.places, resumLinies(r),
      ((r.total_cents || 0) / 100).toFixed(2).replace('.', ','),
      PAGAMENT_ESTAT[r.payment_status] || '',
      ((r.import_pagat_cents || 0) / 100).toFixed(2).replace('.', ','),
      METODE_NOM[r.metode_pagament] || '', r.pagat_at || '',
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

/* ── SEGUIMENT ────────────────────────────────────────────────
   Full editable per activitat: una fila per persona, una columna per
   sessió. Les sessions es calculen soles (cada setmana, el mateix dia
   de la setmana que la data de l'activitat) i es poden treure o
   afegir a mà. Cada canvi es desa al moment i queda a l'auditoria.
   "Alta" = confirmada per nosaltres (primer contacte fet). */
const ORIGEN_NOM = { web: 'Web', telefon: 'Trucada', presencial: 'Presencial', altres: 'Altres' };
const pad2 = n => String(n).padStart(2, '0');
const isoDia = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const esPuntual = ev => (ev?.model || 'puntual') === 'puntual';

function sessionsDe(ev, mes) {
  if (!ev) return [];
  const afegides = Array.isArray(ev.sessions_afegides) ? ev.sessions_afegides : [];
  const tretes = new Set(Array.isArray(ev.sessions_tretes) ? ev.sessions_tretes : []);
  const auto = [];
  if (esPuntual(ev)) {
    if (ev.data) auto.push(String(ev.data).slice(0, 10));
  } else if (ev.data && mes) {
    const inici = String(ev.data).slice(0, 10);
    const dow = new Date(inici + 'T12:00:00').getDay();
    const [y, m] = mes.split('-').map(Number);
    for (let d = new Date(y, m - 1, 1, 12); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) {
      const iso = isoDia(d);
      if (d.getDay() === dow && iso >= inici) auto.push(iso);
    }
  }
  const dins = x => esPuntual(ev) || x.startsWith(mes);
  return [...new Set([...auto.filter(x => !tretes.has(x)), ...afegides.filter(dins)])].sort();
}

function mesPerDefecte(ev) {
  const actual = avui().slice(0, 7);
  const inici = String(ev?.data || '').slice(0, 7);
  return inici && inici > actual ? inici : actual;
}
function nomMesLlarg(mes) {
  const [y, m] = mes.split('-').map(Number);
  const t = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1, 12))
    .replace(/\s+(de|del)\s+/i, ' ').replace(/\s+d[’']/i, ' ');   // "setembre del 2026" → "setembre 2026"
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function capSessio(iso) {
  const d = new Date(iso + 'T12:00:00');
  const dia = new Intl.DateTimeFormat('ca-ES', { weekday: 'short' }).format(d).replace('.', '');
  return `${dia} ${d.getDate()}/${d.getMonth() + 1}`;
}

async function carregaSeguiment() {
  const S = state.seguiment;
  S.error = null;
  if (!S.eventId || !state.events.some(e => e.id === S.eventId)) { S.eventId = eventPerDefecte(); S.mes = null; }
  const ev = state.events.find(e => e.id === S.eventId);
  if (!S.mes) S.mes = mesPerDefecte(ev);
  S.assistencia = {};
  if (!ev) { state.reserves = []; return; }
  await loadReserves(ev.id);
  const ss = sessionsDe(ev, S.mes);
  if (!ss.length) return;
  try {
    const d = await apiGet(`/api/admin/orders?llista=${encodeURIComponent(ev.id)}&des=${ss[0]}&fins=${ss[ss.length - 1]}`);
    for (const a of d?.assistencia || []) (S.assistencia[a.reserva_id] ||= {})[a.data] = a.present;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    S.error = 'No es pot llegir l\'assistència. Has executat els SQL v11 i v13?';
  }
}

function dadesSeguiment() {
  const S = state.seguiment;
  const ev = state.events.find(e => e.id === S.eventId);
  const sessions = sessionsDe(ev, S.mes);
  const persones = state.reserves.filter(reservaViva).sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
  const espera = state.reserves.filter(r => r.status === 'waitlist');
  const passades = sessions.filter(d => d <= avui());
  const marca = (r, d) => S.assistencia[r.id]?.[d];
  const gratuita = ev && window.NXC.tarifesEvent(ev).every(t => t.preu_mode === 'gratuit') && !(ev.extres || []).some(x => x.preu_mode !== 'gratuit');
  const cobra = r => !r.pare_id && !gratuita && (aCobrar(r) > 0 || r.consultar);
  const nivell = r => (Array.isArray(r.linies) ? r.linies : []).filter(l => l.tipus === 'tarifa')
    .map(l => `${l.nom?.ca || l.id}${l.qty > 1 ? ' ×' + l.qty : ''}`).join(', ') || (r.pare_id ? 'Sessió vinculada' : '');
  const pctPersona = r => {
    if (!passades.length) return null;
    const si = passades.filter(d => marca(r, d) === true).length;
    return Math.round(si * 100 / passades.length);
  };
  return { S, ev, sessions, persones, espera, passades, marca, gratuita, cobra, nivell, pctPersona };
}

function renderSeguiment() {
  const { S, ev, sessions, persones, espera, passades, marca, gratuita, cobra, nivell, pctPersona } = dadesSeguiment();
  const opcions = state.events.filter(e => e.estat !== 'arxivat')
    .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
    .map(e => `<option value="${esc(e.id)}" ${e.id === S.eventId ? 'selected' : ''}>${esc(e.titol?.ca || e.id)}${e.entitat?.ca ? ' · ' + esc(e.entitat.ca) : ''}</option>`).join('');

  if (!ev) { app.innerHTML = tabsHTML() + '<div class="alert alert-info">Cap activitat per fer seguiment.</div>'; return; }

  const places = persones.reduce((t, r) => t + (r.places || 0), 0);
  const altes = persones.filter(r => r.status !== 'pending').length;
  const hanDePagar = persones.filter(cobra);
  const pagades = hanDePagar.filter(r => r.payment_status === 'paid').length;
  const totalSi = persones.reduce((t, r) => t + passades.filter(d => marca(r, d) === true).length, 0);
  const pctMitja = persones.length && passades.length ? Math.round(totalSi * 100 / (persones.length * passades.length)) : null;

  const celPagat = r => {
    if (!cobra(r)) return `<span class="muted">${r.pare_id ? '—' : 'Gratuït'}</span>`;
    const pagat = r.payment_status === 'paid';
    return `<select class="sg-sel${pagat ? ' sg-pagat' : ''}" onchange="sgPagat('${esc(r.id)}', this.value, this)" aria-label="Pagament de ${esc(r.nom)}">
      <option value="">${r.payment_status === 'pending' ? 'Link enviat' : 'No pagat'}</option>
      ${Object.entries(METODE_NOM).map(([k, v]) => `<option value="${k}" ${pagat && r.metode_pagament === k ? 'selected' : ''}>✓ ${v}</option>`).join('')}
    </select>${pagat ? `<small class="sg-import">${eur(r.import_pagat_cents)}</small>` : aCobrar(r) ? `<small class="sg-import">${eur(aCobrar(r))}</small>` : ''}`;
  };
  const celSessio = (r, d) => {
    const m = marca(r, d);
    const txt = m === true ? '✓' : m === false ? '✗' : '';
    return `<td class="sg-ses"><button class="sg-marca${m === true ? ' si' : m === false ? ' no' : ''}"
      onclick="sgMarca('${esc(r.id)}','${d}')" aria-label="${esc(r.nom)} ${capSessio(d)}: ${m === true ? 'ha vingut' : m === false ? 'no ha vingut' : 'sense marcar'}">${txt}</button></td>`;
  };

  const fila = (r, i) => `
  <tr>
    <td class="sg-num">${i + 1}</td>
    <td><input class="sg-in sg-nom" value="${esc(r.nom)}" onchange="sgEditar('${esc(r.id)}','nom',this.value)" aria-label="Nom"></td>
    <td><input class="sg-in sg-tel" value="${esc(r.telefon || '')}" inputmode="tel" onchange="sgEditar('${esc(r.id)}','telefon',this.value)" aria-label="Telèfon de ${esc(r.nom)}"></td>
    <td class="sg-nivell">${esc(nivell(r))}</td>
    <td><select class="sg-sel sg-origen" onchange="sgEditar('${esc(r.id)}','origen',this.value)" aria-label="Origen">
      ${Object.entries(ORIGEN_NOM).map(([k, v]) => `<option value="${k}" ${(r.origen || 'web') === k ? 'selected' : ''}>${v}</option>`).join('')}
    </select></td>
    <td class="sg-check"><input type="checkbox" ${r.status !== 'pending' ? 'checked' : ''} ${['attended', 'no-show'].includes(r.status) ? 'disabled' : ''}
      onchange="sgAlta('${esc(r.id)}', this.checked)" aria-label="Alta de ${esc(r.nom)}"></td>
    <td class="sg-pag">${celPagat(r)}</td>
    ${sessions.map(d => celSessio(r, d)).join('')}
    <td class="sg-pct">${pctPersona(r) === null ? '—' : pctPersona(r) + '%'}</td>
    <td><input class="sg-in sg-obs" value="${esc(r.observacions || '')}" onchange="sgEditar('${esc(r.id)}','observacions',this.value)" aria-label="Observacions de ${esc(r.nom)}"></td>
  </tr>`;

  app.innerHTML = `
${tabsHTML()}
<div class="sg-cap no-print">
  <h1 style="margin:0">Seguiment</h1>
  <div class="sg-accions">
    <button class="btn btn-primary" onclick="sgObrirAfegir()">+ Afegir persona</button>
    <button class="btn btn-secondary" onclick="sgExcel()">⬇ Excel</button>
    <button class="btn btn-secondary" onclick="sgImprimir(false)">🖨 Imprimir</button>
    <button class="btn btn-ghost" onclick="sgImprimir(true)">🖨 Full en blanc</button>
  </div>
</div>
<div class="sg-selectors no-print">
  <label class="ins-camp"><span>Activitat</span>
    <select class="form-select" onchange="sgEvent(this.value)">${opcions}</select></label>
  ${esPuntual(ev) ? '' : `
  <div class="ins-camp"><span>Mes</span>
    <div class="sg-mes">
      <button class="btn btn-ghost" onclick="sgMes(-1)" aria-label="Mes anterior">◀</button>
      <strong>${esc(nomMesLlarg(S.mes))}</strong>
      <button class="btn btn-ghost" onclick="sgMes(1)" aria-label="Mes següent">▶</button>
    </div></div>`}
  <label class="ins-camp"><span>Afegir sessió</span>
    <span class="sg-mes"><input class="form-input" type="date" id="sg-nova-data">
    <button class="btn btn-secondary" onclick="sgSessio(qs('#sg-nova-data').value,'afegir')">Afegir</button></span></label>
</div>
${S.error ? `<div class="alert alert-warning">${esc(S.error)}</div>` : ''}
<div id="sg-afegir"></div>

<div class="sg-print-cap">
  <h2>${esc(ev.titol?.ca || ev.id)}${ev.entitat?.ca ? ' · ' + esc(ev.entitat.ca) : ''}</h2>
  <p>${esPuntual(ev) ? esc(formatDate(ev.data, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) : esc(nomMesLlarg(S.mes))}${ev.hora ? ' · ' + esc(ev.hora) : ''}
    · Aforament ${places}/${ev.cupo || '—'}</p>
</div>

<div class="res-xifres no-print">
  <div><span>Aforament</span><strong>${places} / ${ev.cupo || '—'}</strong>${ev.cupo ? `<small>${Math.round(places * 100 / ev.cupo)}% ocupat</small>` : ''}</div>
  <div><span>Alta confirmada</span><strong>${altes} / ${persones.length}</strong></div>
  <div><span>Pagades</span><strong>${gratuita ? 'Gratuïta' : `${pagades} / ${hanDePagar.length}`}</strong></div>
  <div><span>Assistència ${esPuntual(ev) ? '' : 'del mes'}</span><strong>${pctMitja === null ? '—' : pctMitja + '%'}</strong>
    <small>${passades.length} de ${sessions.length} sessions fetes</small></div>
</div>

<div class="sg-taula-wrap">
<table class="admin-table sg-taula">
  <thead><tr>
    <th>#</th><th>Nom</th><th>Telèfon</th><th>Nivell</th><th>Origen</th><th>Alta</th><th>Pagat</th>
    ${sessions.map(d => `<th class="sg-ses">${capSessio(d)}<button class="sg-treure no-print" onclick="sgSessio('${d}','treure')" aria-label="Treure la sessió del ${capSessio(d)}">×</button></th>`).join('')}
    <th>Assist.</th><th>Observacions</th>
  </tr></thead>
  <tbody>${persones.map(fila).join('') || `<tr><td colspan="${9 + sessions.length}" class="muted" style="text-align:center">Cap persona apuntada. Fes servir “+ Afegir persona”.</td></tr>`}</tbody>
</table>
</div>
${sessions.length ? '' : '<p class="muted no-print">Aquest mes no hi ha cap sessió. Afegeix-ne una amb la data.</p>'}

${espera.length ? `
<h3>Llista d'espera (${espera.length})</h3>
<ul class="ll-espera">${espera.map(r => `<li>${esc(r.nom)} · ${esc(r.telefon || '—')} · ${r.places} pl. · ${esc(ORIGEN_NOM[r.origen] || '')}
  <button class="btn btn-ghost btn-mini no-print" onclick="sgDeEspera('${esc(r.id)}')">Passar a inscrita</button></li>`).join('')}</ul>` : ''}

<div class="sg-print-peu">Responsable: ______________________________ &nbsp;&nbsp; Signatura: ____________________ &nbsp;&nbsp; Data: ____________</div>`;
}

window.obrirSeguiment = function(eventId) {
  state.seguiment = { eventId, mes: null, assistencia: {} };
  setTab('seguiment');
};
window.sgEvent = function(id) { state.seguiment = { eventId: id, mes: null, assistencia: {} }; render(); };
window.sgMes = function(delta) {
  const [y, m] = state.seguiment.mes.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1, 12);
  state.seguiment.mes = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  render();
};

/* Cicle d'una casella: buit → ✓ → ✗ → buit */
window.sgMarca = async function(id, data) {
  const S = state.seguiment;
  const abans = S.assistencia[id]?.[data];
  const nou = abans === undefined ? true : abans === true ? false : null;
  (S.assistencia[id] ||= {});
  if (nou === null) delete S.assistencia[id][data]; else S.assistencia[id][data] = nou;
  renderSeguiment();
  try {
    await apiSend('/api/admin/orders', 'PATCH', { accio: 'assistencia', id, data, present: nou });
  } catch (e) {
    if (abans === undefined) delete S.assistencia[id][data]; else S.assistencia[id][data] = abans;
    renderSeguiment();
    alert('No s\'ha pogut desar: ' + errText(e));
  }
};

window.sgEditar = async function(id, camp, valor) {
  try {
    await accioReserva({ accio: 'editar', id, camps: { [camp]: valor } });
  } catch (e) { alert('No s\'ha pogut desar: ' + errText(e)); }
  renderSeguiment();
};

window.sgAlta = async function(id, alta) {
  try { await accioReserva({ id, status: alta ? 'confirmed' : 'pending' }); }
  catch (e) { alert('No s\'ha pogut desar: ' + errText(e)); }
  renderSeguiment();
};

window.sgDeEspera = async function(id) {
  try { await accioReserva({ id, status: 'pending' }); }
  catch (e) { alert('No s\'ha pogut desar: ' + errText(e)); }
  renderSeguiment();
};

/* Pagat: triar un mètode registra el cobrament; "No pagat" l'anul·la */
window.sgPagat = async function(id, metode, sel) {
  const r = state.reserves.find(x => x.id === id);
  if (!r) return;
  try {
    if (!metode) {
      if (r.payment_status !== 'paid') return;
      if (!confirm(`Anul·lar el cobrament de ${r.nom}?`)) { renderSeguiment(); return; }
      await accioReserva({ accio: 'anular_pagament', id, motiu: 'desmarcat al seguiment' });
    } else {
      let imp = aCobrar(r) - (r.payment_status === 'paid' ? 0 : (r.import_pagat_cents || 0));
      if (r.payment_status === 'paid') imp = r.import_pagat_cents || aCobrar(r);
      if (!(imp > 0)) {
        const t = prompt(`Import cobrat a ${r.nom} (€):`, '');
        if (t === null) { renderSeguiment(); return; }
        imp = Math.round((parseFloat(String(t).replace(',', '.')) || 0) * 100);
      }
      await accioReserva({ accio: 'pagament', id, import_cents: imp, metode, nota: 'seguiment' });
    }
  } catch (e) { alert('No s\'ha pogut desar: ' + errText(e)); }
  renderSeguiment();
};

window.sgSessio = async function(data, operacio) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) { alert('Tria una data.'); return; }
  const S = state.seguiment;
  const ev = state.events.find(e => e.id === S.eventId);
  if (operacio === 'treure') {
    const amb = Object.values(S.assistencia).some(a => a[data] !== undefined);
    if (!confirm(`Treure la sessió del ${capSessio(data)}?${amb ? ' Les marques d\'assistència d\'aquell dia es conserven però no es veuran.' : ''}`)) return;
  }
  try {
    const out = await apiSend('/api/admin/orders', 'PATCH', { accio: 'sessio', event_id: ev.id, data, operacio });
    ev.sessions_afegides = out.sessions_afegides;
    ev.sessions_tretes = out.sessions_tretes;
    if (operacio === 'afegir' && !esPuntual(ev)) S.mes = data.slice(0, 7);
    render();
  } catch (e) { alert('No s\'ha pogut desar: ' + errText(e)); }
};

/* Alta manual: per a qui truca al centre o s'apunta en persona */
window.sgObrirAfegir = function() {
  const ev = state.events.find(e => e.id === state.seguiment.eventId);
  const tarifes = window.NXC.tarifesEvent(ev);
  qs('#sg-afegir').innerHTML = `
<section class="cob">
  <div class="cob-cap"><h2>Afegir persona</h2>
    <button class="btn btn-ghost" onclick="qs('#sg-afegir').innerHTML=''">Tancar</button></div>
  <div id="sg-af-msg"></div>
  <form id="sg-af-form" class="cob-grid" style="align-items:end">
    <label class="ins-camp"><span>Nom i cognoms *</span><input class="form-input" id="af-nom" required minlength="2"></label>
    <label class="ins-camp"><span>Telèfon</span><input class="form-input" id="af-tel" inputmode="tel"></label>
    <label class="ins-camp"><span>Correu</span><input class="form-input" id="af-email" type="email"></label>
    ${tarifes.length > 1 ? `<label class="ins-camp"><span>Nivell</span><select class="form-select" id="af-tarifa">
      ${tarifes.map(t => `<option value="${esc(t.id)}">${esc(t.nom?.ca || t.id)}</option>`).join('')}</select></label>` : ''}
    <label class="ins-camp"><span>Places</span><input class="form-input" id="af-places" type="number" min="1" max="10" value="1"></label>
    <label class="ins-camp"><span>Com ha arribat</span><select class="form-select" id="af-origen">
      <option value="telefon">Trucada</option><option value="presencial">Presencial al centre</option><option value="altres">Altres</option></select></label>
    <label class="ins-camp"><span>Observacions</span><input class="form-input" id="af-obs"></label>
    <label class="ins-camp sg-alta-check"><span>Alta confirmada</span><input type="checkbox" id="af-alta" checked></label>
    <button class="btn btn-primary" type="submit">Afegir</button>
  </form>
</section>`;
  qs('#af-nom').focus();
  qs('#sg-af-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const out = await apiSend('/api/admin/orders', 'PATCH', {
        accio: 'afegir_persona', event_id: ev.id,
        nom: qs('#af-nom').value.trim(), telefon: qs('#af-tel').value.trim(), email: qs('#af-email').value.trim(),
        tarifa_id: qs('#af-tarifa')?.value || tarifes[0].id, places: parseInt(qs('#af-places').value, 10) || 1,
        origen: qs('#af-origen').value, alta: qs('#af-alta').checked, observacions: qs('#af-obs').value.trim()
      });
      state.reserves.push(out.reserva);
      renderSeguiment();
      if (out.espera) alert(`${out.reserva.nom} ha quedat a la llista d'espera: l'activitat no té places lliures.`);
    } catch (err) { qs('#sg-af-msg').innerHTML = `<div class="alert alert-danger">${esc(errText(err))}</div>`; }
  });
};

/* Excel amb les mateixes columnes que la pantalla */
window.sgExcel = function() {
  const { S, ev, sessions, persones, espera, marca, cobra, nivell, pctPersona } = dadesSeguiment();
  const cap = ['#', 'Nom', 'Telèfon', 'Correu', 'Nivell', 'Places', 'Origen', 'Alta', 'Pagat', 'Import', 'Mètode',
               ...sessions.map(capSessio), 'Assistència %', 'Observacions', 'Referència'];
  const files = persones.map((r, i) => [
    i + 1, r.nom, r.telefon || '', r.email || '', nivell(r), r.places, ORIGEN_NOM[r.origen] || '',
    r.status !== 'pending' ? 'Sí' : 'No',
    !cobra(r) ? 'No cal' : r.payment_status === 'paid' ? 'Sí' : 'No',
    r.payment_status === 'paid' ? (r.import_pagat_cents || 0) / 100 : cobra(r) ? aCobrar(r) / 100 : null,
    r.payment_status === 'paid' ? METODE_NOM[r.metode_pagament] || '' : '',
    ...sessions.map(d => marca(r, d) === true ? '✓' : marca(r, d) === false ? '✗' : ''),
    pctPersona(r), r.observacions || '', r.id
  ]);
  const titol = `${ev.titol?.ca || ev.id}${ev.entitat?.ca ? ' · ' + ev.entitat.ca : ''}`;
  const periode = esPuntual(ev) ? String(ev.data || '') : nomMesLlarg(S.mes);
  const fulls = [{
    nom: 'Seguiment', capcaleres: 1,
    amplades: [4, 28, 13, 26, 16, 7, 11, 6, 8, 8, 13, ...sessions.map(() => 9), 12, 34, 12],
    files: [cap, ...files]
  }, {
    nom: 'Resum', capcaleres: 0, amplades: [22, 40],
    files: [['Activitat', titol], ['Període', periode], ['Aforament', `${persones.reduce((t, r) => t + r.places, 0)} / ${ev.cupo || ''}`],
            ['Persones inscrites', persones.length], ["Llista d'espera", espera.length],
            ['Exportat', new Date().toLocaleString('ca-ES')], ['Per', state.usuari?.nom || '']]
  }];
  const nomFitxer = `seguiment-${ev.id}-${esPuntual(ev) ? (ev.data || '') : S.mes}.xlsx`;
  window.NXXLSX.descarregar(nomFitxer, fulls);
};

/* A4 horitzontal. "Full en blanc": només noms i caselles, per marcar a mà */
window.sgImprimir = function(blanc) {
  let st = document.getElementById('pagina-print');
  if (!st) { st = document.createElement('style'); st.id = 'pagina-print'; document.head.appendChild(st); }
  st.textContent = '@page { size: A4 landscape; margin: 10mm; }';
  document.body.classList.add('imprimint-seguiment');
  document.body.classList.toggle('print-blanc', !!blanc);
  const fi = () => {
    document.body.classList.remove('imprimint-seguiment', 'print-blanc');
    st.textContent = '';
    window.removeEventListener('afterprint', fi);
  };
  window.addEventListener('afterprint', fi);
  window.print();
};

/* ── PASSAR LLISTA ────────────────────────────────────────────
   Per activitat i per dia: a les mensuals (castellà cada dimarts) es
   passa llista cada sessió. A les puntuals, marcar el dia de l'activitat
   també canvia l'estat de la reserva a "Va assistir" / "No va venir". */
function eventPerDefecte() {
  const vius = state.events.filter(e => e.estat !== 'arxivat');
  const futurs = vius.filter(e => (e.data || '') >= avui()).sort((a, b) => a.data.localeCompare(b.data));
  return (futurs[0] || vius[0])?.id || null;
}

function dataPerDefecte(ev) {
  if (!ev) return avui();
  if ((ev.model || 'puntual') === 'puntual' && ev.data) return ev.data;
  return avui();
}

async function carregaLlista() {
  const L = state.llista;
  L.error = null;
  if (!L.eventId || !state.events.some(e => e.id === L.eventId)) {
    L.eventId = eventPerDefecte();
    L.data = null;
  }
  const ev = state.events.find(e => e.id === L.eventId);
  if (!L.data) L.data = dataPerDefecte(ev);
  L.assistencia = {};
  if (!L.eventId) { state.reserves = []; return; }
  await loadReserves(L.eventId);
  try {
    const d = await apiGet(`/api/admin/orders?llista=${encodeURIComponent(L.eventId)}&data=${L.data}`);
    for (const a of d?.assistencia || []) L.assistencia[a.reserva_id] = a.present;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    L.error = 'No es pot llegir l\'assistència. Has executat api/schema-v11-control.sql?';
  }
}

function renderLlista() {
  const L = state.llista;
  const ev = state.events.find(e => e.id === L.eventId);
  const actius = state.reserves.filter(reservaViva).sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
  const espera = state.reserves.filter(r => r.status === 'waitlist');
  const marca = r => L.assistencia[r.id];
  const han = actius.filter(r => marca(r) === true);
  const no = actius.filter(r => marca(r) === false);
  const places = rs => rs.reduce((s, r) => s + (r.places || 0), 0);

  const opcions = state.events
    .filter(e => e.estat !== 'arxivat')
    .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
    .map(e => `<option value="${esc(e.id)}" ${e.id === L.eventId ? 'selected' : ''}>${esc(e.data || '—')} · ${esc(e.titol?.ca || e.id)}${e.entitat?.ca ? ' · ' + esc(e.entitat.ca) : ''}</option>`).join('');

  const fila = r => {
    const m = marca(r);
    return `
    <li class="ll-fila${m === true ? ' ll-fila--si' : m === false ? ' ll-fila--no' : ''}">
      <div class="ll-qui">
        <strong>${esc(r.nom)}</strong>${r.places > 1 ? ` <span class="ll-places">× ${r.places}</span>` : ''}
        <div class="muted">${esc(resumLinies(r))} · <a href="tel:${esc(r.telefon)}">${esc(r.telefon)}</a></div>
        <div class="ll-pag">${pagamentHTML(r)}</div>
      </div>
      <div class="ll-botons">
        <button class="ll-btn ll-btn--si" aria-pressed="${m === true}" onclick="marcaAssistencia('${esc(r.id)}', ${m === true ? 'null' : 'true'})">✔ Ha vingut</button>
        <button class="ll-btn ll-btn--no" aria-pressed="${m === false}" onclick="marcaAssistencia('${esc(r.id)}', ${m === false ? 'null' : 'false'})">✗ No ha vingut</button>
      </div>
      <span class="ll-print-casella" aria-hidden="true"></span>
    </li>`;
  };

  app.innerHTML = `
${tabsHTML()}
<div class="ll-cap">
  <h1 style="margin:0">Passar llista</h1>
  <button class="btn btn-secondary no-print" onclick="window.print()">🖨 Imprimir</button>
</div>
<div class="ll-selectors no-print">
  <label class="ins-camp"><span>Activitat</span>
    <select class="form-select" onchange="llistaEvent(this.value)">${opcions || '<option>Cap activitat</option>'}</select></label>
  <label class="ins-camp"><span>Dia</span>
    <input class="form-input" type="date" value="${esc(L.data || '')}" onchange="llistaData(this.value)"></label>
</div>
${L.error ? `<div class="alert alert-warning">${esc(L.error)}</div>` : ''}
${ev ? `
<h2 class="ll-titol">${esc(ev.titol?.ca || ev.id)} · ${esc(formatDate(L.data, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</h2>
<p class="ll-resum">
  <strong>${actius.length}</strong> reserves (${places(actius)} places) ·
  <span class="ll-si">${han.length} han vingut</span> ·
  <span class="ll-no">${no.length} no</span> ·
  ${actius.length - han.length - no.length} sense marcar
</p>
<ul class="ll-llista">${actius.map(fila).join('') || '<li class="muted">Cap reserva activa.</li>'}</ul>
${espera.length ? `
  <h3>Llista d'espera (${espera.length})</h3>
  <ul class="ll-espera">${espera.map(r => `<li>${esc(r.nom)} · <a href="tel:${esc(r.telefon)}">${esc(r.telefon)}</a> · ${r.places} pl.</li>`).join('')}</ul>` : ''}
` : '<div class="alert alert-info">Cap activitat per passar llista.</div>'}`;
}

window.obrirLlista = function(eventId) {
  state.llista = { eventId, data: null, assistencia: {} };
  setTab('llista');
};
window.llistaEvent = function(id) {
  state.llista = { eventId: id, data: null, assistencia: {} };
  render();
};
window.llistaData = function(d) {
  if (!d) return;
  state.llista.data = d;
  render();
};

/* Resposta immediata a la pantalla; si el servidor falla, es desfà */
window.marcaAssistencia = async function(id, present) {
  const L = state.llista;
  const abans = L.assistencia[id];
  if (present === null) delete L.assistencia[id]; else L.assistencia[id] = present;
  renderLlista();
  try {
    await apiSend('/api/admin/orders', 'PATCH', { accio: 'assistencia', id, data: L.data, present });
  } catch (e) {
    if (abans === undefined) delete L.assistencia[id]; else L.assistencia[id] = abans;
    renderLlista();
    alert('No s\'ha pogut desar: ' + errText(e));
  }
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

// Boot: sessió d'usuari, accés compartit guardat o pantalla d'entrada
(async function boot() {
  state.gestor = await gestorEstat();
  if (state.gestor?.usuari) {
    state.usuari = state.gestor.usuari;
    if (state.usuari.ha_de_canviar) return renderContrasenya(true);
    return render();
  }
  if (getAuth() && (state.gestor?.acces_antic || !state.gestor?.gestor)) {
    state.usuari = { nom: 'Accés compartit', rol: 'admin', antic: true };
    return render();
  }
  clearAuth();
  renderLogin();
})();

})();

/* main.js — Comunitat NexSocial · nucli
   ────────────────────────────────────────
   i18n CA/ES, nav, footer, helpers globals. */

/* ── Traduccions ──────────────────────────────────────────── */
const i18n = {
  ca: {
    'nav.inici':       'Inici',
    'nav.agenda':      'Agenda',
    'nav.recursos':    'Recursos',
    'nav.passatemps':  'Passatemps',
    'nav.web':         'NexSocial',

    'hero.title':      'Comunitat NexSocial',
    'hero.sub':        'Activitats, trobades i recursos per seguir fent vida.',

    'qb.agenda':       'Agenda',
    'qb.agenda.desc':  "Què fem aquesta setmana i el mes que ve",
    'qb.tallers':      'Tallers',
    'qb.tallers.desc': 'Aprèn coses noves als casals del barri',
    'qb.recursos':     'Recursos',
    'qb.recursos.desc': 'Guies i vídeos útils per al dia a dia',
    'qb.passatemps':   'Passatemps',
    'qb.passatemps.desc': 'Jocs per despertar la memòria',

    'agenda.title':    'Agenda',
    'agenda.sub':      'Totes les activitats, tallers i esdeveniments de Comunitat NexSocial.',
    'filter.all':      'Totes',
    'filter.mensual':  'Activitats mensuals',
    'filter.taller':   'Tallers',
    'filter.esdev':    'Esdeveniments',
    'filter.empty':    "No hi ha activitats amb aquest filtre ara mateix.",

    'ev.reservar':     'Reservar plaça',
    'ev.inscriure':    "M'hi apunto",
    'ev.gratis':       'Gratuït',
    'ev.places':       'places disponibles',
    'ev.ultimes':      'Últimes places!',
    'ev.esgotat':      'Ple',
    'ev.data':         'Data',
    'ev.hora':         'Hora',
    'ev.lloc':         'Lloc',
    'ev.entitat':      'Organitza',
    'ev.durada':       'Durada',
    'ev.preu':         'Preu',
    'ev.desc':         'Descripció',
    'ev.como_llegar':  'Com arribar-hi',
    'ev.abrir_mapa':   'Obrir a Google Maps',
    'ev.tornar':       '← Tornar a l\'agenda',
    'ev.no_trobat':    "No hem trobat aquesta activitat.",

    'form.title':      'Reservar plaça',
    'form.sub':        "Només et cal el nom i el telèfon. Res de comptes ni contrasenyes.",
    'form.nom':        'Nom i cognoms',
    'form.tel':        'Telèfon',
    'form.email':      "Correu (opcional)",
    'form.places':     'Nombre de places',
    'form.notes':      'Vols dir-nos alguna cosa? (opcional)',
    'form.legal':      'En reservar acceptes que et contactem per confirmar la plaça. No compartim les teves dades amb ningú.',
    'form.enviar':     'Confirmar la reserva',
    'form.enviant':    'Enviant…',
    'form.error':      "Hi ha algun camp sense omplir. Revisa'l, si us plau.",
    'form.error_tel':  "El telèfon ha de ser vàlid (9 xifres).",
    'form.error_srv':  "No hem pogut enviar la reserva. Torna a provar-ho o truca'ns.",

    'phone.text':      "Prefereixes reservar per telèfon? Truca'ns:",
    'phone.hours':     'De dilluns a divendres, 9 a 14h',

    'conf.title':      'Reserva confirmada!',
    'conf.desc':       "Ja t'hem apuntat. Rebràs una trucada nostra per confirmar la plaça.",
    'conf.ref':        'Número de reserva:',
    'conf.back':       "Tornar a l'agenda",

    'recursos.title':  'Recursos i consells',
    'recursos.sub':    "Guies senzilles, vídeos i idees per al dia a dia. Si necessites ajuda, truca'ns.",

    'passatemps.title': 'Passatemps',
    'passatemps.sub':   'Jocs per activar la ment. Aviat en tindrem molts més!',
    'passatemps.soon':  'Estem preparant aquesta secció. Aviat trobaràs jocs de memòria, buscar les diferències, sopa de lletres i altres passatemps pensats per divertir-se i mantenir la ment desperta.',

    'footer.desc':     'Espai digital de vida comunitària de NexSocial SCCL. Acompanyament sociovital a Badalona.',
    'footer.enllaços': 'Enllaços',
    'footer.contacte': 'Contacte',
    'footer.privacy':  'Privacitat',
    'footer.legal':    'Avís legal',
    'footer.copy':     '© 2026 NexSocial SCCL · NIF F-27641133 · Badalona',
  },
  es: {
    'nav.inici':       'Inicio',
    'nav.agenda':      'Agenda',
    'nav.recursos':    'Recursos',
    'nav.passatemps':  'Pasatiempos',
    'nav.web':         'NexSocial',

    'hero.title':      'Comunitat NexSocial',
    'hero.sub':        'Actividades, encuentros y recursos para seguir haciendo vida.',

    'qb.agenda':       'Agenda',
    'qb.agenda.desc':  'Qué hacemos esta semana y el mes que viene',
    'qb.tallers':      'Talleres',
    'qb.tallers.desc': 'Aprende cosas nuevas en los casales del barrio',
    'qb.recursos':     'Recursos',
    'qb.recursos.desc': 'Guías y vídeos útiles para el día a día',
    'qb.passatemps':   'Pasatiempos',
    'qb.passatemps.desc': 'Juegos para despertar la memoria',

    'agenda.title':    'Agenda',
    'agenda.sub':      'Todas las actividades, talleres y eventos de Comunitat NexSocial.',
    'filter.all':      'Todas',
    'filter.mensual':  'Actividades mensuales',
    'filter.taller':   'Talleres',
    'filter.esdev':    'Eventos',
    'filter.empty':    'No hay actividades con este filtro ahora mismo.',

    'ev.reservar':     'Reservar plaza',
    'ev.inscriure':    'Me apunto',
    'ev.gratis':       'Gratuito',
    'ev.places':       'plazas disponibles',
    'ev.ultimes':      '¡Últimas plazas!',
    'ev.esgotat':      'Completo',
    'ev.data':         'Fecha',
    'ev.hora':         'Hora',
    'ev.lloc':         'Lugar',
    'ev.entitat':      'Organiza',
    'ev.durada':       'Duración',
    'ev.preu':         'Precio',
    'ev.desc':         'Descripción',
    'ev.como_llegar':  'Cómo llegar',
    'ev.abrir_mapa':   'Abrir en Google Maps',
    'ev.tornar':       '← Volver a la agenda',
    'ev.no_trobat':    'No hemos encontrado esta actividad.',

    'form.title':      'Reservar plaza',
    'form.sub':        'Solo necesitas el nombre y el teléfono. Nada de cuentas ni contraseñas.',
    'form.nom':        'Nombre y apellidos',
    'form.tel':        'Teléfono',
    'form.email':      'Correo (opcional)',
    'form.places':     'Número de plazas',
    'form.notes':      '¿Quieres decirnos algo? (opcional)',
    'form.legal':      'Al reservar aceptas que te contactemos para confirmar la plaza. No compartimos tus datos con nadie.',
    'form.enviar':     'Confirmar la reserva',
    'form.enviant':    'Enviando…',
    'form.error':      'Hay algún campo sin rellenar. Revísalo, por favor.',
    'form.error_tel':  'El teléfono debe ser válido (9 cifras).',
    'form.error_srv':  'No hemos podido enviar la reserva. Vuelve a intentarlo o llámanos.',

    'phone.text':      '¿Prefieres reservar por teléfono? Llámanos:',
    'phone.hours':     'De lunes a viernes, 9 a 14h',

    'conf.title':      '¡Reserva confirmada!',
    'conf.desc':       'Ya te hemos apuntado. Recibirás una llamada nuestra para confirmar la plaza.',
    'conf.ref':        'Número de reserva:',
    'conf.back':       'Volver a la agenda',

    'recursos.title':  'Recursos y consejos',
    'recursos.sub':    'Guías sencillas, vídeos e ideas para el día a día. Si necesitas ayuda, llámanos.',

    'passatemps.title': 'Pasatiempos',
    'passatemps.sub':   'Juegos para activar la mente. ¡Pronto tendremos muchos más!',
    'passatemps.soon':  'Estamos preparando esta sección. Pronto encontrarás juegos de memoria, buscar las diferencias, sopa de letras y otros pasatiempos pensados para divertirse y mantener la mente despierta.',

    'footer.desc':     'Espacio digital de vida comunitaria de NexSocial SCCL. Acompañamiento sociovital en Badalona.',
    'footer.enllaços': 'Enlaces',
    'footer.contacte': 'Contacto',
    'footer.privacy':  'Privacidad',
    'footer.legal':    'Aviso legal',
    'footer.copy':     '© 2026 NexSocial SCCL · NIF F-27641133 · Badalona',
  }
};

const MAIN_SITE = 'https://nexsocial.org';
const PHONE = '900 000 000';       // TODO: substituir per telèfon real
const PHONE_TEL = '900000000';
const WHATSAPP = '34600000000';    // TODO: substituir per WhatsApp real

/* ── Getter idioma ────────────────────────────────────────── */
function getLang() {
  return localStorage.getItem('nx-lang') || 'ca';
}
function setLang(lang) {
  if (!['ca', 'es'].includes(lang)) return;
  localStorage.setItem('nx-lang', lang);
  document.documentElement.lang = lang;
  location.reload();
}
function T(key) {
  return (i18n[getLang()] || i18n.ca)[key] || key;
}
function L(obj) {
  if (!obj) return '';
  const lang = getLang();
  return obj[lang] || obj.ca || obj.es || '';
}

/* ── HTML NAV ─────────────────────────────────────────────── */
function buildNav() {
  const lang = getLang();
  const path = location.pathname;
  const isActive = (p) => path === p || path.endsWith(p) ? 'active' : '';
  return `
<nav class="nav" aria-label="Menú principal">
  <div class="nav-inner">
    <a href="/" class="nav-logo" aria-label="Comunitat NexSocial · Inici">
      <svg viewBox="0 0 100 100" width="44" height="44" fill="currentColor" style="color: var(--forest); flex-shrink: 0">
        <circle cx="50" cy="12" r="2.5"/><circle cx="65" cy="15" r="2"/><circle cx="78" cy="24" r="2.2"/>
        <circle cx="86" cy="37" r="2"/><circle cx="88" cy="52" r="2.5"/><circle cx="84" cy="66" r="2"/>
        <circle cx="75" cy="78" r="2.3"/><circle cx="62" cy="85" r="2"/><circle cx="48" cy="87" r="2.5"/>
        <circle cx="34" cy="85" r="2"/><circle cx="22" cy="78" r="2.2"/><circle cx="14" cy="66" r="2"/>
        <circle cx="11" cy="52" r="2.5"/><circle cx="13" cy="37" r="2"/><circle cx="21" cy="24" r="2.2"/>
        <circle cx="34" cy="15" r="2"/>
        <circle cx="50" cy="28" r="1.8" opacity="0.6"/><circle cx="66" cy="34" r="1.8" opacity="0.6"/>
        <circle cx="72" cy="50" r="1.8" opacity="0.6"/><circle cx="66" cy="66" r="1.8" opacity="0.6"/>
        <circle cx="50" cy="72" r="1.8" opacity="0.6"/><circle cx="34" cy="66" r="1.8" opacity="0.6"/>
        <circle cx="28" cy="50" r="1.8" opacity="0.6"/><circle cx="34" cy="34" r="1.8" opacity="0.6"/>
        <circle cx="50" cy="50" r="4"/>
      </svg>
      <span>
        Comunitat <em>NexSocial</em>
        <span class="nav-logo-sub">Acompanyament Sociovital</span>
      </span>
    </a>
    <div class="nav-links">
      <a class="nav-link ${isActive('/') || isActive('/index.html')}" href="/">${T('nav.inici')}</a>
      <a class="nav-link ${isActive('/agenda.html')}" href="/agenda.html">${T('nav.agenda')}</a>
      <a class="nav-link ${isActive('/recursos.html')}" href="/recursos.html">${T('nav.recursos')}</a>
      <a class="nav-link ${isActive('/passatemps.html')}" href="/passatemps.html">${T('nav.passatemps')}</a>
    </div>
    <div class="lang-sw" role="group" aria-label="Idioma">
      <button class="lang-btn ${lang==='ca'?'active':''}" data-lang="ca" aria-label="Català">CA</button>
      <button class="lang-btn ${lang==='es'?'active':''}" data-lang="es" aria-label="Castellano">ES</button>
    </div>
  </div>
</nav>`;
}

/* ── HTML FOOTER ──────────────────────────────────────────── */
function buildFooter() {
  return `
<footer class="footer">
  <div class="footer-inner">
    <div>
      <div class="footer-brand">Comunitat NexSocial</div>
      <p>${T('footer.desc')}</p>
    </div>
    <div>
      <h4>${T('footer.enllaços')}</h4>
      <a href="/agenda.html">${T('nav.agenda')}</a>
      <a href="/recursos.html">${T('nav.recursos')}</a>
      <a href="/passatemps.html">${T('nav.passatemps')}</a>
      <a href="${MAIN_SITE}">${T('nav.web')}</a>
    </div>
    <div>
      <h4>${T('footer.contacte')}</h4>
      <a href="tel:${PHONE_TEL}">📞 ${PHONE}</a>
      <a href="mailto:hola@nexsocial.org">✉️ hola@nexsocial.org</a>
      <a href="/legal.html">${T('footer.privacy')}</a>
    </div>
  </div>
  <div class="footer-copy">
    ${T('footer.copy')}
  </div>
</footer>`;
}

/* ── HTML BANNER TELÈFON ──────────────────────────────────── */
function phoneBannerHTML() {
  return `
<div class="phone-banner">
  <strong>${T('phone.text')}</strong>
  <a href="tel:${PHONE_TEL}">📞 ${PHONE}</a>
  <div class="muted" style="font-size: var(--fs-sm); margin-top: 4px;">${T('phone.hours')}</div>
</div>`;
}

/* ── Helpers de vista ─────────────────────────────────────── */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const lang = getLang() === 'ca' ? 'ca-ES' : 'es-ES';
    return new Intl.DateTimeFormat(lang, {
      day: 'numeric', month: 'long', year: 'numeric',
      ...opts
    }).format(d);
  } catch { return dateStr; }
}

function formatPrice(cents) {
  if (cents === 0 || cents == null) return T('ev.gratis');
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

function tipoLabel(tipo) {
  const map = {
    mensual: T('filter.mensual'),
    taller:  T('filter.taller'),
    esdeveniment: T('filter.esdev')
  };
  return map[tipo] || tipo;
}

function tipoBadgeClass(tipo) {
  return tipo === 'taller' ? 'badge-taller' :
         tipo === 'esdeveniment' ? 'badge-esdev' : '';
}

function placesRestants(ev) {
  const cupo = ev.cupo || 0;
  const reservades = ev.reservades || 0;
  return Math.max(0, cupo - reservades);
}

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

/* ── Bind idioma ──────────────────────────────────────────── */
function bindLangSwitcher() {
  qsa('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}

/* ── Boot ─────────────────────────────────────────────────── */
function initShell() {
  document.documentElement.lang = getLang();
  const navP = qs('#nav-placeholder');
  const footP = qs('#footer-placeholder');
  if (navP) navP.innerHTML = buildNav();
  if (footP) footP.innerHTML = buildFooter();
  bindLangSwitcher();

  // Skip link
  if (!qs('.skip-link')) {
    const skip = document.createElement('a');
    skip.href = '#main';
    skip.className = 'skip-link';
    skip.textContent = getLang() === 'ca' ? 'Salta al contingut' : 'Saltar al contenido';
    document.body.prepend(skip);
  }
}

// Auto-init si es carrega directament
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShell);
} else {
  initShell();
}

// Exportar globals per altres scripts
window.NX = {
  T, L, getLang, setLang,
  esc, formatDate, formatPrice,
  tipoLabel, tipoBadgeClass, placesRestants,
  phoneBannerHTML,
  PHONE, PHONE_TEL, WHATSAPP,
  qs, qsa
};

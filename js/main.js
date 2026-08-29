/* main.js — Comunitat NexSocial · nucli
   ────────────────────────────────────────
   i18n CA/ES, nav, footer, helpers globals. */

/* ── Traduccions ──────────────────────────────────────────── */
const i18n = {
  ca: {
    'nav.inici':       'Inici',
    'nav.agenda':      'Agenda',
    'nav.reserves':    'Reserves',
    'nav.recursos':    'Recursos',
    'nav.web':         'NexSocial',

    'hero.title':      'Comunitat NexSocial',
    'hero.tagline':    'Sumem recursos per un Acompanyament Sociovital de proximitat i proactiu.',
    'hero.sub':        'Activitats, trobades i recursos per seguir fent vida.',

    'qb.agenda':       'Agenda',
    'qb.agenda.desc':  'Mira què fem aquest mes',
    'qb.reserves':     'Reserves',
    'qb.reserves.desc':"Apunta't a tallers, activitats i esdeveniments",
    'qb.recursos':     'Recursos',
    'qb.recursos.desc':'Guies, vídeos i passatemps per al dia a dia',

    'agenda.title':    'Agenda',
    'agenda.sub':      'Tot el que farem, ordenat per data. Clica una activitat per veure-la i apuntar-te.',
    'agenda.empty':    "De moment no hi ha res programat. Torna aviat!",
    'agenda.mes':      'Aquest mes',

    'reserves.title':  'Reserves',
    'reserves.sub':    "Tria una categoria i apunta't a la que t'interessi.",
    'reserves.tab.esdev':    'Esdeveniments',
    'reserves.tab.tallers':  'Tallers',
    'reserves.tab.mensual':  'Activitats mensuals',
    'reserves.empty.esdev':  'No hi ha esdeveniments programats ara mateix.',
    'reserves.empty.tallers':'No hi ha tallers oberts a inscripció ara mateix.',
    'reserves.empty.mensual':"No hi ha activitats mensuals programades ara mateix.",

    'ev.reservar':     'Reservar plaça',
    'ev.veure':        'Veure detalls',
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
    'ev.tornar':       '← Tornar',
    'ev.no_trobat':    "No hem trobat aquesta activitat.",

    'form.title':      'Reservar plaça',
    'form.sub':        "Només et cal el nom i el telèfon. Res de comptes ni contrasenyes.",
    'form.step1':      "Tria el nombre de places i continua.",
    'form.continuar':  'Continuar',
    'form.nom':        'Nom i cognoms',
    'form.tel':        'Telèfon',
    'form.email':      "Correu (opcional)",
    'form.email_ck':   "Correu electrònic",
    'form.places':     'Nombre de places',
    'form.places_single': 'plaça',
    'form.notes':      'Vols dir-nos alguna cosa? (opcional)',
    'form.legal':      'En reservar acceptes que et contactem per confirmar la plaça. Consulta la <a href="/legal.html" style="color:var(--forest)">política de privacitat</a>.',
    'form.enviar':     'Confirmar la reserva',
    'form.enviant':    'Enviant…',
    'form.total':      'Total:',
    'form.error':      "Hi ha algun camp sense omplir. Revisa'l, si us plau.",
    'form.error_tel':  "El telèfon ha de ser vàlid (9 xifres).",
    'form.error_srv':  "No hem pogut enviar la reserva. Torna a provar-ho o truca'ns.",

    'phone.text':      "Prefereixes reservar per telèfon? Truca'ns:",
    'phone.hours':     'De dilluns a divendres, 9 a 14h',

    'conf.title':      'Reserva confirmada!',
    'conf.desc':       "Ja t'hem apuntat. Rebràs una trucada nostra per confirmar la plaça.",
    'conf.ref':        'Número de reserva:',
    'conf.back':       "Tornar a l'agenda",

    'checkout.title':    'Les teves dades',
    'checkout.eyebrow':  'COMPLETA LA RESERVA',
    'checkout.back':     '← Tornar al detall',
    'checkout.resum':    'Resum de la reserva',
    'checkout.pay_card': 'Pagar amb targeta',
    'checkout.reserve_wa': 'Reservar per WhatsApp',
    'checkout.stripe_soon': "El pagament amb targeta estarà disponible molt aviat. Mentrestant, completa la reserva per WhatsApp i te la confirmarem al moment.",
    'checkout.legal_note': "En continuar acceptes les condicions. La reserva es confirma per WhatsApp.",
    'checkout.expired':  "La selecció ha caducat. Torna a triar les places.",

    'recursos.title':  'Recursos i consells',
    'recursos.sub':    "Guies senzilles, vídeos i idees per al dia a dia. Si necessites ajuda, truca'ns.",
    'recursos.pas':    'Passatemps',
    'recursos.pas.sub':'Jocs per activar la ment. Aviat en tindrem molts més!',
    'recursos.pas.soon':'Estem preparant aquesta secció. Aviat trobaràs jocs de memòria, buscar les diferències, sopa de lletres i altres passatemps pensats per divertir-se i mantenir la ment desperta.',

    'footer.desc':     'Sumem recursos per un Acompanyament Sociovital de proximitat i proactiu. Un projecte de NexSocial SCCL a Badalona.',
    'footer.enllaços': 'Enllaços',
    'footer.contacte': 'Contacte',
    'footer.privacy':  'Privacitat',
    'footer.legal':    'Avís legal',
    'footer.accessibilitat': 'Accessibilitat',
    'footer.copy':     '© 2026 NexSocial SCCL · NIF F-27641133 · Badalona',
  },
  es: {
    'nav.inici':       'Inicio',
    'nav.agenda':      'Agenda',
    'nav.reserves':    'Reservas',
    'nav.recursos':    'Recursos',
    'nav.web':         'NexSocial',

    'hero.title':      'Comunitat NexSocial',
    'hero.tagline':    'Sumamos recursos para un Acompañamiento Sociovital de proximidad y proactivo.',
    'hero.sub':        'Actividades, encuentros y recursos para seguir haciendo vida.',

    'qb.agenda':       'Agenda',
    'qb.agenda.desc':  'Mira lo que hacemos este mes',
    'qb.reserves':     'Reservas',
    'qb.reserves.desc':'Apúntate a talleres, actividades y eventos',
    'qb.recursos':     'Recursos',
    'qb.recursos.desc':'Guías, vídeos y pasatiempos para el día a día',

    'agenda.title':    'Agenda',
    'agenda.sub':      'Todo lo que haremos, ordenado por fecha. Haz clic en una actividad para verla y apuntarte.',
    'agenda.empty':    'Por ahora no hay nada programado. ¡Vuelve pronto!',
    'agenda.mes':      'Este mes',

    'reserves.title':  'Reservas',
    'reserves.sub':    'Elige una categoría y apúntate a la que te interese.',
    'reserves.tab.esdev':    'Eventos',
    'reserves.tab.tallers':  'Talleres',
    'reserves.tab.mensual':  'Actividades mensuales',
    'reserves.empty.esdev':  'No hay eventos programados ahora mismo.',
    'reserves.empty.tallers':'No hay talleres abiertos a inscripción ahora mismo.',
    'reserves.empty.mensual':'No hay actividades mensuales programadas ahora mismo.',

    'ev.reservar':     'Reservar plaza',
    'ev.veure':        'Ver detalles',
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
    'ev.tornar':       '← Volver',
    'ev.no_trobat':    'No hemos encontrado esta actividad.',

    'form.title':      'Reservar plaza',
    'form.sub':        'Solo necesitas el nombre y el teléfono. Nada de cuentas ni contraseñas.',
    'form.step1':      'Elige el número de plazas y continúa.',
    'form.continuar':  'Continuar',
    'form.nom':        'Nombre y apellidos',
    'form.tel':        'Teléfono',
    'form.email':      'Correo (opcional)',
    'form.email_ck':   'Correo electrónico',
    'form.places':     'Número de plazas',
    'form.places_single': 'plaza',
    'form.notes':      '¿Quieres decirnos algo? (opcional)',
    'form.legal':      'Al reservar aceptas que te contactemos para confirmar la plaza. Consulta la <a href="/legal.html" style="color:var(--forest)">política de privacidad</a>.',
    'form.enviar':     'Confirmar la reserva',
    'form.enviant':    'Enviando…',
    'form.total':      'Total:',
    'form.error':      'Hay algún campo sin rellenar. Revísalo, por favor.',
    'form.error_tel':  'El teléfono debe ser válido (9 cifras).',
    'form.error_srv':  'No hemos podido enviar la reserva. Vuelve a intentarlo o llámanos.',

    'phone.text':      '¿Prefieres reservar por teléfono? Llámanos:',
    'phone.hours':     'De lunes a viernes, 9 a 14h',

    'conf.title':      '¡Reserva confirmada!',
    'conf.desc':       'Ya te hemos apuntado. Recibirás una llamada nuestra para confirmar la plaza.',
    'conf.ref':        'Número de reserva:',
    'conf.back':       'Volver a la agenda',

    'checkout.title':    'Tus datos',
    'checkout.eyebrow':  'COMPLETA LA RESERVA',
    'checkout.back':     '← Volver al detalle',
    'checkout.resum':    'Resumen de la reserva',
    'checkout.pay_card': 'Pagar con tarjeta',
    'checkout.reserve_wa': 'Reservar por WhatsApp',
    'checkout.stripe_soon': 'El pago con tarjeta estará disponible muy pronto. Mientras tanto, completa la reserva por WhatsApp y te la confirmamos al momento.',
    'checkout.legal_note': 'Al continuar aceptas las condiciones. La reserva se confirma por WhatsApp.',
    'checkout.expired':  'La selección ha caducado. Vuelve a elegir las plazas.',

    'recursos.title':  'Recursos y consejos',
    'recursos.sub':    'Guías sencillas, vídeos e ideas para el día a día. Si necesitas ayuda, llámanos.',
    'recursos.pas':    'Pasatiempos',
    'recursos.pas.sub':'Juegos para activar la mente. ¡Pronto tendremos muchos más!',
    'recursos.pas.soon':'Estamos preparando esta sección. Pronto encontrarás juegos de memoria, buscar las diferencias, sopa de letras y otros pasatiempos pensados para divertirse y mantener la mente despierta.',

    'footer.desc':     'Sumamos recursos para un Acompañamiento Sociovital de proximidad y proactivo. Un proyecto de NexSocial SCCL en Badalona.',
    'footer.enllaços': 'Enlaces',
    'footer.contacte': 'Contacto',
    'footer.privacy':  'Privacidad',
    'footer.legal':    'Aviso legal',
    'footer.accessibilitat': 'Accesibilidad',
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
      <img src="/assets/logo.png" alt="NexSocial" class="nav-logo-img">
      <span class="nav-logo-tag">Comunitat NexSocial</span>
    </a>
    <div class="nav-links">
      <a class="nav-link ${isActive('/') || isActive('/index.html')}" href="/"${(isActive('/') || isActive('/index.html')) ? ' aria-current="page"' : ''}>${T('nav.inici')}</a>
      <a class="nav-link ${isActive('/agenda.html')}" href="/agenda.html"${isActive('/agenda.html') ? ' aria-current="page"' : ''}>${T('nav.agenda')}</a>
      <a class="nav-link ${isActive('/reserves.html')}" href="/reserves.html"${isActive('/reserves.html') ? ' aria-current="page"' : ''}>${T('nav.reserves')}</a>
      <a class="nav-link ${isActive('/recursos.html')}" href="/recursos.html"${isActive('/recursos.html') ? ' aria-current="page"' : ''}>${T('nav.recursos')}</a>
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
      <a href="/reserves.html">${T('nav.reserves')}</a>
      <a href="/recursos.html">${T('nav.recursos')}</a>
      <a href="${MAIN_SITE}">${T('nav.web')}</a>
    </div>
    <div>
      <h4>${T('footer.contacte')}</h4>
      <a href="tel:${PHONE_TEL}">📞 ${PHONE}</a>
      <a href="mailto:infonex@nexsocial.org">✉️ infonex@nexsocial.org</a>
      <a href="/legal.html">${T('footer.privacy')}</a>
      <a href="/accessibilitat.html">${T('footer.accessibilitat')}</a>
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
    mensual: getLang() === 'ca' ? 'Activitat mensual' : 'Actividad mensual',
    taller:  getLang() === 'ca' ? 'Taller' : 'Taller',
    esdeveniment: getLang() === 'ca' ? 'Esdeveniment' : 'Evento'
  };
  return map[tipo] || tipo;
}

function tipoBadgeClass(tipo) {
  return tipo === 'taller' ? 'badge-taller' :
         tipo === 'esdeveniment' ? 'badge-esdev' :
         tipo === 'mensual' ? 'badge-mensual' : '';
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

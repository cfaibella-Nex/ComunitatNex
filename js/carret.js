/* carret.js — Comunitat NexSocial · inscripcions
   ────────────────────────────────────────────────
   Tarifes (nivells), extres i carret del procés de reserva:

     detall.html  → tria nivell i places
     extres.html  → mesos, sessions vinculades o altres extres (si n'hi ha)
     checkout.html → dades i confirmació / pagament

   Mateix plantejament que BookingFEB. El carret només guarda
   QUANTITATS; el preu el recalcula sempre el servidor.

   ⚠ tarifesEvent / extresEvent són còpia d'api/_lib/tarifes.js.
   Si en canvies la forma, canvia totes dues.

   Va dins d'una IIFE com la resta de scripts d'aquest projecte:
   main.js declara funcions globals i dos scripts clàssics amb el
   mateix nom es trepitgen. Exporta window.NXC. */

(function() {

const { L, getLang, esc, formatDate } = window.NX;

/* ── Textos propis (CA / ES) ─────────────────────────────── */
const TXT = {
  ca: {
    'ins.tria':          'Tria quantes places vols i continua.',
    'ins.tria_nivell':   'Tria el nivell i quantes places vols.',
    'ins.cap':           'Tria almenys una plaça per continuar.',
    'ins.places':        'Places',
    'ins.treure':        'Treure una plaça',
    'ins.afegir':        'Afegir una plaça',
    'preu.gratuit':      'Gratuït',
    'preu.consultar':    'A consultar',
    'preu.mes':          '/ mes',
    'preu.trimestre':    '/ trimestre',
    'preu.placa':        '/ plaça',
    'preu.des_de':       'Des de',
    'total.consultar':   '+ a consultar',
    'nivell.complet':    'Complet',
    'nivell.ultimes':    'Últimes places',
    'nivell.queden':     'En queden {n}',
    'model.mensual':     'Pagament mensual',
    'model.trimestral':  'Trimestre sencer',
    'ext.eyebrow':       'PAS 2 DE 3',
    'ext.titol_mensual': 'Vols reservar ja els mesos següents?',
    'ext.intro_mensual': 'Tria els mesos que vols reservar a més del primer. Ho pots fer ara o més endavant.',
    'ext.titol':         'Vols afegir-hi alguna cosa?',
    'ext.intro':         'És opcional. Pots continuar sense afegir-hi res.',
    'ext.sessio':        'Sessió',
    'ext.totes':         'Per a totes les places ({n})',
    'ext.max':           'Com a màxim {n}: una per plaça.',
    'ext.saltar':        'Continuar sense afegir res',
    'ext.continuar':     'Continuar',
    'ext.tornar':        '← Tornar a triar places',
    'chk.eyebrow':       'PAS 3 DE 3',
    'chk.pagar':         'Pagar amb targeta',
    'chk.obrint':        'Obrint el pagament…',
    'chk.online':        'Pagaràs amb targeta a la pàgina segura de Stripe. La plaça queda guardada 30 minuts mentre pagues.',
    'chk.online_aviat':  "El pagament amb targeta arribarà aviat. Ara reserves la plaça i et trucarem per explicar-te com pagar.",
    'chk.presencial':    "Pagaràs el dia de l'activitat, al mateix lloc. Ara només reserves la plaça.",
    'chk.consultar':     "El preu d'alguna part és a consultar. Reserves la plaça i et trucarem per explicar-t'ho.",
    'err.tarifa_completa':      "Aquest nivell s'acaba d'omplir. Torna enrere i tria'n un altre.",
    'err.sessio_completa':      "Una de les sessions que has afegit ja és plena. Torna enrere i treu-la.",
    'err.sessio_duplicada':     "Ja tens reserva a una de les sessions que has afegit. Torna enrere i treu-la.",
    'err.sessio_no_disponible': "Una de les sessions que has afegit ja no està disponible. Torna enrere i treu-la.",
    'err.stripe':               "No hem pogut obrir el pagament amb targeta. Torna-ho a provar o truca'ns.",
    'err.event_unavailable':    "Aquesta activitat ja no admet reserves. Truca'ns si tens cap dubte.",
    'conf.pagat_titol':  'Pagament rebut!',
    'conf.pagat':        'Tens la plaça confirmada. Guarda el número de reserva.',
    'conf.processant':   'Estem confirmant el pagament. Pot trigar uns segons…',
    'conf.pendent':      "Encara no ens ha arribat la confirmació del pagament. Si has pagat, no pateixis: t'ho confirmarem per telèfon.",
    'conf.ko_titol':     "El pagament no s'ha completat",
    'conf.ko':           "No s'ha fet cap càrrec. Pots tornar a l'agenda i provar-ho de nou, o trucar-nos i t'ajudem.",
    'conf.presencial':   "Pagaràs el dia de l'activitat, al mateix lloc."
  },
  es: {
    'ins.tria':          'Elige cuántas plazas quieres y continúa.',
    'ins.tria_nivell':   'Elige el nivel y cuántas plazas quieres.',
    'ins.cap':           'Elige al menos una plaza para continuar.',
    'ins.places':        'Plazas',
    'ins.treure':        'Quitar una plaza',
    'ins.afegir':        'Añadir una plaza',
    'preu.gratuit':      'Gratuito',
    'preu.consultar':    'A consultar',
    'preu.mes':          '/ mes',
    'preu.trimestre':    '/ trimestre',
    'preu.placa':        '/ plaza',
    'preu.des_de':       'Desde',
    'total.consultar':   '+ a consultar',
    'nivell.complet':    'Completo',
    'nivell.ultimes':    'Últimas plazas',
    'nivell.queden':     'Quedan {n}',
    'model.mensual':     'Pago mensual',
    'model.trimestral':  'Trimestre completo',
    'ext.eyebrow':       'PASO 2 DE 3',
    'ext.titol_mensual': '¿Quieres reservar ya los meses siguientes?',
    'ext.intro_mensual': 'Elige los meses que quieres reservar además del primero. Puedes hacerlo ahora o más adelante.',
    'ext.titol':         '¿Quieres añadir algo más?',
    'ext.intro':         'Es opcional. Puedes continuar sin añadir nada.',
    'ext.sessio':        'Sesión',
    'ext.totes':         'Para todas las plazas ({n})',
    'ext.max':           'Como máximo {n}: una por plaza.',
    'ext.saltar':        'Continuar sin añadir nada',
    'ext.continuar':     'Continuar',
    'ext.tornar':        '← Volver a elegir plazas',
    'chk.eyebrow':       'PASO 3 DE 3',
    'chk.pagar':         'Pagar con tarjeta',
    'chk.obrint':        'Abriendo el pago…',
    'chk.online':        'Pagarás con tarjeta en la página segura de Stripe. La plaza queda guardada 30 minutos mientras pagas.',
    'chk.online_aviat':  'El pago con tarjeta llegará pronto. Ahora reservas la plaza y te llamaremos para explicarte cómo pagar.',
    'chk.presencial':    'Pagarás el día de la actividad, en el mismo lugar. Ahora solo reservas la plaza.',
    'chk.consultar':     'El precio de alguna parte es a consultar. Reservas la plaza y te llamaremos para explicártelo.',
    'err.tarifa_completa':      'Este nivel se acaba de llenar. Vuelve atrás y elige otro.',
    'err.sessio_completa':      'Una de las sesiones que has añadido ya está llena. Vuelve atrás y quítala.',
    'err.sessio_duplicada':     'Ya tienes reserva en una de las sesiones que has añadido. Vuelve atrás y quítala.',
    'err.sessio_no_disponible': 'Una de las sesiones que has añadido ya no está disponible. Vuelve atrás y quítala.',
    'err.stripe':               'No hemos podido abrir el pago con tarjeta. Vuelve a intentarlo o llámanos.',
    'err.event_unavailable':    'Esta actividad ya no admite reservas. Llámanos si tienes cualquier duda.',
    'conf.pagat_titol':  '¡Pago recibido!',
    'conf.pagat':        'Tienes la plaza confirmada. Guarda el número de reserva.',
    'conf.processant':   'Estamos confirmando el pago. Puede tardar unos segundos…',
    'conf.pendent':      'Todavía no nos ha llegado la confirmación del pago. Si has pagado, no te preocupes: te lo confirmaremos por teléfono.',
    'conf.ko_titol':     'El pago no se ha completado',
    'conf.ko':           'No se ha hecho ningún cargo. Puedes volver a la agenda e intentarlo de nuevo, o llamarnos y te ayudamos.',
    'conf.presencial':   'Pagarás el día de la actividad, en el mismo lugar.'
  }
};

function t(key, vars) {
  let s = (TXT[getLang()] || TXT.ca)[key] || TXT.ca[key] || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

/* ── Tarifes i extres (còpia d'api/_lib/tarifes.js) ───────── */
const PREU_MODES = ['fix', 'gratuit', 'consultar'];

function tarifesEvent(ev) {
  if (Array.isArray(ev?.tarifes) && ev.tarifes.length) {
    return ev.tarifes.map(x => ({
      id: x.id,
      nom: x.nom || { ca: '', es: '' },
      detall: x.detall || null,
      preu_mode: PREU_MODES.includes(x.preu_mode) ? x.preu_mode : 'fix',
      preu_cents: Math.max(0, Number(x.preu_cents) || 0),
      places: x.places == null || x.places === '' ? null : Number(x.places),
      estat: x.estat === 'complet' ? 'complet' : 'disponible'
    }));
  }
  const preu = Math.max(0, Number(ev?.preu_cents) || 0);
  return [{
    id: 'general', nom: { ca: 'Inscripció', es: 'Inscripción' }, detall: null,
    preu_mode: preu > 0 ? 'fix' : 'gratuit', preu_cents: preu, places: null, estat: 'disponible'
  }];
}

function extresEvent(ev) {
  if (!Array.isArray(ev?.extres)) return [];
  return ev.extres
    .filter(x => x && x.id && ['mes', 'sessio', 'extra'].includes(x.tipus))
    .map(x => ({
      id: x.id, tipus: x.tipus,
      nom: x.nom || { ca: '', es: '' }, detall: x.detall || null,
      preu_mode: PREU_MODES.includes(x.preu_mode) ? x.preu_mode : 'fix',
      preu_cents: Math.max(0, Number(x.preu_cents) || 0),
      event_id: x.tipus === 'sessio' ? x.event_id : null
    }));
}

/* Una activitat amb una sola tarifa i sense nom propi es mostra com
   sempre: "Places", sense parlar de nivells. */
function esTarifaUnica(ev) {
  const ts = tarifesEvent(ev);
  return ts.length === 1;
}

/* ── Preus ───────────────────────────────────────────────── */
function euros(cents) {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

function sufixModel(ev) {
  if (ev?.model === 'mensual') return t('preu.mes');
  if (ev?.model === 'trimestral') return t('preu.trimestre');
  return '';
}

/* Text del preu d'una tarifa o extra. `ambSufix` afegeix "/ mes" o
   "/ trimestre" quan és una tarifa d'activitat mensual o trimestral. */
function preuTxt(item, ev, ambSufix) {
  if (item.preu_mode === 'gratuit') return t('preu.gratuit');
  if (item.preu_mode === 'consultar') return t('preu.consultar');
  const suf = ambSufix ? sufixModel(ev) : '';
  return euros(item.preu_cents) + (suf ? ` ${suf}` : '');
}

/* Resum per a la fitxa: "Gratuït", "A consultar", "25,00 € / mes"
   o "Des de 20,00 € / mes" */
function preuResum(ev) {
  const ts = tarifesEvent(ev);
  const fixos = ts.filter(x => x.preu_mode === 'fix').map(x => x.preu_cents);
  if (!fixos.length) {
    return ts.every(x => x.preu_mode === 'gratuit') ? t('preu.gratuit') : t('preu.consultar');
  }
  const min = Math.min(...fixos);
  const suf = sufixModel(ev);
  const tot = ts.length === 1 || fixos.every(p => p === min) && fixos.length === ts.length;
  return `${tot ? '' : t('preu.des_de') + ' '}${euros(min)}${suf ? ' ' + suf : ''}`;
}

/* ── Places ──────────────────────────────────────────────── */
function restantsEvent(ev) {
  if (ev.estat === 'esgotat') return 0;
  return Math.max(0, (ev.cupo || 0) - (ev.reservades || 0));
}

/* null = el nivell no té aforament propi */
function restantsTarifa(ev, tarifa) {
  if (tarifa.places == null) return null;
  const ocup = (ev.reservades_tarifa || {})[tarifa.id] || 0;
  return Math.max(0, tarifa.places - ocup);
}

function estatTarifa(ev, tarifa) {
  if (tarifa.estat === 'complet') return 'complet';
  const r = restantsTarifa(ev, tarifa);
  if (r === 0) return 'complet';
  if (r !== null && r <= (window.NX.LLINDAR_ULTIMES || 3)) return 'ultimes';
  return 'lliure';
}

/* ── Sessions vinculades ─────────────────────────────────── */
const avui = () => new Date().toISOString().slice(0, 10);

function sessioDisponible(target) {
  if (!target || target.estat === 'arxivat') return false;
  if (target.data && String(target.data) < avui()) return false;
  return restantsEvent(target) > 0;
}

/* Extres que es poden oferir ara: les sessions vinculades només si
   l'altra activitat és vigent i hi queden places. */
function extresVisibles(ev, events) {
  return extresEvent(ev).filter(x => {
    if (x.tipus !== 'sessio') return true;
    return sessioDisponible((events || []).find(e => e.id === x.event_id));
  });
}

/* Nom d'un extra per mostrar. Una sessió porta la data de l'altra
   activitat si l'extra no en diu res. */
function nomExtra(x, events) {
  const nom = L(x.nom);
  if (x.tipus !== 'sessio') return nom;
  const target = (events || []).find(e => e.id === x.event_id);
  if (!target?.data) return nom;
  const quan = formatDate(target.data, { weekday: 'long', day: 'numeric', month: 'long', year: undefined })
             + (target.hora ? `, ${target.hora}` : '');
  const on = L(target.entitat);
  return [nom, quan, on].filter(Boolean).join(' · ');
}

/* ── Carret ──────────────────────────────────────────────── */
const CLAU = 'nx-carret';
const VIDA_MS = 2 * 60 * 60 * 1000;   // 2 hores

function getCart(eventId) {
  try {
    const c = JSON.parse(sessionStorage.getItem(CLAU) || 'null');
    if (!c || (eventId && c.event_id !== eventId)) return null;
    if (Date.now() - (c.ts || 0) > VIDA_MS) { sessionStorage.removeItem(CLAU); return null; }
    c.linies = c.linies || {};
    c.extres = c.extres || {};
    return c;
  } catch { return null; }
}
function setCart(c) {
  c.ts = Date.now();
  sessionStorage.setItem(CLAU, JSON.stringify(c));
}
function clearCart() { sessionStorage.removeItem(CLAU); }

function cartPlaces(cart) {
  return Object.values(cart?.linies || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

/* Línies del carret amb nom i import, per al resum i per a WhatsApp */
function cartLinies(ev, cart, events) {
  const out = [];
  for (const x of tarifesEvent(ev)) {
    const q = cart.linies[x.id] || 0;
    if (q > 0) out.push({ item: x, qty: q, nom: esTarifaUnica(ev) ? window.NX.T('form.places_single') : L(x.nom), tipus: 'tarifa' });
  }
  for (const x of extresEvent(ev)) {
    const q = cart.extres[x.id] || 0;
    if (q > 0) out.push({ item: x, qty: q, nom: nomExtra(x, events), tipus: x.tipus });
  }
  return out.map(l => ({
    ...l,
    importTxt: l.item.preu_mode === 'fix' ? euros(l.item.preu_cents * l.qty) : preuTxt(l.item, ev, false)
  }));
}

function cartTotal(ev, cart) {
  let cents = 0, consultar = false;
  for (const l of cartLinies(ev, cart)) {
    if (l.item.preu_mode === 'fix') cents += l.item.preu_cents * l.qty;
    if (l.item.preu_mode === 'consultar') consultar = true;
  }
  return { cents, consultar };
}

/* "25,00 €", "25,00 € + a consultar", "A consultar" o "Gratuït" */
function totalTxt(ev, cart) {
  const { cents, consultar } = cartTotal(ev, cart);
  if (consultar) return cents > 0 ? `${euros(cents)} ${t('total.consultar')}` : t('preu.consultar');
  return cents > 0 ? euros(cents) : t('preu.gratuit');
}

/* Com es cobra aquesta activitat ara mateix. El calcula el servidor
   (/api/events → ev.cobrament); amb el catàleg local, com a reserva. */
function cobrament(ev) {
  if (ev.cobrament) return ev.cobrament;
  if (ev.pagament === 'online') return 'online_aviat';
  return ev.pagament === 'presencial' ? 'presencial' : 'reserva';
}

/* ── Dades ───────────────────────────────────────────────── */
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

/* Selector − n + reutilitzant l'estil de sempre (.places-selector).
   `nom` va a l'aria-label perquè el lector de pantalla digui de quin
   nivell o extra és cada botó. */
function selectorHTML({ id, qty, max, nom, desactivat }) {
  const aria = esc(nom || '');
  return `
<div class="places-selector ins-qty" data-id="${esc(id)}">
  <button type="button" class="places-btn" data-op="dec" aria-label="${esc(t('ins.treure'))}${aria ? ': ' + aria : ''}"
          ${desactivat || qty <= 0 ? 'disabled' : ''}>−</button>
  <output class="places-input ins-qty-val" aria-live="polite">${qty}</output>
  <button type="button" class="places-btn" data-op="inc" aria-label="${esc(t('ins.afegir'))}${aria ? ': ' + aria : ''}"
          ${desactivat || qty >= max ? 'disabled' : ''}>+</button>
</div>`;
}

window.NXC = {
  t, euros, tarifesEvent, extresEvent, esTarifaUnica,
  preuTxt, preuResum, sufixModel,
  restantsEvent, restantsTarifa, estatTarifa,
  extresVisibles, nomExtra, sessioDisponible,
  getCart, setCart, clearCart, cartPlaces, cartLinies, cartTotal, totalTxt,
  cobrament, fetchEvents, selectorHTML
};

})();

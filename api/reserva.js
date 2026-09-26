// api/reserva.js — inscripció (v10: tarifes, extres, sessions vinculades i Stripe)
//
//   POST /api/reserva          → crea la reserva i, si toca, obre el pagament
//   GET  /api/reserva?ref=…    → estat d'una reserva (per a la pàgina de confirmació)
//
// El navegador només envia QUANTITATS ({ tarifaId: n }, { extraId: n }).
// Noms i preus es llegeixen de la base de dades i es recalculen aquí:
// el total que pugui enviar el client s'ignora sempre.
import { json, readBody, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase } from './_lib/supabase.js';
import { calcularInscripcio, tarifesEvent } from './_lib/tarifes.js';
import { cobramentEvent, crearCheckoutSession } from './_lib/stripe.js';

// Versió del text legal mostrat al formulari. Canviar-la quan canviï el text.
const CONSENT_VERSIO = 'form-legal-v1';
const REF_RE = /^NX-[A-Z0-9]{6}$/;
const MINIM_STRIPE = 50;   // Stripe no cobra menys de 0,50 €

function generarRef() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sense 0/O/1/I/L
  let s = 'NX-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
const netejaTelefon = t => String(t || '').replace(/[\s\-()]/g, '');
const validaTelefon = t => /^(\+?\d{9,15})$/.test(netejaTelefon(t));
const validaEmail   = e => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const avui = () => new Date().toISOString().slice(0, 10);
const passat = ev => Boolean(ev.data) && String(ev.data) < avui();

function urlBase(req) {
  const env = (process.env.SITE_URL || '').trim().replace(/\/$/, '');
  if (env) return env;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}`;
}

const ERRORS = {
  event_not_found:      [404, 'Activitat no trobada'],
  event_unavailable:    [409, 'Activitat no disponible'],
  duplicate:            [409, 'Ja tens una reserva per a aquesta activitat amb aquest telèfon'],
  rate_limit:           [429, "Massa sol·licituds. Truca'ns i t'apuntem nosaltres."],
  sold_out:             [409, 'No queden prou places'],
  tarifa_completa:      [409, 'Aquest nivell ja és complet'],
  sessio_no_disponible: [409, 'Una de les sessions triades ja no està disponible'],
  sessio_duplicada:     [409, 'Ja tens reserva a una de les sessions que has afegit'],
  sessio_completa:      [409, 'Una de les sessions que has afegit ja és plena. Treu-la per continuar.'],
  ref_collision:        [500, 'Error generant la referència']
};

export default async function handler(req, res) {
  if (req.method === 'GET') return estat(req, res);
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  if (!hasSupabase()) {
    return json(res, 503, {
      error: 'Sistema de reserves no disponible',
      hint: 'Reserva per telèfon o WhatsApp mentrestant'
    });
  }

  let body;
  try { body = await readBody(req); }
  catch { return json(res, 400, { error: 'Body no vàlid' }); }

  // Honeypot: camp ocult que cap persona omple. Si ve ple, és un bot.
  if (body.web) return json(res, 400, { error: 'Sol·licitud no vàlida' });

  const { event_id, nom, telefon, email, notes, lang } = body;
  if (!event_id) return json(res, 400, { error: 'Falta event_id' });
  if (!nom || String(nom).trim().length < 2) return json(res, 400, { error: 'Nom no vàlid' });
  if (!validaTelefon(telefon)) return json(res, 400, { error: 'Telèfon no vàlid' });
  if (!validaEmail(email)) return json(res, 400, { error: 'Correu no vàlid' });
  const idioma = lang === 'es' ? 'es' : 'ca';

  try {
    const sb = supabase();

    const { data: ev, error: evErr } = await sb.from('events').select('*').eq('id', event_id).maybeSingle();
    if (evErr) throw evErr;
    if (!ev) return json(res, 404, { error: ERRORS.event_not_found[1], codi: 'event_not_found' });
    if (ev.estat === 'arxivat' || passat(ev)) {
      return json(res, 409, { error: ERRORS.event_unavailable[1], codi: 'event_unavailable' });
    }

    /* Compatibilitat amb la pàgina antiga (encara en memòria cau d'algun
       navegador): enviava { places: n } sense línies. */
    let linies = body.linies;
    if (!linies || typeof linies !== 'object') {
      const n = parseInt(body.places, 10) || 0;
      linies = { [tarifesEvent(ev)[0].id]: n };
    }

    let calc;
    try {
      calc = calcularInscripcio(ev, linies, body.extres || {});
    } catch (e) {
      const [status, msg] = ERRORS[e.codi] || [400, e.message];
      return json(res, status, { error: msg, codi: e.codi || 'carret_invalid' });
    }

    // Les sessions vinculades han d'existir i no haver passat
    if (calc.sessions.length) {
      const ids = calc.sessions.map(s => s.event_id);
      const { data: sev, error } = await sb.from('events').select('id, data, estat').in('id', ids);
      if (error) throw error;
      const ok = ids.every(id => {
        const s = (sev || []).find(x => x.id === id);
        return s && s.estat !== 'arxivat' && !passat(s);
      });
      if (!ok) return json(res, 409, { error: ERRORS.sessio_no_disponible[1], codi: 'sessio_no_disponible' });
    }

    const cobrament = cobramentEvent(ev);
    const online = cobrament === 'online' && !calc.consultar && calc.totalCents >= MINIM_STRIPE;

    const params = {
      p_event_id: ev.id,
      p_nom: String(nom).trim().slice(0, 120),
      p_telefon: netejaTelefon(telefon),
      p_email: email ? String(email).trim().slice(0, 160) : null,
      p_notes: notes ? String(notes).trim().slice(0, 500) : null,
      p_lang: idioma,
      p_consent_versio: CONSENT_VERSIO,
      p_linies: calc.detall,
      p_places: calc.places,
      p_total_cents: calc.totalCents,
      p_consultar: calc.consultar,
      p_mode_pagament: cobrament,
      p_payment_status: online ? 'pending' : 'none',
      p_sessions: calc.sessions,
      p_permet_espera: true
    };

    let out = null;
    for (let intent = 0; intent < 5; intent++) {   // només per col·lisió de referència
      const { data, error } = await sb.rpc('crear_reserva_v2', { ...params, p_ref: generarRef() });
      if (error) throw error;
      out = data;
      if (!(out && out.error === 'ref_collision')) break;
    }
    if (!out) return json(res, 500, { error: 'Error creant la reserva' });

    if (out.ok !== true) {
      const [status, msg] = ERRORS[out.error] || [500, 'Error creant la reserva'];
      return json(res, status, { error: msg, codi: out.error, disponibles: out.disponibles, event: out.event });
    }

    const ref = out.reserva_id;

    if (out.status === 'waitlist') {
      return json(res, 201, {
        reserva_id: ref, status: 'waitlist',
        message: "No quedaven places lliures. Has quedat a la llista d'espera i et trucarem si se n'allibera alguna."
      });
    }

    if (online) {
      const base = urlBase(req);
      try {
        const sess = await crearCheckoutSession({
          ref, event: ev, detall: calc.detall, email: params.p_email, lang: idioma,
          successUrl: `${base}/confirmacio.html?ref=${ref}&pagament=ok`,
          cancelUrl:  `${base}/confirmacio.html?ref=${ref}&pagament=ko`,
          descripcio: [ev.titol?.[idioma] || ev.titol?.ca, ev.data].filter(Boolean).join(' · ')
        });
        await sb.from('reserves').update({ stripe_session: sess.id }).eq('id', ref);
        return json(res, 201, { reserva_id: ref, status: 'pending', pagament: 'online', redirect: sess.url });
      } catch (e) {
        console.error('stripe:', e.message);
        // Sense pagament no hi ha reserva: alliberem la plaça de seguida
        await sb.rpc('marcar_pagament', { p_ref: ref, p_resultat: 'failed' });
        return json(res, 502, { error: "No hem pogut obrir el pagament amb targeta. Torna-ho a provar o truca'ns.", codi: 'stripe' });
      }
    }

    return json(res, 201, {
      reserva_id: ref,
      status: out.status,
      pagament: cobrament,
      message: 'Reserva creada. Rebràs una trucada per confirmar la plaça.'
    });

  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Error creant la reserva' });
  }
}

/* Estat mínim, sense dades personals: el fa servir confirmacio.html
   quan la persona torna de Stripe. */
async function estat(req, res) {
  const ref = String(req.query?.ref || '').toUpperCase();
  if (!REF_RE.test(ref)) return json(res, 400, { error: 'Referència no vàlida' });
  if (!hasSupabase()) return json(res, 503, { error: 'No disponible' });
  try {
    const { data, error } = await supabase().from('reserves')
      .select('status, payment_status, consultar, mode_pagament')
      .eq('id', ref).maybeSingle();
    if (error) throw error;
    if (!data) return json(res, 404, { error: 'No trobada' });
    return json(res, 200, data);
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Error' });
  }
}

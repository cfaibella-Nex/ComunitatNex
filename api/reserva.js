// api/reserva.js — POST crear reserva (v2: atòmica via RPC)
import { json, readBody, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase } from './_lib/supabase.js';

// Versió del text legal mostrat al formulari. Canviar-la quan canviï el text.
const CONSENT_VERSIO = 'form-legal-v1';

function generarRef() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sense 0/O/1/I/L
  let s = 'NX-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function netejaTelefon(t) {
  return String(t || '').replace(/[\s\-()]/g, '');
}

function validaTelefon(t) {
  return /^(\+?\d{9,15})$/.test(netejaTelefon(t));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

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

  const { event_id, nom, telefon, email, places, notes, lang } = body;
  if (!event_id) return json(res, 400, { error: 'Falta event_id' });
  if (!nom || String(nom).trim().length < 2) return json(res, 400, { error: 'Nom no vàlid' });
  if (!validaTelefon(telefon)) return json(res, 400, { error: 'Telèfon no vàlid' });

  const numPlaces = parseInt(places, 10);
  if (!numPlaces || numPlaces < 1 || numPlaces > 10) {
    return json(res, 400, { error: 'Nombre de places no vàlid' });
  }

  const params = {
    p_event_id: event_id,
    p_nom: String(nom).trim(),
    p_telefon: netejaTelefon(telefon),
    p_email: email ? String(email).trim() : null,
    p_places: numPlaces,
    p_notes: notes ? String(notes).trim().slice(0, 500) : null,
    p_lang: lang === 'es' ? 'es' : 'ca',
    p_consent_versio: CONSENT_VERSIO,
    p_permet_espera: true
  };

  try {
    const sb = supabase();
    let out = null;

    // Reintents només per col·lisió de referència (probabilitat mínima)
    for (let intent = 0; intent < 5; intent++) {
      const { data, error } = await sb.rpc('crear_reserva', { ...params, p_ref: generarRef() });
      if (error) throw error;
      out = data;
      if (!(out && out.error === 'ref_collision')) break;
    }

    if (!out) return json(res, 500, { error: 'Error creant la reserva' });

    if (out.ok !== true) {
      const map = {
        event_not_found:   [404, 'Activitat no trobada'],
        event_unavailable: [409, 'Activitat no disponible'],
        duplicate:         [409, 'Ja tens una reserva per a aquesta activitat amb aquest telèfon'],
        rate_limit:        [429, 'Massa sol·licituds. Truca\'ns i t\'apuntem nosaltres.'],
        sold_out:          [409, 'No queden prou places'],
        ref_collision:     [500, 'Error generant la referència']
      };
      const [status, msg] = map[out.error] || [500, 'Error creant la reserva'];
      return json(res, status, { error: msg, codi: out.error, disponibles: out.disponibles });
    }

    return json(res, 201, {
      reserva_id: out.reserva_id,
      status: out.status, // 'pending' | 'waitlist'
      disponibles: out.disponibles,
      message: out.status === 'waitlist'
        ? 'No quedaven places lliures. Has quedat a la llista d\'espera i et trucarem si se n\'allibera alguna.'
        : 'Reserva creada. Rebràs una trucada per confirmar la plaça.'
    });

  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Error creant la reserva' });
  }
}

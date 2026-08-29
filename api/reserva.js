// api/reserva.js — POST crear reserva
import { json, readBody, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase } from './_lib/supabase.js';

function generarRef() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sense 0/O/1/I/L
  let s = 'NX-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function validaTelefon(t) {
  const clean = String(t || '').replace(/[\s\-\(\)]/g, '');
  return /^(\+?\d{9,15})$/.test(clean);
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

  // Validació
  const { event_id, nom, telefon, email, places, notes, preu_cents, lang } = body;
  if (!event_id) return json(res, 400, { error: 'Falta event_id' });
  if (!nom || String(nom).trim().length < 2) return json(res, 400, { error: 'Nom no vàlid' });
  if (!validaTelefon(telefon)) return json(res, 400, { error: 'Telèfon no vàlid' });
  const numPlaces = parseInt(places, 10);
  if (!numPlaces || numPlaces < 1 || numPlaces > 10) return json(res, 400, { error: 'Nombre de places no vàlid' });

  try {
    const sb = supabase();

    // Comprovar disponibilitat
    const { data: ev, error: evErr } = await sb
      .from('events')
      .select('id, cupo, estat, preu_cents')
      .eq('id', event_id)
      .single();

    if (evErr || !ev) return json(res, 404, { error: 'Activitat no trobada' });
    if (ev.estat === 'esgotat' || ev.estat === 'arxivat')
      return json(res, 409, { error: 'Activitat no disponible' });

    const { data: ocupData } = await sb.rpc('places_ocupades', { p_event_id: event_id, p_hold_min: 60 });
    const ocupades = ocupData || 0;
    const disponibles = Math.max(0, (ev.cupo || 0) - ocupades);

    if (numPlaces > disponibles) {
      return json(res, 409, {
        error: 'No queden prou places',
        disponibles
      });
    }

    // Inserir reserva
    const ref = generarRef();
    const totalCents = (ev.preu_cents || 0) * numPlaces;

    const { error: insErr } = await sb.from('reserves').insert({
      id: ref,
      event_id,
      nom: String(nom).trim(),
      telefon: String(telefon).trim(),
      email: email ? String(email).trim() : null,
      places: numPlaces,
      notes: notes ? String(notes).trim() : null,
      preu_cents: ev.preu_cents || 0,
      total_cents: totalCents,
      status: 'pending',      // fase 1: sempre pending; admin confirma manualment
      lang: lang || 'ca'
    });

    if (insErr) throw insErr;

    return json(res, 201, {
      reserva_id: ref,
      status: 'pending',
      message: 'Reserva creada. Rebràs una trucada per confirmar la plaça.'
    });

  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Error creant la reserva' });
  }
}

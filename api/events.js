// api/events.js — GET públic del llistat d'events
import { json, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase } from './_lib/supabase.js';
import { cobramentEvent } from './_lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  if (!hasSupabase()) {
    // Sense Supabase, el frontend cau a data.js
    return json(res, 503, { error: 'Supabase no configurat', events: [] });
  }

  try {
    const sb = supabase();

    /* Les tres consultes alhora (abans anaven una darrere l'altra) */
    const [evRes, ocRes, otRes] = await Promise.all([
      sb.from('events').select('*').neq('estat', 'arxivat').order('data', { ascending: true }),
      sb.rpc('places_ocupades_totes', { p_hold_min: 60 }),
      sb.rpc('ocupacio_tarifes_totes')        // v10; si no existeix, es continua sense
    ]);
    if (evRes.error) throw evRes.error;
    const events = evRes.data;
    const ocupMap = new Map((ocRes.data || []).map(o => [o.event_id, o.places]));
    const ocupTarifa = new Map();
    if (!otRes.error) {
      for (const o of otRes.data || []) {
        if (!ocupTarifa.has(o.event_id)) ocupTarifa.set(o.event_id, {});
        ocupTarifa.get(o.event_id)[o.tarifa_id] = o.places;
      }
    }

    /* El preu intern (tarifes "a consultar") és només per al panell */
    const senseIntern = llista => Array.isArray(llista)
      ? llista.map(({ preu_intern_cents, ...x }) => x) : llista;

    const enriched = (events || []).map(ev => ({
      ...ev,
      tarifes: senseIntern(ev.tarifes),
      extres: senseIntern(ev.extres),
      reservades: ocupMap.get(ev.id) || 0,
      reservades_tarifa: ocupTarifa.get(ev.id) || {},
      /* Com es cobra de debò ara mateix (depèn de si Stripe està connectat) */
      cobrament: cobramentEvent(ev)
    }));

    /* Memòria cau a la CDN de Vercel: 20 s fresc + 60 s mentre es renova.
       Les places que es veuen poden anar fins a 20 s endarrerides, però la
       reserva sempre comprova l'aforament real a la base de dades. */
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=20, stale-while-revalidate=60');
    return res.status(200).send(JSON.stringify({ events: enriched }));
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Error consultant events', events: [] });
  }
}

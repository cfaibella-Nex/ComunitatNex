// api/events.js — GET públic del llistat d'events
import { json, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase } from './_lib/supabase.js';
import { cobramentEvent } from './_lib/stripe.js';

/* Dates concretes (ex. 1r i 3r dijous de mes): la llista de dies és
   sessions_afegides − sessions_tretes. A la web surt com una activitat d'un
   sol dia amb la data de la PROPERA sessió (targetes, agenda i carret no
   canvien); `sessions` porta els dies que queden per al calendari i
   `etiqueta_dates` el text "1r i 3r dijous de mes". */
const avuiISO = () => new Date().toISOString().slice(0, 10);
export function diesDates(ev) {
  const tretes = new Set(Array.isArray(ev.sessions_tretes) ? ev.sessions_tretes : []);
  return [...new Set((Array.isArray(ev.sessions_afegides) ? ev.sessions_afegides : []).map(d => String(d).slice(0, 10)))]
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !tretes.has(d)).sort();
}
function datesConcretes(ev) {
  if (ev.recurrencia !== 'dates') return {};
  const dies = diesDates(ev);
  if (!dies.length) return {};
  const hui = avuiISO();
  const futurs = dies.filter(d => d >= hui);
  return {
    data: futurs[0] || dies[dies.length - 1],
    sessions: futurs,
    etiqueta_dates: ev.data_label || null,
    data_label: null
  };
}

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
      ...datesConcretes(ev),
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

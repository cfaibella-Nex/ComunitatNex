// api/events.js — GET públic del llistat d'events
import { json, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  if (!hasSupabase()) {
    // Sense Supabase, el frontend cau a data.js
    return json(res, 503, { error: 'Supabase no configurat', events: [] });
  }

  try {
    const sb = supabase();

    // Events actius (no arxivats)
    const { data: events, error } = await sb
      .from('events')
      .select('*')
      .neq('estat', 'arxivat')
      .order('data', { ascending: true });

    if (error) throw error;

    // Ocupació: quantes places reservades per event (només reserves confirmades o pendents recents)
    const { data: ocup } = await sb.rpc('places_ocupades_totes', { p_hold_min: 60 });
    const ocupMap = new Map((ocup || []).map(o => [o.event_id, o.places]));

    const enriched = (events || []).map(ev => ({
      ...ev,
      reservades: ocupMap.get(ev.id) || 0
    }));

    return json(res, 200, { events: enriched });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: 'Error consultant events', events: [] });
  }
}

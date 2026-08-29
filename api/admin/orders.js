// api/admin/orders.js — Llistat reserves + canvi d'estat
import { json, readBody, methodNotAllowed } from '../_lib/http.js';
import { supabase, hasSupabase } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasSupabase()) return json(res, 503, { error: 'Supabase no configurat' });

  const sb = supabase();

  try {
    if (req.method === 'GET') {
      const eventId = req.query?.event_id;
      let q = sb.from('reserves').select('*').order('created_at', { ascending: false });
      if (eventId) q = q.eq('event_id', eventId);
      const { data, error } = await q;
      if (error) throw error;
      return json(res, 200, { reserves: data || [] });
    }
    if (req.method === 'PATCH') {
      const { id, status } = await readBody(req);
      if (!id || !status) return json(res, 400, { error: 'Falten id/status' });
      const validStates = ['pending','confirmed','cancelled','attended','no-show'];
      if (!validStates.includes(status)) return json(res, 400, { error: 'Status no vàlid' });
      const { data, error } = await sb.from('reserves').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return json(res, 200, { reserva: data });
    }
    return methodNotAllowed(res, ['GET','PATCH']);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: err.message || 'Error' });
  }
}

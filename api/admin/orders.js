// api/admin/orders.js — Llistat reserves + canvi d'estat (v2: auditat)
import { json, readBody, methodNotAllowed } from '../_lib/http.js';
import { supabase, hasSupabase } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/auth.js';

const VALID = ['pending','confirmed','waitlist','cancelled','attended','no-show'];

export default async function handler(req, res) {
  const actor = requireAdmin(req, res);
  if (!actor) return;
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
      const { id, status, motiu } = await readBody(req);
      if (!id || !status) return json(res, 400, { error: 'Falten id/status' });
      if (!VALID.includes(status)) return json(res, 400, { error: 'Status no vàlid' });

      // Via RPC perquè el canvi i el registre d'auditoria vagin a la mateixa
      // transacció (i l'actor quedi guardat).
      const { data, error } = await sb.rpc('canviar_estat_reserva', {
        p_id: id,
        p_status: status,
        p_actor: actor,
        p_motiu: motiu || null
      });
      if (error) throw error;
      if (!data?.ok) return json(res, 404, { error: 'Reserva no trobada' });
      return json(res, 200, { reserva: data.reserva });
    }

    return methodNotAllowed(res, ['GET','PATCH']);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: err.message || 'Error' });
  }
}

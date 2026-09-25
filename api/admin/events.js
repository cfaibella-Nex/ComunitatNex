// api/admin/events.js — CRUD events per admin (v2: auditat)
import { json, readBody, methodNotAllowed } from '../_lib/http.js';
import { supabase, hasSupabase } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  const actor = requireAdmin(req, res);
  if (!actor) return;
  if (!hasSupabase()) return json(res, 503, { error: 'Supabase no configurat' });

  try {
    const sb = supabase();

    switch (req.method) {
      case 'GET': {
        const { data, error } = await sb.from('events').select('*').order('data', { ascending: false });
        if (error) throw error;
        return json(res, 200, { events: data || [] });
      }

      // POST i PATCH comparteixen la mateixa RPC (upsert auditat)
      case 'POST':
      case 'PATCH': {
        const body = await readBody(req);
        if (!body?.id) return json(res, 400, { error: 'Falta id' });
        const { data, error } = await sb.rpc('admin_upsert_event', {
          p_event: body,
          p_actor: actor
        });
        if (error) throw error;
        return json(res, req.method === 'POST' ? 201 : 200, { event: data?.event });
      }

      case 'DELETE': {
        const { id } = await readBody(req);
        if (!id) return json(res, 400, { error: 'Falta id' });
        const { data, error } = await sb.rpc('admin_arxivar_event', { p_id: id, p_actor: actor });
        if (error) throw error;
        if (!data?.ok) return json(res, 404, { error: 'Event no trobat' });
        return json(res, 200, { ok: true });
      }

      default:
        return methodNotAllowed(res, ['GET','POST','PATCH','DELETE']);
    }
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: err.message || 'Error' });
  }
}

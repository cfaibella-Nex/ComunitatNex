// api/admin/events.js — CRUD events per admin
import { json, readBody, methodNotAllowed } from '../_lib/http.js';
import { supabase, hasSupabase } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!hasSupabase()) return json(res, 503, { error: 'Supabase no configurat' });

  const sb = supabase();

  try {
    switch (req.method) {
      case 'GET': {
        const { data, error } = await sb.from('events').select('*').order('data', { ascending: false });
        if (error) throw error;
        return json(res, 200, { events: data || [] });
      }
      case 'POST': {
        const body = await readBody(req);
        const { data, error } = await sb.from('events').insert(body).select().single();
        if (error) throw error;
        return json(res, 201, { event: data });
      }
      case 'PATCH': {
        const body = await readBody(req);
        const { id, ...rest } = body;
        if (!id) return json(res, 400, { error: 'Falta id' });
        const { data, error } = await sb.from('events').update(rest).eq('id', id).select().single();
        if (error) throw error;
        return json(res, 200, { event: data });
      }
      case 'DELETE': {
        const { id } = await readBody(req);
        if (!id) return json(res, 400, { error: 'Falta id' });
        const { error } = await sb.from('events').update({ estat: 'arxivat' }).eq('id', id);
        if (error) throw error;
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

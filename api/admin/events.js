// api/admin/events.js — CRUD events per admin (v2: auditat)
import { json, readBody, methodNotAllowed } from '../_lib/http.js';
import { supabase, hasSupabase } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/auth.js';
import { validarConfig, tarifesEvent } from '../_lib/tarifes.js';

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

        /* Tarifes, extres, model i cobrament: es validen aquí i es
           desa la versió neta, mai el que arriba tal qual. */
        const { data: ids, error: idsErr } = await sb.from('events').select('id');
        if (idsErr) throw idsErr;
        /* Activitat antiga o canvi ràpid des de la targeta: sense tarifes
           explícites se'n desa una amb el preu de sempre. */
        if (!Array.isArray(body.tarifes) || !body.tarifes.length) body.tarifes = tarifesEvent(body);
        /* Cartell: només imatges pròpies (assets o el bucket de Supabase) */
        if (body.cartell) {
          const c = String(body.cartell).trim();
          const propi = c.startsWith('/assets/') || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//i.test(c);
          if (!propi) return json(res, 400, { error: 'El cartell ha de ser una imatge pujada des del panell o de /assets/' });
          body.cartell = c;
        } else {
          body.cartell = null;
        }

        let config;
        try {
          config = validarConfig(body, { eventIds: (ids || []).map(e => e.id) });
        } catch (e) {
          return json(res, 400, { error: e.message });
        }

        const { data, error } = await sb.rpc('admin_upsert_event', {
          p_event: { ...body, ...config },
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

// api/admin/audit.js — Consulta del registre d'auditoria (només lectura)
import { json, methodNotAllowed } from '../_lib/http.js';
import { supabase, hasSupabase } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  const actor = requireAdmin(req, res);
  if (!actor) return;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!hasSupabase()) return json(res, 503, { error: 'Supabase no configurat' });

  const { taula, registre_id, limit } = req.query || {};
  const max = Math.min(parseInt(limit, 10) || 200, 1000);

  try {
    const sb = supabase();
    let q = sb.from('auditoria').select('*').order('created_at', { ascending: false }).limit(max);
    if (taula) q = q.eq('taula', taula);
    if (registre_id) q = q.eq('registre_id', registre_id);
    const { data, error } = await q;
    if (error) throw error;
    return json(res, 200, { auditoria: data || [] });
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: err.message || 'Error' });
  }
}

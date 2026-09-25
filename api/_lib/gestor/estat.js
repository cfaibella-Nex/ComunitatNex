/* gestor/estat.js — diagnòstic del gestor
   El fa servir /api/health i, a l'S2, el panell per decidir quina
   pantalla ensenya (configuració inicial, login o gestió). */

import { ambTimeout } from '../http.js';
import { hasSupabase } from '../supabase.js';
import { getGestorDb, esquemaGestor } from './db.js';
import { secretOk } from './auth.js';

export async function estatGestor() {
  const e = {
    secret: secretOk(),
    supabase: hasSupabase(),
    esquema: esquemaGestor(),
    taules_ok: false,
    usuaris: 0,
    setup_key: (process.env.GESTOR_SETUP_KEY || '').length >= 16,
    acces_antic: Boolean(process.env.ADMIN_PASS)
  };
  if (!e.supabase) return e;
  try {
    const { count, error } = await ambTimeout(
      getGestorDb().from('usuaris').select('id', { count: 'exact', head: true }), 5000, 'estat');
    if (error) e.error = error.message;
    else { e.taules_ok = true; e.usuaris = count || 0; }
  } catch (x) { e.error = String(x.message || x); }
  return e;
}

/* El gestor està llest per fer-se servir? */
export function gestorLlest(e) {
  return Boolean(e.secret && e.supabase && e.taules_ok);
}

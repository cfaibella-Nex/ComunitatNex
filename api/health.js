/* GET /api/health — diagnòstic: què està configurat i què falta.
   No mostra mai cap valor secret, només si hi és o no.
   Pensat per obrir-lo al navegador quan alguna cosa no rutlla. */

import { json, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase, credencialsSupabase, ESQUEMA } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const estat = {
    ok: true,
    esquema: ESQUEMA,
    vars: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ADMIN_USER: Boolean(process.env.ADMIN_USER),
      ADMIN_PASS: Boolean(process.env.ADMIN_PASS)
    },
    credencials_ok: false,
    esquema_ok: false,
    taules: null
  };

  if (!process.env.ADMIN_PASS) {
    estat.ok = false;
    estat.pista = 'Falta ADMIN_PASS a Vercel. Afegeix-la i fes Redeploy.';
  }

  if (!hasSupabase()) {
    estat.ok = false;
    estat.pista = estat.pista || 'Falten les variables de Supabase a Vercel.';
    return json(res, 200, estat);
  }

  // 1) Les credencials tenen el format correcte?
  try {
    credencialsSupabase();
    estat.credencials_ok = true;
  } catch (e) {
    estat.ok = false;
    estat.credencials_error = e.message;
    estat.pista = 'Revisa el valor de la variable que indica l\'error i fes Redeploy.';
    return json(res, 200, estat);
  }

  // 2) L'esquema està exposat i les taules existeixen?
  try {
    const sb = supabase();
    const out = {};
    for (const taula of ['events', 'reserves', 'auditoria']) {
      const { count, error } = await sb.from(taula).select('id', { count: 'exact', head: true });
      out[taula] = error ? `ERROR: ${error.message}` : (count ?? 0);
    }
    estat.taules = out;
    estat.esquema_ok = Object.values(out).every(v => typeof v === 'number');
    if (!estat.esquema_ok) {
      estat.ok = false;
      estat.pista = `Si l'error parla de l'esquema, afegeix "${ESQUEMA}" a Supabase → Data API → Exposed schemas. `
                  + 'Si parla de la taula, executa api/schema-full.sql.';
    }
  } catch (e) {
    estat.ok = false;
    estat.supabase_error = String(e.message || e);
  }

  return json(res, 200, estat);
}

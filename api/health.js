/* GET /api/health — diagnòstic: què està configurat i què falta.
   No mostra mai cap valor secret, només si hi és o no.
   Pensat per obrir-lo al navegador quan alguna cosa no rutlla. */

import { json, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase, credencialsSupabase, ESQUEMA } from './_lib/supabase.js';
import { estatGestor, gestorLlest } from './_lib/gestor/estat.js';
import { modeStripe } from './_lib/stripe.js';

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
    /* 'off' | 'test' | 'live' — sense mostrar cap clau */
    stripe: modeStripe(),
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
    /* Migració v10 (tarifes i pagament) executada? */
    const { error: v10 } = await sb.from('events').select('model, tarifes').limit(1);
    estat.inscripcions_v10 = v10 ? `FALTA: executa api/schema-v10-inscripcions.sql (${v10.message})` : true;
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

  // 3) Amb quin projecte parla de debò i quins bucket hi veu?
  //    És la comprovació que desfà la confusió de tenir-ne tres oberts.
  try {
    const { url } = credencialsSupabase();
    estat.projecte = new URL(url).hostname.split('.')[0];
    const sb = supabase();
    const { data, error } = await sb.storage.listBuckets();
    if (error) {
      estat.storage_error = error.message;
    } else {
      estat.buckets = (data || []).map(b => `${b.name}${b.public ? ' (públic)' : ' (privat)'}`);
      estat.bucket_fotos = (data || []).some(b => b.name === 'comunitat-media');
      if (!estat.bucket_fotos) {
        estat.ok = false;
        estat.pista = `Falta el bucket "comunitat-media" al projecte ${estat.projecte}. `
                    + 'Comprova que el crees en aquest projecte i no en un altre.';
      }
    }
  } catch (e) {
    estat.storage_error = String(e.message || e);
  }

  // 4) Estat del gestor (S1: taules i secret; encara no actiu)
  try {
    const g = await estatGestor();
    estat.gestor = { ...g, llest: gestorLlest(g) };
    if (g.taules_ok && g.usuaris === 0 && g.secret) {
      estat.pista = estat.pista || 'Gestor llest i sense usuaris: falta crear el primer amb GESTOR_SETUP_KEY.';
    }
  } catch (e) {
    estat.gestor = { error: String(e.message || e) };
  }

  return json(res, 200, estat);
}

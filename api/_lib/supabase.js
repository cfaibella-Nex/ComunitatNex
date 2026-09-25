/* api/_lib/supabase.js — client de servidor
   ─────────────────────────────────────────────────────────
   Les taules de Comunitat viuen a l'esquema `comunitat` del
   projecte Supabase compartit amb IntraNex. Cal tenir-lo a
   Supabase → Data API → Exposed schemas.

   Fem servir la SERVICE_ROLE, no l'anon: les taules tenen RLS
   actiu i cap política, i l'esquema revoca tot l'accés a anon.

   El client es crea de forma mandrosa i MAI es llança res en
   importar el mòdul. Si es llancés a l'import, tota la funció
   petaria amb un FUNCTION_INVOCATION_FAILED opac, sense arribar
   a dir què falla. */

import { createClient } from '@supabase/supabase-js';

const SCHEMA = 'comunitat';

let _client = null;

export function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/* URL i clau netes i validades, amb missatges que diuen què passa.
   Les claus enganxades al panell de Vercel arrosseguen sovint
   salts de línia o espais: es netegen aquí i no a cada ús. */
export function credencialsSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/^["']|["']$/g, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\s+/g, '');

  if (!url) throw new Error('Falta SUPABASE_URL a les variables d\'entorn de Vercel');
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY a les variables d\'entorn de Vercel');

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    throw new Error(`SUPABASE_URL no té el format esperat (https://xxxx.supabase.co): "${url}"`);
  }
  /* La service_role és un JWT: tres parts separades per punts.
     Si algú enganxa la anon o el Project ID, es detecta aquí. */
  if (key.split('.').length !== 3) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no sembla una clau vàlida (ha de ser un JWT de tres parts)');
  }

  return { url: url.replace(/\/$/, ''), key };
}

export function supabase() {
  if (_client) return _client;
  const { url, key } = credencialsSupabase();
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: SCHEMA }
  });
  return _client;
}

export const ESQUEMA = SCHEMA;

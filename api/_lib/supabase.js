// api/_lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Les taules de Comunitat viuen a l'esquema `comunitat` del projecte
// Supabase compartit amb IntraNex. Així els dos productes no es trepitgen.
// Cal tenir `comunitat` a Supabase → Settings → API → Exposed schemas.
const SCHEMA = 'comunitat';

let _client = null;

export function hasSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function supabase() {
  if (!hasSupabase()) {
    throw new Error('Supabase no configurat (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
        db: { schema: SCHEMA }
      }
    );
  }
  return _client;
}

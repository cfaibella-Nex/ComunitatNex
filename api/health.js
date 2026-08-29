// api/health.js — GET status
import { json } from './_lib/http.js';
import { hasSupabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  return json(res, 200, {
    ok: true,
    time: new Date().toISOString(),
    supabase: hasSupabase() ? 'configurat' : 'fallback-estatic',
    version: '0.1.0'
  });
}

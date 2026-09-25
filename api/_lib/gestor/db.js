/* gestor/db.js — accés a l'esquema del gestor
   ─────────────────────────────────────────────────────────
   A Comunitat, el gestor viu al mateix esquema `comunitat` que
   les reserves, així que es reaprofita el client d'_lib/supabase.js
   en lloc de crear-ne un de nou.

   Si algun dia es replica a un altre client dins del mateix
   projecte de Supabase, aquí és on es canvia l'esquema. */

import { supabase, hasSupabase, ESQUEMA } from '../supabase.js';

export function esquemaGestor() {
  return ESQUEMA;
}

export function getGestorDb() {
  return supabase();
}

/* Storage viu fora dels esquemes de Postgres */
export function getStorage() {
  return supabase().storage;
}

export const BUCKET = 'comunitat-media';

export { hasSupabase };

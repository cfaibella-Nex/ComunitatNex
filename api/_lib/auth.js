// api/_lib/auth.js — qui pot entrar al panell
//
// Dues vies, en aquest ordre:
//   1. Sessió d'usuari (correu + contrasenya, gestor/auth.js). És la bona:
//      cada persona amb el seu nom i el seu rol, i l'auditoria diu qui ha
//      fet cada canvi.
//   2. Accés antic (usuari i contrasenya compartits, ADMIN_USER/ADMIN_PASS).
//      Només funciona mentre no hi hagi cap usuari creat: és el camí per
//      entrar el primer dia. Quan existeix el primer usuari, es tanca sol.
//
// autoritzar() torna { actor, usuari } o null (i ja ha respost 401/403).

import { usuariDeSessio, pot } from './gestor/auth.js';
import { getGestorDb } from './gestor/db.js';

/* Quants usuaris hi ha, amb memòria curta per no consultar-ho a cada petició */
let _usuaris = { n: null, t: 0 };
export async function hiHaUsuaris() {
  if (_usuaris.n !== null && Date.now() - _usuaris.t < 30000) return _usuaris.n > 0;
  try {
    const { data, count, error } = await getGestorDb().from('usuaris').select('id', { count: 'exact' }).limit(1);
    if (error || !Array.isArray(data)) return false;   // sense taula d'usuaris → accés antic
    _usuaris = { n: count || 0, t: Date.now() };
    return _usuaris.n > 0;
  } catch { return false; }
}
export function oblidarRecompte() { _usuaris = { n: null, t: 0 }; }

export function actorDe(u) { return `${u.nom} <${u.email}>`; }

function envia(res, status, body, extra = {}) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.status(status).send(JSON.stringify(body));
}

function basicValid(req) {
  const pass = process.env.ADMIN_PASS;
  if (!pass) return null;
  const user = process.env.ADMIN_USER || 'admin';
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return null;
  try {
    const [u, p] = Buffer.from(header.slice(6), 'base64').toString('utf-8').split(':');
    if (u === user && p === pass) return u;
  } catch { /* res */ }
  return null;
}

/* permis: 'contingut' | 'esborrar' | 'reserves' | 'usuaris' | 'auditoria' */
export async function autoritzar(req, res, permis = 'reserves') {
  const u = await usuariDeSessio(req);
  if (u) {
    if (u.ha_de_canviar) { envia(res, 403, { error: 'Cal canviar la contrasenya temporal', codi: 'cal_canviar_contrasenya' }); return null; }
    if (!pot(u, permis)) { envia(res, 403, { error: 'El teu rol no permet fer això', codi: 'sense_permis' }); return null; }
    return { actor: actorDe(u), usuari: u };
  }

  const antic = basicValid(req);
  if (antic) {
    if (await hiHaUsuaris()) {
      envia(res, 401, { error: "L'accés compartit ja no funciona: entra amb el teu correu", codi: 'acces_antic_tancat' });
      return null;
    }
    return { actor: antic, usuari: { nom: antic, rol: 'admin', antic: true } };
  }

  envia(res, 401, { error: 'Autenticació requerida', codi: 'no_autenticat' });
  return null;
}

/* Compatibilitat: codi antic que encara el cridi */
export async function requireAdmin(req, res) {
  const a = await autoritzar(req, res, 'reserves');
  return a ? a.actor : null;
}

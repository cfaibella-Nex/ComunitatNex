/* gestor/auth.js — usuaris, contrasenyes i sessions
   ─────────────────────────────────────────────────────────
   Portat de BookingFEB. Diferència: allà els handlers fan servir
   l'API Web de Vercel (request.headers.get), aquí fem servir
   l'estil Node (req.headers.cookie), com la resta de Comunitat.

   · Contrasenyes: scrypt amb sal aleatòria. Els paràmetres viatgen
     dins del hash, així que es poden endurir sense trencar els
     usuaris existents (es refà el hash al següent login).
   · Sessió: token signat amb HMAC dins d'una cookie httpOnly,
     SameSite=Strict, limitada a /api. El JavaScript de la pàgina
     no la pot llegir i una web aliena no la pot fer servir. Això
     és el que substitueix el Basic Auth amb usuari compartit.
   · Cada petició torna a llegir l'usuari: desactivar-lo o
     canviar-li la contrasenya talla les sessions obertes.
   · 5 intents fallits → bloqueig de 15 minuts.

   Variables d'entorn:
     GESTOR_SECRET     ≥ 32 caràcters aleatoris (signa les sessions)
     GESTOR_SETUP_KEY  clau d'un sol ús per crear el primer usuari */

import { scrypt as _scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { getGestorDb } from './db.js';

const scrypt = promisify(_scrypt);

const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 32 };
const MAXMEM = 96 * 1024 * 1024;
export const SESSIO_SEG = 12 * 60 * 60;
const COOKIE = 'comunitat_sessio';
const MAX_INTENTS = 5;
const BLOQUEIG_MIN = 15;

export const ROLS = ['admin', 'responsable', 'editor'];

export const ROL_NOM = {
  admin:       'Administració',
  responsable: 'Responsable',
  editor:      'Editor'
};

/* Què pot fer cada rol. Un sol lloc on mirar-ho.
   L'editor pot preparar activitats però no esborrar-les ni tocar
   dades de persones. */
export const PERMISOS = {
  contingut: ['admin', 'responsable', 'editor'],
  esborrar:  ['admin', 'responsable'],
  reserves:  ['admin', 'responsable'],
  usuaris:   ['admin', 'responsable']
};

export function pot(usuari, accio) {
  return Boolean(usuari && PERMISOS[accio]?.includes(usuari.rol));
}

/* ── Secret ──────────────────────────────────────────────── */
export function secretOk() {
  return (process.env.GESTOR_SECRET || '').length >= 32;
}
function secret() {
  const s = process.env.GESTOR_SECRET || '';
  if (s.length < 32) throw new Error('GESTOR_SECRET absent o massa curt (mínim 32 caràcters)');
  return s;
}

/* ── Contrasenyes ────────────────────────────────────────── */
const b64 = buf => Buffer.from(buf).toString('base64');

export async function hashContrasenya(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(String(pw), salt, SCRYPT.keylen,
    { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: MAXMEM });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${b64(salt)}$${b64(key)}`;
}

export async function verificarContrasenya(pw, hash) {
  const parts = String(hash || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const esperada = Buffer.from(keyB64, 'base64');
  let key;
  try {
    key = await scrypt(String(pw), Buffer.from(saltB64, 'base64'), esperada.length,
      { N: Number(N), r: Number(r), p: Number(p), maxmem: MAXMEM });
  } catch { return false; }
  return key.length === esperada.length && timingSafeEqual(key, esperada);
}

/* Si els paràmetres del hash són més febles que els actuals, cal refer-lo */
export function hashAntic(hash) {
  const [, N, r, p] = String(hash || '').split('$');
  return Number(N) !== SCRYPT.N || Number(r) !== SCRYPT.r || Number(p) !== SCRYPT.p;
}

/* Hash de joguina per igualar el temps de resposta quan l'email no
   existeix: sense això, es podria endevinar quins correus són
   d'usuaris pel temps que triga el servidor a dir que no. */
let _ficticia = null;
async function hashFicticia() {
  if (!_ficticia) _ficticia = await hashContrasenya(randomBytes(12).toString('hex'));
  return _ficticia;
}

export function validarNovaContrasenya(pw) {
  const s = String(pw || '');
  if (s.length < 10) return 'La contrasenya ha de tenir almenys 10 caràcters';
  if (s.length > 200) return 'Contrasenya massa llarga';
  if (/^(.)\1+$/.test(s)) return 'Contrasenya massa simple';
  return null;
}

/* Contrasenya temporal llegible (sense 0/O, 1/l) per dictar-la
   per telèfon sense confusions */
export function contrasenyaTemporal() {
  const alfabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alfabet[bytes[i] % alfabet.length];
    if (i === 3 || i === 7) out += '-';
  }
  return out;
}

/* ── Sessions ────────────────────────────────────────────── */
const b64u = s => Buffer.from(s).toString('base64url');

function signar(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function crearToken(usuari) {
  const payload = b64u(JSON.stringify({
    u: usuari.id,
    v: usuari.sessio_versio,
    e: Math.floor(Date.now() / 1000) + SESSIO_SEG
  }));
  return `${payload}.${signar(payload)}`;
}

export function llegirToken(token) {
  if (!token || typeof token !== 'string' || !secretOk()) return null;
  const i = token.indexOf('.');
  if (i < 1) return null;
  const payload = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const bona = Buffer.from(signar(payload));
  if (sig.length !== bona.length || !timingSafeEqual(sig, bona)) return null;
  let d;
  try { d = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (!d || typeof d.e !== 'number' || d.e < Date.now() / 1000) return null;
  return d;
}

export function cookieSessio(token) {
  return `${COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSIO_SEG}`;
}
export function cookieEsborrar() {
  return `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/* Estil Node: la cookie arriba com una cadena a req.headers.cookie */
function llegirCookie(req, nom) {
  const h = req.headers?.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === nom) return part.slice(i + 1).trim();
  }
  return null;
}

const CAMPS_USUARI = 'id, email, nom, rol, actiu, ha_de_canviar, sessio_versio, ultim_acces';

/* Usuari de la sessió, o null. No llança mai: un gestor encara no
   configurat simplement no té sessions. */
export async function usuariDeSessio(req) {
  try {
    const d = llegirToken(llegirCookie(req, COOKIE));
    if (!d) return null;
    const { data, error } = await getGestorDb()
      .from('usuaris').select(CAMPS_USUARI).eq('id', d.u).maybeSingle();
    if (error || !data || !data.actiu || data.sessio_versio !== d.v) return null;
    return data;
  } catch {
    return null;
  }
}

/* ── Login ───────────────────────────────────────────────── */
export async function login(email, contrasenya) {
  const db = getGestorDb();
  const correu = String(email || '').trim().toLowerCase().slice(0, 160);
  const { data: u, error } = await db.from('usuaris').select('*').eq('email', correu).maybeSingle();
  if (error) throw new Error(error.message);

  if (!u || !u.actiu) {
    await verificarContrasenya(contrasenya, await hashFicticia());
    return { error: 'credencials' };
  }

  if (u.bloquejat_fins && new Date(u.bloquejat_fins) > new Date()) {
    return { error: 'bloquejat', fins: u.bloquejat_fins };
  }

  const ok = await verificarContrasenya(contrasenya, u.hash);
  if (!ok) {
    const intents = (u.intents || 0) + 1;
    const bloqueja = intents >= MAX_INTENTS;
    await db.from('usuaris').update({
      intents: bloqueja ? 0 : intents,
      bloquejat_fins: bloqueja ? new Date(Date.now() + BLOQUEIG_MIN * 60000).toISOString() : null
    }).eq('id', u.id);
    return bloqueja
      ? { error: 'bloquejat', fins: new Date(Date.now() + BLOQUEIG_MIN * 60000).toISOString() }
      : { error: 'credencials', queden: MAX_INTENTS - intents };
  }

  const canvis = { intents: 0, bloquejat_fins: null, ultim_acces: new Date().toISOString() };
  /* Paràmetres de hash antics → es refà ara que tenim la contrasenya */
  if (hashAntic(u.hash)) canvis.hash = await hashContrasenya(contrasenya);
  await db.from('usuaris').update(canvis).eq('id', u.id);

  const { hash, intents, bloquejat_fins, ...net } = u;
  return { usuari: net, token: crearToken(u) };
}

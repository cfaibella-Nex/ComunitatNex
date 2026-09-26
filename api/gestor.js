// api/gestor.js — usuaris del panell: primer admin, login, contrasenya i gestió
//
//   GET  ?op=estat        públic: què ha d'ensenyar la pantalla d'entrada
//   POST ?op=setup        crea el primer admin (GESTOR_SETUP_KEY, un sol cop)
//   POST ?op=login        correu + contrasenya → cookie de sessió
//   POST ?op=logout
//   GET  ?op=jo           qui soc
//   POST ?op=contrasenya  canviar la pròpia (obligatori amb una temporal)
//   GET  ?op=usuaris      llistat (només admin)
//   POST ?op=usuari       crear · reiniciar · activar · desactivar · rol (només admin)
//
// Portat de BookingFEB i adaptat a l'estil (req, res) de Comunitat.
// Les contrasenyes temporals es mostren UNA vegada a qui crea l'usuari:
// la web no envia res a ningú, l'admin les passa per on vulgui.
import { json, readBody } from './_lib/http.js';
import { getGestorDb } from './_lib/gestor/db.js';
import { estatGestor } from './_lib/gestor/estat.js';
import {
  ROLS, ROL_NOM, pot, secretOk, login, usuariDeSessio, crearToken, cookieSessio, cookieEsborrar,
  hashContrasenya, verificarContrasenya, validarNovaContrasenya, contrasenyaTemporal
} from './_lib/gestor/auth.js';
import { actorDe, oblidarRecompte } from './_lib/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const net = (v, max) => String(v ?? '').trim().slice(0, max);

const MISSATGES = {
  credencials: 'Correu o contrasenya incorrectes',
  bloquejat: 'Massa intents. Torna-ho a provar d’aquí a 15 minuts.',
  falta_secret: 'Falta GESTOR_SECRET a Vercel',
  setup_no_disponible: 'La creació del primer usuari no està activada (GESTOR_SETUP_KEY)',
  clau_incorrecta: 'Clau d’instal·lació incorrecta',
  ja_inicialitzat: 'Ja hi ha usuaris creats: entra amb el teu correu',
  dades_invalides: 'Revisa el nom i el correu',
  email_existent: 'Ja hi ha un usuari amb aquest correu',
  contrasenya_actual_incorrecta: 'La contrasenya actual no és correcta',
  contrasenya_igual: 'La nova ha de ser diferent de l’actual',
  rol_no_permes: 'Rol no vàlid',
  no_sobre_tu: 'No pots canviar el teu propi rol ni desactivar-te',
  ultim_admin: 'Ha de quedar almenys un admin actiu',
  no_trobat: 'Usuari no trobat',
  no_autenticat: 'Cal entrar',
  sense_permis: 'El teu rol no permet fer això',
  cal_canviar_contrasenya: 'Cal canviar la contrasenya temporal',
  peticio_no_valida: 'Petició no vàlida',
  origen_no_permes: 'Origen no permès'
};
const err = (res, codi, status, extra = {}) => json(res, status, { error: extra.detall || MISSATGES[codi] || codi, codi, ...extra });

async function rpc(nom, args) {
  const { data, error } = await getGestorDb().rpc(nom, args);
  if (error) throw new Error(error.message);
  return data;
}

export default async function handler(req, res) {
  try {
    const op = String(req.query?.op || '');

    if (req.method === 'POST') {
      /* Capçalera pròpia: un formulari d'una web aliena no la pot posar */
      if (req.headers['x-gestor'] !== '1') return err(res, 'peticio_no_valida', 400);
      const origen = req.headers.origin;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      if (origen && new URL(origen).host !== host) return err(res, 'origen_no_permes', 403);
    }
    const cos = req.method === 'POST' ? await readBody(req).catch(() => ({})) : {};

    /* ── Públiques ── */
    if (op === 'estat' && req.method === 'GET') {
      const e = await estatGestor();
      const u = e.taules_ok ? await usuariDeSessio(req) : null;
      return json(res, 200, {
        gestor: e.secret && e.taules_ok,
        inicialitzat: e.usuaris > 0,
        setup_disponible: e.secret && e.taules_ok && e.setup_key && e.usuaris === 0,
        acces_antic: e.acces_antic && e.usuaris === 0,
        usuari: u, rols: ROL_NOM,
        falta: !e.secret ? 'GESTOR_SECRET' : !e.taules_ok ? 'gestor-schema.sql' : null
      });
    }
    if (op === 'setup' && req.method === 'POST') return opSetup(req, res, cos);
    if (op === 'login' && req.method === 'POST') {
      if (!secretOk()) return err(res, 'falta_secret', 500);
      const r = await login(cos.email, String(cos.contrasenya || ''));
      if (r.error) return err(res, r.error, r.error === 'bloquejat' ? 429 : 401, { queden: r.queden });
      res.setHeader('Set-Cookie', cookieSessio(r.token));
      return json(res, 200, { usuari: r.usuari });
    }
    if (op === 'logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', cookieEsborrar());
      return json(res, 200, { ok: true });
    }

    /* ── Amb sessió ── */
    const u = await usuariDeSessio(req);
    if (!u) return err(res, 'no_autenticat', 401);
    if (u.ha_de_canviar && !['jo', 'contrasenya'].includes(op)) return err(res, 'cal_canviar_contrasenya', 403);

    switch (`${req.method} ${op}`) {
      case 'GET jo':           return json(res, 200, { usuari: u, rols: ROL_NOM });
      case 'POST contrasenya': return opContrasenya(res, u, cos);
      case 'GET usuaris':      return pot(u, 'usuaris') ? opUsuaris(res) : err(res, 'sense_permis', 403);
      case 'POST usuari':      return pot(u, 'usuaris') ? opUsuari(res, u, cos) : err(res, 'sense_permis', 403);
    }
    return err(res, 'operacio_desconeguda', 404);
  } catch (e) {
    console.error('/api/gestor:', e);
    return json(res, 500, { error: 'Error del servidor', detall: String(e.message || e).slice(0, 300) });
  }
}

/* ── Primer admin ── */
async function opSetup(req, res, cos) {
  const clau = process.env.GESTOR_SETUP_KEY || '';
  if (clau.length < 16) return err(res, 'setup_no_disponible', 403);
  if (!secretOk()) return err(res, 'falta_secret', 500);
  if (String(cos.clau || '') !== clau) return err(res, 'clau_incorrecta', 403);

  const { count } = await getGestorDb().from('usuaris').select('id', { count: 'exact', head: true });
  if (count > 0) return err(res, 'ja_inicialitzat', 409);

  const email = net(cos.email, 160).toLowerCase();
  const nom = net(cos.nom, 80);
  if (!EMAIL_RE.test(email) || !nom) return err(res, 'dades_invalides', 400);
  const problema = validarNovaContrasenya(cos.contrasenya);
  if (problema) return err(res, 'contrasenya_feble', 400, { detall: problema });

  const r = await rpc('admin_usuari', {
    p_accio: 'crear', p_id: null, p_actor: 'instal·lació',
    p_dades: { email, nom, rol: 'admin', hash: await hashContrasenya(cos.contrasenya), ha_de_canviar: false }
  });
  if (!r?.ok) return err(res, r?.error || 'error', 400);
  oblidarRecompte();
  return json(res, 200, { ok: true });
}

async function opContrasenya(res, u, cos) {
  const { data: fila } = await getGestorDb().from('usuaris').select('hash').eq('id', u.id).single();
  if (!(await verificarContrasenya(String(cos.actual || ''), fila?.hash))) return err(res, 'contrasenya_actual_incorrecta', 400);
  const problema = validarNovaContrasenya(cos.nova);
  if (problema) return err(res, 'contrasenya_feble', 400, { detall: problema });
  if (cos.nova === cos.actual) return err(res, 'contrasenya_igual', 400);

  const r = await rpc('admin_usuari', {
    p_accio: 'hash', p_id: u.id, p_actor: actorDe(u),
    p_dades: { hash: await hashContrasenya(cos.nova), ha_de_canviar: false }
  });
  if (!r?.ok) return err(res, r?.error || 'error', 400);
  /* El canvi invalida les altres sessions; aquesta es renova */
  res.setHeader('Set-Cookie', cookieSessio(crearToken(r.usuari)));
  return json(res, 200, { ok: true, usuari: r.usuari });
}

async function opUsuaris(res) {
  const { data, error } = await getGestorDb().from('usuaris')
    .select('id, email, nom, rol, actiu, ha_de_canviar, bloquejat_fins, ultim_acces, created_at')
    .order('created_at');
  if (error) throw new Error(error.message);
  return json(res, 200, { usuaris: data || [], rols: ROL_NOM });
}

async function opUsuari(res, u, cos) {
  const accio = String(cos.accio || '');
  const db = getGestorDb();

  if (accio === 'crear') {
    const email = net(cos.email, 160).toLowerCase();
    const nom = net(cos.nom, 80);
    if (!EMAIL_RE.test(email) || !nom) return err(res, 'dades_invalides', 400);
    if (!ROLS.includes(cos.rol)) return err(res, 'rol_no_permes', 400);
    const temporal = contrasenyaTemporal();
    const r = await rpc('admin_usuari', {
      p_accio: 'crear', p_id: null, p_actor: actorDe(u),
      p_dades: { email, nom, rol: cos.rol, hash: await hashContrasenya(temporal), ha_de_canviar: true }
    });
    if (!r?.ok) return err(res, r?.error || 'error', 400);
    oblidarRecompte();
    return json(res, 200, { ok: true, usuari: r.usuari, temporal });
  }

  const { data: obj } = await db.from('usuaris').select('id, rol, actiu').eq('id', String(cos.id || '')).maybeSingle();
  if (!obj) return err(res, 'no_trobat', 404);
  if (obj.id === u.id && accio !== 'reiniciar') return err(res, 'no_sobre_tu', 400);

  /* No es pot deixar el panell sense cap admin actiu */
  const treuAdmin = obj.rol === 'admin' && obj.actiu &&
    (accio === 'desactivar' || (accio === 'rol' && cos.rol !== 'admin'));
  if (treuAdmin) {
    const { count } = await db.from('usuaris').select('id', { count: 'exact', head: true })
      .eq('rol', 'admin').eq('actiu', true);
    if ((count || 0) <= 1) return err(res, 'ultim_admin', 400);
  }

  let r, temporal;
  if (accio === 'reiniciar') {
    temporal = contrasenyaTemporal();
    r = await rpc('admin_usuari', { p_accio: 'hash', p_id: obj.id, p_actor: actorDe(u),
      p_dades: { hash: await hashContrasenya(temporal), ha_de_canviar: true } });
  } else if (accio === 'activar' || accio === 'desactivar') {
    r = await rpc('admin_usuari', { p_accio: 'actiu', p_id: obj.id, p_actor: actorDe(u),
      p_dades: { actiu: accio === 'activar' } });
  } else if (accio === 'rol') {
    if (!ROLS.includes(cos.rol)) return err(res, 'rol_no_permes', 400);
    r = await rpc('admin_usuari', { p_accio: 'rol', p_id: obj.id, p_actor: actorDe(u), p_dades: { rol: cos.rol } });
  } else {
    return err(res, 'accio_desconeguda', 400);
  }
  if (!r?.ok) return err(res, r?.error || 'error', 400);
  const { hash, ...usuari } = r.usuari || {};
  return json(res, 200, { ok: true, usuari, temporal });
}

// api/admin/orders.js — reserves: llistat, estat, cobraments, link de pagament i llista
//
//   GET   ?event_id=…                 → reserves (+ si Stripe està actiu)
//   GET   ?llista=<event_id>&data=…   → assistència d'aquell dia
//   PATCH { id, status }              → canvi d'estat (com sempre)
//   PATCH { accio: 'pagament', id, import_cents, metode, nota }
//   PATCH { accio: 'anular_pagament', id, motiu }
//   PATCH { accio: 'link', id, import_cents }        → crea link Stripe
//   PATCH { accio: 'assistencia', id, data, present } → true / false / null
//   GET   ?llista=<event_id>&des=…&fins=…   → assistència d'un període (seguiment)
//   PATCH { accio: 'afegir_persona', event_id, nom, telefon, email, tarifa_id, places, origen, alta, observacions }
//   PATCH { accio: 'editar', id, camps: { nom, telefon, email, observacions, origen } }
//   PATCH { accio: 'sessio', event_id, data, operacio: 'afegir' | 'treure' }
//
// Tot passa per RPC: el canvi i el registre d'auditoria (amb qui l'ha
// fet) van a la mateixa transacció.
import { json, readBody, methodNotAllowed } from '../_lib/http.js';
import { supabase, hasSupabase } from '../_lib/supabase.js';
import { autoritzar } from '../_lib/auth.js';
import { modeStripe, stripeActiu, crearLinkPagament, HORES_LINK } from '../_lib/stripe.js';
import { calcularInscripcio, tarifesEvent } from '../_lib/tarifes.js';

const VALID = ['pending','confirmed','waitlist','cancelled','attended','no-show'];
const METODES = ['efectiu','bizum','transferencia','targeta','altres'];
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function urlBase(req) {
  const env = (process.env.SITE_URL || '').trim().replace(/\/$/, '');
  if (env) return env;
  return `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
}
const enter = v => Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN;

export default async function handler(req, res) {
  const a = await autoritzar(req, res, 'reserves');
  if (!a) return;
  const actor = a.actor;
  if (!hasSupabase()) return json(res, 503, { error: 'Supabase no configurat' });

  try {
    const sb = supabase();

    if (req.method === 'GET') {
      const llista = req.query?.llista;
      if (llista) {
        /* Un dia (?data=) o un període (?des=&fins=) */
        const data = String(req.query?.data || '');
        const des = String(req.query?.des || data), fins = String(req.query?.fins || data);
        if (!DATA_RE.test(des) || !DATA_RE.test(fins)) return json(res, 400, { error: 'Data no vàlida' });
        const { data: res1, error } = await sb.from('reserves').select('id').eq('event_id', llista);
        if (error) throw error;
        const ids = (res1 || []).map(r => r.id);
        if (!ids.length) return json(res, 200, { assistencia: [] });
        const { data: as, error: e2 } = await sb.from('assistencia')
          .select('reserva_id, data, present, actor, updated_at')
          .gte('data', des).lte('data', fins).in('reserva_id', ids);
        if (e2) throw e2;
        return json(res, 200, { assistencia: as || [] });
      }

      const eventId = req.query?.event_id;
      let q = sb.from('reserves').select('*').order('created_at', { ascending: false });
      if (eventId) q = q.eq('event_id', eventId);
      const { data, error } = await q;
      if (error) throw error;
      return json(res, 200, { reserves: data || [], stripe: modeStripe() });
    }

    if (req.method !== 'PATCH') return methodNotAllowed(res, ['GET', 'PATCH']);

    const body = await readBody(req);
    const { id, accio } = body || {};
    const senseId = ['afegir_persona', 'sessio'];
    if (!id && !senseId.includes(accio)) return json(res, 400, { error: 'Falta id' });

    const rpc = async (nom, params) => {
      const { data, error } = await sb.rpc(nom, params);
      if (error) throw error;
      return data;
    };

    switch (accio || 'estat') {
      case 'estat': {
        const { status, motiu } = body;
        if (!VALID.includes(status)) return json(res, 400, { error: 'Status no vàlid' });
        const out = await rpc('canviar_estat_reserva', { p_id: id, p_status: status, p_actor: actor, p_motiu: motiu || null });
        if (!out?.ok) return json(res, 404, { error: 'Reserva no trobada' });
        return json(res, 200, { reserva: out.reserva });
      }

      case 'pagament': {
        const imp = enter(body.import_cents);
        if (!(imp >= 0) || imp > 1000000) return json(res, 400, { error: 'Import no vàlid' });
        if (!METODES.includes(body.metode)) return json(res, 400, { error: 'Mètode no vàlid' });
        const out = await rpc('admin_registrar_pagament', {
          p_id: id, p_import: imp, p_metode: body.metode, p_actor: actor,
          p_nota: body.nota ? String(body.nota).slice(0, 200) : null
        });
        if (!out?.ok) return json(res, 409, { error: 'No es pot registrar el cobrament d\'aquesta reserva' });
        return json(res, 200, { reserva: out.reserva });
      }

      case 'anular_pagament': {
        const out = await rpc('admin_anular_pagament', {
          p_id: id, p_actor: actor, p_motiu: body.motiu ? String(body.motiu).slice(0, 200) : null
        });
        if (!out?.ok) return json(res, 409, { error: 'Aquesta reserva no consta com a pagada' });
        return json(res, 200, { reserva: out.reserva });
      }

      case 'link': {
        if (!stripeActiu()) return json(res, 409, { error: 'Stripe no està connectat. Mira STRIPE-SETUP.md.' });
        const imp = enter(body.import_cents);
        if (!(imp >= 50) || imp > 1000000) return json(res, 400, { error: 'L\'import mínim amb targeta és 0,50 €' });

        const { data: r, error } = await sb.from('reserves').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!r) return json(res, 404, { error: 'Reserva no trobada' });
        if (r.payment_status === 'paid') return json(res, 409, { error: 'Aquesta reserva ja està pagada' });
        if (['cancelled', 'waitlist'].includes(r.status)) return json(res, 409, { error: 'La reserva no està activa' });
        const { data: ev, error: e2 } = await sb.from('events').select('id, titol, data').eq('id', r.event_id).maybeSingle();
        if (e2) throw e2;

        const base = urlBase(req);
        const sess = await crearLinkPagament({
          ref: r.id, event: ev || { id: r.event_id }, importCents: imp, lang: r.lang, email: r.email,
          successUrl: `${base}/confirmacio.html?ref=${r.id}&pagament=ok`,
          cancelUrl:  `${base}/confirmacio.html?ref=${r.id}&pagament=ko`
        });
        const caduca = new Date(Date.now() + HORES_LINK * 3600 * 1000).toISOString();
        const out = await rpc('admin_desar_link', {
          p_id: r.id, p_import: imp, p_session: sess.id, p_url: sess.url, p_caduca: caduca, p_actor: actor
        });
        if (!out?.ok) return json(res, 409, { error: 'No s\'ha pogut desar el link' });
        return json(res, 200, { reserva: out.reserva, url: sess.url, caduca });
      }

      case 'assistencia': {
        const data = String(body.data || '');
        if (!DATA_RE.test(data)) return json(res, 400, { error: 'Data no vàlida' });
        const present = body.present === true ? true : body.present === false ? false : null;
        const out = await rpc('admin_marcar_assistencia', { p_reserva: id, p_data: data, p_present: present, p_actor: actor });
        if (!out?.ok) return json(res, 409, { error: out?.error === 'reserva_no_activa' ? 'La reserva no està activa' : 'Reserva no trobada' });
        return json(res, 200, { ok: true });
      }

      case 'afegir_persona': {
        const { data: ev, error } = await sb.from('events').select('*').eq('id', String(body.event_id || '')).maybeSingle();
        if (error) throw error;
        if (!ev) return json(res, 404, { error: 'Activitat no trobada' });
        const nom = String(body.nom || '').trim().slice(0, 120);
        if (nom.length < 2) return json(res, 400, { error: 'Falta el nom' });
        const telefon = String(body.telefon || '').replace(/[\s\-()]/g, '').slice(0, 20);
        if (telefon && !/^\+?\d{9,15}$/.test(telefon)) return json(res, 400, { error: 'Telèfon no vàlid' });
        const email = body.email ? String(body.email).trim().slice(0, 160) : null;
        const origen = ['telefon', 'presencial', 'web', 'altres'].includes(body.origen) ? body.origen : 'telefon';
        const tarifa = String(body.tarifa_id || tarifesEvent(ev)[0].id);
        const places = Math.max(1, Math.min(10, parseInt(body.places, 10) || 1));
        let calc;
        try { calc = calcularInscripcio({ ...ev, tarifes: (ev.tarifes || []).map(t => ({ ...t, estat: 'disponible' })) }, { [tarifa]: places }, {}); }
        catch (e) { return json(res, 400, { error: e.message }); }

        const ref = () => { const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = 'NX-'; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
        let out;
        for (let i = 0; i < 5; i++) {
          out = await rpc('admin_afegir_persona', {
            p_ref: ref(), p_event_id: ev.id, p_nom: nom, p_telefon: telefon, p_email: email,
            p_linies: calc.detall, p_places: calc.places, p_total_cents: calc.totalCents, p_consultar: calc.consultar,
            p_origen: origen, p_alta: body.alta !== false,
            p_observacions: body.observacions ? String(body.observacions).slice(0, 500) : null, p_actor: actor
          });
          if (out?.error !== 'ref_collision') break;
        }
        if (!out?.ok) {
          const m = { duplicate: 'Aquest telèfon ja té una reserva en aquesta activitat', event_unavailable: 'Activitat no disponible' };
          return json(res, 409, { error: m[out?.error] || 'No s\'ha pogut afegir' });
        }
        return json(res, 201, { reserva: out.reserva, espera: out.reserva?.status === 'waitlist' });
      }

      case 'editar': {
        const c = body.camps || {};
        const camps = {};
        if ('nom' in c) { const n = String(c.nom || '').trim().slice(0, 120); if (n.length < 2) return json(res, 400, { error: 'Nom massa curt' }); camps.nom = n; }
        if ('telefon' in c) {
          const t = String(c.telefon || '').replace(/[\s\-()]/g, '').slice(0, 20);
          if (t && !/^\+?\d{9,15}$/.test(t)) return json(res, 400, { error: 'Telèfon no vàlid' });
          camps.telefon = t;
        }
        if ('email' in c) camps.email = String(c.email || '').trim().slice(0, 160);
        if ('observacions' in c) camps.observacions = String(c.observacions || '').slice(0, 500);
        if ('origen' in c) { if (!['telefon', 'presencial', 'web', 'altres'].includes(c.origen)) return json(res, 400, { error: 'Origen no vàlid' }); camps.origen = c.origen; }
        const out = await rpc('admin_editar_persona', { p_id: id, p_camps: camps, p_actor: actor });
        if (!out?.ok) return json(res, 404, { error: 'Reserva no trobada' });
        return json(res, 200, { reserva: out.reserva });
      }

      case 'sessio': {
        const data = String(body.data || '');
        if (!DATA_RE.test(data)) return json(res, 400, { error: 'Data no vàlida' });
        if (!['afegir', 'treure'].includes(body.operacio)) return json(res, 400, { error: 'Operació no vàlida' });
        const out = await rpc('admin_sessio', { p_event_id: String(body.event_id || ''), p_data: data, p_accio: body.operacio, p_actor: actor });
        if (!out?.ok) return json(res, 404, { error: 'Activitat no trobada' });
        return json(res, 200, out);
      }

      default:
        return json(res, 400, { error: 'Acció no vàlida' });
    }
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: err.message || 'Error' });
  }
}

/* gestor/contingut.js — validació i fusió de canvis
   ─────────────────────────────────────────────────────────
   Aquí és on es fa efectiva la protecció: el servidor parteix
   SEMPRE del document que hi ha a la base de dades i només hi
   aplica els camps que config.js declara editables. La resta
   del que arribi s'ignora en silenci.

   Això vol dir que ningú no pot canviar el preu, el cupo o l'id
   manipulant la petició des del navegador: si el camp no és a
   la configuració, no existeix per al servidor.

   Format dels canvis que envia el panell:
     {
       estat: 'actiu' | 'esgotat' | …,
       camps: { 'titol': {ca,es}, 'cupo': 12, 'ubicacio': {…} }
     }                                                         */

import { GESTOR, campsPerTipus, colleccio } from './config.js';

/* ── Camins dins del document ───────────────────────────── */
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, path, valor) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
    o = o[parts[i]];
  }
  if (valor === undefined) delete o[parts.at(-1)];
  else o[parts.at(-1)] = valor;
}

/* ── Neteja de text ──────────────────────────────────────── */
function netejar(s, max, multilinia) {
  const re = multilinia ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  let t = String(s ?? '').replace(/\r\n?/g, '\n').replace(re, '');
  if (multilinia) t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim().slice(0, max || 500);
}

/* ── Imatges acceptades ──────────────────────────────────── */
/* Només fitxers del repositori (/assets/…) o del bucket propi.
   Sense això, algú podria enganxar la URL d'una altra web i la
   pàgina carregaria contingut de tercers. */
export function prefixMedia() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  return url ? `${url}/storage/v1/object/public/${GESTOR.media.bucket}/` : null;
}

function imatgeValida(v) {
  if (/^\/assets\/[\w\-./]+\.(jpe?g|png|webp|svg)$/i.test(v) && !v.includes('..')) return true;
  const p = prefixMedia();
  return Boolean(p && v.startsWith(p) && /^[\w\-./]+$/.test(v.slice(p.length)) && !v.includes('..'));
}

function urlValida(v) {
  return /^https:\/\/[\w\-.]+\.[a-z]{2,}(\/[\w\-./?%&=+#:,~]*)?$/i.test(v) && !v.includes('..');
}

/* ── Validació d'un valor segons el tipus de camp ──────────
   Torna { valor } o { error }. `valor: undefined` = treure el camp. */
export function validarValor(camp, v) {
  const nom = camp.nom || camp.path;

  switch (camp.tipus) {
    case 'text':
    case 'textarea': {
      const t = netejar(v, camp.max, camp.tipus === 'textarea');
      if (camp.requerit && !t) return { error: `${nom}: obligatori` };
      return { valor: t || undefined };
    }

    case 'text-i18n':
    case 'textarea-i18n': {
      if (v == null || typeof v !== 'object') return { error: `${nom}: format no vàlid` };
      const out = {};
      for (const l of GESTOR.idiomes) {
        const t = netejar(v[l], camp.max, camp.tipus === 'textarea-i18n');
        if (t) out[l] = t;
      }
      if (camp.requerit && !out[GESTOR.idiomaBase]) {
        return { error: `${nom}: obligatori en ${GESTOR.idiomaEtiquetes[GESTOR.idiomaBase]}` };
      }
      return { valor: Object.keys(out).length ? out : undefined };
    }

    case 'data': {
      if (!v) return { valor: undefined };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: `${nom}: data no vàlida` };
      if (Number.isNaN(Date.parse(v))) return { error: `${nom}: data inexistent` };
      return { valor: v };
    }

    case 'hora': {
      if (!v) return { valor: undefined };
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return { error: `${nom}: hora no vàlida (HH:MM)` };
      return { valor: v };
    }

    case 'enter': {
      if (v === '' || v == null) return { valor: undefined };
      const n = Number(v);
      if (!Number.isInteger(n)) return { error: `${nom}: ha de ser un nombre enter` };
      if (camp.min != null && n < camp.min) return { error: `${nom}: mínim ${camp.min}` };
      if (camp.max != null && n > camp.max) return { error: `${nom}: màxim ${camp.max}` };
      return { valor: n };
    }

    /* El panell treballa en euros; la base de dades, en cèntims.
       La conversió es fa aquí i no al navegador. */
    case 'preu': {
      if (v === '' || v == null) return { valor: 0 };
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return { error: `${nom}: preu no vàlid` };
      if (camp.min != null && n < camp.min) return { error: `${nom}: mínim ${camp.min} €` };
      if (camp.max != null && n > camp.max) return { error: `${nom}: màxim ${camp.max} €` };
      return { valor: Math.round(n * 100) };
    }

    case 'url': {
      if (!v) return { valor: undefined };
      const s = String(v).trim();
      if (!urlValida(s)) return { error: `${nom}: ha de ser una adreça https vàlida` };
      return { valor: s.slice(0, 400) };
    }

    case 'imatge': {
      if (v === '' || v == null) return { valor: undefined };
      const s = String(v).trim();
      if (!imatgeValida(s)) return { error: `${nom}: imatge no vàlida (puja-la des del panell)` };
      return { valor: s };
    }

    case 'estat': {
      if (!GESTOR.estats.some(e => e.id === v)) return { error: `${nom}: estat no vàlid` };
      return { valor: v };
    }

    default:
      return { error: `${nom}: tipus de camp desconegut` };
  }
}

/* ── Aplicar canvis ──────────────────────────────────────── */
/* `actual` és el document tal com és a la base de dades.
   Torna una còpia amb els canvis vàlids aplicats i la llista
   d'errors. Si hi ha cap error, qui crida no ha de desar res. */
export function aplicarCanvis(actual, canvis, nomColleccio = 'activitats') {
  const dades = structuredClone(actual || {});
  const errors = [];
  if (!canvis || typeof canvis !== 'object') return { dades, errors: ['Cap canvi rebut'] };

  const col = colleccio(nomColleccio);
  if (!col) return { dades, errors: ['Col·lecció desconeguda'] };

  if (canvis.estat !== undefined && col.ambEstat) {
    const r = validarValor({ tipus: 'estat', nom: 'Estat' }, canvis.estat);
    if (r.error) errors.push(r.error); else dades.estat = r.valor;
  }

  if (canvis.camps && typeof canvis.camps === 'object') {
    const permesos = new Map(
      (col.magatzem === 'events' ? campsPerTipus(dades.tipo) : col.camps).map(c => [c.path, c])
    );
    for (const [path, valor] of Object.entries(canvis.camps)) {
      const camp = permesos.get(path);
      if (!camp) continue;                        // camp no declarat → s'ignora
      if (GESTOR.prohibits.includes(path)) continue;
      const r = validarValor(camp, valor);
      if (r.error) errors.push(r.error); else setPath(dades, path, r.valor);
    }
  }

  return { dades, errors };
}

/* ── Identificadors ──────────────────────────────────────── */
export function slug(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60).replace(/-+$/g, '');
}

export function nouId(tipus, titol) {
  const sufix = Math.random().toString(36).slice(2, 6);
  let t = slug(String(titol || '').replace(/\(còpia\)|\(copia\)/gi, '')) || 'activitat';
  const tp = slug(tipus);
  if (t === tp || t.startsWith(tp + '-')) t = t.slice(tp.length).replace(/^-+/, '');
  const base = [tp, t].filter(Boolean).join('-').slice(0, 70).replace(/-+$/, '');
  return `${base}-${sufix}`;
}

/* Duplicar una activitat: sempre neix oculta i sense reserves. */
export function duplicarDades(font) {
  const d = structuredClone(font);
  delete d.id;
  delete d.versio;
  delete d.created_at;
  delete d.updated_at;
  d.estat = 'proximament';
  for (const l of GESTOR.idiomes) {
    if (d.titol?.[l]) d.titol[l] = `${d.titol[l]} (còpia)`.slice(0, 120);
  }
  return d;
}

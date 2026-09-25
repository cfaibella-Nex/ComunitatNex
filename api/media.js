/* POST /api/media — pujada d'imatges al bucket comunitat-media
   ─────────────────────────────────────────────────────────
   El navegador envia la foto ja reduïda (màx. 1600 px, JPEG) en
   base64. Aquí es torna a validar: mai es confia en el que diu
   el client sobre el seu propi fitxer.

   Per què base64 i no multipart: les funcions de Vercel tenen un
   límit de 4,5 MB de cos i base64 infla un 33 %. Amb la reducció
   prèvia al navegador, una foto de mòbil de 6 MB baixa a ~300 KB.

   Requereix el bucket `comunitat-media`, que crea gestor-schema.sql. */

import { json, readBody, methodNotAllowed } from './_lib/http.js';
import { hasSupabase, supabase } from './_lib/supabase.js';
import { requireAdmin } from './_lib/auth.js';
import { BUCKET } from './_lib/gestor/db.js';

const MIMES = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp'
};
const MAX_BYTES = 3 * 1024 * 1024;

/* Els primers bytes del fitxer han de coincidir amb el tipus
   declarat: canviar l'extensió a un fitxer no el converteix en imatge. */
function tipusReal(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function nomSegur(original, ext) {
  const base = String(original || 'imatge')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'imatge';
  const sufix = Math.random().toString(36).slice(2, 8);
  const any = new Date().getFullYear();
  return `${any}/${base}-${sufix}.${ext}`;
}

export default async function handler(req, res) {
  const actor = requireAdmin(req, res);
  if (!actor) return;
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!hasSupabase()) return json(res, 503, { error: 'Supabase no configurat' });

  let body;
  try { body = await readBody(req); }
  catch { return json(res, 400, { error: 'Body no vàlid' }); }

  const { nom, dades } = body;
  if (!dades || typeof dades !== 'string') {
    return json(res, 400, { error: 'Falta la imatge' });
  }

  const net = dades.replace(/^data:[^;]+;base64,/, '');
  let buf;
  try { buf = Buffer.from(net, 'base64'); }
  catch { return json(res, 400, { error: 'Imatge no llegible' }); }

  if (!buf.length) return json(res, 400, { error: 'Imatge buida' });
  if (buf.length > MAX_BYTES) {
    return json(res, 413, { error: `La imatge ocupa ${Math.round(buf.length / 1024)} KB i el màxim són 3 MB` });
  }

  const mime = tipusReal(buf);
  if (!mime || !MIMES[mime]) {
    return json(res, 415, { error: 'El fitxer no és una imatge JPG, PNG o WebP' });
  }

  const cami = nomSegur(nom, MIMES[mime]);

  try {
    const sb = supabase();
    const { error } = await sb.storage.from(BUCKET).upload(cami, buf, {
      contentType: mime,
      cacheControl: '31536000',
      upsert: false
    });
    if (error) throw error;

    const { data } = sb.storage.from(BUCKET).getPublicUrl(cami);
    return json(res, 201, { url: data.publicUrl, cami, bytes: buf.length });

  } catch (err) {
    console.error(err);
    const msg = String(err.message || err);
    if (/bucket/i.test(msg)) {
      return json(res, 500, { error: `Falta el bucket "${BUCKET}". Executa api/gestor-schema.sql o crea'l a Supabase.` });
    }
    return json(res, 500, { error: msg });
  }
}

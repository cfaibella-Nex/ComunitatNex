// api/_lib/http.js
export function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

/* Llegeix el cos de la petició.
   Abans: en superar el límit feia req.destroy() i la promesa no es
   resolia MAI, o sigui que la funció es quedava penjada fins que
   Vercel la matava. L'usuari veia un error mut. Ara es rebutja amb
   un missatge i el límit és configurable: les imatges necessiten
   més que un formulari. */
export function readBody(req, maxBytes = 1e6) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let buf = '';
    let passat = false;
    req.on('data', c => {
      if (passat) return;
      buf += c;
      if (buf.length > maxBytes) {
        passat = true;
        reject(new Error(`La petició supera el màxim de ${Math.round(maxBytes / 1024)} KB`));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (passat) return;
      try { resolve(buf ? JSON.parse(buf) : {}); }
      catch { reject(new Error('Body no és JSON vàlid')); }
    });
    req.on('error', e => { if (!passat) reject(e); });
  });
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return json(res, 405, { error: 'Mètode no permès' });
}

/* Talla una espera que no torna. Sense això, un Supabase pausat
   deixa la funció penjada fins que Vercel la mata amb un 504 mut. */
export function ambTimeout(promesa, ms, etiqueta) {
  return Promise.race([
    promesa,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`timeout ${etiqueta} (${ms} ms)`)), ms))
  ]);
}

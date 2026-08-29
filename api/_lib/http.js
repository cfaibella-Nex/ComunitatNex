// api/_lib/http.js
export function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let buf = '';
    req.on('data', c => { buf += c; if (buf.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(buf ? JSON.parse(buf) : {}); }
      catch { reject(new Error('Body no és JSON vàlid')); }
    });
    req.on('error', reject);
  });
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return json(res, 405, { error: 'Mètode no permès' });
}

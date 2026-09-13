// api/_lib/auth.js
// Basic Auth simple per admin. En Fase 2 canviarem a JWT + roles.
// v2: retorna el nom d'usuari (per registrar-lo com a actor a l'auditoria).

export function requireAdmin(req, res) {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS;

  if (!pass) {
    res.status(500).send(JSON.stringify({ error: 'ADMIN_PASS no configurat' }));
    return null;
  }

  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Comunitat NexSocial Admin", charset="UTF-8"');
    res.status(401).send(JSON.stringify({ error: 'Autenticació requerida' }));
    return null;
  }

  try {
    const [u, p] = Buffer.from(header.slice(6), 'base64').toString('utf-8').split(':');
    if (u === user && p === pass) return u;   // ← actor per a l'auditoria
  } catch { /* fallthrough */ }

  res.setHeader('WWW-Authenticate', 'Basic realm="Comunitat NexSocial Admin"');
  res.status(401).send(JSON.stringify({ error: 'Credencials invàlides' }));
  return null;
}

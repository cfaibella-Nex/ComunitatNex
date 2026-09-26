/* api/_lib/stripe.js — pagament amb targeta (Stripe Checkout)
   ─────────────────────────────────────────────────────────────
   Portat de BookingFEB, amb un sol compte (NexSocial SCCL).

   Checkout Sessions amb redirecció: les dades de la targeta no
   passen mai pel nostre domini i quedem fora de l'abast de PCI.

   S'activa NOMÉS quan hi ha les dues variables a Vercel:
     STRIPE_SECRET_KEY       sk_test_… / sk_live_…
     STRIPE_WEBHOOK_SECRET   whsec_…
   Sense el secret del webhook, Stripe cobraria però la reserva no
   passaria mai a pagada i la plaça quedaria retinguda: millor no
   cobrar. Mentre falti alguna, les activitats marcades "online" es
   reserven com sempre i surt l'avís de "pagament aviat". */

const API = 'https://api.stripe.com/v1';

/* Stripe demana un mínim de 30 minuts de vida per a la sessió.
   Si caduca sense pagar, el webhook cancel·la la reserva i la plaça
   torna a quedar lliure. */
export const MINUTS_SESSIO = 30;

const clau   = () => (process.env.STRIPE_SECRET_KEY || '').replace(/\s+/g, '');
const secret = () => (process.env.STRIPE_WEBHOOK_SECRET || '').replace(/\s+/g, '');

export function stripeActiu() {
  return Boolean(clau() && secret());
}

export function modeStripe() {
  if (!stripeActiu()) return 'off';
  return clau().startsWith('sk_live') ? 'live' : 'test';
}

/* Què veu la persona al pas final, segons com es cobra l'activitat:
     online       → botó de pagar amb targeta
     online_aviat → activitat de pagament online però Stripe encara
                    no està connectat: es reserva i surt l'avís
     presencial   → es reserva i es paga el dia, al centre
     reserva      → només reserva (gratuït o preu a consultar) */
export function cobramentEvent(ev) {
  const p = ev?.pagament || 'reserva';
  if (p === 'online') return stripeActiu() ? 'online' : 'online_aviat';
  return p === 'presencial' ? 'presencial' : 'reserva';
}

async function stripeFetch(path, { body, idempotencyKey, method = 'POST' } = {}) {
  if (!stripeActiu()) throw new Error('Stripe no configurat');
  const headers = {
    authorization: `Bearer ${clau()}`,
    'content-type': 'application/x-www-form-urlencoded'
  };
  /* Un doble clic no pot crear dues sessions ni cobrar dues vegades */
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  const res = await fetch(API + path, { method, headers, body });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${out.error?.message || 'error desconegut'}`);
  return out;
}

/* Stripe Checkout no té català: català → castellà */
const localeStripe = lang => (lang === 'ca' || lang === 'es') ? 'es' : 'auto';

export async function crearCheckoutSession({ ref, event, detall, email, lang, successUrl, cancelUrl, descripcio }) {
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('client_reference_id', ref);
  body.set('locale', localeStripe(lang));
  body.set('submit_type', 'book');
  body.set('expires_at', String(Math.floor(Date.now() / 1000) + MINUTS_SESSIO * 60));
  if (email) body.set('customer_email', email);

  body.set('metadata[reserva]', ref);
  body.set('metadata[event_id]', event.id);
  body.set('payment_intent_data[description]', (descripcio || 'Comunitat NexSocial').slice(0, 200));
  body.set('payment_intent_data[metadata][reserva]', ref);

  /* Només les línies amb import: Stripe no accepta línies a 0 */
  let i = 0;
  for (const l of detall) {
    if (!(l.preu_cents > 0)) continue;
    const nom = (l.nom?.[lang] || l.nom?.ca || l.id);
    body.set(`line_items[${i}][quantity]`, String(l.qty));
    body.set(`line_items[${i}][price_data][currency]`, 'eur');
    body.set(`line_items[${i}][price_data][unit_amount]`, String(l.preu_cents));
    body.set(`line_items[${i}][price_data][product_data][name]`, String(nom).slice(0, 120));
    i++;
  }

  return stripeFetch('/checkout/sessions', { body, idempotencyKey: `reserva_${ref}` });
}

/* Verificació de la signatura (capçalera Stripe-Signature: t=…,v1=…) */
export async function verificarWebhook(payload, header) {
  const s = secret();
  if (!s) return false;

  const parts = {};
  for (const p of String(header || '').split(',')) {
    const i = p.indexOf('=');
    if (i > 0) {
      const k = p.slice(0, i).trim();
      (parts[k] = parts[k] || []).push(p.slice(i + 1).trim());  // pot haver-hi dos v1 en una rotació
    }
  }
  const t = parts.t?.[0];
  const firmes = parts.v1 || [];
  if (!t || !firmes.length) return false;

  /* Avisos de fa més de 5 minuts: protecció contra reenviaments */
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(s),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`));
  const esperada = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');

  /* Comparació en temps constant */
  return firmes.some(f => {
    let diff = esperada.length ^ f.length;
    for (let i = 0; i < Math.max(esperada.length, f.length); i++) {
      diff |= (esperada.charCodeAt(i) || 0) ^ (f.charCodeAt(i) || 0);
    }
    return diff === 0;
  });
}

/* Link de pagament per a una reserva concreta, generat des del panell.
   L'equip el copia i l'envia per on vulgui (WhatsApp, correu…); la web
   no envia res a ningú. Una sessió de Checkout viu com a màxim 24 h:
   si caduca, la reserva NO es cancel·la, només torna a "sense pagar"
   i se'n pot generar un altre. */
export const HORES_LINK = 23;   // una mica per sota del màxim de Stripe

export async function crearLinkPagament({ ref, event, importCents, lang, email, successUrl, cancelUrl }) {
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('client_reference_id', ref);
  body.set('locale', localeStripe(lang));
  body.set('expires_at', String(Math.floor(Date.now() / 1000) + HORES_LINK * 3600));
  if (email) body.set('customer_email', email);
  body.set('metadata[reserva]', ref);
  body.set('metadata[event_id]', event.id);
  body.set('metadata[origen]', 'link');
  const titol = event.titol?.[lang] || event.titol?.ca || 'Comunitat NexSocial';
  body.set('payment_intent_data[description]', `${titol} · ${ref}`.slice(0, 200));
  body.set('payment_intent_data[metadata][reserva]', ref);
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'eur');
  body.set('line_items[0][price_data][unit_amount]', String(importCents));
  body.set('line_items[0][price_data][product_data][name]', `${titol} · ${ref}`.slice(0, 120));
  /* Clau única per generació: tornar a generar ha de crear un link nou */
  return stripeFetch('/checkout/sessions', { body, idempotencyKey: `link_${ref}_${Date.now()}` });
}

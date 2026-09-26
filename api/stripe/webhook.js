/* POST /api/stripe/webhook — avís signat de Stripe
   ─────────────────────────────────────────────────────────────
   És l'ÚNICA cosa que marca una reserva com a pagada. No porta
   CORS: no el crida cap navegador.

   Exports amb nom (POST) i no `export default`, com a BookingFEB:
   així Vercel ens dona el cos en cru, que és sobre el que es
   calcula la signatura. Qualsevol reserialització la trencaria. */

import { verificarWebhook } from '../_lib/stripe.js';
import { hasSupabase, supabase } from '../_lib/supabase.js';

const ok = () => new Response('OK', { status: 200 });

export async function POST(request) {
  const payload = await request.text();
  if (!(await verificarWebhook(payload, request.headers.get('stripe-signature')))) {
    console.error('webhook stripe: signatura invàlida');
    return new Response('KO', { status: 403 });
  }
  if (!hasSupabase()) return new Response('KO', { status: 503 });   // que Stripe ho reintenti

  let event;
  try { event = JSON.parse(payload); } catch { return ok(); }

  const sess = event.data?.object || {};
  const ref = sess.client_reference_id || sess.metadata?.reserva;
  if (!ref) return ok();

  try {
    const sb = supabase();

    /* Stripe reenvia fins que rep un 200: el segon avís no fa res */
    const { error: dup } = await sb.from('notificacions')
      .insert({ id: event.id, proveidor: 'stripe', tipus: event.type });
    if (dup) {
      if (dup.code === '23505') return ok();
      throw new Error(dup.message);
    }

    let resultat = null;
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        /* Amb mètodes diferits, 'completed' pot arribar sense cobrar */
        if (sess.payment_status === 'paid') resultat = 'paid';
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        /* Link enviat des del panell: la reserva es manté, només torna a
           "sense pagar". Pagament de la web: la plaça s'allibera. */
        resultat = sess.metadata?.origen === 'link' ? 'caducat_link' : 'failed';
        break;
    }

    if (resultat) {
      const { data, error } = await sb.rpc('marcar_pagament', {
        p_ref: ref,
        p_resultat: resultat,
        p_payment_ref: sess.payment_intent || sess.id || null,
        p_import: Number.isFinite(sess.amount_total) ? sess.amount_total : null,
        p_session: sess.id || null
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) console.error('webhook stripe:', ref, data);
    }
  } catch (e) {
    console.error('webhook stripe:', e.message);
    /* Esborrem la marca perquè el reintent de Stripe no es prengui per duplicat */
    try { await supabase().from('notificacions').delete().eq('id', event.id); } catch { /* res */ }
    return new Response('KO', { status: 500 });
  }

  return ok();
}

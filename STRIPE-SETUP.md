# Activar Stripe a Comunitat

Només quan decidim cobrar online. Fins llavors no cal fer res.

1. Compte Stripe a nom de **NexSocial SCCL**. ⚑ [VERIFICAR] text de l'extracte bancari.
2. Stripe → Developers → **Webhooks** → Add endpoint:
   - URL: `https://comunitat.nexsocial.org/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
3. Vercel → Settings → Environment Variables (Production):
   - `STRIPE_SECRET_KEY` = `sk_test_…` (primer en test)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_…` (el del webhook del pas 2)
4. Redeploy. `/api/health` ha de dir `stripe: "test"`.
5. Activitat de prova amb "Com es cobra: Online" i preu fix → pagar amb `4242 4242 4242 4242`.
   Al panell la reserva ha de sortir **Pagat** i **Confirmada**.
6. Per passar a real: les dues variables en `live` (i un webhook nou en mode live).

Cal **les dues** variables: sense el secret del webhook no s'activa mai
(cobraria però la reserva no passaria a pagada).

/* checkout.js — Comunitat NexSocial
   ────────────────────────────────────────
   PAS 3: dades de la persona + resum + reservar o pagar.
   Llegeix el carret (js/carret.js) que han deixat els passos 1 i 2.

   Què passa en prémer el botó ho decideix el servidor:
     · reserva / presencial / "online aviat" → queda reservada
     · online (Stripe connectat)            → redirigeix a Stripe
     · sense places                         → llista d'espera
   WhatsApp només si l'API no respon. */

(function() {

const { T, L, esc, formatDate, qs, qsa } = window.NX;
const NXC = window.NXC;

function validaTelefon(t) {
  const clean = String(t || '').replace(/[\s\-\(\)]/g, '');
  return /^(\+?\d{9,15})$/.test(clean);
}
function validaEmail(e) {
  if (!e) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function renderCheckout() {
  const app = qs('#checkout-app');
  if (!app) return;

  const id = new URLSearchParams(location.search).get('id');
  const cart = NXC.getCart(id);

  if (!id || !cart || !NXC.cartPlaces(cart)) {
    app.innerHTML = `
    <section class="section">
      <div class="alert alert-warning">${T('checkout.expired')}</div>
      <a href="/agenda.html" class="btn btn-primary">${T('ev.tornar')}</a>
    </section>`;
    return;
  }

  const events = await NXC.fetchEvents();
  const ev = events.find(e => e.id === id);
  if (!ev) {
    app.innerHTML = `<section class="section"><div class="alert alert-warning">${T('ev.no_trobat')}</div></section>`;
    return;
  }

  const linies = NXC.cartLinies(ev, cart, events);
  const { cents, consultar } = NXC.cartTotal(ev, cart);
  const mode = NXC.cobrament(ev);
  /* Mateixa regla que el servidor: amb alguna línia a consultar o un
     total per sota del mínim de Stripe, no es cobra en línia. */
  const pagaAra = mode === 'online' && !consultar && cents >= 50;
  const avis = consultar ? 'chk.consultar'
             : pagaAra ? 'chk.online'
             : cents > 0 && mode === 'online_aviat' ? 'chk.online_aviat'
             : cents > 0 && mode === 'presencial' ? 'chk.presencial'
             : null;
  const tornar = NXC.extresVisibles(ev, events).length ? 'extres' : 'detall';
  const dataTxt = ev.data_label ? L(ev.data_label) : formatDate(ev.data, { weekday: 'long' });
  const ambHora = !(ev.data_label && /pr[oò]xi/i.test(L(ev.data_label))) && ev.hora;

  document.title = `${T('checkout.title')} · Comunitat NexSocial`;

  app.innerHTML = `
<section class="section checkout-section">
  <a href="/${tornar}.html?id=${encodeURIComponent(ev.id)}" class="detail-back">${T('checkout.back')}</a>

  <div class="checkout-heading">
    <span class="checkout-eyebrow">${esc(NXC.t('chk.eyebrow'))}</span>
    <h1 style="margin-top: var(--sp-1)">${T('checkout.title')}</h1>
  </div>

  <div class="checkout-layout">
    <form id="checkout-form" novalidate>
      <div class="form-group">
        <label class="form-label" for="nom">${T('form.nom')}<span class="form-required">*</span></label>
        <input class="form-input" id="nom" name="nom" type="text" required autocomplete="name">
      </div>

      <div class="form-group">
        <label class="form-label" for="email">${T('form.email_ck')}</label>
        <input class="form-input" id="email" name="email" type="email" autocomplete="email">
      </div>

      <div class="form-group">
        <label class="form-label" for="tel">${T('form.tel')}<span class="form-required">*</span></label>
        <input class="form-input" id="tel" name="telefon" type="tel" required autocomplete="tel" inputmode="tel">
      </div>

      <div class="form-group">
        <label class="form-label" for="notes">${T('form.notes')}</label>
        <textarea class="form-textarea" id="notes" name="notes" rows="3"></textarea>
      </div>

      <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
        <label>No omplis aquest camp
          <input type="text" id="hp-web" name="web" tabindex="-1" autocomplete="off">
        </label>
      </div>

      <p class="form-help">${T('form.legal')}</p>
      <div id="form-msg" aria-live="polite" aria-atomic="true"></div>
    </form>

    <aside class="checkout-summary">
      ${ev.imatge ? `<div class="summary-poster"><img src="${esc(ev.imatge)}" alt="${esc(L(ev.titol))}"></div>` : ''}

      <div class="summary-body">
        <h3 style="margin: 0 0 var(--sp-2)">${T('checkout.resum')}</h3>
        <div class="summary-title">${esc(L(ev.titol))}</div>
        <div class="summary-line muted">${esc(dataTxt)}${ambHora ? ' · ' + esc(ev.hora) : ''}</div>
        <div class="summary-line muted">${esc(L(ev.entitat))}</div>

        ${linies.map((l, i) => `
        <div class="summary-row"${i ? ' style="margin-top:0"' : ''}>
          <span>${l.qty} × ${esc(l.nom)}</span>
          <strong>${esc(l.importTxt)}</strong>
        </div>`).join('')}

        <div class="summary-total">
          <span>${T('form.total')}</span>
          <strong>${esc(NXC.totalTxt(ev, cart))}</strong>
        </div>

        ${avis ? `<div class="alert alert-info ins-avis">${esc(NXC.t(avis))}</div>` : ''}

        <button type="button" id="btn-reservar" class="btn btn-primary btn-lg btn-block" style="margin-top: var(--sp-2)">
          ${pagaAra ? '💳 ' + esc(NXC.t('chk.pagar')) : T('form.enviar')}
        </button>

        <div class="muted" style="font-size: var(--fs-xs); margin-top: var(--sp-2); text-align: center">
          ${T('checkout.legal_note')}
        </div>
      </div>
    </aside>
  </div>
</section>`;

  qs('#btn-reservar').addEventListener('click', async (e) => {
    e.preventDefault();
    const nom = qs('#nom').value.trim();
    const email = qs('#email').value.trim();
    const tel = qs('#tel').value.trim();
    const notes = qs('#notes').value.trim();
    const msg = qs('#form-msg');

    qsa('.form-input, .form-textarea').forEach(el => {
      el.classList.remove('error');
      el.removeAttribute('aria-invalid');
    });
    const errors = [];
    if (nom.length < 2) errors.push('nom');
    if (!validaTelefon(tel)) errors.push('tel');
    if (!validaEmail(email)) errors.push('email');
    errors.forEach(k => {
      const el = qs('#' + k);
      if (el) { el.classList.add('error'); el.setAttribute('aria-invalid', 'true'); }
    });
    if (errors.length) {
      msg.innerHTML = `<div class="alert alert-danger">${T(errors.includes('tel') ? 'form.error_tel' : 'form.error')}</div>`;
      qs('#' + errors[0])?.focus();
      return;
    }

    const btn = qs('#btn-reservar');
    btn.disabled = true;
    const btnOrig = btn.innerHTML;
    btn.textContent = pagaAra ? NXC.t('chk.obrint') : T('form.enviant');

    try {
      const r = await fetch('/api/reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: ev.id,
          linies: cart.linies,
          extres: cart.extres,
          nom, telefon: tel, email: email || null, notes: notes || null,
          web: qs('#hp-web')?.value || '',
          lang: window.NX.getLang()
        })
      });

      /* 503: sistema no disponible · 404: activitat que només és a data.js */
      if (r.status === 503 || r.status === 404) { obrirWhatsApp(); return; }

      const out = await r.json().catch(() => ({}));

      if (r.ok) {
        if (out.redirect) {                 // Stripe: el carret es buida en tornar
          location.href = out.redirect;
          return;
        }
        NXC.clearCart();
        if (out.status === 'waitlist') {
          msg.innerHTML = `<div class="alert alert-warning">${T('form.waitlist')}</div>
            <div class="muted" style="font-size:var(--fs-sm);margin-top:var(--sp-2)">Ref. ${esc(out.reserva_id || '')}</div>`;
          btn.remove();
          return;
        }
        const extra = out.pagament === 'presencial' && cents > 0 ? '&pagament=presencial' : '';
        location.href = `/confirmacio.html?ref=${encodeURIComponent(out.reserva_id || 'OK')}${extra}`;
        return;
      }

      // Errors controlats: es mostra el motiu, no s'obre WhatsApp
      const traduit = out.codi && NXC.t('err.' + out.codi);
      if (out.codi === 'duplicate') {
        msg.innerHTML = `<div class="alert alert-warning">${T('form.duplicat')}</div>`;
      } else if (r.status === 429) {
        msg.innerHTML = `<div class="alert alert-warning">${T('form.massa')}</div>`;
      } else if (traduit && traduit !== 'err.' + out.codi) {
        msg.innerHTML = `<div class="alert alert-warning">${esc(traduit)}</div>`;
      } else {
        msg.innerHTML = `<div class="alert alert-danger">${esc(out.error || T('form.error_srv'))}</div>`;
      }
      btn.disabled = false;
      btn.innerHTML = btnOrig;
      return;

    } catch (err) {
      console.error(err);
      obrirWhatsApp();
      return;
    }

    function obrirWhatsApp() {
      const lang = window.NX.getLang();
      const detall = linies.map(l => `• ${l.qty} × ${l.nom} — ${l.importTxt}`).join('\n');
      const total = NXC.totalTxt(ev, cart);
      const txt = lang === 'ca'
        ? `Hola! Vull fer una reserva:\n\n*${L(ev.titol)}*\n📅 ${dataTxt}${ambHora ? ' · ' + ev.hora : ''}\n📍 ${L(ev.entitat)}\n\n${detall}\nTotal: ${total}\n\nDades:\nNom: ${nom}\nTelèfon: ${tel}${email ? '\nCorreu: ' + email : ''}${notes ? '\nNotes: ' + notes : ''}`
        : `¡Hola! Quiero hacer una reserva:\n\n*${L(ev.titol)}*\n📅 ${dataTxt}${ambHora ? ' · ' + ev.hora : ''}\n📍 ${L(ev.entitat)}\n\n${detall}\nTotal: ${total}\n\nDatos:\nNombre: ${nom}\nTeléfono: ${tel}${email ? '\nCorreo: ' + email : ''}${notes ? '\nNotas: ' + notes : ''}`;

      msg.innerHTML = `<div class="alert alert-warning">${T('form.error_srv')}</div>`;
      btn.disabled = false;
      btn.innerHTML = btnOrig;
      window.open(`https://wa.me/${window.NX.WHATSAPP}?text=${encodeURIComponent(txt)}`, '_blank');
    }
  });
}

renderCheckout();

})();

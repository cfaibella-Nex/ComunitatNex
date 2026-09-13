/* checkout.js — Comunitat NexSocial
   ────────────────────────────────────────
   PAS 2: dades del reservant + resum + WhatsApp/pagar.
   Llegeix la selecció (event_id + places + total) del sessionStorage
   que ha desat el pas 1 (renderDetail a agenda.js). */

(function() {

const { T, L, esc, formatDate, formatPrice,
        tipoLabel, tipoBadgeClass, phoneBannerHTML, qs, qsa } = window.NX;

async function fetchEvents() {
  try {
    const r = await fetch('/api/events', { cache: 'no-store' });
    if (!r.ok) throw new Error('API error');
    const data = await r.json();
    if (Array.isArray(data.events) && data.events.length) return data.events;
    throw new Error('empty');
  } catch {
    return window.EVENTS_DATA || [];
  }
}

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

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const stored = JSON.parse(sessionStorage.getItem('nx-checkout') || 'null');

  if (!id || !stored || stored.event_id !== id) {
    app.innerHTML = `
    <section class="section">
      <div class="alert alert-warning">${T('checkout.expired')}</div>
      <a href="/agenda.html" class="btn btn-primary">${T('ev.tornar')}</a>
    </section>`;
    return;
  }

  const events = await fetchEvents();
  const ev = events.find(e => e.id === id);
  if (!ev) {
    app.innerHTML = `<section class="section"><div class="alert alert-warning">${T('ev.no_trobat')}</div></section>`;
    return;
  }

  const isFree = !ev.preu_cents || ev.preu_cents === 0;
  const totalCents = (ev.preu_cents || 0) * stored.places;
  document.title = `${T('checkout.title')} · Comunitat NexSocial`;

  app.innerHTML = `
<section class="section checkout-section">
  <a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="detail-back">${T('checkout.back')}</a>

  <div class="checkout-heading">
    <span class="checkout-eyebrow">${T('checkout.eyebrow')}</span>
    <h1 style="margin-top: var(--sp-1)">${T('checkout.title')}</h1>
  </div>

  <div class="checkout-layout">
    <!-- Formulari dades -->
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

    <!-- Sidebar resum -->
    <aside class="checkout-summary">
      <div class="summary-poster">
        <img src="${esc(ev.imatge)}" alt="${esc(L(ev.titol))}">
      </div>

      <div class="summary-body">
        <h3 style="margin: 0 0 var(--sp-2)">${T('checkout.resum')}</h3>
        <div class="summary-title">${esc(L(ev.titol))}</div>
        <div class="summary-line muted">${esc(ev.data_label ? L(ev.data_label) : formatDate(ev.data, { weekday: 'long' }))}${ev.data_label && /pr[oò]xi/i.test(L(ev.data_label)) ? '' : ' · ' + esc(ev.hora || '')}</div>
        <div class="summary-line muted">${esc(L(ev.entitat))}</div>

        <div class="summary-row">
          <span>${stored.places} × ${T('form.places_single')}</span>
          <strong>${isFree ? T('ev.gratis') : formatPrice(ev.preu_cents * stored.places)}</strong>
        </div>

        <div class="summary-total">
          <span>${T('form.total')}</span>
          <strong>${isFree ? T('ev.gratis') : formatPrice(totalCents)}</strong>
        </div>

        ${!isFree ? `
          <div class="alert alert-info" style="font-size: var(--fs-sm); margin: var(--sp-3) 0">
            ${T('checkout.stripe_soon')}
          </div>
          <button type="button" class="btn btn-secondary btn-block" disabled>
            💳 ${T('checkout.pay_card')}
          </button>
        ` : ''}

        <button type="button" id="btn-reservar" class="btn btn-primary btn-lg btn-block" style="margin-top: var(--sp-2)">
          ${T('form.enviar')}
        </button>

        <div class="muted" style="font-size: var(--fs-xs); margin-top: var(--sp-2); text-align: center">
          ${T('checkout.legal_note')}
        </div>
      </div>
    </aside>
  </div>
</section>`;

  // Bind botó "Confirmar la reserva"
  qs('#btn-reservar').addEventListener('click', async (e) => {
    e.preventDefault();
    const nom = qs('#nom').value.trim();
    const email = qs('#email').value.trim();
    const tel = qs('#tel').value.trim();
    const notes = qs('#notes').value.trim();
    const msg = qs('#form-msg');

    // Validació
    qsa('.form-input, .form-textarea').forEach(el => {
      el.classList.remove('error');
      el.removeAttribute('aria-invalid');
    });
    let errors = [];
    if (nom.length < 2) errors.push('nom');
    if (!validaTelefon(tel)) errors.push('tel');
    if (!validaEmail(email)) errors.push('email');
    errors.forEach(k => {
      const el = qs('#' + (k === 'tel' ? 'tel' : k));
      if (el) { el.classList.add('error'); el.setAttribute('aria-invalid', 'true'); }
    });
    if (errors.length) {
      msg.innerHTML = `<div class="alert alert-danger">${T(errors.includes('tel') ? 'form.error_tel' : 'form.error')}</div>`;
      qs('#' + errors[0])?.focus();
      return;
    }

    // La web es la font de veritat: nomes caiem a WhatsApp si l'API falla.
    const btn = qs('#btn-reservar');
    btn.disabled = true;
    const btnOrig = btn.textContent;
    btn.textContent = T('form.enviant');

    try {
      const r = await fetch('/api/reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: ev.id, nom, telefon: tel, email: email || null,
          places: stored.places, notes: notes || null,
          web: qs('#hp-web')?.value || '',
          lang: window.NX.getLang()
        })
      });

      // Sistema no disponible -> fallback WhatsApp
      if (r.status === 503 || r.status === 404) { obrirWhatsApp(); return; }

      const out = await r.json().catch(() => ({}));

      if (r.ok) {
        sessionStorage.removeItem('nx-checkout');
        if (out.status === 'waitlist') {
          msg.innerHTML = `<div class="alert alert-warning">${T('form.waitlist')}</div>
            <div class="muted" style="font-size:var(--fs-sm);margin-top:var(--sp-2)">Ref. ${esc(out.reserva_id || '')}</div>`;
          btn.remove();
          return;
        }
        location.href = `/confirmacio.html?ref=${encodeURIComponent(out.reserva_id || 'OK')}`;
        return;
      }

      // Errors controlats: mostrem el motiu, no obrim WhatsApp
      if (out.codi === 'duplicate') {
        msg.innerHTML = `<div class="alert alert-warning">${T('form.duplicat')}</div>`;
      } else if (r.status === 429) {
        msg.innerHTML = `<div class="alert alert-warning">${T('form.massa')}</div>`;
      } else {
        msg.innerHTML = `<div class="alert alert-danger">${esc(out.error || T('form.error_srv'))}</div>`;
      }
      btn.disabled = false;
      btn.textContent = btnOrig;
      return;

    } catch (err) {
      console.error(err);
      obrirWhatsApp();
      return;
    }

    function obrirWhatsApp() {
    const lang = window.NX.getLang();
    const dataStr = formatDate(ev.data);
    const totalStr = isFree ? T('ev.gratis') : formatPrice(totalCents);
    const txt = lang === 'ca'
      ? `Hola! Vull confirmar una reserva:\n\n*${L(ev.titol)}*\n📅 ${dataStr} · ${ev.hora}\n📍 ${L(ev.entitat)}\n\nDades:\nNom: ${nom}\nTelèfon: ${tel}${email ? '\nCorreu: ' + email : ''}\nPlaces: ${stored.places}\nTotal: ${totalStr}${notes ? '\nNotes: ' + notes : ''}`
      : `¡Hola! Quiero confirmar una reserva:\n\n*${L(ev.titol)}*\n📅 ${dataStr} · ${ev.hora}\n📍 ${L(ev.entitat)}\n\nDatos:\nNombre: ${nom}\nTeléfono: ${tel}${email ? '\nCorreo: ' + email : ''}\nPlazas: ${stored.places}\nTotal: ${totalStr}${notes ? '\nNotas: ' + notes : ''}`;

      msg.innerHTML = `<div class="alert alert-warning">${T('form.error_srv')}</div>`;
      btn.disabled = false;
      btn.textContent = btnOrig;
      sessionStorage.removeItem('nx-checkout');
      window.open(`https://wa.me/${window.NX.WHATSAPP}?text=${encodeURIComponent(txt)}`, '_blank');
    }
  });
}

renderCheckout();

})();

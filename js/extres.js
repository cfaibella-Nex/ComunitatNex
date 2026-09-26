/* extres.js — Comunitat NexSocial
   ────────────────────────────────────────
   PAS 2 (opcional): mesos addicionals, sessions vinculades o altres
   extres. Si l'activitat no en té cap, el pas 1 salta directament al
   checkout i aquesta pàgina no es veu mai.

   Quantitat de cada extra: com a màxim una per plaça reservada, com a
   BookingFEB. El servidor ho torna a comprovar. */

(function() {

const { T, L, esc, qs } = window.NX;
const NXC = window.NXC;

async function render() {
  const app = qs('#extres-app');
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

  const extres = NXC.extresVisibles(ev, events);
  if (!extres.length) { location.replace(`/checkout.html?id=${encodeURIComponent(id)}`); return; }

  /* Un extra que ja no s'ofereix (sessió plena, per exemple) no pot
     quedar amagat dins del carret */
  const vius = new Set(extres.map(x => x.id));
  for (const k of Object.keys(cart.extres)) if (!vius.has(k)) delete cart.extres[k];

  const places = NXC.cartPlaces(cart);
  const mensual = ev.model === 'mensual' && extres.every(x => x.tipus === 'mes');
  document.title = `${L(ev.titol)} · Comunitat NexSocial`;

  const fila = (x) => {
    const q = Math.min(cart.extres[x.id] || 0, places);
    const nom = NXC.nomExtra(x, events);
    return `
<div class="ins-tarifa ins-extra" data-id="${esc(x.id)}">
  <div class="ins-tarifa-cap">
    <span class="ins-tarifa-nom">${x.tipus === 'sessio' && !L(x.nom) ? esc(NXC.t('ext.sessio')) + ' · ' : ''}${esc(nom)}</span>
    <span class="ins-tarifa-preu">${x.preu_mode === 'fix' ? '+ ' : ''}${esc(NXC.preuTxt(x, ev, false))}</span>
  </div>
  ${x.detall && L(x.detall) ? `<div class="ins-tarifa-detall">${esc(L(x.detall))}</div>` : ''}
  <div class="ins-extra-ctrl">
    ${NXC.selectorHTML({ id: x.id, qty: q, max: places, nom })}
    ${places > 1 ? `<button type="button" class="btn btn-ghost ins-totes" data-id="${esc(x.id)}">${esc(NXC.t('ext.totes', { n: places }))}</button>` : ''}
  </div>
</div>`;
  };

  app.innerHTML = `
<section class="section checkout-section">
  <a href="/detall.html?id=${encodeURIComponent(ev.id)}" class="detail-back">${esc(NXC.t('ext.tornar'))}</a>

  <div class="checkout-heading">
    <span class="checkout-eyebrow">${esc(NXC.t('ext.eyebrow'))}</span>
    <h1 style="margin-top: var(--sp-1)">${esc(NXC.t(mensual ? 'ext.titol_mensual' : 'ext.titol'))}</h1>
    <p class="lead" style="max-width: 720px">${esc(NXC.t(mensual ? 'ext.intro_mensual' : 'ext.intro'))}</p>
    ${places > 1 ? `<p class="muted">${esc(NXC.t('ext.max', { n: places }))}</p>` : ''}
  </div>

  <div class="ins-extres-layout">
    <div class="ins-tarifes" id="ins-extres">
      ${extres.map(fila).join('')}
    </div>

    <aside class="booking-card">
      <div class="summary-title" style="margin-bottom: var(--sp-2)">${esc(L(ev.titol))}</div>
      <div class="total-box">
        <span>${T('form.total')}</span>
        <strong id="total-display"></strong>
      </div>
      <button type="button" id="btn-continuar" class="btn btn-primary btn-lg btn-block">${esc(NXC.t('ext.continuar'))} →</button>
      <button type="button" id="btn-saltar" class="btn btn-ghost btn-block" style="margin-top: var(--sp-2)">${esc(NXC.t('ext.saltar'))}</button>
      <div class="booking-phone">
        <div class="muted" style="font-size:var(--fs-sm)">${T('phone.text')}</div>
        <a href="tel:${window.NX.PHONE_TEL}">📞 ${window.NX.PHONE}</a>
      </div>
    </aside>
  </div>
</section>`;

  function pinta() {
    for (const x of extres) {
      const box = qs(`.ins-qty[data-id="${CSS.escape(x.id)}"]`);
      const q = cart.extres[x.id] || 0;
      box.querySelector('.ins-qty-val').textContent = q;
      box.querySelector('[data-op="dec"]').disabled = q <= 0;
      box.querySelector('[data-op="inc"]').disabled = q >= places;
      box.closest('.ins-extra').classList.toggle('ins-extra--on', q > 0);
    }
    qs('#total-display').textContent = NXC.totalTxt(ev, cart);
  }

  qs('#ins-extres').addEventListener('click', (e) => {
    const tot = e.target.closest('.ins-totes');
    const btn = e.target.closest('.places-btn');
    let xid, q;
    if (tot) {
      xid = tot.dataset.id;
      q = (cart.extres[xid] || 0) === places ? 0 : places;
    } else if (btn && !btn.disabled) {
      xid = btn.closest('.ins-qty').dataset.id;
      q = (cart.extres[xid] || 0) + (btn.dataset.op === 'inc' ? 1 : -1);
    } else return;
    q = Math.max(0, Math.min(q, places));
    if (q === 0) delete cart.extres[xid]; else cart.extres[xid] = q;
    pinta();
  });

  const seguent = () => {
    NXC.setCart(cart);
    location.href = `/checkout.html?id=${encodeURIComponent(ev.id)}`;
  };
  qs('#btn-continuar').addEventListener('click', seguent);
  qs('#btn-saltar').addEventListener('click', () => { cart.extres = {}; seguent(); });

  pinta();
}

render();

})();

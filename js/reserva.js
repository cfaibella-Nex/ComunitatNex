/* reserva.js — Comunitat NexSocial
   ────────────────────────────────────────
   Validació i enviament del formulari de reserva. */

const { T, qs } = window.NX;

function validaTelefon(t) {
  const clean = String(t || '').replace(/\s+/g, '').replace(/[\-\(\)]/g, '');
  return /^(\+?\d{9,15})$/.test(clean);
}

function validaEmail(e) {
  if (!e) return true; // opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

window.bindReservaForm = function bindReservaForm(ev) {
  const form = qs('#reserva-form');
  if (!form) return;
  const msg = qs('#form-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.innerHTML = '';

    const data = Object.fromEntries(new FormData(form).entries());
    let errors = [];

    if (!data.nom || data.nom.trim().length < 2) errors.push('nom');
    if (!validaTelefon(data.telefon)) errors.push('tel');
    if (!validaEmail(data.email)) errors.push('email');
    if (!data.places || parseInt(data.places) < 1) errors.push('places');

    // Marca camps erronis + aria-invalid
    form.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
      el.classList.remove('error');
      el.removeAttribute('aria-invalid');
    });
    errors.forEach(k => {
      const map = { nom: '#nom', tel: '#tel', email: '#email', places: '#places' };
      const el = qs(map[k]);
      if (el) { el.classList.add('error'); el.setAttribute('aria-invalid', 'true'); }
    });

    if (errors.length) {
      msg.innerHTML = `<div class="alert alert-danger">${T(errors.includes('tel') ? 'form.error_tel' : 'form.error')}</div>`;
      qs(`#${errors[0] === 'nom' ? 'nom' : errors[0] === 'tel' ? 'tel' : 'email'}`)?.focus();
      return;
    }

    // Enviant
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = T('form.enviant');

    try {
      const r = await fetch('/api/reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: ev.id,
          nom: data.nom.trim(),
          telefon: data.telefon.trim(),
          email: (data.email || '').trim() || null,
          places: parseInt(data.places, 10),
          notes: (data.notes || '').trim() || null,
          preu_cents: ev.preu_cents || 0,
          lang: window.NX.getLang()
        })
      });

      if (!r.ok) {
        // Si l'API no està activa (fase 0 sense Supabase), fem WhatsApp fallback
        if (r.status === 503 || r.status === 404) {
          fallbackWhatsApp(ev, data);
          return;
        }
        throw new Error(await r.text());
      }

      const res = await r.json();
      // Redirect a confirmació
      location.href = `/confirmacio.html?ref=${encodeURIComponent(res.reserva_id || 'OK')}`;

    } catch (err) {
      console.error(err);
      // Fallback WhatsApp
      msg.innerHTML = `
        <div class="alert alert-warning">
          ${T('form.error_srv')}
        </div>
        <button type="button" id="wa-fallback" class="btn btn-secondary btn-block mt-3">
          Reservar per WhatsApp
        </button>`;
      qs('#wa-fallback').addEventListener('click', () => fallbackWhatsApp(ev, data));
      btn.disabled = false;
      btn.textContent = orig;
    }
  });
};

function fallbackWhatsApp(ev, data) {
  const lang = window.NX.getLang();
  const titol = window.NX.L(ev.titol);
  const dataStr = window.NX.formatDate(ev.data);
  const txt = lang === 'ca'
    ? `Hola! Vull reservar plaça per "${titol}" del ${dataStr} a les ${ev.hora}.
Nom: ${data.nom}
Telèfon: ${data.telefon}
Places: ${data.places}${data.notes ? '\nNotes: ' + data.notes : ''}`
    : `Hola! Quiero reservar plaza para "${titol}" del ${dataStr} a las ${ev.hora}.
Nombre: ${data.nom}
Teléfono: ${data.telefon}
Plazas: ${data.places}${data.notes ? '\nNotas: ' + data.notes : ''}`;
  window.open(`https://wa.me/${window.NX.WHATSAPP}?text=${encodeURIComponent(txt)}`, '_blank');
}

/* api/_lib/tarifes.js — inscripcions: tarifes, extres i càlcul del preu
   ─────────────────────────────────────────────────────────────────────
   Mateix plantejament que BookingFEB, adaptat a Comunitat:

   · Tres models d'inscripció (camp `model` de l'activitat):
       puntual    → una sessió o poques, amb data fixa
       mensual    → la inscripció cobra el primer mes; els mesos
                    següents s'afegeixen com a extres (tipus 'mes')
       trimestral → es paga el període sencer d'un cop

   · Tarifes = nivells (bàsic, intermedi…). Cadascuna amb:
       preu_mode  'fix' | 'gratuit' | 'consultar'
       places     opcional: si hi és, el nivell té aforament propi
                  a més del de l'activitat
       estat      'disponible' | 'complet' (marcat a mà des del panell)

   · Extres:
       'mes'    → mes addicional (només activitats mensuals)
       'sessio' → una altra activitat (ex. autodefensa 13/10 + 10/11):
                  ocupa plaça ALLÀ, amb una reserva filla
       'extra'  → qualsevol altre complement

   El preu no el decideix mai el navegador: aquí es recalcula a partir
   del que hi ha a la base de dades.

   ⚠ js/carret.js té una còpia de `tarifesEvent` i `extresEvent` per al
   navegador. Si en canvies la forma, canvia totes dues. */

export const MODELS       = ['puntual', 'mensual', 'trimestral'];
export const PAGAMENTS    = ['reserva', 'presencial', 'online'];
export const PREU_MODES   = ['fix', 'gratuit', 'consultar'];
export const TIPUS_EXTRA  = ['mes', 'sessio', 'extra'];
export const MAX_PLACES   = 10;     // per reserva (igual que abans)

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

function text(v, max) {
  return String(v ?? '').trim().slice(0, max);
}
function bilingue(o, max, obligatori, etiqueta) {
  const ca = text(o?.ca, max);
  const es = text(o?.es, max) || ca;
  if (obligatori && !ca) throw new Error(`${etiqueta}: falta el text en català`);
  return ca || es ? { ca, es } : null;
}
function enter(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

/* ── Lectura (tolerant) ─────────────────────────────────── */

/* Una activitat sense tarifes es comporta com fins ara: una sola
   tarifa amb el preu de sempre. Així les activitats antigues i el
   fitxer data.js no s'han de migrar. */
export function tarifesEvent(ev) {
  if (Array.isArray(ev?.tarifes) && ev.tarifes.length) {
    return ev.tarifes.map(t => ({
      id: t.id,
      nom: t.nom || { ca: '', es: '' },
      detall: t.detall || null,
      preu_mode: PREU_MODES.includes(t.preu_mode) ? t.preu_mode : 'fix',
      preu_cents: Math.max(0, Number(t.preu_cents) || 0),
      places: t.places == null || t.places === '' ? null : Number(t.places),
      estat: t.estat === 'complet' ? 'complet' : 'disponible'
    }));
  }
  const preu = Math.max(0, Number(ev?.preu_cents) || 0);
  return [{
    id: 'general',
    nom: { ca: 'Inscripció', es: 'Inscripción' },
    detall: null,
    preu_mode: preu > 0 ? 'fix' : 'gratuit',
    preu_cents: preu,
    places: null,
    estat: 'disponible'
  }];
}

export function extresEvent(ev) {
  if (!Array.isArray(ev?.extres)) return [];
  return ev.extres
    .filter(x => x && x.id && TIPUS_EXTRA.includes(x.tipus))
    .map(x => ({
      id: x.id,
      tipus: x.tipus,
      nom: x.nom || { ca: '', es: '' },
      detall: x.detall || null,
      preu_mode: PREU_MODES.includes(x.preu_mode) ? x.preu_mode : 'fix',
      preu_cents: Math.max(0, Number(x.preu_cents) || 0),
      event_id: x.tipus === 'sessio' ? x.event_id : null
    }));
}

/* Import que compta per al total: les línies gratuïtes o a consultar
   sumen 0 (les segones marquen la reserva com a "consultar"). */
function preuEfectiu(item) {
  return item.preu_mode === 'fix' ? item.preu_cents : 0;
}

/* ── Validació del que envia el panell ──────────────────── */

/* Retorna la configuració neta o llança un Error amb un missatge
   que es pot ensenyar tal qual al panell. */
export function validarConfig(body, { eventIds = [] } = {}) {
  const model    = MODELS.includes(body.model) ? body.model : 'puntual';
  const pagament = PAGAMENTS.includes(body.pagament) ? body.pagament : 'reserva';
  const ids = new Set();

  const netejaPreu = (item, etiqueta) => {
    const preu_mode = PREU_MODES.includes(item.preu_mode) ? item.preu_mode : 'fix';
    let preu_cents = 0;
    if (preu_mode === 'fix') {
      preu_cents = enter(item.preu_cents);
      if (!(preu_cents > 0) || preu_cents > 100000) {
        throw new Error(`${etiqueta}: amb "preu fix" cal un import entre 0,01 i 1.000 €. Si no es cobra, tria "Gratuït" o "A consultar".`);
      }
    }
    return { preu_mode, preu_cents };
  };

  const nouId = (id, etiqueta) => {
    const net = text(id, 40).toLowerCase();
    if (!ID_RE.test(net)) throw new Error(`${etiqueta}: identificador no vàlid`);
    if (ids.has(net)) throw new Error(`${etiqueta}: identificador repetit (${net})`);
    ids.add(net);
    return net;
  };

  const tarifesIn = Array.isArray(body.tarifes) ? body.tarifes : [];
  if (!tarifesIn.length) throw new Error('Cal almenys una tarifa (nivell).');
  if (tarifesIn.length > 12) throw new Error('Màxim 12 tarifes per activitat.');

  const tarifes = tarifesIn.map((t, i) => {
    const et = `Tarifa ${i + 1}`;
    const places = t.places == null || t.places === '' ? null : enter(t.places);
    if (places !== null && !(places >= 1 && places <= 999)) {
      throw new Error(`${et}: les places del nivell han de ser entre 1 i 999, o buides.`);
    }
    return {
      id: nouId(t.id, et),
      nom: bilingue(t.nom, 120, true, et),
      detall: bilingue(t.detall, 300, false, et),
      ...netejaPreu(t, et),
      places,
      estat: t.estat === 'complet' ? 'complet' : 'disponible'
    };
  });

  const extresIn = Array.isArray(body.extres) ? body.extres : [];
  if (extresIn.length > 24) throw new Error('Màxim 24 extres per activitat.');

  const extres = extresIn.map((x, i) => {
    const et = `Extra ${i + 1}`;
    if (!TIPUS_EXTRA.includes(x.tipus)) throw new Error(`${et}: tipus no vàlid`);
    if (x.tipus === 'mes' && model !== 'mensual') {
      throw new Error(`${et}: els mesos com a extra només es fan servir en activitats mensuals.`);
    }
    let event_id = null;
    if (x.tipus === 'sessio') {
      event_id = text(x.event_id, 80);
      if (!event_id) throw new Error(`${et}: tria a quina activitat porta la sessió.`);
      if (event_id === body.id) throw new Error(`${et}: una sessió no pot apuntar a la mateixa activitat.`);
      if (eventIds.length && !eventIds.includes(event_id)) {
        throw new Error(`${et}: l'activitat "${event_id}" no existeix.`);
      }
    }
    return {
      id: nouId(x.id, et),
      tipus: x.tipus,
      nom: bilingue(x.nom, 120, true, et),
      detall: bilingue(x.detall, 300, false, et),
      ...netejaPreu(x, et),
      ...(event_id ? { event_id } : {})
    };
  });

  /* preu_cents de l'activitat = el preu fix més baix. Es manté perquè
     el fan servir el panell, l'export i qualsevol lectura antiga. */
  const fixos = tarifes.filter(t => t.preu_mode === 'fix').map(t => t.preu_cents);
  const preu_cents = fixos.length ? Math.min(...fixos) : 0;

  return { model, pagament, tarifes, extres, preu_cents };
}

/* ── Càlcul d'una inscripció ────────────────────────────── */

function errorAmbCodi(codi, missatge) {
  const e = new Error(missatge);
  e.codi = codi;
  return e;
}

/* `linies` i `extres` arriben del navegador com { id: quantitat }.
   Només es fan servir les quantitats; noms i preus surten de `ev`. */
export function calcularInscripcio(ev, linies = {}, extres = {}) {
  const detall = [];
  const sessions = [];
  let places = 0, total = 0, consultar = false;

  for (const t of tarifesEvent(ev)) {
    const q = Math.floor(Number(linies?.[t.id] || 0));
    if (q <= 0) continue;
    if (t.estat === 'complet') throw errorAmbCodi('tarifa_completa', `El nivell ${t.id} és complet`);
    places += q;
    total += q * preuEfectiu(t);
    if (t.preu_mode === 'consultar') consultar = true;
    detall.push({ tipus: 'tarifa', id: t.id, nom: t.nom, qty: q,
                  preu_cents: preuEfectiu(t), preu_mode: t.preu_mode });
  }

  if (places === 0) throw errorAmbCodi('buit', 'No has triat cap plaça');
  if (places > MAX_PLACES) throw errorAmbCodi('massa_places', `Màxim ${MAX_PLACES} places per reserva`);

  for (const x of extresEvent(ev)) {
    const q = Math.floor(Number(extres?.[x.id] || 0));
    if (q <= 0) continue;
    if (q > places) throw errorAmbCodi('extra_excedit', `L'extra ${x.id} supera el nombre de places`);
    total += q * preuEfectiu(x);
    if (x.preu_mode === 'consultar') consultar = true;
    detall.push({ tipus: x.tipus, id: x.id, nom: x.nom, qty: q,
                  preu_cents: preuEfectiu(x), preu_mode: x.preu_mode,
                  ...(x.event_id ? { event_id: x.event_id } : {}) });
    if (x.tipus === 'sessio') sessions.push({ event_id: x.event_id, qty: q, extra_id: x.id });
  }

  return { detall, places, totalCents: total, consultar, sessions };
}

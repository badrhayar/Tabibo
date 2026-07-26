// ─────────────────────────────────────────────────────────────────────────────
// Tabibo — facturation du cabinet.
//   Modèle de facture, persistance locale par praticien, agrégations pour le
//   tableau « Chiffre d'affaires », et jeu de démonstration.
//
//   Contexte marocain : une consultation est soit prise en charge par l'AMO
//   (CNSS / CNOPS, feuille de soins remise au patient ou télétransmise), soit
//   réglée directement par le patient (facturation privée), soit hors
//   nomenclature (acte non remboursable — esthétique, certificat sportif…).
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS = {
  draft:    { key: 'draft',    label: 'Brouillon',    color: '#5A6B65', bg: '#EEF3F0' },
  open:     { key: 'open',     label: 'Ouverte',      color: '#3B6FB0', bg: '#E8F1FC' },
  sent:     { key: 'sent',     label: 'Envoyée',      color: '#0891B2', bg: '#E3F5FA' },
  reminded: { key: 'reminded', label: 'Relancée',     color: '#C28A1B', bg: '#FEF3DC' },
  recovery: { key: 'recovery', label: 'Recouvrement', color: '#C2466A', bg: '#FCE7EE' },
  paid:     { key: 'paid',     label: 'Payée',        color: '#0E7C52', bg: '#E7F6EE' },
  canceled: { key: 'canceled', label: 'Annulée',      color: '#6B7B76', bg: '#F3F4F6' },
};
export const statusOf = (k) => STATUS[k] || STATUS.open;

// Type de facturation — sert aussi de légende colorée aux barres empilées.
export const KINDS = [
  { key: 'prive', label: 'Privé',            color: '#16A06A' },
  { key: 'amo',   label: 'AMO',              color: '#0C4A37' },
  { key: 'hors',  label: 'Hors nomenclature', color: '#5AD6A0' },
];
export const kindOf = (k) => KINDS.find((x) => x.key === k) || KINDS[0];

// Destinataire de la facture.
export const RECIPIENTS = ['Patient', 'CNSS', 'CNOPS', 'Mutuelle'];

// Moyens de paiement encaissés au cabinet.
export const METHODS = [
  { key: 'virement', label: 'Virement' },
  { key: 'enligne',  label: 'Paiement en ligne' },
  { key: 'especes',  label: 'Espèces' },
  { key: 'carte',    label: 'Carte bancaire' },
];
export const methodLabel = (k) => METHODS.find((m) => m.key === k)?.label || k;

// Les trois familles d'états, telles qu'affichées dans la section « Paiement ».
export const OPEN_STATES = ['open', 'sent', 'reminded', 'recovery'];
export const OPEN_BREAKDOWN = [
  { key: 'sent',     label: 'Facturé',      color: '#3B9BD6' },
  { key: 'reminded', label: 'Relancé',      color: '#E9B44C' },
  { key: 'recovery', label: 'Recouvrement', color: '#E2748A' },
];

// ── Persistance ─────────────────────────────────────────────────────────────
const key = (state) => `tabibo_invoices_${state?.appUser?.id || 'demo'}`;

export function loadInvoices(state) {
  try {
    const raw = localStorage.getItem(key(state));
    if (raw) return JSON.parse(raw);
  } catch { /* private mode */ }
  return state?.demoDoctor ? demoSeed() : [];
}

export function saveInvoices(state, list) {
  try { localStorage.setItem(key(state), JSON.stringify(list)); } catch { /* private mode */ }
}

// ── Création ────────────────────────────────────────────────────────────────
export function nextNumber(list) {
  const max = list.reduce((m, i) => Math.max(m, Number(i.no) || 0), 100);
  return String(max + 1);
}

export function makeInvoice({ list, patient, kind = 'prive', amount = 0, sentTo = 'Patient', date, service, status = 'draft' }) {
  const d = date || new Date().toISOString().slice(0, 10);
  return {
    id: `inv_${Date.now()}_${Math.round(Number(nextNumber(list)))}`,
    no: nextNumber(list),
    date: d,
    patient: patient || 'Patient',
    service: service || '',
    sentTo,
    kind,
    status,
    amount: Number(amount) || 0,
    method: null,
    history: [{ label: 'Créée', date: d }],
  };
}

// Fait avancer une facture et journalise l'étape — l'historique affiché dans le
// tableau est toujours le reflet exact de ce qui s'est passé.
export function advance(inv, status, extra = {}) {
  const d = new Date().toISOString().slice(0, 10);
  const label = statusOf(status).label;
  return { ...inv, status, ...extra, history: [{ label, date: d }, ...(inv.history || [])] };
}

// ── Périodes ────────────────────────────────────────────────────────────────
export const PERIODS = [
  { key: 'month',   label: 'Mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year',    label: 'Année' },
  { key: 'custom',  label: 'Personnalisé' },
];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Renvoie { from, to, label } pour la période courante décalée de `offset`.
export function periodRange(kind, offset, today, custom) {
  const base = new Date(`${today}T12:00:00`);
  if (kind === 'custom') {
    const from = custom?.from || today;
    const to = custom?.to || today;
    return { from, to, label: `${frShort(from)} – ${frShort(to)}` };
  }
  if (kind === 'year') {
    const y = base.getFullYear() + offset;
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
  }
  if (kind === 'month') {
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: iso(d), to: iso(end), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  }
  // trimestre
  const q0 = Math.floor(base.getMonth() / 3) + offset;
  const d = new Date(base.getFullYear(), q0 * 3, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 3, 0);
  return { from: iso(d), to: iso(end), label: `T${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}` };
}

export const frShort = (i) => (i ? new Date(`${i}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
export const mad = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} MAD`;

export const inRange = (i, from, to) => i.date >= from && i.date <= to;

// ── Agrégations du tableau de bord ──────────────────────────────────────────
export function summarize(list, from, to) {
  const per = list.filter((i) => inRange(i, from, to) && i.status !== 'canceled');
  const sent = per.filter((i) => i.status !== 'draft');
  const paid = per.filter((i) => i.status === 'paid');
  const open = per.filter((i) => OPEN_STATES.includes(i.status));
  const sum = (l) => l.reduce((t, i) => t + (i.amount || 0), 0);
  const byKind = KINDS.map((k) => {
    const rows = sent.filter((i) => i.kind === k.key);
    return { ...k, total: sum(rows), count: rows.length };
  }).filter((k) => k.count > 0);
  const paidByKind = KINDS.map((k) => {
    const rows = paid.filter((i) => i.kind === k.key);
    return { ...k, total: sum(rows), count: rows.length };
  }).filter((k) => k.count > 0);
  const openByState = OPEN_BREAKDOWN.map((s) => {
    const rows = open.filter((i) => i.status === s.key);
    return { ...s, total: sum(rows), count: rows.length };
  }).filter((s) => s.count > 0);
  const byMethod = METHODS.map((m) => {
    const rows = paid.filter((i) => i.method === m.key);
    return { ...m, total: sum(rows), count: rows.length };
  }).filter((m) => m.count > 0);
  return {
    sentTotal: sum(sent), sentCount: sent.length,
    paidTotal: sum(paid), paidCount: paid.length,
    openTotal: sum(open), openCount: open.length,
    byKind, paidByKind, openByState, byMethod,
  };
}

// « Pas encore facturé » — les consultations réellement réalisées pour
// lesquelles aucune facture n'existe. Calculé sur l'agenda, pas inventé.
export function notInvoiced(state, list, today) {
  const appts = [...(state?.manualConsults || []), ...(state?.consultations || [])];
  const done = appts.filter((c) => c.date <= today && c.status !== 'Annulé' && c.booking !== 'cancelled');
  const invoiced = new Set(list.map((i) => `${i.patient}|${i.date}`));
  const rows = done.filter((c) => !invoiced.has(`${c.patient}|${c.date}`));
  const total = rows.reduce((t, c) => t + (c.amount || c.fee || 0), 0);
  return { rows, total, count: rows.length };
}

// ── Jeu de démonstration ────────────────────────────────────────────────────
// Factures fictives réparties sur le trimestre en cours, avec des états et des
// moyens de paiement réalistes pour que chaque graphique ait de la matière.
const DEMO_PATIENTS = [
  'Fatima Zahra Benali', 'Mohamed Rachid Alami', 'Khadija Oumghar', 'Youssef El Mansouri',
  'Nadia Benbrahim', 'Hassan Berrada', 'Amina Tazi', 'Omar Chraibi', 'Souad Kettani',
  'Karim Bensouda', 'Layla Cherkaoui', 'Driss El Fassi', 'Rachida Idrissi', 'Anas Lahlou',
];
const DEMO_ACTS = [
  { service: 'Consultation générale', amount: 250, kind: 'prive' },
  { service: 'Consultation de suivi', amount: 200, kind: 'amo' },
  { service: 'Échographie', amount: 400, kind: 'prive' },
  { service: 'Contraception', amount: 250, kind: 'amo' },
  { service: 'Certificat sportif', amount: 150, kind: 'hors' },
  { service: 'Bilan annuel', amount: 600, kind: 'prive' },
  { service: 'Frottis de dépistage', amount: 350, kind: 'amo' },
  { service: 'Consultation urgente', amount: 300, kind: 'prive' },
];
const DEMO_FLOW = [
  { status: 'paid',     method: 'virement', w: 26 },
  { status: 'paid',     method: 'enligne',  w: 14 },
  { status: 'paid',     method: 'especes',  w: 18 },
  { status: 'paid',     method: 'carte',    w: 12 },
  { status: 'sent',     method: null,       w: 14 },
  { status: 'reminded', method: null,       w: 6 },
  { status: 'recovery', method: null,       w: 3 },
  { status: 'draft',    method: null,       w: 5 },
  { status: 'canceled', method: null,       w: 2 },
];

function demoSeed() {
  // Déterministe (pas de Math.random) pour que la démo soit identique partout.
  const now = new Date();
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const spanDays = Math.max(1, Math.round((now - qStart) / 86400000));
  const flow = DEMO_FLOW.flatMap((f) => Array(f.w).fill(f));
  const out = [];
  for (let n = 0; n < 118; n++) {
    const act = DEMO_ACTS[n % DEMO_ACTS.length];
    const f = flow[n % flow.length];
    const d = new Date(qStart);
    d.setDate(d.getDate() + ((n * 7) % spanDays));
    const date = iso(d);
    const sentTo = act.kind === 'amo' ? (n % 3 === 0 ? 'CNOPS' : 'CNSS') : (n % 9 === 0 ? 'Mutuelle' : 'Patient');
    const hist = [{ label: 'Créée', date }];
    if (f.status !== 'draft') hist.unshift({ label: 'Envoyée', date });
    if (f.status === 'paid') hist.unshift({ label: 'Payée', date });
    if (f.status === 'reminded') hist.unshift({ label: 'Relancée', date });
    if (f.status === 'recovery') hist.unshift({ label: 'Recouvrement', date });
    if (f.status === 'canceled') hist.unshift({ label: 'Annulée', date });
    out.push({
      id: `demo_inv_${n}`,
      no: String(220 + n),
      date,
      patient: DEMO_PATIENTS[n % DEMO_PATIENTS.length],
      service: act.service,
      sentTo,
      kind: act.kind,
      status: f.status,
      amount: act.amount + (n % 5) * 10,
      method: f.method,
      history: hist,
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

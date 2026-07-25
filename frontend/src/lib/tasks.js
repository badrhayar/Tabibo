// ─────────────────────────────────────────────────────────────────────────────
// Tâches du cabinet — real, auto-generated action items derived from live data
// (nothing invented): rendez-vous à confirmer, patients en salle d'attente,
// consultations terminées non encaissées. Manual tasks are stored locally on
// the device (localStorage), per signed-in user.
// ─────────────────────────────────────────────────────────────────────────────
import { moroccoNow, moDateKeyOf, moTime } from './time';

export function autoTasks(state) {
  const todayKey = moroccoNow().dateISO;
  const appts = [...(state?.manualAppts || []), ...(state?.myAppointments || [])];
  const tasks = [];

  appts
    .filter((a) => a.status === 'pending' && moDateKeyOf(a.datetime) >= todayKey)
    .forEach((a) => tasks.push({
      id: `confirm_${a.id}`, apptId: a.id, kind: 'confirm', screen: 'dappts',
      title: `Confirmer le rendez-vous de ${a.patientName || 'Patient'}`,
      sub: `${moDateKeyOf(a.datetime) === todayKey ? "Aujourd'hui" : moDateKeyOf(a.datetime)} · ${moTime(a.datetime)}`,
      cta: 'Confirmer',
    }));

  appts
    .filter((a) => moDateKeyOf(a.datetime) === todayKey && (a.arrivedAt || a.arrived_at) && !(a.inConsultAt || a.in_consultation_at) && a.status !== 'completed' && a.status !== 'no_show' && a.status !== 'cancelled')
    .forEach((a) => tasks.push({
      id: `waiting_${a.id}`, apptId: a.id, kind: 'waiting', screen: 'doctor',
      title: `${a.patientName || 'Patient'} attend en salle`,
      sub: `Arrivé à ${moTime(a.arrivedAt || a.arrived_at)}`,
      cta: 'Faire entrer',
    }));

  appts
    .filter((a) => moDateKeyOf(a.datetime) === todayKey && a.status === 'completed' && !a.paid)
    .forEach((a) => tasks.push({
      id: `pay_${a.id}`, apptId: a.id, kind: 'pay', screen: 'dappts',
      title: `Encaisser la consultation de ${a.patientName || 'Patient'}`,
      sub: `${moTime(a.datetime)} · ${(a.fee || 0).toLocaleString('fr-FR')} MAD attendus`,
      cta: 'Encaisser',
    }));

  return tasks;
}

// ── Task categories — the colour-coded chips of the task table ───────────────
export const TASK_CATS = [
  { key: 'contact', label: 'Contact patient', color: '#0E7C52', bg: '#E7F6EE' },
  { key: 'rdv',     label: 'Rendez-vous',     color: '#12875A', bg: '#E3F8EE' },
  { key: 'doc',     label: 'Document',        color: '#9A6510', bg: '#FEF4DD' },
  { key: 'result',  label: 'Résultats',       color: '#6B57A6', bg: '#EFEAFB' },
  { key: 'admin',   label: 'Administratif',   color: '#3B6FB0', bg: '#E8F1FC' },
];
export const catOf = (key) => TASK_CATS.find((c) => c.key === key) || TASK_CATS[0];

// The shape every manual task is stored in (localStorage, per signed-in user).
export const EMPTY_TASK = {
  text: '', category: 'contact', patientName: '', patientId: null,
  createdBy: '', calendar: '', assignee: '', due: '', flagged: false, done: false,
};

const storeKey = (state) => `tabibo_tasks_${state?.appUser?.id || 'demo'}`;
export function loadManualTasks(state) {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(state)) || 'null');
    if (Array.isArray(raw)) return raw.map((t) => ({ ...EMPTY_TASK, ...t }));
    // First visit in the sales demo: seed a realistic, clearly-fictional board.
    return state?.demoDoctor ? demoSeed(state) : [];
  } catch { return []; }
}
export function saveManualTasks(state, list) {
  try { localStorage.setItem(storeKey(state), JSON.stringify(list)); } catch { /* private mode */ }
}
export const taskBadge = (state) => autoTasks(state).length + loadManualTasks(state).filter((t) => !t.done).length;

// ── Demo seed — a believable cabinet task board (données fictives) ───────────
function demoSeed(state) {
  const doc = state?.appUser?.full_name || 'Dr. Démonstration';
  const cal = doc;
  const d = moroccoNow().dateISO;
  const plus = (n) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const mk = (i, t) => ({ ...EMPTY_TASK, id: `seed_${i}`, createdBy: doc, calendar: cal, ...t });
  return [
    mk(1, { text: 'Appeler Mme Fatima Zahra Benali pour confirmer son accord sur la date de l’intervention', category: 'contact', patientName: 'Fatima Zahra Benali', assignee: doc, due: d, flagged: true }),
    mk(2, { text: 'Appeler la patiente pour programmer un rendez-vous de contrôle', category: 'rdv', patientName: 'Layla Cherkaoui', assignee: 'Secrétariat', due: d }),
    mk(3, { text: 'Appeler le patient pour discuter de la suite de la prise en charge', category: 'contact', patientName: 'Mohamed Rachid Alami', assignee: doc, due: d }),
    mk(4, { text: 'Ce patient n’a pas rempli son questionnaire d’antécédents', category: 'doc', patientName: 'Youssef El Mansouri', assignee: 'Secrétariat', due: plus(1) }),
    mk(5, { text: 'Analyser les résultats du bilan biologique', category: 'result', patientName: 'Khadija Oumghar', assignee: doc, due: plus(1) }),
    mk(6, { text: 'Appeler le patient pour discuter de la suite de la prise en charge', category: 'contact', patientName: 'Hassan Berrada', assignee: doc, due: plus(2) }),
    mk(7, { text: 'Envoyer le compte-rendu au médecin traitant', category: 'admin', patientName: 'Omar Chraibi', assignee: 'Secrétariat', due: plus(3) }),
  ];
}

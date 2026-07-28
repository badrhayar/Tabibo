// ─────────────────────────────────────────────────────────────────────────────
// Postes de soins (stations) — the physical/functional places a patient can be
// sent to inside the cabinet: l'accueil, chaque médecin, le laboratoire,
// l'échographie, la salle de soins… The doctor defines them once; the
// navigateur patients then routes every patient to the right one.
// Stored per signed-in user (localStorage), so a cabinet keeps its own layout.
// ─────────────────────────────────────────────────────────────────────────────

export const STATION_KINDS = [
  { key: 'desk',   label: 'Accueil / administratif', color: '#3B6FB0', bg: '#E8F1FC' },
  { key: 'doctor', label: 'Médecin',                 color: '#0E7C52', bg: '#E7F6EE' },
  { key: 'assist', label: 'Assistant(e) médical(e)',  color: '#B45309', bg: '#FDF1E0' },
  { key: 'care',   label: 'Salle de soins',          color: '#12875A', bg: '#E3F8EE' },
  { key: 'lab',    label: 'Laboratoire',             color: '#6B57A6', bg: '#EFEAFB' },
  { key: 'imaging',label: 'Imagerie / échographie',  color: '#0891B2', bg: '#E3F5FA' },
  { key: 'other',  label: 'Autre',                   color: '#5A6B65', bg: '#EEF3F0' },
];
export const kindOf = (k) => STATION_KINDS.find((x) => x.key === k) || STATION_KINDS[STATION_KINDS.length - 1];

const key = (state) => `tabibo_stations_${state?.appUser?.id || 'demo'}`;

/** Default layout for a cabinet that has not configured anything yet. */
export function defaultStations(doctorName = 'Médecin') {
  return [
    { id: 'st_desk', name: 'Accueil et admin', kind: 'desk' },
    { id: 'st_doc',  name: doctorName,          kind: 'doctor' },
    { id: 'st_care', name: 'Salle de soins',    kind: 'care' },
  ];
}

/** Les postes du cabinet connecté : la base fait foi, le cache local prend le
 *  relais hors ligne et en démonstration. */
export function loadStations(state, doctorName) {
  const fromDb = state?.myDoctor?.stations;
  if (Array.isArray(fromDb) && fromDb.length) return fromDb;
  try {
    const raw = JSON.parse(localStorage.getItem(key(state)) || 'null');
    if (Array.isArray(raw) && raw.length) return raw;
  } catch { /* private mode */ }
  return defaultStations(doctorName);
}

export function saveStations(state, list) {
  try { localStorage.setItem(key(state), JSON.stringify(list)); } catch { /* private mode */ }
}

/**
 * Les postes RÉELLEMENT enregistrés par le cabinet — la seule liste que voient
 * à la fois le médecin, le secrétariat et le patient.
 *
 * `loadStations` sert à PRÉ-REMPLIR l'éditeur avec une configuration type ;
 * cette fonction-ci, elle, ne renvoie que ce qui a été enregistré. La nuance
 * est importante : proposer au secrétariat un poste que le patient ne verra
 * jamais (parce qu'il n'est pas en base) ferait diverger les deux écrans.
 * Tant que le médecin n'a rien enregistré, la liste est vide et le champ
 * « poste de soins » ne s'affiche nulle part.
 */
export function activeStations(state, doctorName) {
  const fromDb = state?.myDoctor?.stations;
  if (Array.isArray(fromDb)) return fromDb.filter((s) => s && s.name);
  try {
    const raw = JSON.parse(localStorage.getItem(key(state)) || 'null');
    if (Array.isArray(raw)) return raw.filter((s) => s && s.name);
  } catch { /* private mode */ }
  // Aucun compte : en démonstration, on montre une configuration type.
  return state?.demoDoctor ? defaultStations(doctorName) : [];
}

/** Les postes proposés au patient sur la page publique d'un médecin. */
export function stationsOf(doctor) {
  const l = doctor?.stations;
  return Array.isArray(l) ? l.filter((s) => s && s.name) : [];
}

/** Nom lisible d'un poste à partir de son identifiant. */
export function stationName(list, id) {
  if (!id) return '';
  return (list || []).find((s) => s.id === id)?.name || '';
}

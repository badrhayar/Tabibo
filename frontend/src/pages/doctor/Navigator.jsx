import { useState, useEffect, useMemo } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { moTime, moDateKeyOf, moroccoNow, moroccoToUTCISO } from '../../lib/time';
import { initials as initialsOf, BTN_GREEN } from '../../shared.jsx';
import { markArrived, markInConsultation, updateAppointmentStatus, updateAppointment, createWalkinAppointment, fetchStaff, saveDoctorStations } from '../../lib/api';
import { activeStations, saveStations, STATION_KINDS, kindOf, stationName } from '../../lib/stations';

// ─────────────────────────────────────────────────────────────────────────────
// Navigateur patients — the front-desk board for the whole day.
//   Colonne 1 : Visites à venir      (attendus, pas encore arrivés)
//   Colonne 2 : Salle d'attente      (arrivés, en attente — chrono d'attente)
//   Colonne n : une colonne par praticien (patients en consultation)
// Le secrétariat déplace le patient d'une étape à l'autre (walk-in → salle →
// consultation → sortie) et peut laisser une NOTE (urgente si besoin) que le
// médecin voit immédiatement sur la fiche du patient.
// ─────────────────────────────────────────────────────────────────────────────

const DEEP = '#0C4A37';
const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';
const SHADOW = '0 1px 3px rgba(13,43,30,0.05), 0 10px 26px -16px rgba(13,43,30,0.18)';
const URGENT = '#C2263F';

const I = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  plus:  <svg {...I} strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>,
  out:   <svg {...I}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
  chair: <svg {...I}><path d="M6 4v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4" /><path d="M4 13h16M7 20v-7M17 20v-7" /></svg>,
  note:  <svg {...I}><path d="M4 5h16v11H9l-4 4z" /></svg>,
  alert: <svg {...I}><path d="M12 4.5L2.8 20h18.4z" /><path d="M12 10v4M12 17.2v.1" /></svg>,
  file:  <svg {...I}><path d="M14 3v5h5" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /></svg>,
  gear:  <svg {...I}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>,
  arrow: <svg {...I}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
};

const AV = ['#0F6E56', '#2563EB', '#9333EA', '#EA580C', '#DB2777', '#0891B2'];
const barColor = (name) => AV[[...String(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % AV.length];
const isLocalId = (id) => { const s = String(id); return s.startsWith('local_') || s.startsWith('demo_'); };
const minsSince = (iso, now) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

export default function Navigator({ state, setState, go }) {
  const { isMobile } = useViewport();
  const todayKey = moroccoNow().dateISO;
  const doctorId = state?.myDoctor?.id;
  const me = state?.appUser?.full_name || (state?.demoDoctor ? 'Dr. Démonstration' : 'Docteur');

  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const [noteFor, setNoteFor] = useState(null);   // appointment being annotated
  const [walkOpen, setWalkOpen] = useState(false);
  const [showOut, setShowOut] = useState(false);
  const [busy, setBusy] = useState(null);
  const [stationFor, setStationFor] = useState(null);
  const [enterFor, setEnterFor] = useState(null);   // faire entrer depuis la salle d'attente  // appointment being moved
  const [stationsOpen, setStationsOpen] = useState(false);

  // Postes de soins du cabinet (configurables par le médecin).
  const [stations, setStations] = useState(() => activeStations(state, state?.appUser?.full_name || (state?.demoDoctor ? 'Dr. Démonstration' : 'Médecin')));
  // Enregistrer les postes depuis le navigateur écrit AU MÊME ENDROIT que la
  // page Paramètres : la base d'abord (c'est elle que lit le patient), le cache
  // local ensuite. Sans cela, le secrétariat et le patient verraient deux
  // listes différentes.
  const persistStations = async (l) => {
    setStations(l);
    saveStations(state, l);
    if (!doctorId) return;
    try {
      const saved = await saveDoctorStations(doctorId, l);
      setState({ myDoctor: { ...state.myDoctor, stations: saved } });
    } catch (_) {
      setState({ toast: 'Postes non enregistrés — vérifiez la connexion.', toastShow: true });
    }
  };

  // Le médecin vient de modifier ses postes ailleurs (page Paramètres) :
  // le tableau se réaligne sans rechargement.
  const dbStations = state?.myDoctor?.stations;
  useEffect(() => {
    if (Array.isArray(dbStations)) setStations(dbStations.filter((x) => x && x.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(dbStations)]);

  // Practitioners = the doctor + active staff (each gets a consultation column).
  const [staff, setStaff] = useState([]);
  useEffect(() => {
    if (!doctorId) { setStaff(state?.demoDoctor ? ['Dr. Assistante'] : []); return; }
    fetchStaff(doctorId).then((l) => setStaff((l || []).filter((s) => s.active).map((s) => s.name))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);
  const practitioners = useMemo(() => [...new Set([me, ...staff])].filter(Boolean), [me, staff]);

  const all = [...(state?.manualAppts || []), ...(state?.myAppointments || [])];
  const today = all.filter((a) => moDateKeyOf(a.datetime) === todayKey && a.status !== 'cancelled');
  const arrivedAt = (a) => a.arrivedAt || a.arrived_at || null;
  const inConsultAt = (a) => a.inConsultAt || a.in_consultation_at || null;

  const upcoming = today
    .filter((a) => !arrivedAt(a) && a.status !== 'completed' && a.status !== 'no_show')
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const waiting = today
    .filter((a) => arrivedAt(a) && !inConsultAt(a) && a.status !== 'completed' && a.status !== 'no_show')
    .sort((a, b) => new Date(arrivedAt(a)) - new Date(arrivedAt(b)));
  const inConsult = today.filter((a) => inConsultAt(a) && a.status !== 'completed' && a.status !== 'no_show');
  const checkedOut = today.filter((a) => a.status === 'completed')
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  // A patient sits in the station the desk sent them to (fallback: first station).
  const atStation = (st) => inConsult.filter((a) => (a.stationId || stations[0]?.id) === st.id);

  // ── State transitions (optimistic + persisted) ────────────────────────────
  const patch = (id, fn) => setState({
    manualAppts: (state.manualAppts || []).map((a) => a.id === id ? fn(a) : a),
    myAppointments: (state.myAppointments || []).map((a) => a.id === id ? fn(a) : a),
  });

  // Le tableau réagit immédiatement (le secrétariat ne doit jamais attendre le
  // réseau), mais si l'enregistrement échoue il faut le DIRE : sinon le parcours
  // du patient paraît consigné alors que la base n'a rien reçu, et le médecin
  // voit autre chose sur son propre écran. `sync` exécute l'écriture et remonte
  // l'échec sous forme de message clair, à la place du ✓.
  const sync = async (id, run, okToast) => {
    let failed = false;
    try { if (!isLocalId(id)) await run(); }
    catch (_) { failed = true; }
    setState({
      toast: failed ? 'Non enregistré — le tableau est à jour ici, mais vérifiez la connexion.' : okToast,
      toastShow: true,
    });
    return !failed;
  };

  const arrive = async (a) => {
    setBusy(a.id);
    const ts = new Date().toISOString();
    patch(a.id, (x) => ({ ...x, arrivedAt: ts }));
    await sync(a.id, () => markArrived(a.id, true), `${a.patientName || 'Patient'} est en salle d’attente ✓`);
    setBusy(null);
  };
  const enter = async (a, station) => {
    setBusy(a.id);
    const ts = new Date().toISOString();
    patch(a.id, (x) => ({ ...x, inConsultAt: ts, arrivedAt: arrivedAt(x) || ts, stationId: station.id, bookedStationId: station.id, practitioner: station.kind === 'doctor' ? station.name : (x.practitioner || me) }));
    // On enregistre l'entrée ET le poste : le rendez-vous doit dire où se
    // trouve le patient, pas seulement qu'il est pris en charge.
    await sync(a.id, async () => {
      await markInConsultation(a.id, true);
      await updateAppointment(a.id, { station_id: station.id });
    }, `${a.patientName || 'Patient'} → ${station.name} ✓`);
    setBusy(null);
  };
  // Move an already-admitted patient to another station (labo, échographie…).
  // Le poste retenu suit le rendez-vous en base, comme celui choisi à la
  // réservation : sans cela, un patient envoyé au laboratoire réapparaissait
  // dans la colonne du médecin au premier rechargement.
  const moveStation = async (a, station) => {
    patch(a.id, (x) => ({ ...x, stationId: station.id, bookedStationId: station.id, inConsultAt: inConsultAt(x) || new Date().toISOString() }));
    setStationFor(null);
    await sync(a.id, () => updateAppointment(a.id, { station_id: station.id }), `${a.patientName || 'Patient'} déplacé vers ${station.name} ✓`);
  };
  const back = async (a) => {
    setBusy(a.id);
    patch(a.id, (x) => ({ ...x, inConsultAt: null }));
    try { if (!isLocalId(a.id)) await markInConsultation(a.id, false); }
    catch (_) { setState({ toast: 'Non enregistré — vérifiez la connexion.', toastShow: true }); }
    setBusy(null);
  };
  const checkout = async (a) => {
    setBusy(a.id);
    patch(a.id, (x) => ({ ...x, status: 'completed', inConsultAt: null }));
    await sync(a.id, () => updateAppointmentStatus(a.id, 'completed'), `${a.patientName || 'Patient'} : visite terminée ✓`);
    setBusy(null);
  };
  const saveNote = async (a, text, urgent) => {
    patch(a.id, (x) => ({ ...x, deskNote: text, deskUrgent: urgent }));
    setNoteFor(null);
    await sync(a.id, () => updateAppointment(a.id, { notes: text || null }), text ? 'Note transmise au médecin ✓' : 'Note supprimée');
  };
  const openFile = (a) => {
    const roster = state?.patients || [];
    const p = roster.find((x) => (x.name || '').toLowerCase() === (a.patientName || '').toLowerCase())
      || { id: `local_${a.id}`, name: a.patientName || 'Patient', phone: a.patientPhone || '' };
    setState({ pfilePatient: p, pfileApptId: a.id, pfileFrom: 'dnav' });
    go('dpfile');
  };

  // ── Card ──────────────────────────────────────────────────────────────────
  // Le poste demandé lors de la prise de rendez-vous (par le cabinet ou par le
  // patient lui-même). Facultatif : souvent vide.
  const bookedStation = (a) => stations.find((s) => s.id === (a.bookedStationId || a.stationId));
  const bookedName = (a) => stationName(stations, a.bookedStationId);

  const Card = ({ a, tone, actions }) => {
    const wait = arrivedAt(a) && !inConsultAt(a) ? minsSince(arrivedAt(a), now) : null;
    const busyMin = inConsultAt(a) ? minsSince(inConsultAt(a), now) : null;
    const urgent = a.deskUrgent;
    return (
      <div style={{ position: 'relative', background: '#fff', border: `1px solid ${urgent ? '#F3C6CF' : BORDER}`, borderRadius: 13, padding: '11px 13px 11px 15px', marginBottom: 9, boxShadow: '0 1px 2px rgba(13,43,30,0.04)', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: urgent ? URGENT : (tone || barColor(a.patientName)) }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', background: barColor(a.patientName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {initialsOf(a.patientName || 'P')}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <button onClick={() => openFile(a)} title="Ouvrir le dossier"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: DARK, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {a.patientName || 'Patient'}
              </button>
              {urgent && <span title="Urgence signalée" style={{ display: 'inline-flex', color: URGENT, flexShrink: 0 }}>{IC.alert}</span>}
              {a.walkin && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#9A6510', background: '#FEF4DD', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>Walk-in</span>}
              {!inConsultAt(a) && bookedName(a) && (
                <span title="Poste choisi à la réservation" style={{ fontSize: 9.5, fontWeight: 800, color: TEAL, background: '#E9F5F0', borderRadius: 5, padding: '1px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {bookedName(a)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>{a.reason || 'Consultation'}</span>
              <span>·</span><span style={{ fontWeight: 600 }}>{moTime(a.datetime)}</span>
              {wait != null && (
                <span title="Temps d'attente" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, color: wait >= 30 ? URGENT : wait >= 15 ? '#9A6510' : '#0E7C52' }}>
                  <span style={{ display: 'flex' }}>{IC.chair}</span>{wait}′
                </span>
              )}
              {busyMin != null && <span style={{ fontWeight: 700, color: '#0E7C52' }}>en cours · {busyMin}′</span>}
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{a.practitioner || me}</div>
          </div>
        </div>

        {/* Note du secrétariat — visible immédiatement par le médecin */}
        {a.deskNote && (
          <div style={{ marginTop: 9, background: urgent ? '#FDECEF' : '#F1F6F9', border: `1px solid ${urgent ? '#F3C6CF' : '#E3ECF2'}`, borderRadius: 10, padding: '8px 11px', fontSize: 12.5, color: urgent ? '#8A1B30' : '#33433E', lineHeight: 1.5 }}>
            {urgent && <strong>Urgent — </strong>}{a.deskNote}
          </div>
        )}

        <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
          {actions}
          <button onClick={() => setNoteFor(a)} title="Ajouter une note pour le médecin"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 9px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {IC.note}{a.deskNote ? 'Note' : 'Noter'}
          </button>
        </div>
      </div>
    );
  };

  const btnPri = { background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  const btnGhost = { background: '#fff', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 11px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };

  const Column = ({ title, count, children, tint }) => (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${BORDER}`, background: tint || '#FBFDFC', borderRadius: '16px 16px 0 0' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: DARK, letterSpacing: '-0.3px' }}>{title}</span>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: TEAL, background: '#E9F5F0', borderRadius: 20, padding: '1px 8px' }}>{count}</span>
      </div>
      <div style={{ padding: 12, flex: 1, minHeight: 120, maxHeight: isMobile ? 'none' : 620, overflowY: 'auto' }}>{children}</div>
    </div>
  );

  const empty = (t) => <div style={{ padding: '22px 10px', textAlign: 'center', fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{t}</div>;

  return (
    <div className="nav" style={{ padding: isMobile ? 12 : 26, background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{`.nav input:focus,.nav select:focus,.nav textarea:focus{border-color:${TEAL} !important;box-shadow:0 0 0 3px rgba(15,110,86,0.07)}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: DARK, letterSpacing: '-0.4px' }}>Navigateur patients</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>
            Suivez chaque patient de son arrivée à sa sortie — et laissez une note au médecin.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setWalkOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 16px -8px rgba(12,74,55,0.7)' }}>
          {IC.plus} Walk-in
        </button>
        <button onClick={() => setShowOut((v) => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: showOut ? '#E9F5F0' : '#fff', color: TEAL, border: `1px solid ${showOut ? TEAL : BORDER}`, borderRadius: 11, padding: '10px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {IC.out} Sorties récentes ({checkedOut.length})
        </button>
        <button onClick={() => setStationsOpen(true)} title="Définir les postes de soins du cabinet"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 11, padding: '10px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {IC.gear} Postes de soins
        </button>
      </div>

      {/* Un tableau de bord se lit en rangée : toutes les colonnes s'arrêtent à
          la même hauteur, sinon le regard décroche. */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${2 + Math.min(stations.length, 4)}, minmax(0,1fr))`, gap: 14, alignItems: isMobile ? 'start' : 'stretch' }}>
        {/* Visites à venir */}
        <Column title="Visites à venir" count={upcoming.length}>
          {upcoming.length === 0 && empty('Aucune visite à venir aujourd’hui.')}
          {upcoming.map((a) => (
            <Card key={a.id} a={a} actions={
              <button onClick={() => arrive(a)} disabled={busy === a.id} style={btnPri}>Patient arrivé</button>
            } />
          ))}
        </Column>

        {/* Salle d'attente */}
        <Column title="Salle d’attente" count={waiting.length} tint="#F5FBF8">
          {waiting.length === 0 && empty('Salle d’attente vide.')}
          {waiting.map((a) => (
            <Card key={a.id} a={a} tone="#9333EA" actions={
              /* Un vrai sélecteur en fenêtre : la liste déroulante native se
                 refermait au premier rafraîchissement du chrono de salle. */
              stations.length > 1 ? (
                bookedStation(a) ? (
                  <>
                    <button onClick={() => enter(a, bookedStation(a))} disabled={busy === a.id} style={btnPri}>
                      Faire entrer → {bookedStation(a).name}
                    </button>
                    <button onClick={() => setEnterFor(a)} style={btnGhost}>Autre poste…</button>
                  </>
                ) : (
                  <button onClick={() => setEnterFor(a)} style={{ ...btnGhost, color: TEAL, borderColor: TEAL, fontWeight: 700 }}>
                    Envoyer vers…
                  </button>
                )
              ) : (
                <button onClick={() => enter(a, stations[0] || { id: 'st_doc', name: me, kind: 'doctor' })} disabled={busy === a.id} style={btnPri}>Faire entrer</button>
              )
            } />
          ))}
        </Column>

        {/* Une colonne par poste de soins (configurable) */}
        {stations.slice(0, 4).map((st) => {
          const k = kindOf(st.kind);
          return (
            <Column key={st.id} title={st.name} count={atStation(st).length} tint={k.bg}>
              {atStation(st).length === 0 && empty('Aucun patient à ce poste.')}
              {atStation(st).map((a) => (
                <Card key={a.id} a={a} tone={k.color} actions={
                  <>
                    <button onClick={() => checkout(a)} disabled={busy === a.id} style={btnPri}>Terminer la visite</button>
                    <button onClick={() => setStationFor(a)} style={btnGhost} title="Envoyer vers un autre poste">Changer de poste</button>
                    <button onClick={() => openFile(a)} style={btnGhost}>Dossier</button>
                    <button onClick={() => back(a)} style={btnGhost} title="Renvoyer en salle d’attente">↩</button>
                  </>
                } />
              ))}
            </Column>
          );
        })}
      </div>

      {/* Sorties récentes */}
      {showOut && (
        <div style={{ marginTop: 16, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 700, color: DARK, background: '#FBFDFC' }}>
            Sorties récentes — aujourd’hui
          </div>
          <div style={{ padding: 12 }}>
            {checkedOut.length === 0 && empty('Aucune visite terminée pour le moment.')}
            {checkedOut.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 8, background: '#FAFDFB' }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: barColor(a.patientName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initialsOf(a.patientName || 'P')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{a.patientName || 'Patient'}</div>
                  <div style={{ fontSize: 11.5, color: MUTED }}>{a.reason || 'Consultation'} · {moTime(a.datetime)} · {a.practitioner || me}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0E7C52', background: '#E7F6EE', borderRadius: 20, padding: '3px 10px', flexShrink: 0 }}>Sorti</span>
                <button onClick={() => openFile(a)} style={btnGhost}>Dossier</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {noteFor && <NoteModal a={noteFor} onClose={() => setNoteFor(null)} onSave={saveNote} isMobile={isMobile} />}
      {enterFor && (
        <StationPicker a={enterFor} stations={stations} title="Envoyer vers un poste"
          onClose={() => setEnterFor(null)} onPick={(st) => { enter(enterFor, st); setEnterFor(null); }} isMobile={isMobile} />
      )}
      {stationFor && (
        <StationPicker a={stationFor} stations={stations} onClose={() => setStationFor(null)} onPick={(st) => moveStation(stationFor, st)} isMobile={isMobile} />
      )}
      {stationsOpen && (
        <StationsManager stations={stations} onClose={() => setStationsOpen(false)} onSave={persistStations} isMobile={isMobile} />
      )}
      {walkOpen && (
        <WalkinModal
          state={state} setState={setState} onClose={() => setWalkOpen(false)} isMobile={isMobile}
          practitioners={practitioners} doctorId={doctorId} me={me} todayKey={todayKey}
        />
      )}
    </div>
  );
}

// ── Envoyer le patient vers un poste de soins ────────────────────────────────
function StationPicker({ a, stations, onClose, onPick, isMobile, title = 'Poste de soins du patient' }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,42,32,0.52)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1400, padding: isMobile ? 0 : 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: isMobile ? '18px 18px 0 0' : 20, width: '100%', maxWidth: 440, boxShadow: '0 30px 80px -20px rgba(13,43,30,0.55)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: DARK }}>{title}</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>{a.patientName || 'Patient'}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: MUTED, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ padding: 14, maxHeight: '60vh', overflowY: 'auto' }}>
          {stations.map((s) => {
            const k = kindOf(s.kind);
            const on = a.stationId === s.id;
            return (
              <button key={s.id} onClick={() => onPick(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'start', padding: '11px 13px', marginBottom: 8, border: `1px solid ${on ? TEAL : BORDER}`, borderRadius: 12, background: on ? '#F2FAF6' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.name.slice(0, 2).toUpperCase()}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: DARK }}>{s.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: MUTED }}>{k.label}</span>
                </span>
                {on ? <span style={{ fontSize: 11, fontWeight: 700, color: TEAL }}>Ici</span> : <span style={{ color: MUTED, display: 'flex' }}>{IC.arrow}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Définir les postes de soins du cabinet ───────────────────────────────────
function StationsManager({ stations, onClose, onSave, isMobile }) {
  const [list, setList] = useState(stations);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('doctor');
  const add = () => {
    const n = name.trim();
    if (!n) return;
    setList([...list, { id: `st_${Date.now()}`, name: n, kind }]);
    setName('');
  };
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };
  const inp = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 11, fontSize: 13.5, color: DARK, outline: 'none', fontFamily: 'inherit', background: '#fff' };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,42,32,0.52)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1400, padding: isMobile ? 0 : 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: isMobile ? '18px 18px 0 0' : 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px -20px rgba(13,43,30,0.55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.gear}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: DARK }}>Postes de soins du cabinet</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>Médecins, laboratoire, échographie, salle de soins… chacun devient une colonne du navigateur.</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: MUTED, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          {list.map((s, i) => {
            const k = kindOf(s.kind);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 8, background: '#FAFDFB' }}>
                <span style={{ width: 28, height: 28, borderRadius: 9, background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{s.name.slice(0, 2).toUpperCase()}</span>
                <input value={s.name} onChange={(e) => setList(list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  style={{ ...inp, flex: 1, padding: '7px 10px', background: '#fff' }} />
                <select value={s.kind} onChange={(e) => setList(list.map((x, j) => j === i ? { ...x, kind: e.target.value } : x))}
                  style={{ ...inp, width: 168, padding: '7px 10px', cursor: 'pointer' }}>
                  {STATION_KINDS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Monter" style={{ background: 'none', border: 'none', color: i === 0 ? '#C9D6D1' : MUTED, cursor: i === 0 ? 'default' : 'pointer', fontSize: 14 }}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1} title="Descendre" style={{ background: 'none', border: 'none', color: i === list.length - 1 ? '#C9D6D1' : MUTED, cursor: i === list.length - 1 ? 'default' : 'pointer', fontSize: 14 }}>▼</button>
                <button onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="Supprimer" style={{ background: 'none', border: 'none', color: '#C2263F', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
              </div>
            );
          })}
          {list.length === 0 && <div style={{ padding: '18px 0', fontSize: 13, color: MUTED, textAlign: 'center' }}>Aucun poste — ajoutez-en un ci-dessous.</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Nom du poste (ex. Dr. Alaoui, Laboratoire…)" style={{ ...inp, flex: '1 1 200px' }} />
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...inp, width: 190, cursor: 'pointer' }}>
              {STATION_KINDS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
            <button onClick={add} style={{ padding: '10px 15px', borderRadius: 11, border: `1px solid #CFE4DB`, background: '#E9F5F0', color: TEAL, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Ajouter</button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: `1px solid ${BORDER}`, background: '#FAFDFB' }}>
          <button onClick={onClose} style={{ padding: '9px 15px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button onClick={() => { onSave(list); onClose(); }}
            style={{ padding: '9px 17px', borderRadius: 10, border: 'none', background: BTN_GREEN, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Enregistrer les postes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Note du secrétariat ──────────────────────────────────────────────────────
function NoteModal({ a, onClose, onSave, isMobile }) {
  const [text, setText] = useState(a.deskNote || '');
  const [urgent, setUrgent] = useState(!!a.deskUrgent);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,42,32,0.52)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1400, padding: isMobile ? 0 : 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: isMobile ? '18px 18px 0 0' : 20, width: '100%', maxWidth: 460, boxShadow: '0 30px 80px -20px rgba(13,43,30,0.55)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.note}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: DARK }}>Note pour le médecin</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>{a.patientName || 'Patient'} · {moTime(a.datetime)}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: MUTED, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} autoFocus
            placeholder="Ex. Le patient se plaint de fortes douleurs — à examiner en priorité."
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: `1px solid ${BORDER}`, borderRadius: 11, fontSize: 13.5, color: DARK, outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: urgent ? URGENT : DARK, fontWeight: urgent ? 700 : 500, cursor: 'pointer' }}>
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} style={{ accentColor: URGENT, width: 16, height: 16, cursor: 'pointer' }} />
            Signaler comme urgence
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: `1px solid ${BORDER}`, background: '#FAFDFB' }}>
          {a.deskNote && <button onClick={() => onSave(a, '', false)} style={{ background: 'none', border: 'none', color: URGENT, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Supprimer la note</button>}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '9px 15px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button onClick={() => onSave(a, text.trim(), urgent)}
            style={{ padding: '9px 17px', borderRadius: 10, border: 'none', background: BTN_GREEN, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Transmettre au médecin
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Walk-in : un patient sans rendez-vous se présente au cabinet ─────────────
function WalkinModal({ state, setState, onClose, isMobile, practitioners, doctorId, me, todayKey }) {
  const roster = state?.patients || [];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('Consultation générale');
  const [who, setWho] = useState(practitioners[0] || me);
  const [urgent, setUrgent] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    const m = moroccoNow();
    const hhmm = `${String(Math.floor(m.minutes / 60)).padStart(2, '0')}:${String(m.minutes % 60).padStart(2, '0')}`;
    const dt = moroccoToUTCISO(todayKey, hhmm);
    const nowIso = new Date().toISOString();
    const match = roster.find((p) => (p.name || '').toLowerCase() === n.toLowerCase());
    let row = {
      id: `local_w${Date.now()}`, datetime: dt, durationMin: 30, status: 'confirmed',
      patientName: n, patientPhone: phone.trim() || match?.phone || '', reason: reason.trim() || 'Consultation',
      arrivedAt: nowIso, walkin: true, practitioner: who, deskNote: note.trim(), deskUrgent: urgent, fee: null,
    };
    try {
      if (doctorId) {
        const saved = await createWalkinAppointment({
          doctorId, datetime: dt, reason: row.reason, notes: note.trim() || null,
          patientId: match?.userId || null, patientName: n, patientPhone: row.patientPhone || null, durationMinutes: 30,
        });
        if (saved?.id) {
          row = { ...row, id: saved.id };
          try { await markArrived(saved.id, true); }
    catch (_) { setState({ toast: 'Arrivée non enregistrée côté serveur — vérifiez la connexion.', toastShow: true }); }
        }
      }
    } catch (e) {
      setState({ toast: 'Walk-in non synchronisé : ' + (e?.message || 'erreur'), toastShow: true });
    }
    setState({ manualAppts: [...(state.manualAppts || []), row], toast: `${n} ajouté en salle d’attente ✓`, toastShow: true });
    setSaving(false);
    onClose();
  };

  const inp = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: `1px solid ${BORDER}`, borderRadius: 11, fontSize: 13.5, color: DARK, outline: 'none', fontFamily: 'inherit', background: '#fff' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', margin: '0 0 6px' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,42,32,0.52)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1400, padding: isMobile ? 0 : 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: isMobile ? '18px 18px 0 0' : 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px -20px rgba(13,43,30,0.55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 14px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.plus}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: DARK }}>Patient sans rendez-vous</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>Il est ajouté directement en salle d’attente.</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: `1px solid ${BORDER}`, background: '#fff', color: MUTED, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <label style={lbl}>Patient</label>
          <input list="nav-roster" value={name} onChange={(e) => setName(e.target.value)} autoFocus
            placeholder="Nom du patient" style={{ ...inp, marginBottom: 13 }} />
          <datalist id="nav-roster">{roster.map((p) => <option key={p.id} value={p.name} />)}</datalist>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 13, marginBottom: 13 }}>
            <div><label style={lbl}>Téléphone (optionnel)</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212…" style={inp} /></div>
            <div><label style={lbl}>Motif</label><input value={reason} onChange={(e) => setReason(e.target.value)} style={inp} /></div>
            <div>
              <label style={lbl}>Praticien</label>
              <select value={who} onChange={(e) => setWho(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {practitioners.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: urgent ? URGENT : DARK, fontWeight: urgent ? 700 : 500, cursor: 'pointer', padding: '11px 0' }}>
                <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} style={{ accentColor: URGENT, width: 16, height: 16, cursor: 'pointer' }} />
                Urgence
              </label>
            </div>
          </div>
          <label style={lbl}>Note pour le médecin (optionnel)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="Ex. Semble avoir une forte fièvre — à examiner rapidement."
            style={{ ...inp, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: `1px solid ${BORDER}`, background: '#FAFDFB' }}>
          <button onClick={onClose} style={{ padding: '9px 15px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button onClick={save} disabled={!name.trim() || saving}
            style={{ padding: '9px 17px', borderRadius: 10, border: 'none', background: name.trim() ? BTN_GREEN : '#C9D6D1', color: '#fff', fontSize: 13, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            {saving ? 'Ajout…' : 'Ajouter en salle d’attente'}
          </button>
        </div>
      </div>
    </div>
  );
}

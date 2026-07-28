import { useState, useMemo, useRef, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { SEC, Hero, ICONS } from '../../components/SectionKit.jsx';
import { autoTasks, loadManualTasks, saveManualTasks, TASK_CATS, catOf, EMPTY_TASK } from '../../lib/tasks';
import { moroccoNow } from '../../lib/time';
import { DEMO_PATIENTS, initials as initialsOf, BTN_GREEN, BTN_GREEN_SOLID } from '../../shared.jsx';
import { updateAppointmentStatus, markInConsultation, sendApptWhatsApp, notifyApptEmail, fetchStaff } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Tâches — the cabinet's task board (Doctolib-grade).
//   A single sortable table: every task carries a category, a patient, who
//   created it, the agenda it belongs to, who is responsible and a due date.
//   • Tabs scope the board (actuelles / qui me sont assignées / non assignées / toutes)
//   • Six filters (catégorie, responsable, créé par, agenda, échéance, statut)
//   • The check circle completes a task; the flag marks it as priority
//   • Auto rows come from the live agenda (RDV à confirmer, salle d'attente,
//     encaissements) — completing one performs the REAL action, no dead buttons.
// ─────────────────────────────────────────────────────────────────────────────

const DEEP = '#0C4A37';
const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';
const LINK = '#0E7C52';
const SHADOW = '0 1px 3px rgba(13,43,30,0.05), 0 10px 26px -16px rgba(13,43,30,0.18)';

const I = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  search: <svg {...I}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>,
  plus:   <svg {...I} strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>,
  chev:   <svg {...I}><path d="M6 9l6 6 6-6" /></svg>,
  x:      <svg {...I} strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12" /></svg>,
  help:   <svg {...I}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.7.2-1.2.9-1.2 1.6v.5" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></svg>,
  hist:   <svg {...I}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" /></svg>,
};

const AV_COLORS = ['#0F6E56', '#2563EB', '#9333EA', '#EA580C', '#DB2777', '#0891B2'];
const colorFor = (name) => AV_COLORS[[...String(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % AV_COLORS.length];

function Avatar({ name, size = 22 }) {
  if (!name) return <span style={{ color: '#B7C2BD' }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
      <span style={{ width: size, height: size, borderRadius: '50%', background: colorFor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 700, flexShrink: 0 }}>{initialsOf(name)}</span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
    </span>
  );
}

// Compact multi-select popover — "Responsable (2)" with a clear button.
function MultiFilter({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${value.length ? TEAL : '#DCE6E1'}`, borderRadius: 11, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: value.length ? DARK : MUTED, textAlign: 'left' }}>
        <span style={{ display: 'flex', color: value.length ? TEAL : '#9AA8A2', flexShrink: 0 }}>{IC.search}</span>
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: value.length ? 600 : 400 }}>
          {label}{value.length ? ` (${value.length})` : ''}
        </span>
        {value.length > 0 && (
          <span role="button" tabIndex={0} aria-label={`Effacer ${label}`}
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange([]); } }}
            style={{ display: 'flex', color: MUTED, flexShrink: 0 }}>{IC.x}</span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', insetInlineStart: 0, marginTop: 6, minWidth: '100%', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 18px 40px -18px rgba(13,43,30,0.4)', zIndex: 40, padding: 6, maxHeight: 260, overflowY: 'auto' }}>
          {options.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12.5, color: MUTED }}>Aucune option.</div>}
          {options.map((o) => (
            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: DARK, whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F8F5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} style={{ accentColor: BTN_GREEN_SOLID, width: 15, height: 15, cursor: 'pointer' }} />
              {o}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const isLocalId = (id) => { const s = String(id); return s.startsWith('local_') || s.startsWith('demo_'); };
const frDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export default function Tasks({ state, setState, go }) {
  const { isMobile } = useViewport();
  const todayISO = moroccoNow().dateISO;
  const doctorId = state?.myDoctor?.id;
  const me = state?.appUser?.full_name || (state?.demoDoctor ? 'Dr. Démonstration' : 'Docteur');

  const [manual, setManual] = useState(() => loadManualTasks(state));
  const [tab, setTab] = useState('current');
  const [q, setQ] = useState('');
  const [fCat, setFCat] = useState('');
  const [fAssignee, setFAssignee] = useState([]);
  const [fCreator, setFCreator] = useState([]);
  const [fCal, setFCal] = useState([]);
  const [fDue, setFDue] = useState('');
  const [fStatus, setFStatus] = useState('open');
  const [sortDir, setSortDir] = useState('asc');
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Team members = the people a task can be assigned to (real staff when signed in).
  const [staff, setStaff] = useState([]);
  useEffect(() => {
    if (!doctorId) { setStaff(state?.demoDoctor ? ['Secrétariat', 'Dr. Assistante'] : []); return; }
    fetchStaff(doctorId).then((l) => setStaff((l || []).filter((s) => s.active).map((s) => s.name))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);
  const people = useMemo(() => [...new Set([me, ...staff])].filter(Boolean), [me, staff]);
  const roster = state?.patients?.length ? state.patients : (state?.demoDoctor ? DEMO_PATIENTS : []);

  const persist = (list) => { setManual(list); saveManualTasks(state, list); };

  // ── Auto rows: real work items derived from the live agenda ────────────────
  const patchAppt = (id, fn) => setState({
    manualAppts: (state.manualAppts || []).map((a) => a.id === id ? fn(a) : a),
    myAppointments: (state.myAppointments || []).map((a) => a.id === id ? fn(a) : a),
  });
  const runAuto = async (t) => {
    const id = t.apptId;
    setBusyId(t.id);
    try {
      if (t.kind === 'confirm') {
        patchAppt(id, (a) => ({ ...a, status: 'confirmed' }));
        if (!isLocalId(id)) { await updateAppointmentStatus(id, 'confirmed'); sendApptWhatsApp(id, 'confirmed'); notifyApptEmail(id, 'confirmed'); }
        setState({ toast: 'Rendez-vous confirmé — le patient est notifié ✓', toastShow: true });
      } else if (t.kind === 'waiting') {
        patchAppt(id, (a) => ({ ...a, inConsultAt: new Date().toISOString() }));
        if (!isLocalId(id)) await markInConsultation(id, true);
        setState({ toast: 'Patient en consultation ✓', toastShow: true });
      } else if (t.kind === 'pay') {
        setState({ apptPanel: id });
        go('dappts');
      }
    } catch (e) {
      setState({ toast: 'Action impossible : ' + (e?.message || 'erreur'), toastShow: true });
    } finally { setBusyId(null); }
  };

  const AUTO_CAT = { confirm: 'rdv', waiting: 'contact', pay: 'admin' };
  const autoRows = autoTasks(state).map((t) => ({
    id: t.id, auto: t, text: t.title, category: AUTO_CAT[t.kind] || 'admin',
    patientName: t.title.replace(/^.*?(de |)/, '').trim() && (t.patientName || ''),
    createdBy: 'Agenda Tabibo', calendar: me, assignee: me, due: todayISO, flagged: t.kind === 'waiting', done: false,
    sub: t.sub,
  }));
  // The auto title already names the patient; keep the column honest by reusing
  // the appointment's patient when we can resolve it.
  const apptById = (id) => [...(state?.manualAppts || []), ...(state?.myAppointments || [])].find((a) => a.id === id);
  autoRows.forEach((r) => { const a = apptById(r.auto.apptId); if (a) r.patientName = a.patientName || ''; });

  const rows = [...autoRows, ...manual];
  const openRows = rows.filter((t) => !t.done);   // ce que le bandeau compte

  // ── Filtering + sorting ────────────────────────────────────────────────────
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const visible = useMemo(() => {
    let list = rows.slice();
    if (tab === 'mine') list = list.filter((t) => t.assignee === me);
    else if (tab === 'unassigned') list = list.filter((t) => !t.assignee);
    else if (tab === 'current') list = list.filter((t) => !t.done && (!t.due || t.due <= todayISO));
    if (fStatus === 'open') list = list.filter((t) => !t.done);
    else if (fStatus === 'done') list = list.filter((t) => t.done);
    if (q.trim()) list = list.filter((t) => norm(t.patientName).includes(norm(q)) || norm(t.text).includes(norm(q)));
    if (fCat) list = list.filter((t) => t.category === fCat);
    if (fAssignee.length) list = list.filter((t) => fAssignee.includes(t.assignee));
    if (fCreator.length) list = list.filter((t) => fCreator.includes(t.createdBy));
    if (fCal.length) list = list.filter((t) => fCal.includes(t.calendar));
    if (fDue) list = list.filter((t) => t.due === fDue);
    return list.sort((a, b) => {
      if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;        // priorities first
      const d = String(a.due || '9999').localeCompare(String(b.due || '9999'));
      return sortDir === 'asc' ? d : -d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tab, q, fCat, fAssignee, fCreator, fCal, fDue, fStatus, sortDir, me, todayISO]);

  const creators = useMemo(() => [...new Set(rows.map((t) => t.createdBy).filter(Boolean))], [rows]);
  const calendars = useMemo(() => [...new Set(rows.map((t) => t.calendar).filter(Boolean))], [rows]);
  const assignees = useMemo(() => [...new Set([...people, ...rows.map((t) => t.assignee)].filter(Boolean))], [people, rows]);

  const complete = (t) => {
    if (t.auto) { runAuto(t.auto); return; }
    persist(manual.map((x) => x.id === t.id ? { ...x, done: !x.done } : x));
  };
  const toggleFlag = (t) => {
    if (t.auto) return;
    persist(manual.map((x) => x.id === t.id ? { ...x, flagged: !x.flagged } : x));
  };
  const removeTask = (t) => { if (!t.auto) persist(manual.filter((x) => x.id !== t.id)); };
  const openPatient = (name) => {
    const p = roster.find((x) => (x.name || '').toLowerCase() === (name || '').toLowerCase());
    if (!p) { setState({ toast: 'Ce patient n’est pas encore dans votre fichier patients.', toastShow: true }); return; }
    setState({ pfilePatient: p, pfileApptId: null, pfileFrom: 'dtasks' });
    go('dpfile');
  };

  const resetFilters = () => { setFCat(''); setFAssignee([]); setFCreator([]); setFCal([]); setFDue(''); setFStatus('open'); setQ(''); };
  const activeFilters = !!(fCat || fAssignee.length || fCreator.length || fCal.length || fDue || q.trim() || fStatus !== 'open');

  const TABS = [
    ['current', 'Tâches actuelles'],
    ['mine', 'Qui me sont assignées'],
    ['unassigned', 'Non assignées'],
    ['all', 'Toutes les tâches'],
  ];

  const sel = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #DCE6E1', borderRadius: 11, background: '#fff', fontSize: 13, color: DARK, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' };
  const th = { textAlign: 'start', padding: '13px 16px', fontSize: 12, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', borderBottom: `1px solid ${BORDER}`, background: '#FBFDFC' };
  const td = { padding: '13px 16px', fontSize: 13, color: DARK, borderBottom: `1px solid #F1F6F3`, verticalAlign: 'middle' };

  return (
    <div className="tasks" style={{ padding: isMobile ? 12 : 32, background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{`.tasks input:focus,.tasks select:focus,.tasks textarea:focus{border-color:${TEAL} !important;box-shadow:0 0 0 3px rgba(15,110,86,0.07)}
.tasks tbody tr:hover{background:#F7FBF9}`}</style>

      {/* ── Page head ── */}
      <Hero tint={SEC.ttt} icon={ICONS.check} isMobile={isMobile}
        title="Tâches"
        sub="Ce qu’il reste à faire au cabinet : appels à passer, rendez-vous à confirmer, patients à rappeler."
        chips={[
          { value: openRows.length, label: openRows.length > 1 ? 'tâches ouvertes' : 'tâche ouverte' },
          { value: openRows.filter((t) => t.flagged).length, label: 'signalées', color: '#C2263F' },
          { value: openRows.filter((t) => t.due && t.due <= todayISO).length, label: 'pour aujourd’hui', color: '#0E7C52' },
        ]}
        right={<div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button onClick={() => { setFStatus('done'); setTab('all'); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          {IC.hist} Voir les tâches terminées
        </button>
        <button onClick={() => go('contact')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: TEAL, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          {IC.help} Besoin d’aide
        </button>
        </div>} />

      {/* ── Search + tabs ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 0 300px' }}>
          <span style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: '#9AA8A2', display: 'flex' }}>{IC.search}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 38px', border: '1px solid #DCE6E1', borderRadius: 11, fontSize: 13.5, color: DARK, background: '#fff', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'inline-flex', background: '#EDF3F0', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 3, gap: 2, flexWrap: 'wrap' }}>
          {TABS.map(([k, label]) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)}
                style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap', background: on ? BTN_GREEN : 'transparent', color: on ? '#fff' : '#3E4F49', boxShadow: on ? '0 1px 2px rgba(12,74,55,0.25)' : 'none', transition: 'background .12s' }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, minmax(0,1fr))', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>Catégories</label>
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} style={sel}>
            <option value="">Toutes les catégories</option>
            {TASK_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>Responsable</label>
          <MultiFilter label="Responsable" options={assignees} value={fAssignee} onChange={setFAssignee} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>Créé par</label>
          <MultiFilter label="Créé par" options={creators} value={fCreator} onChange={setFCreator} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>Agenda</label>
          <MultiFilter label="Agenda" options={calendars} value={fCal} onChange={setFCal} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>Date d’échéance</label>
          <input type="date" value={fDue} onChange={(e) => setFDue(e.target.value)} style={sel} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>Statut</label>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel}>
            <option value="open">Tâches ouvertes</option>
            <option value="done">Tâches terminées</option>
            <option value="all">Toutes</option>
          </select>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 16px -8px rgba(12,74,55,0.7)' }}>
          {IC.plus} Ajouter une tâche
        </button>
        <button onClick={() => { setFDue(todayISO); setTab('all'); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: TEAL, border: `1px solid ${TEAL}`, borderRadius: 11, padding: '11px 18px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Tâches du jour
        </button>
        {activeFilters && (
          <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Réinitialiser les filtres
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>{visible.length} tâche{visible.length > 1 ? 's' : ''}</span>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 78 }} />
                <th style={th}>Tâche</th>
                <th style={th}>Patient</th>
                <th style={th}>Créé par</th>
                <th style={th}>Agenda</th>
                <th style={th}>Responsable</th>
                <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Date d’échéance
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sortDir === 'asc' ? 'none' : 'rotate(180deg)', color: TEAL }}><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </th>
                <th style={{ ...th, width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '46px 20px', textAlign: 'center', color: MUTED, fontSize: 13.5 }}>
                  {activeFilters ? 'Aucune tâche ne correspond à ces filtres.' : 'Aucune tâche — tout est à jour ✓'}
                </td></tr>
              )}
              {visible.map((t) => {
                const c = catOf(t.category);
                const late = !t.done && t.due && t.due < todayISO;
                return (
                  <tr key={t.id}>
                    {/* complete + flag */}
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <button onClick={() => complete(t)} disabled={busyId === t.id}
                        title={t.auto ? `${t.auto.cta} — exécute l’action` : (t.done ? 'Rouvrir la tâche' : 'Marquer comme terminée')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex', color: t.done ? '#16A06A' : '#9FB3AB', opacity: busyId === t.id ? 0.5 : 1 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={t.done ? '#16A06A' : 'none'} stroke={t.done ? '#fff' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" fill={t.done ? '#16A06A' : 'none'} stroke={t.done ? '#16A06A' : 'currentColor'} />
                          <path d="M8.5 12.3l2.4 2.4 4.6-4.9" />
                        </svg>
                      </button>
                      <button onClick={() => toggleFlag(t)} disabled={!!t.auto}
                        title={t.auto ? 'Priorité automatique' : (t.flagged ? 'Retirer la priorité' : 'Marquer comme prioritaire')}
                        style={{ background: 'none', border: 'none', cursor: t.auto ? 'default' : 'pointer', padding: 2, marginInlineStart: 4, display: 'inline-flex', color: t.flagged ? '#C2263F' : '#9FB3AB' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={t.flagged ? '#C2263F' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 21V4M5 4h11l-1.6 3.4L16 11H5" />
                        </svg>
                      </button>
                    </td>
                    {/* task text + category chip */}
                    <td style={{ ...td, minWidth: 340 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13.5, fontWeight: t.flagged ? 700 : 500, color: t.done ? MUTED : DARK, textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.45 }}>
                          {t.text}
                          {t.sub && <span style={{ display: 'block', fontSize: 11.5, color: MUTED, fontWeight: 500, marginTop: 2 }}>{t.sub}</span>}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, borderRadius: 7, padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.label}</span>
                      </div>
                    </td>
                    {/* patient */}
                    <td style={td}>
                      {t.patientName ? (
                        <button onClick={() => openPatient(t.patientName)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: LINK, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                          {t.patientName}
                        </button>
                      ) : <span style={{ color: '#B7C2BD' }}>—</span>}
                    </td>
                    <td style={{ ...td, color: MUTED, whiteSpace: 'nowrap' }}>{t.createdBy || '—'}</td>
                    <td style={{ ...td, color: MUTED, whiteSpace: 'nowrap' }}>{t.calendar || '—'}</td>
                    <td style={td}><Avatar name={t.assignee} /></td>
                    <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: late ? 700 : 500, color: late ? '#C2263F' : DARK }}>
                      {t.due === todayISO ? "Aujourd'hui" : frDate(t.due)}
                    </td>
                    <td style={{ ...td, textAlign: 'end' }}>
                      {!t.auto && (
                        <button onClick={() => removeTask(t)} aria-label="Supprimer la tâche" title="Supprimer"
                          style={{ background: 'none', border: 'none', color: '#B7C2BD', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 2 }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#C2263F'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#B7C2BD'; }}>×</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <AddTaskModal
          onClose={() => setAddOpen(false)}
          onSave={(t) => { persist([{ ...EMPTY_TASK, ...t, id: `m_${Date.now()}` }, ...manual]); setAddOpen(false); setState({ toast: 'Tâche ajoutée ✓', toastShow: true }); }}
          people={people} roster={roster} me={me} todayISO={todayISO} isMobile={isMobile}
        />
      )}
    </div>
  );
}

// ── Ajouter une tâche ────────────────────────────────────────────────────────
function AddTaskModal({ onClose, onSave, people, roster, me, todayISO, isMobile }) {
  const [f, setF] = useState({ ...EMPTY_TASK, createdBy: me, calendar: me, assignee: me, due: todayISO });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const inp = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: '1px solid #DCE6E1', borderRadius: 11, fontSize: 13.5, color: DARK, background: '#fff', outline: 'none', fontFamily: 'inherit' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', margin: '0 0 6px' };
  const save = () => { if (!f.text.trim()) return; onSave({ ...f, text: f.text.trim() }); };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,42,32,0.52)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1400, padding: isMobile ? 0 : 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: isMobile ? '18px 18px 0 0' : 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px -20px rgba(13,43,30,0.55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{IC.plus}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: DARK, letterSpacing: '-0.2px' }}>Ajouter une tâche</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 1 }}>Assignez-la à un membre de l’équipe avec une échéance.</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: MUTED, cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px' }}>
          <label style={lbl}>Tâche</label>
          <textarea value={f.text} onChange={(e) => set('text', e.target.value)} rows={2} autoFocus
            placeholder="Ex. Appeler la patiente pour confirmer son rendez-vous" style={{ ...inp, resize: 'vertical', marginBottom: 14 }} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Catégorie</label>
              <select value={f.category} onChange={(e) => set('category', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {TASK_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Patient (optionnel)</label>
              <select value={f.patientName} onChange={(e) => set('patientName', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">— Aucun —</option>
                {roster.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Responsable</label>
              <select value={f.assignee} onChange={(e) => set('assignee', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">— Non assignée —</option>
                {people.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Agenda</label>
              <select value={f.calendar} onChange={(e) => set('calendar', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {people.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Date d’échéance</label>
              <input type="date" value={f.due} onChange={(e) => set('due', e.target.value)} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: DARK, cursor: 'pointer', padding: '11px 0' }}>
                <input type="checkbox" checked={f.flagged} onChange={(e) => set('flagged', e.target.checked)} style={{ accentColor: '#C2263F', width: 16, height: 16, cursor: 'pointer' }} />
                Tâche prioritaire
              </label>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: `1px solid ${BORDER}`, background: '#FAFDFB' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button onClick={save} disabled={!f.text.trim()}
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: f.text.trim() ? BTN_GREEN : '#C9D6D1', color: '#fff', fontSize: 13, fontWeight: 700, cursor: f.text.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            Ajouter la tâche
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import { useViewport } from '../../hooks/useViewport';
import { useApp } from '../../context/AppContext';
import { docDisplayName, greenBtn, greenBtnBusy, GREEN_GRAD, BTN_GREEN } from '../../shared.jsx';
import Pager, { usePager } from '../../components/Pager';
import { SEC, Hero, Panel } from '../../components/SectionKit.jsx';
import { buildPrescriptionPDF, pdfOpen, pdfDownload, pdfFileName, loadBrandLogo } from '../../lib/pdf';
import {
  createPrescription,
  fetchPrescriptions,
  fetchPrescriptionTemplates,
  savePrescriptionTemplate,
  deletePrescriptionTemplate,
  sendPrescriptionToPatient,
  deletePrescription, dbErrorMessage } from '../../lib/api';

// The QR/verification link always points at the live domain, never a preview URL.
const PUBLIC_BASE = (import.meta.env.VITE_APP_URL || 'https://tabibo.ma').replace(/\/$/, '');

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BG = '#F5F9F7';
const BORDER = '#E8EFEB';
const MUTED = '#6B7B76';

const T = SEC.ordo;                       // l'ordonnancier a sa couleur : le violet
const I = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  rx:    <svg {...I}><path d="M4 3h9a4 4 0 0 1 0 8H4zM4 11l9 10M13 13l7 8M20 13l-7 8"/></svg>,
  clock: <svg {...I}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>,
  user:  <svg {...I}><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-3.8 3.8-5.8 7.5-5.8s6.7 2 7.5 5.8"/></svg>,
  pill:  <svg {...I}><rect x="2.6" y="8.8" width="18.8" height="6.4" rx="3.2" transform="rotate(-38 12 12)"/><path d="M8.9 8.2l6.2 7.6"/></svg>,
  note:  <svg {...I}><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg>,
};

const emptyRow = () => ({ drug: '', dosage: '', duration: '', instructions: '' });
const todayLabel = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return ''; }
};

const inputStyle = {
  width: '100%',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  color: DARK,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#fff',
};
const focus = (e) => { e.target.style.borderColor = PRIMARY; };
const blur = (e) => { e.target.style.borderColor = BORDER; };

export default function Prescriptions() {
  const { isMobile } = useViewport();
  const { state, setState } = useApp();

  const myDoctor = state?.myDoctor;
  const appUser = state?.appUser;
  const doctorId = myDoctor?.id;
  // Sales demo: the editor + PDF generation are fully client-side, so they work
  // without an account. Only persistence is disabled (with a friendly nudge).
  const isDemo = !doctorId && !!state?.demoDoctor;

  // ── Patient ───────────────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDrop, setShowPatientDrop] = useState(false);

  // ── Items / notes ────────────────────────────────────────────────────────
  const [items, setItems] = useState([emptyRow()]);
  const [notes, setNotes] = useState('');

  // ── Templates ─────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [showTplDrop, setShowTplDrop] = useState(false);

  // ── Recent prescriptions ───────────────────────────────────────────────────
  const [recent, setRecent] = useState([]);
  const recentPager = usePager(recent, 6);

  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  // Signature of the last auto-saved ordonnance, so generate→download→save of the
  // same content doesn't create duplicate records (but an edited one does).
  const savedSigRef = useRef(null);

  const patients = state?.patients || [];
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p => (p.name || '').toLowerCase().includes(q));
  }, [patients, patientSearch]);

  const refreshRecent = async () => {
    if (!doctorId) return;
    try { setRecent(await fetchPrescriptions(doctorId)); }
    catch (e) { console.warn('[Tabibo] fetchPrescriptions failed', e); }
  };
  const refreshTemplates = async () => {
    if (!doctorId) return;
    try { setTemplates(await fetchPrescriptionTemplates(doctorId)); }
    catch (e) { console.warn('[Tabibo] fetchPrescriptionTemplates failed', e); }
  };

  useEffect(() => {
    if (!doctorId) return;
    refreshRecent();
    refreshTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  // Deep-link prefill: "Ordonnance" buttons elsewhere (rendez-vous, fiche
  // patient) land here with the patient already selected.
  useEffect(() => {
    const p = state?.rxPrefill;
    if (!p) return;
    setPatientName(p.name || '');
    setPatientSearch(p.name || '');
    setPatientId(p.patientId || null);
    setState({ rxPrefill: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.rxPrefill]);

  // Écran « compte pas encore activé » — rendu tout en bas, APRÈS l'appel de
  // tous les hooks. Sortir ici en sauterait une partie et React planterait à
  // l'instant où la fiche médecin finit de charger.
  const notReady = !doctorId && !isDemo;

  // ── Item helpers ───────────────────────────────────────────────────────────
  const setItem = (i, field, val) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  };
  const addRow = () => setItems(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const cleanItems = () => items
    .map(it => ({ drug: it.drug.trim(), dosage: it.dosage.trim(), duration: it.duration.trim(), instructions: it.instructions.trim() }))
    .filter(it => it.drug || it.dosage || it.duration || it.instructions);

  const buildDoctorDoc = (itemsArg, nameArg, notesArg) => ({
    // state.myDoctor is the RAW doctors row (specialty / clinic_address / cnom);
    // fall back to the mapped names just in case the shape varies.
    doctorName: docDisplayName(appUser?.full_name, myDoctor?.specialty || myDoctor?.spec) || (isDemo ? 'Dr. Démonstration' : ''),
    specialty: myDoctor?.specialty || myDoctor?.spec,
    cnom: myDoctor?.cnom,
    inpe: appUser?.cin_or_inpe,
    clinic: myDoctor?.clinic_address || myDoctor?.clinic,
    city: myDoctor?.city,
    phone: appUser?.phone,
    patientName: nameArg,
    dateLabel: todayLabel(),
    items: itemsArg,
    notes: notesArg,
  });

  // ── Patient selection ──────────────────────────────────────────────────────
  const choosePatient = (p) => {
    setPatientName(p.name || '');
    setPatientId(p.userId || null);
    setPatientSearch(p.name || '');
    setShowPatientDrop(false);
  };
  const onPatientType = (val) => {
    setPatientSearch(val);
    setPatientName(val);
    setPatientId(null); // free-text / walk-in until a roster item is picked
    setShowPatientDrop(true);
  };

  // ── Templates ──────────────────────────────────────────────────────────────
  const loadTemplate = (tpl) => {
    const its = Array.isArray(tpl.items) && tpl.items.length
      ? tpl.items.map(it => ({ drug: it.drug || '', dosage: it.dosage || '', duration: it.duration || '', instructions: it.instructions || '' }))
      : [emptyRow()];
    setItems(its);
    setShowTplDrop(false);
    setState({ toast: `Modèle « ${tpl.name} » chargé`, toastShow: true });
  };
  const saveAsTemplate = async () => {
    if (isDemo) { setState({ toast: 'Mode démo — créez votre compte pour enregistrer des modèles.', toastShow: true }); return; }
    const its = cleanItems();
    if (!its.length) { setState({ toast: 'Ajoutez au moins un médicament.', toastShow: true }); return; }
    const name = window.prompt('Nom du modèle :');
    if (!name || !name.trim()) return;
    try {
      await savePrescriptionTemplate(doctorId, { name: name.trim(), items: its });
      await refreshTemplates();
      setState({ toast: 'Modèle enregistré ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Échec : ' + dbErrorMessage(e), toastShow: true });
    }
  };
  const removeTemplate = async (tpl) => {
    if (!window.confirm(`Supprimer le modèle « ${tpl.name} » ?`)) return;
    try {
      await deletePrescriptionTemplate(tpl.id);
      await refreshTemplates();
      setState({ toast: 'Modèle supprimé', toastShow: true });
    } catch (e) {
      setState({ toast: 'Échec : ' + dbErrorMessage(e), toastShow: true });
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const ensureReady = () => {
    if (!patientName.trim()) { setState({ toast: 'Indiquez le nom du patient.', toastShow: true }); return null; }
    const its = cleanItems();
    if (!its.length) { setState({ toast: 'Ajoutez au moins un médicament.', toastShow: true }); return null; }
    return its;
  };

  // One stable reference (+ QR) per ordonnance content, reused across
  // generate/download/save so the printed code matches the saved record.
  const refMap = useRef({ sig: null, ref: null });
  const currentRef = (its) => {
    const sig = JSON.stringify({ p: patientName.trim(), i: its, n: notes.trim() });
    if (refMap.current.sig !== sig) {
      // Crypto-random reference: verify_prescription(ref) is a public RPC, so the
      // ref must be unguessable (a time-derived code would be an existence oracle).
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O/1/I — printed on the ordonnance
      const bytes = crypto.getRandomValues(new Uint8Array(10));
      const code = 'ORD-' + [...bytes].map((b) => A[b % A.length]).join('');
      refMap.current = { sig, ref: code };
    }
    return refMap.current.ref;
  };
  const makeQr = async (ref) => {
    try { return await QRCode.toDataURL(`${PUBLIC_BASE}/verifier-ordonnance?rx=${ref}`, { width: 240, margin: 0 }); }
    catch { return ''; }
  };

  // Save the ordonnance unless this exact content was already saved this session.
  const persist = async (its, ref) => {
    if (isDemo) { setState({ toast: 'Mode démo — créez votre compte pour enregistrer vos ordonnances.', toastShow: true }); return 'skip'; }
    const sig = JSON.stringify({ p: patientName.trim(), i: its, n: notes.trim() });
    if (sig === savedSigRef.current) return 'skip';   // unchanged → already archived
    savedSigRef.current = sig;
    try {
      await createPrescription(doctorId, { patientId, patientName: patientName.trim(), items: its, notes: notes.trim() || null, ref });
      await refreshRecent();
      setState({ toast: 'Ordonnance enregistrée ✓', toastShow: true });
      return 'saved';
    } catch (e) {
      savedSigRef.current = null;                // allow a retry on the next action
      setState({ toast: 'Enregistrement échoué : ' + dbErrorMessage(e), toastShow: true });
      return 'error';
    }
  };

  const generatePDF = async () => {
    const its = ensureReady(); if (!its) return;
    const ref = currentRef(its);
    const [qr, logo] = await Promise.all([makeQr(ref), loadBrandLogo()]);
    pdfOpen(buildPrescriptionPDF({ ...buildDoctorDoc(its, patientName.trim(), notes.trim()), ref, qr, logo }), pdfFileName('ordonnance', patientName));
    persist(its, ref);                           // auto-save so nothing is lost
  };
  const downloadPDF = async () => {
    const its = ensureReady(); if (!its) return;
    const ref = currentRef(its);
    const [qr, logo] = await Promise.all([makeQr(ref), loadBrandLogo()]);
    pdfDownload(buildPrescriptionPDF({ ...buildDoctorDoc(its, patientName.trim(), notes.trim()), ref, qr, logo }), `ordonnance-${patientName.trim() || 'patient'}.pdf`);
    setDownloaded(true);
    persist(its, ref);                           // auto-save
  };
  const savePrescription = async () => {
    const its = ensureReady(); if (!its) return;
    setBusy(true);
    try {
      const r = await persist(its, currentRef(its));
      if (r === 'skip') setState({ toast: 'Ordonnance déjà enregistrée ✓', toastShow: true });
    } finally { setBusy(false); }
  };

  const openRecent = async (p) => {
    const its = Array.isArray(p.items) ? p.items : [];
    const [qr, logo] = await Promise.all([p.ref ? makeQr(p.ref) : Promise.resolve(''), loadBrandLogo()]);
    pdfOpen(buildPrescriptionPDF({ ...buildDoctorDoc(its, p.patient_name || '', p.notes || ''), ref: p.ref || '', qr, logo }), pdfFileName('ordonnance', p.patient_name));
  };

  // Send a saved ordonnance to the patient's Tabibo space (needs a linked account).
  const [sendBusyId, setSendBusyId] = useState(null);
  const sendToPatient = async (p) => {
    if (!p.patient_id) {
      setState({ toast: "Ordonnance non liée à un compte patient. Sélectionnez un patient enregistré (« Fiche liée ») pour pouvoir l'envoyer.", toastShow: true });
      return;
    }
    setSendBusyId(p.id);
    try {
      await sendPrescriptionToPatient(p.id);
      await refreshRecent();
      setState({ toast: 'Ordonnance envoyée au patient ✓', toastShow: true });
    } catch (e) {
      setState({ toast: 'Envoi échoué : ' + dbErrorMessage(e), toastShow: true });
    } finally { setSendBusyId(null); }
  };
  const removeRecent = async (p) => {
    if (!window.confirm('Supprimer cette ordonnance ? Cette action est définitive.')) return;
    try {
      await deletePrescription(p.id);
      await refreshRecent();
      setState({ toast: 'Ordonnance supprimée', toastShow: true });
    } catch (e) {
      setState({ toast: 'Suppression échouée : ' + dbErrorMessage(e), toastShow: true });
    }
  };

  const dropRef = useRef(null);

  if (notReady) return (
    <div style={{ padding: isMobile ? 16 : 32, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: '40px 32px', textAlign: 'center', maxWidth: 420, color: MUTED, fontSize: 15 }}>
        Disponible une fois votre compte médecin activé.
      </div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 12 : 32, background: BG, minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Bandeau de l'ordonnancier */}
      <Hero tint={T} icon={IC.rx} isMobile={isMobile}
        title="Ordonnances"
        sub="Rédigez, générez et envoyez des ordonnances électroniques — chacune vérifiable par son code."
        chips={[
          { value: items.filter((x) => x.drug.trim()).length, label: 'dans le brouillon' },
          { value: recent.length, label: 'ordonnances récentes', color: SEC.profil.c },
          { value: recent.filter((p) => p.sent_at).length, label: 'envoyées', color: '#0E7C52' },
          { value: templates.length, label: templates.length > 1 ? 'modèles' : 'modèle', color: SEC.factures.c },
        ]} />

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 20, alignItems: 'stretch' }}>

        {/* LEFT — Editor */}
        <div style={{ flex: 1.6, minWidth: 0 }}>
          <Panel tint={T} icon={IC.pill} title="Nouvelle ordonnance" sub="Un médicament par bloc." pad={20}
            right={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Charger un modèle */}
                <div style={{ position: 'relative' }} ref={dropRef}>
                  <button
                    onClick={() => setShowTplDrop(v => !v)}
                    style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 13px', fontSize: 12.5, color: DARK, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    Charger un modèle ▾
                  </button>
                  {showTplDrop && (
                    <>
                      <div onClick={() => setShowTplDrop(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: 240, background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 100, overflowY: 'auto', maxHeight: 280 }}>
                        {templates.length === 0 && (
                          <div style={{ padding: '12px 14px', fontSize: 13, color: MUTED }}>Aucun modèle enregistré.</div>
                        )}
                        {templates.map(tpl => (
                          <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${BORDER}` }}
                            onMouseEnter={e => e.currentTarget.style.background = BG}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            <span onClick={() => loadTemplate(tpl)} style={{ flex: 1, fontSize: 13, color: DARK, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {tpl.name}
                              <span style={{ color: MUTED, marginLeft: 6 }}>({Array.isArray(tpl.items) ? tpl.items.length : 0})</span>
                            </span>
                            <button onClick={() => removeTemplate(tpl)} title="Supprimer" style={{ border: 'none', background: 'transparent', color: '#D14343', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 2 }}>×</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Enregistrer comme modèle */}
                <button
                  onClick={saveAsTemplate}
                  style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 13px', fontSize: 12.5, color: DARK, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                >
                  Enregistrer comme modèle
                </button>
              </div>
            }>

            {/* Patient typeahead */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 8 }}>Patient</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={patientSearch}
                  onChange={e => onPatientType(e.target.value)}
                  onFocus={(e) => { focus(e); setShowPatientDrop(true); }}
                  onBlur={blur}
                  placeholder="Rechercher un patient ou saisir un nom…"
                  style={inputStyle}
                />
                {patientId && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 600, color: PRIMARY }}>Fiche liée</span>
                )}
                {showPatientDrop && filteredPatients.length > 0 && (
                  <>
                    <div onClick={() => setShowPatientDrop(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 100, overflowY: 'auto', maxHeight: 240 }}>
                      {filteredPatients.map(p => (
                        <div key={p.id} onMouseDown={() => choosePatient(p)}
                          style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, color: DARK, borderBottom: `1px solid ${BORDER}` }}
                          onMouseEnter={e => e.currentTarget.style.background = BG}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          {p.name}
                          {p.phone && <span style={{ color: MUTED, fontSize: 12, marginLeft: 8 }}>{p.phone}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Medication rows */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 10 }}>Médicaments</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {items.map((it, i) => (
                  <div key={i} style={{ border: `1px solid ${it.drug.trim() ? T.c + '33' : '#EDF2EF'}`, borderInlineStart: `3px solid ${it.drug.trim() ? T.c : '#E3EBE7'}`, borderRadius: 13, padding: 14, background: it.drug.trim() ? `linear-gradient(120deg, ${T.bg}, #fff 70%)` : '#FBFDFC', transition: 'background .15s, border-color .15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 9, background: '#fff', color: T.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, boxShadow: `0 4px 10px -6px ${T.c}` }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: DARK }}>{it.drug.trim() || `Médicament ${i + 1}`}</span>
                      <button
                        onClick={() => removeRow(i)}
                        disabled={items.length === 1}
                        title="Retirer"
                        style={{ border: 'none', background: '#fff', borderRadius: 8, width: 28, height: 28, color: items.length === 1 ? '#CFD9D5' : '#C2466A', cursor: items.length === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      <input value={it.drug} onChange={e => setItem(i, 'drug', e.target.value)} onFocus={focus} onBlur={blur} placeholder="Médicament (ex. Doliprane 1000mg)" style={inputStyle} />
                      <input value={it.dosage} onChange={e => setItem(i, 'dosage', e.target.value)} onFocus={focus} onBlur={blur} placeholder="Posologie (ex. 1 cp 3x/jour)" style={inputStyle} />
                      <input value={it.duration} onChange={e => setItem(i, 'duration', e.target.value)} onFocus={focus} onBlur={blur} placeholder="Durée (ex. 7 jours)" style={inputStyle} />
                      <input value={it.instructions} onChange={e => setItem(i, 'instructions', e.target.value)} onFocus={focus} onBlur={blur} placeholder="Instructions (ex. après les repas)" style={inputStyle} />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addRow}
                style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 7, background: T.bg, border: `1px dashed ${T.c}66`, color: T.c, borderRadius: 11, padding: '10px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Ajouter un médicament
              </button>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 8 }}>Remarques (optionnel)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Conseils, précautions…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={focus}
                onBlur={blur}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                onClick={generatePDF}
                style={{ ...greenBtn, flex: isMobile ? '1 1 100%' : '0 1 auto' }}
              >
                Générer le PDF
              </button>
              <button
                onClick={downloadPDF}
                style={{ flex: isMobile ? '1 1 100%' : '0 1 auto', background: '#fff', color: DARK, border: `1px solid #D8E2DD`, borderRadius: 8, padding: '6px 14px', minHeight: 30, fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
              >
                Télécharger
              </button>
              <button
                onClick={savePrescription}
                disabled={busy}
                style={{ flex: isMobile ? '1 1 100%' : '0 1 auto', background: '#fff', color: '#0F6E56', border: '1px solid #BFE0D4', borderRadius: 8, padding: '6px 14px', minHeight: 30, fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}
              >
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>

            {/* WhatsApp hint */}
            {downloaded && (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: `${PRIMARY}12`, border: `1px solid ${PRIMARY}33`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: DARK }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>
                Téléchargez puis joignez le PDF dans WhatsApp.
              </div>
            )}
          </Panel>
        </div>

        {/* RIGHT — Recent prescriptions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Panel tint={SEC.histo} icon={IC.clock} title="Ordonnances récentes" sub="Rouvrez le PDF, envoyez-le au patient, ou retirez-le." pad={0}
            right={<span style={{ fontSize: 12, fontWeight: 800, color: SEC.histo.c, background: SEC.histo.bg, borderRadius: 99, padding: '3px 10px' }}>{recent.length}</span>}>
            <div style={{ overflow: 'hidden' }}>
              {recent.length === 0 && (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: MUTED, fontSize: 13 }}>
                  Aucune ordonnance pour le moment.
                </div>
              )}
              {recentPager.items.map((p, idx) => (
                <div key={p.id}
                  style={{ padding: '14px 16px', borderBottom: idx < recentPager.items.length - 1 ? `1px solid ${BORDER}` : 'none', background: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = BG}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.patient_name || 'Patient'}
                        {p.sent_at && <span style={{ marginLeft: 7, fontSize: 10.5, fontWeight: 700, color: '#138257', background: '#E7F6EE', borderRadius: 99, padding: '1px 7px' }}>Envoyée ✓</span>}
                      </div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                        {fmtDate(p.created_at)} · {Array.isArray(p.items) ? p.items.length : 0} médicament{(Array.isArray(p.items) ? p.items.length : 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => openRecent(p)}
                      title="Ouvrir le PDF"
                      style={{ height: 32, padding: '0 12px', borderRadius: 8, border: `1.5px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
                    >
                      PDF
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => sendToPatient(p)}
                      disabled={sendBusyId === p.id || !!p.sent_at}
                      title={p.patient_id ? 'Envoyer au patient' : 'Patient non lié à un compte'}
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 30, borderRadius: 8, border: 'none', background: p.sent_at ? '#EDF3F0' : BTN_GREEN, color: p.sent_at ? MUTED : '#fff', fontSize: 12.5, fontWeight: 600, cursor: (sendBusyId === p.id || p.sent_at) ? 'default' : 'pointer', opacity: sendBusyId === p.id ? 0.7 : 1 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      {p.sent_at ? 'Envoyée' : (sendBusyId === p.id ? 'Envoi…' : 'Envoyer au patient')}
                    </button>
                    <button
                      onClick={() => removeRecent(p)}
                      title="Supprimer l'ordonnance"
                      style={{ width: 40, height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: '#fff', color: '#D14343', fontSize: 15, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 14px 12px' }}><Pager pager={recentPager} compact={isMobile} /></div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

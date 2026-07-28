import { useState, useEffect, useRef, useMemo } from 'react';
import { BTN_GREEN_SOLID } from '../../shared.jsx';
import { uploadDocument, listDocuments, getDocumentUrl, downloadDocument, updateAppointment } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Documents du patient — the dossier's document desk.
//   Left   : every document of this patient (searchable, multi-select, status)
//   Center : the live preview (image / PDF / generic file)
//   Right  : classification — patient, category, and the save action
// Real files are uploaded to the private documents bucket; in the sales demo
// they live in the browser session only (clearly labelled données fictives).
// ─────────────────────────────────────────────────────────────────────────────

const TEAL = '#0F6E56';
const DEEP = '#0C4A37';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';

const I = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };

// Document categories — colour-tiled, exactly the vocabulary of a Moroccan cabinet.
export const DOC_CATS = [
  { key: 'labo',     label: 'Analyses (labo)',   color: '#0E7C52', bg: '#E7F6EE', icon: <svg {...I}><path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.3 22h11.4a2 2 0 0 0 1.8-3.5L14 9V3"/><path d="M7 15h10"/></svg> },
  { key: 'imagerie', label: 'Imagerie',          color: '#3B6FB0', bg: '#E8F1FC', icon: <svg {...I}><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 15l5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8" r="1.6"/></svg> },
  { key: 'radio',    label: 'Radiographie',      color: '#6B57A6', bg: '#EFEAFB', icon: <svg {...I}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M8 8c2 1.5 6 1.5 8 0M8 16c2-1.5 6-1.5 8 0"/></svg> },
  { key: 'ecg',      label: 'ECG',               color: '#C2466A', bg: '#FCE7EE', icon: <svg {...I}><path d="M2 12h4l2-6 4 12 3-8 2 2h5"/></svg> },
  { key: 'ordo',     label: 'Ordonnance',        color: '#12875A', bg: '#E3F8EE', icon: <svg {...I}><path d="M4 3h9a4 4 0 0 1 0 8H4zM4 11l9 10M13 13l7 8M20 13l-7 8"/></svg> },
  { key: 'courrier', label: 'Courrier médical',  color: '#9A6510', bg: '#FEF4DD', icon: <svg {...I}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> },
  { key: 'compte',   label: 'Compte-rendu',      color: '#0891B2', bg: '#E3F5FA', icon: <svg {...I}><path d="M14 3v5h5"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h4"/></svg> },
  { key: 'arret',    label: 'Arrêt de travail',  color: '#DB2777', bg: '#FCE7F3', icon: <svg {...I}><path d="M14 3v5h5"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><circle cx="12" cy="14" r="2.4"/></svg> },
  { key: 'facture',  label: 'Facture',           color: '#C28A1B', bg: '#FEF3DC', icon: <svg {...I}><path d="M6 2.5h12v19l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9.5 8h5M9.5 12h5M9.5 16h3"/></svg> },
  { key: 'assur',    label: 'Carte d’assurance', color: '#EA580C', bg: '#FFF0E6', icon: <svg {...I}><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11.5" r="2"/><path d="M5.4 16.4c.5-1.7 1.6-2.5 3.1-2.5s2.6.8 3.1 2.5"/><path d="M14.5 10h4.5M14.5 14h4.5"/></svg> },
  { key: 'autre',    label: 'Autre document',    color: '#5A6B65', bg: '#EEF3F0', icon: <svg {...I}><path d="M14 3v5h5"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg> },
];
export const docCat = (k) => DOC_CATS.find((c) => c.key === k) || DOC_CATS[DOC_CATS.length - 1];

const STATUS = {
  pending:  { label: 'À classer',  color: '#9A6510', bg: '#FEF4DD' },
  ok:       { label: 'Classé',     color: '#0E7C52', bg: '#E7F6EE' },
  review:   { label: 'À revoir',   color: '#C2466A', bg: '#FCE7EE' },
};

const isImg = (t) => /^image\//.test(t || '') || /\.(png|jpe?g|gif|webp)$/i.test(t || '');
const isPdf = (t) => /pdf/i.test(t || '');
const frDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const kb = (n) => (n ? (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`) : '');

// Local classification store — keeps category/status per document id, so a
// re-classification survives a reload in both demo and real mode.
const metaKey = (uid) => `tabibo_docmeta_${uid || 'demo'}`;
const loadMeta = (uid) => { try { return JSON.parse(localStorage.getItem(metaKey(uid)) || '{}'); } catch { return {}; } };
const saveMeta = (uid, m) => { try { localStorage.setItem(metaKey(uid), JSON.stringify(m)); } catch { /* private mode */ } };
export const loadDocMeta = loadMeta;

// Single source of truth for "which documents belong to this patient" — used by
// this cabinet AND by the dossier's Verlauf timeline, so both always agree.
export async function fetchPatientDocs({ state, patient, pkey }) {
  const doctorId = state?.myDoctor?.id;
  if (!doctorId) {
    const seeded = (state?.demoPatientDocs || {})[pkey];
    return seeded || demoSeed(patient);
  }
  const all = await listDocuments();
  return (all || [])
    .filter((d) => String(d.patient_id || '') === String(patient?.userId || '') || (d.notes || '').includes(`[${pkey}]`))
    .map((d) => ({
      id: d.id, name: (d.notes || '').replace(/\s*\[.*?\]\s*$/, '') || 'Document',
      type: d.file_type || '', path: d.file_url, at: d.uploaded_at, source: 'Cabinet', size: 0,
    }));
}

export default function PatientDocs({ state, setState, patient, pkey, isMobile, card, CardHead, IC_FILE, Hero, tint }) {
  const doctorId = state?.myDoctor?.id;
  const uid = state?.appUser?.id;
  const isDemo = !doctorId;
  const fileRef = useRef(null);

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [checked, setChecked] = useState([]);
  const [q, setQ] = useState('');
  const [meta, setMeta] = useState(() => loadMeta(uid));
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  // Classification draft (right pane)
  const [draftCat, setDraftCat] = useState('autre');
  const [draftStatus, setDraftStatus] = useState('pending');
  const [catOpen, setCatOpen] = useState(false);

  // ── Load this patient's documents ────────────────────────────────────────
  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchPatientDocs({ state, patient, pkey });
        if (on) setDocs(rows);
      } catch (e) {
        setState({ toast: 'Chargement des documents échoué : ' + (e?.message || 'erreur'), toastShow: true });
      } finally { on && setLoading(false); }
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkey, doctorId]);

  const withMeta = useMemo(() => docs.map((d) => ({
    ...d,
    category: meta[d.id]?.category || d.category || 'autre',
    status: meta[d.id]?.status || d.status || 'pending',
  })), [docs, meta]);

  const list = useMemo(() => {
    const n = (s) => (s || '').toLowerCase();
    return withMeta.filter((d) => !q.trim() || n(d.name).includes(n(q)) || n(docCat(d.category).label).includes(n(q)));
  }, [withMeta, q]);

  const sel = list.find((d) => d.id === selId) || list[0] || null;
  useEffect(() => { if (sel) { setDraftCat(sel.category); setDraftStatus(sel.status); } }, [sel?.id]); // eslint-disable-line

  // Resolve a preview URL (signed for real files, blob for demo uploads).
  useEffect(() => {
    let on = true; let revoke = '';
    (async () => {
      if (!sel) { setPreviewUrl(''); return; }
      if (sel.blobUrl) { setPreviewUrl(sel.blobUrl); return; }
      if (!sel.path) { setPreviewUrl(''); return; }
      try { const u = await getDocumentUrl(sel.path); if (on) { setPreviewUrl(u); revoke = ''; } }
      catch { if (on) setPreviewUrl(''); }
    })();
    return () => { on = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [sel?.id]); // eslint-disable-line

  // ── Upload ────────────────────────────────────────────────────────────────
  const onPick = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        if (isDemo) {
          const row = { id: `demo_${Date.now()}_${file.name}`, name: file.name, type: file.type, size: file.size, at: new Date().toISOString(), source: 'Importé', blobUrl: URL.createObjectURL(file), category: guessCat(file), status: 'pending' };
          setDocs((l) => { const next = [row, ...l]; setState({ demoPatientDocs: { ...(state.demoPatientDocs || {}), [pkey]: next } }); return next; });
          setSelId(row.id);
        } else {
          const saved = await uploadDocument({ file, ownerId: uid, patientId: patient?.userId || null, doctorId, direction: 'to_doctor', fileType: file.type, notes: `${file.name} [${pkey}]` });
          const row = { id: saved?.id || `up_${Date.now()}`, name: file.name, type: file.type, size: file.size, at: new Date().toISOString(), source: 'Importé', path: saved?.file_url, category: guessCat(file), status: 'pending' };
          setDocs((l) => [row, ...l]);
          setSelId(row.id);
        }
      }
      setState({ toast: files.length > 1 ? `${files.length} documents importés ✓` : 'Document importé ✓', toastShow: true });
    } catch (err) {
      setState({ toast: 'Import échoué : ' + (err?.message || 'erreur'), toastShow: true });
    } finally { setBusy(false); }
  };

  const saveClassification = () => {
    if (!sel) return;
    const next = { ...meta, [sel.id]: { category: draftCat, status: draftStatus } };
    setMeta(next); saveMeta(uid, next);
    setState({ toast: 'Classification enregistrée ✓', toastShow: true });
  };

  const removeDoc = (d) => {
    if (typeof window !== 'undefined' && !window.confirm(`Retirer « ${d.name} » de ce dossier ?`)) return;
    setDocs((l) => {
      const next = l.filter((x) => x.id !== d.id);
      if (isDemo) setState({ demoPatientDocs: { ...(state.demoPatientDocs || {}), [pkey]: next } });
      return next;
    });
    if (selId === d.id) setSelId(null);
  };

  const dl = async (d) => {
    try {
      if (d.blobUrl) { const a = document.createElement('a'); a.href = d.blobUrl; a.download = d.name; a.click(); return; }
      if (d.path) await downloadDocument(d.path, d.name);
    } catch (e) { setState({ toast: 'Téléchargement impossible : ' + (e?.message || 'erreur'), toastShow: true }); }
  };
  const printDoc = () => { if (previewUrl) window.open(previewUrl, '_blank', 'noopener'); };

  const toggleCheck = (id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const paneH = isMobile ? 'auto' : 560;
  const btn = (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: bg, color, border: border || 'none', fontFamily: 'inherit' });

  const importBtn = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input ref={fileRef} type="file" multiple hidden onChange={onPick}
        accept="image/*,application/pdf,.doc,.docx,.txt" />
      <button onClick={() => fileRef.current?.click()} disabled={busy}
        style={{ ...btn(`linear-gradient(135deg, #14795C 0%, ${DEEP} 100%)`, '#fff'), padding: '9px 16px', borderRadius: 11, fontWeight: 700, boxShadow: '0 8px 18px -10px #14795C' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        {busy ? 'Import…' : 'Importer un document'}
      </button>
    </div>
  );

  return (
    <>
      {Hero ? (
        <Hero tint={tint} icon={IC_FILE} isMobile={isMobile}
          title="Documents du patient"
          sub="Importez, prévisualisez et classez tous les documents de ce patient."
          right={importBtn}
          chips={[
            { value: withMeta.length, label: withMeta.length > 1 ? 'documents' : 'document' },
            { value: withMeta.filter((d) => d.status === 'pending').length, label: 'à classer', color: '#9A6510' },
            { value: new Set(withMeta.map((d) => d.category)).size, label: 'catégories', color: '#6B57A6' },
          ]} />
      ) : null}
    <div style={card}>
      {!Hero && (
        <CardHead icon={IC_FILE} title="Documents du patient"
          sub="Importez, prévisualisez et classez tous les documents de ce patient." right={importBtn} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '270px minmax(0,1fr) 260px', gap: 14, alignItems: 'start' }}>
        {/* ── Left: document list ── */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', background: '#fff', height: paneH, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderBottom: `1px solid ${BORDER}`, background: '#FBFDFC' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>Documents</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, background: '#E9F5F0', borderRadius: 20, padding: '1px 8px' }}>{list.length}</span>
            <div style={{ flex: 1 }} />
          </div>
          <div style={{ padding: '9px 11px', borderBottom: `1px solid ${BORDER}` }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 11px', border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 12.5, color: DARK, outline: 'none', fontFamily: 'inherit', background: BG }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: isMobile ? 180 : 0 }}>
            {loading && <div style={{ padding: 18, fontSize: 12.5, color: MUTED }}>Chargement…</div>}
            {!loading && list.length === 0 && (
              <div style={{ padding: '26px 16px', textAlign: 'center', fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>
                Aucun document.<br />Importez une analyse, une imagerie ou un courrier.
              </div>
            )}
            {list.map((d) => {
              const on = sel?.id === d.id;
              const c = docCat(d.category);
              const st = STATUS[d.status] || STATUS.pending;
              return (
                <div key={d.id} onClick={() => setSelId(d.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 12px', borderBottom: `1px solid #F1F6F3`, cursor: 'pointer', background: on ? '#EEF7F2' : 'transparent', borderInlineStart: `3px solid ${on ? TEAL : 'transparent'}` }}>
                  <input type="checkbox" checked={checked.includes(d.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleCheck(d.id)}
                    style={{ accentColor: BTN_GREEN_SOLID, width: 15, height: 15, marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 6, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.label} · {frDate(d.at)}{d.size ? ` · ${kb(d.size)}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {checked.length > 0 && (
            <div style={{ padding: '9px 12px', borderTop: `1px solid ${BORDER}`, background: '#FBFDFC', fontSize: 11.5, color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
              {checked.length} sélectionné{checked.length > 1 ? 's' : ''}
              <div style={{ flex: 1 }} />
              <button onClick={() => { list.filter((d) => checked.includes(d.id)).forEach(dl); }} style={{ background: 'none', border: 'none', color: TEAL, fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>Télécharger</button>
              <button onClick={() => setChecked([])} style={{ background: 'none', border: 'none', color: MUTED, fontWeight: 600, fontSize: 11.5, cursor: 'pointer' }}>Annuler</button>
            </div>
          )}
        </div>

        {/* ── Center: preview ── */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', background: BG, height: paneH, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, background: '#fff', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: DARK, flex: '1 1 100%', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {sel ? sel.name : 'Aperçu du document'}
            </span>
            {sel && (
              <>
                <button onClick={printDoc} style={btn('#fff', DARK, `1px solid ${BORDER}`)}>Ouvrir</button>
                <button onClick={() => dl(sel)} style={btn('#fff', DARK, `1px solid ${BORDER}`)}>Télécharger</button>
                <button onClick={() => removeDoc(sel)} style={btn('#fff', '#C2466A', `1px solid ${BORDER}`)}>Retirer</button>
              </>
            )}
          </div>
          <div style={{ flex: 1, minHeight: isMobile ? 320 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, overflow: 'auto' }}>
            {!sel && <div style={{ color: MUTED, fontSize: 13, textAlign: 'center' }}>Sélectionnez un document à gauche pour l’afficher ici.</div>}
            {sel && previewUrl && isImg(sel.type || sel.name) && (
              <img src={previewUrl} alt={sel.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 10, boxShadow: '0 10px 30px -18px rgba(13,43,30,0.5)', background: '#fff' }} />
            )}
            {sel && previewUrl && isPdf(sel.type || sel.name) && (
              <iframe title={sel.name} src={previewUrl} style={{ width: '100%', height: '100%', minHeight: 380, border: 'none', borderRadius: 10, background: '#fff' }} />
            )}
            {sel && (!previewUrl || (!isImg(sel.type || sel.name) && !isPdf(sel.type || sel.name))) && (
              <div style={{ textAlign: 'center', color: MUTED }}>
                <div style={{ width: 62, height: 62, borderRadius: 16, background: '#fff', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: TEAL }}>
                  {docCat(sel.category).icon}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 4 }}>{sel.name}</div>
                <div style={{ fontSize: 12.5, marginBottom: 12 }}>Aperçu non disponible pour ce format.</div>
                <button onClick={() => dl(sel)} style={btn('#fff', TEAL, `1px solid ${TEAL}`)}>Télécharger le fichier</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: classification ── */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, background: '#fff', height: paneH, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '11px 14px', borderBottom: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 700, color: DARK, background: '#FBFDFC' }}>Classification</div>
          <div style={{ padding: 14, flex: 1, overflowY: 'auto' }}>
            {/* Patient card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px', marginBottom: 14, background: BG }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(140deg,#DCEFE7,#BFE0D4)', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {(patient?.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{patient?.name}</div>
                <div style={{ fontSize: 11.5, color: MUTED }}>{patient?.age != null ? `${patient.age} ans` : 'Patient du cabinet'}</div>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>Catégorie du document</label>
            <button onClick={() => setCatOpen((o) => !o)} disabled={!sel}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 11, background: '#fff', cursor: sel ? 'pointer' : 'default', fontFamily: 'inherit', marginBottom: catOpen ? 8 : 14, opacity: sel ? 1 : 0.6 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: docCat(draftCat).bg, color: docCat(draftCat).color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{docCat(draftCat).icon}</span>
              <span style={{ flex: 1, textAlign: 'start', fontSize: 13, color: DARK, fontWeight: 600 }}>{docCat(draftCat).label}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: catOpen ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {catOpen && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 14 }}>
                {DOC_CATS.map((c) => (
                  <button key={c.key} onClick={() => { setDraftCat(c.key); setCatOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 9px', border: `1px solid ${draftCat === c.key ? TEAL : BORDER}`, borderRadius: 11, background: draftCat === c.key ? '#F2FAF6' : '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: DARK, lineHeight: 1.25 }}>{c.label}</span>
                  </button>
                ))}
              </div>
            )}

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>Statut</label>
            <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} disabled={!sel}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 11, background: '#fff', fontSize: 13, color: DARK, fontFamily: 'inherit', cursor: 'pointer', marginBottom: 14 }}>
              <option value="pending">À classer</option>
              <option value="ok">Classé</option>
              <option value="review">À revoir</option>
            </select>

            {sel && (
              <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                Importé le {frDate(sel.at)}{sel.source ? ` · ${sel.source}` : ''}
                {isDemo && <><br /><span style={{ color: '#9A6510' }}>Démo : ce fichier reste dans votre navigateur.</span></>}
              </div>
            )}
          </div>
          <div style={{ padding: 14, borderTop: `1px solid ${BORDER}`, background: '#FAFDFB' }}>
            <button onClick={saveClassification} disabled={!sel}
              style={{ ...btn(sel ? `linear-gradient(135deg, #14795C 0%, ${DEEP} 100%)` : '#C9D6D1', '#fff'), width: '100%', padding: '11px 14px', fontSize: 13, fontWeight: 700 }}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// Guess a category from the file name/type so imports land sensibly.
function guessCat(file) {
  const n = `${file.name} ${file.type}`.toLowerCase();
  if (/radio|rx|xray/.test(n)) return 'radio';
  if (/echo|irm|scan|imagerie|mri/.test(n)) return 'imagerie';
  if (/ecg|ekg/.test(n)) return 'ecg';
  if (/labo|analyse|bilan|nfs|glyc/.test(n)) return 'labo';
  if (/ordonnance|rx_|prescription/.test(n)) return 'ordo';
  if (/courrier|lettre/.test(n)) return 'courrier';
  if (/facture|invoice/.test(n)) return 'facture';
  if (/arret|itt/.test(n)) return 'arret';
  if (/assur|amo|cnss|cnops/.test(n)) return 'assur';
  if (/compte.?rendu|cr_/.test(n)) return 'compte';
  return 'autre';
}

// Sales-demo documents — clearly fictional, no files attached.
function demoSeed(patient) {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString(); };
  return [
    { id: 'dd1', name: `Bilan biologique — ${(patient?.name || '').split(' ')[0] || 'patient'}.pdf`, type: 'application/pdf', at: d(3), source: 'Laboratoire Atlas', category: 'labo', status: 'ok', size: 214000 },
    { id: 'dd2', name: 'Compte-rendu échographie.pdf', type: 'application/pdf', at: d(12), source: 'Radiologie Centre', category: 'imagerie', status: 'pending', size: 480000 },
    { id: 'dd3', name: 'Ordonnance du 12/06.pdf', type: 'application/pdf', at: d(28), source: 'Cabinet', category: 'ordo', status: 'ok', size: 96000 },
    { id: 'dd4', name: 'Carte AMO.jpg', type: 'image/jpeg', at: d(64), source: 'Patient', category: 'assur', status: 'review', size: 132000 },
  ];
}

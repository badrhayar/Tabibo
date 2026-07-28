import { useState, useMemo, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { SEC, Hero, ICONS } from '../../components/SectionKit.jsx';
import { moroccoNow } from '../../lib/time';
import { initials as initialsOf, BTN_GREEN } from '../../shared.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Demandes des patients — the cabinet's structured request inbox.
//   Table : patient · date · catégorie · aperçu · pièce jointe · statut
//   Drawer: the patient's message, a reply composed from an optional template,
//           document attachment, save-as-draft and send. Requests close once
//           answered, exactly like a front-desk ticket.
// Requests are stored per signed-in user (localStorage) — the demo seeds a few
// clearly-fictional ones so the workflow can be tried end to end.
// ─────────────────────────────────────────────────────────────────────────────

const DEEP = '#0C4A37';
const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';
const SHADOW = '0 1px 3px rgba(13,43,30,0.05), 0 10px 26px -16px rgba(13,43,30,0.18)';

const I = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  search: <svg {...I}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>,
  clip:   <svg {...I}><path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8.5-8.5" /></svg>,
  send:   <svg {...I}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>,
  plus:   <svg {...I} strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>,
  phone:  <svg {...I}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2z" /></svg>,
};

// Request categories — the reasons a patient writes to the cabinet.
const CATS = [
  { key: 'renew',   label: 'Renouvellement',    color: '#12875A', bg: '#E3F8EE' },
  { key: 'result',  label: 'Résultats',         color: '#6B57A6', bg: '#EFEAFB' },
  { key: 'letter',  label: 'Lettre / courrier', color: '#3B6FB0', bg: '#E8F1FC' },
  { key: 'certif',  label: 'Certificat',        color: '#9A6510', bg: '#FEF4DD' },
  { key: 'question',label: 'Question médicale', color: '#0E7C52', bg: '#E7F6EE' },
  { key: 'admin',   label: 'Administratif',     color: '#5A6B65', bg: '#EEF3F0' },
];
const catOf = (k) => CATS.find((c) => c.key === k) || CATS[CATS.length - 1];

// Reply templates — the doctor picks one and edits it before sending.
const TEMPLATES = [
  { key: '', label: 'Aucun modèle', body: '' },
  { key: 'classic', label: 'Modèle classique avec formules de politesse',
    body: (p, d) => `Bonjour ${p},\n\nMerci pour votre message.\n\n[Votre réponse ici]\n\nBien cordialement,\n${d}` },
  { key: 'renew', label: 'Renouvellement d’ordonnance accordé',
    body: (p, d) => `Bonjour ${p},\n\nVotre ordonnance a bien été renouvelée. Vous la trouverez en pièce jointe ; elle est également disponible dans votre espace patient.\n\nBien cordialement,\n${d}` },
  { key: 'result', label: 'Résultats — tout est normal',
    body: (p, d) => `Bonjour ${p},\n\nJ’ai bien reçu vos résultats : ils sont dans les normes, aucune action particulière n’est nécessaire.\n\nN’hésitez pas à me recontacter en cas de question.\n\nBien cordialement,\n${d}` },
  { key: 'appt', label: 'Une consultation est nécessaire',
    body: (p, d) => `Bonjour ${p},\n\nCette demande nécessite un examen en consultation. Je vous invite à réserver un créneau depuis votre espace patient.\n\nBien cordialement,\n${d}` },
];

const storeKey = (state) => `tabibo_requests_${state?.appUser?.id || 'demo'}`;
const load = (state) => {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(state)) || 'null');
    if (Array.isArray(raw)) return raw;
  } catch { /* private mode */ }
  return state?.demoDoctor ? demoSeed() : [];
};
const save = (state, list) => { try { localStorage.setItem(storeKey(state), JSON.stringify(list)); } catch { /* private mode */ } };

const frDateTime = (iso) => {
  const d = new Date(iso);
  return { date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }), time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
};

export default function Requests({ state, setState, go }) {
  const { isMobile } = useViewport();
  const me = state?.appUser?.full_name || (state?.demoDoctor ? 'Dr. Démonstration' : 'Docteur');

  const [list, setList] = useState(() => load(state));
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('open');
  const [fCat, setFCat] = useState('');
  const [openId, setOpenId] = useState(null);

  const persist = (l) => { setList(l); save(state, l); };
  const open = list.find((r) => r.id === openId) || null;

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const rows = useMemo(() => list
    .filter((r) => (fStatus === 'all' ? true : fStatus === 'open' ? !r.closed : r.closed))
    .filter((r) => !fCat || r.category === fCat)
    .filter((r) => !q.trim() || norm(r.patientName).includes(norm(q)) || norm(r.message).includes(norm(q)))
    .sort((a, b) => new Date(b.at) - new Date(a.at)), [list, fStatus, fCat, q]);

  const reply = (r, body, { close = true, draft = false } = {}) => {
    const next = list.map((x) => x.id === r.id ? {
      ...x,
      reply: body,
      replyAt: draft ? x.replyAt : new Date().toISOString(),
      draft,
      closed: draft ? x.closed : close,
    } : x);
    persist(next);
    setState({ toast: draft ? 'Brouillon enregistré ✓' : 'Réponse envoyée au patient ✓', toastShow: true });
    if (!draft) setOpenId(null);
  };
  const toggleClosed = (r) => {
    persist(list.map((x) => x.id === r.id ? { ...x, closed: !x.closed } : x));
  };

  const sel = { padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: 11, background: '#fff', fontSize: 13, color: DARK, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' };
  const th = { textAlign: 'start', padding: '13px 16px', fontSize: 12, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', borderBottom: `1px solid ${BORDER}`, background: '#FBFDFC' };
  const td = { padding: '13px 16px', fontSize: 13, color: DARK, borderBottom: '1px solid #F1F6F3', verticalAlign: 'middle' };

  return (
    <div className="reqs" style={{ padding: isMobile ? 12 : 32, background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{`.reqs input:focus,.reqs select:focus,.reqs textarea:focus{border-color:${TEAL} !important;box-shadow:0 0 0 3px rgba(15,110,86,0.07)}
.reqs tbody tr:hover{background:#F7FBF9;cursor:pointer}`}</style>

      <Hero tint={SEC.admin} icon={ICONS.inbox} isMobile={isMobile}
        title="Demandes des patients"
        sub="Renouvellements, résultats, certificats — répondez en quelques secondes."
        chips={[
          { value: list.filter((r) => !r.closed).length, label: 'en attente', color: '#B45309' },
          { value: list.filter((r) => r.closed).length, label: 'traitées', color: '#0E7C52' },
          { value: list.length, label: 'au total', color: SEC.histo.c },
        ]} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 0 300px' }}>
          <span style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: '#9AA8A2', display: 'flex' }}>{IC.search}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 38px', border: `1px solid ${BORDER}`, borderRadius: 11, fontSize: 13.5, color: DARK, background: '#fff', outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel}>
          <option value="open">Ouvertes</option>
          <option value="closed">Traitées</option>
          <option value="all">Toutes</option>
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} style={sel}>
          <option value="">Toutes les catégories</option>
          {CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>{rows.length} demande{rows.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr>
                <th style={th}>Patient</th>
                <th style={th}>Date</th>
                <th style={th}>Catégorie</th>
                <th style={th}>Aperçu</th>
                <th style={{ ...th, width: 120 }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '46px 20px', textAlign: 'center', color: MUTED, fontSize: 13.5 }}>
                  Aucune demande {fStatus === 'open' ? 'ouverte' : ''} pour le moment.
                </td></tr>
              )}
              {rows.map((r) => {
                const c = catOf(r.category);
                const dt = frDateTime(r.at);
                return (
                  <tr key={r.id} onClick={() => setOpenId(r.id)}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initialsOf(r.patientName)}</span>
                        <span>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: TEAL }}>{r.patientName}</span>
                          {r.age && <span style={{ display: 'block', fontSize: 11.5, color: MUTED }}>{r.age} ans</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{dt.date}</span><br />
                      <span style={{ color: MUTED, fontSize: 12 }}>{dt.time}</span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, borderRadius: 7, padding: '4px 10px', whiteSpace: 'nowrap' }}>{c.label}</span>
                      {r.attachment && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginInlineStart: 8, fontSize: 11, color: MUTED, background: '#F3F8F5', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '3px 8px' }}>
                          {IC.clip}{r.attachment}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, color: MUTED, maxWidth: 320 }}>
                      <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.message}</span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap', color: r.closed ? '#0E7C52' : '#9A6510', background: r.closed ? '#E7F6EE' : '#FEF4DD' }}>
                        {r.closed ? 'Traitée' : r.draft ? 'Brouillon' : 'Ouverte'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <RequestDrawer r={open} me={me} isMobile={isMobile}
          onClose={() => setOpenId(null)} onReply={reply} onToggleClosed={toggleClosed} />
      )}
    </div>
  );
}

// ── Right drawer: the thread + the reply composer ────────────────────────────
function RequestDrawer({ r, me, isMobile, onClose, onReply, onToggleClosed }) {
  const c = catOf(r.category);
  const dt = frDateTime(r.at);
  const [tpl, setTpl] = useState('');
  const [body, setBody] = useState(r.reply || '');
  const [attach, setAttach] = useState(r.replyAttachment || '');

  const applyTpl = (key) => {
    setTpl(key);
    const t = TEMPLATES.find((x) => x.key === key);
    if (t && typeof t.body === 'function') setBody(t.body((r.patientName || '').split(' ').slice(-1)[0] || r.patientName, me));
    else if (t && t.body === '') setBody('');
  };

  const inp = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', border: `1px solid ${BORDER}`, borderRadius: 11, fontSize: 13.5, color: DARK, outline: 'none', fontFamily: 'inherit', background: '#fff' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,42,32,0.45)', backdropFilter: 'blur(2px)', zIndex: 1400, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', width: isMobile ? '100%' : 560, maxWidth: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px -20px rgba(13,43,30,0.5)', animation: 'reqIn .18s ease' }}>
        <style>{`@keyframes reqIn{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${BORDER}`, background: 'linear-gradient(90deg, #0C4A37 0%, #0A3D2D 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>{c.label}</span>
            <button onClick={() => onToggleClosed(r)}
              title={r.closed ? 'Rouvrir la demande' : 'Marquer comme traitée'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', cursor: 'pointer', border: 'none', fontFamily: 'inherit', color: r.closed ? '#0E7C52' : '#9A6510', background: r.closed ? '#E7F6EE' : '#FEF4DD'}}>
              {r.closed ? 'Traitée' : 'Ouverte'} ✕
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5, color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ fontWeight: 700, color: '#BFF0DA' }}>{r.patientName}</span>
            {r.dob && <><span>·</span><span>{r.dob}{r.age ? ` (${r.age} ans)` : ''}</span></>}
            {r.phone && <><span>·</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{IC.phone}{r.phone}</span></>}
          </div>
        </div>

        {/* Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: BG }}>
          <div style={{ background: '#EEF6FB', border: '1px solid #DCEAF3', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#3B6FB0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800 }}>{initialsOf(r.patientName)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: DARK }}>{r.patientName}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: MUTED }}>{dt.date}, {dt.time}</span>
            </div>
            <div style={{ fontSize: 13.5, color: '#33433E', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{r.message}</div>
            {r.attachment && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: TEAL, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 10px' }}>
                {IC.clip}{r.attachment}
              </div>
            )}
          </div>
          {r.reply && r.replyAt && (
            <div style={{ background: '#E9F5F0', border: '1px solid #CFE4DB', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800 }}>{initialsOf(me)}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: DARK }}>{me}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11.5, color: MUTED }}>{frDateTime(r.replyAt).date}, {frDateTime(r.replyAt).time}</span>
              </div>
              <div style={{ fontSize: 13.5, color: '#33433E', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{r.reply}</div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: 18, background: '#fff' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5A6B65', marginBottom: 6 }}>
            Modèle <span style={{ color: MUTED, fontWeight: 400 }}>(optionnel)</span>
          </label>
          <select value={tpl} onChange={(e) => applyTpl(e.target.value)} style={{ ...inp, cursor: 'pointer', marginBottom: 13 }}>
            {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{initialsOf(me)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: DARK }}>{me}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setAttach(attach ? '' : 'Document.pdf')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: TEAL, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {IC.clip} {attach ? 'Retirer la pièce jointe' : 'Joindre un document'}
            </button>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6}
            placeholder="Écrivez votre réponse au patient…" style={{ ...inp, resize: 'vertical' }} />
          {attach && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9, fontSize: 12, color: TEAL, background: '#F3F8F5', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 10px' }}>
              {IC.clip}{attach}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => onReply(r, body, { draft: true })} disabled={!body.trim()}
              style={{ padding: '10px 16px', borderRadius: 11, border: `1px solid ${TEAL}`, background: '#fff', color: TEAL, fontSize: 12.5, fontWeight: 700, cursor: body.trim() ? 'pointer' : 'default', opacity: body.trim() ? 1 : 0.5, fontFamily: 'inherit' }}>
              Enregistrer le brouillon
            </button>
            <button onClick={() => onReply(r, body)} disabled={!body.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11, border: 'none', background: body.trim() ? BTN_GREEN : '#C9D6D1', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: body.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {IC.send} Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sales-demo requests (données fictives) ───────────────────────────────────
function demoSeed() {
  const now = new Date();
  const at = (h) => { const d = new Date(now); d.setHours(d.getHours() - h); return d.toISOString(); };
  return [
    { id: 'rq1', patientName: 'Fatima Zahra Benali', age: 34, dob: '12/03/1992', phone: '+212 6 12 34 56 78',
      category: 'renew', at: at(2), attachment: 'Ordonnance.pdf', closed: false,
      message: 'Bonjour Docteur,\n\nMon ordonnance pour le traitement de fond n’est plus valable. Pourriez-vous m’en délivrer une nouvelle ?\nPouvez-vous me l’envoyer par l’espace patient ou dois-je passer la récupérer au cabinet ?\n\nMerci beaucoup et bonne journée,\nFatima' },
    { id: 'rq2', patientName: 'Mohamed Rachid Alami', age: 52, dob: '04/07/1974', phone: '+212 6 23 45 67 89',
      category: 'result', at: at(5), attachment: 'Analyses.pdf', closed: false,
      message: 'Bonjour Docteur,\n\nJ’ai reçu les résultats de ma prise de sang, je vous les joins. Est-ce que tout est normal ?\n\nCordialement,\nMohamed' },
    { id: 'rq3', patientName: 'Layla Cherkaoui', age: 35, dob: '22/11/1991', phone: '+212 6 55 44 33 22',
      category: 'certif', at: at(26), closed: false,
      message: 'Bonjour,\n\nJ’aurais besoin d’un certificat médical pour la reprise du sport de ma fille. Puis-je passer le récupérer cette semaine ?\n\nMerci d’avance.' },
    { id: 'rq4', patientName: 'Omar Chraibi', age: 67, dob: '08/02/1959', phone: '+212 6 77 88 99 00',
      category: 'question', at: at(50), closed: true,
      message: 'Bonjour Docteur, dois-je continuer à prendre le comprimé du soir malgré les vertiges ?',
      reply: 'Bonjour M. Chraibi,\n\nSuspendez le comprimé du soir jusqu’à notre prochain rendez-vous et surveillez votre tension matin et soir.\n\nBien cordialement,\nDr. Démonstration',
      replyAt: at(48) },
  ];
}

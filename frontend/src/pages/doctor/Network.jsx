import { useState, useEffect, useMemo, useRef } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { SEC, Hero, ICONS } from '../../components/SectionKit.jsx';
import { SPEC_OPTS, CITY_OPTS, SPEC_INFO, docDisplayName, initials as initialsOf, BTN_GREEN } from '../../shared.jsx';
import {
  fetchColleagues, fetchMyLinks, requestLink, respondLink, removeLink,
  fetchReferrals, sendReferral, updateReferralStatus,
  fetchColleagueNotes, sendColleagueNote, fetchNetworkThreads,
  markColleagueNotesRead, uploadConfrereFile, getConfrereFileUrl,
} from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Tabibo Network — le réseau des confrères.
//   Quatre gestes, et rien de plus :
//     1. Trouver un confrère et se relier à lui
//     2. Lui parler — messages, photos, documents, appel audio ou vidéo
//     3. Lui adresser un patient, avec le motif et le degré d'urgence
//     4. Suivre ce que l'adressage devient
//   Ce qui NE circule PAS : le dossier du patient. Un adressage porte un nom,
//   un téléphone et un motif — la pièce médicale reste au cabinet qui l'a
//   constituée. C'est écrit en toutes lettres sur l'écran, pas seulement ici.
//   Les appels ne transitent pas par Tabibo : le salon est ouvert chez le
//   fournisseur de visioconférence, comme pour la téléconsultation.
// ─────────────────────────────────────────────────────────────────────────────

const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';
const SHADOW = '0 1px 3px rgba(13,43,30,0.05), 0 10px 26px -16px rgba(13,43,30,0.18)';
const URGENT = '#C2263F';

const I = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  search: <svg {...I}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  link:   <svg {...I}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>,
  send:   <svg {...I}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></svg>,
  note:   <svg {...I}><path d="M4 5h16v11H9l-4 4z" /></svg>,
  check:  <svg {...I}><path d="M20 6L9 17l-5-5" /></svg>,
  close:  <svg {...I}><path d="M18 6L6 18M6 6l12 12" /></svg>,
  alert:  <svg {...I}><path d="M12 4.5L2.8 20h18.4z" /><path d="M12 10v4M12 17.2v.1" /></svg>,
  arrow:  <svg {...I}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  back:   <svg {...I}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>,
  phone:  <svg {...I}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>,
  video:  <svg {...I}><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="M15.5 10.5l6-3.5v10l-6-3.5z" /></svg>,
  clip:   <svg {...I}><path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7-7l8.9-8.9a3.3 3.3 0 1 1 4.7 4.7l-8.8 8.8a1.7 1.7 0 0 1-2.4-2.4l8.1-8.1" /></svg>,
  image:  <svg {...I}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.6" cy="9.6" r="1.7" /><path d="M4 17l5-5 3.5 3.5 3-2.5L20 17" /></svg>,
  doc:    <svg {...I}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /></svg>,
  down:   <svg {...I}><path d="M12 3v13M7 11.5l5 5 5-5" /><path d="M4 20h16" /></svg>,
  user:   <svg {...I}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c.8-3.8 3.8-5.8 7.5-5.8s6.7 2 7.5 5.8" /></svg>,
  chat:   <svg {...I}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-5A8 8 0 1 1 21 12z" /></svg>,
};

const AV = ['#0F6E56', '#2563EB', '#9333EA', '#EA580C', '#DB2777', '#0891B2'];
const avColor = (name) => AV[[...String(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % AV.length];
const specLabel = (k) => SPEC_INFO[k]?.label || k || 'Médecin';
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); } catch { return ''; } };
const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const dayKey = (iso) => { try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; } };
const dayLabel = (iso) => {
  const d = new Date(iso); const today = new Date();
  const diff = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};
const fmtSize = (b) => (!b ? '' : b >= 1048576 ? `${(b / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);
const isImageFile = (f) => !!f && (/^image\//.test(f.type || '') || /\.(png|jpe?g|gif|webp|heic|jfif)$/i.test(f.name || ''));
/** Un salon d'appel stable pour une paire de confrères — le même des deux côtés. */
const callRoomFor = (a, b) => `tabibo-confreres-${[String(a), String(b)].sort().join('-').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 70)}`;

// ── Données de démonstration ────────────────────────────────────────────────
// Clairement fictives, cohérentes entre elles, et jamais enregistrées : elles
// servent à montrer le fonctionnement du réseau avant l'ouverture du compte.
const DEMO_COLLEAGUES = [
  { id: 'demo_c1', name: 'Nadia El Amrani', spec: 'cardio',     city: 'Casablanca', clinic: '14 bd Zerktouni', years: 15, teleconsultation: true,  cnss: true },
  { id: 'demo_c2', name: 'Youssef Berrada', spec: 'dermato',    city: 'Casablanca', clinic: '8 rue Ibn Batouta', years: 9, teleconsultation: false, cnss: true },
  { id: 'demo_c3', name: 'Salma Idrissi',   spec: 'pediatre',   city: 'Rabat',      clinic: 'Résidence Al Manar', years: 12, teleconsultation: true, cnss: true },
  { id: 'demo_c4', name: 'Rachid Ouazzani', spec: 'ophtalmo',   city: 'Casablanca', clinic: '22 av Hassan II', years: 20, teleconsultation: false, cnss: false },
  { id: 'demo_c5', name: 'Imane Chraibi',   spec: 'gyneco',     city: 'Marrakech',  clinic: 'Clinique Ennakhil', years: 11, teleconsultation: true, cnss: true },
  { id: 'demo_c6', name: 'Hamza Tazi',      spec: 'generaliste', city: 'Fès',       clinic: '5 rue Moulay Slimane', years: 7, teleconsultation: true, cnss: true },
];
const DEMO_LINKS = [
  { id: 'demo_l1', otherId: 'demo_c1', incoming: false, status: 'accepted', createdAt: new Date(Date.now() - 86400000 * 21).toISOString() },
  { id: 'demo_l2', otherId: 'demo_c3', incoming: false, status: 'accepted', createdAt: new Date(Date.now() - 86400000 * 12).toISOString() },
  { id: 'demo_l3', otherId: 'demo_c2', incoming: true,  status: 'pending',  message: 'Bonjour confrère, je vous adresse régulièrement des patients du quartier — relions nos cabinets.', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];
const DEMO_REFERRALS = [
  { id: 'demo_r1', fromId: 'demo_c1', toId: 'me', incoming: true,  patientName: 'Khadija Amrani', patientPhone: '+212 6 61 22 33 44', reason: 'Bilan pré-opératoire', note: 'Patiente hypertendue, traitement en cours. Merci de la revoir avant l’intervention.', urgency: 'urgent', status: 'sent',     createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'demo_r2', fromId: 'me', toId: 'demo_c3', incoming: false, patientName: 'Yassine Belkadi', patientPhone: '+212 6 70 11 22 33', reason: 'Avis pédiatrique',    note: 'Enfant de 4 ans, fièvre récurrente depuis trois semaines.', urgency: 'normal', status: 'accepted', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'demo_r3', fromId: 'me', toId: 'demo_c1', incoming: false, patientName: 'Fatima Zahra Benali', patientPhone: '+212 6 12 34 56 78', reason: 'Échocardiographie', note: null, urgency: 'normal', status: 'done', createdAt: new Date(Date.now() - 86400000 * 9).toISOString() },
];
// Une pièce jointe de démonstration : un tracé dessiné, pas la photo d'un vrai
// patient. Elle montre comment une image reçue s'affiche dans le fil.
const DEMO_TRACE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="240" viewBox="0 0 520 240"><rect width="520" height="240" fill="#FDF4F4"/><g stroke="#F3CFCF" stroke-width="1">${
    Array.from({ length: 26 }, (_, i) => `<path d="M${i * 20} 0V240"/>`).join('')
  }${Array.from({ length: 12 }, (_, i) => `<path d="M0 ${i * 20}H520"/>`).join('')}</g><path d="M0 150h40l10-6 8 34 10-58 9 30h13l10-6h40l10-6 8 34 10-58 9 30h13l10-6h40l10-6 8 34 10-58 9 30h13l10-6h40l10-6 8 34 10-58 9 30h13l10-6h120" fill="none" stroke="#C2263F" stroke-width="2.4" stroke-linejoin="round"/><text x="14" y="26" font-family="Inter,sans-serif" font-size="13" fill="#9A3C3C">Tracé d'exemple — démonstration</text></svg>`,
);
const t0 = Date.now();
const DEMO_NOTES = {
  demo_c1: [
    { id: 'dn1', mine: false, kind: 'text', body: 'Bonjour confrère, j’ai bien reçu Mme Benali. L’échocardiographie est faite.', createdAt: new Date(t0 - 86400000 - 3600000 * 3).toISOString(), readAt: new Date().toISOString() },
    { id: 'dn2', mine: false, kind: 'file', body: '', file: { path: DEMO_TRACE, name: 'trace-ecg-benali.svg', type: 'image/svg+xml', size: 48000 }, createdAt: new Date(t0 - 86400000 - 3600000 * 3 + 60000).toISOString(), readAt: new Date().toISOString() },
    { id: 'dn3', mine: true,  kind: 'text', body: 'Merci beaucoup. Le tracé est net — je poursuis le traitement en l’état.', createdAt: new Date(t0 - 86400000 - 3600000 * 2).toISOString() },
    { id: 'dn4', mine: false, kind: 'text', body: 'Parfait. Je vous adresse le compte-rendu écrit dans la journée.', createdAt: new Date(t0 - 3600000 * 4).toISOString() },
  ],
  demo_c3: [
    { id: 'dn5', mine: true,  kind: 'text', body: 'Bonjour, je vous adresse Yassine Belkadi, 4 ans, fièvres récurrentes.', createdAt: new Date(t0 - 86400000 * 3).toISOString() },
    { id: 'dn6', mine: false, kind: 'text', body: 'Bien reçu, je le prends jeudi matin.', createdAt: new Date(t0 - 86400000 * 3 + 1800000).toISOString() },
    { id: 'dn7', mine: false, kind: 'call', body: 'Appel vidéo', callRoom: 'tabibo-confreres-demo', createdAt: new Date(t0 - 3600000 * 26).toISOString() },
  ],
};

// ── Fragments réutilisés ────────────────────────────────────────────────────
// Définis au niveau du module, jamais dans le corps du composant : React
// remonterait sinon l'arbre à chaque rendu.
const CARD = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW };
const BTN_PRI = { display: 'inline-flex', alignItems: 'center', gap: 6, background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const BTN_GHOST = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '8px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };

function Avatar({ name, src, size = 40, ring = false }) {
  const common = { width: size, height: size, borderRadius: '50%', flexShrink: 0, boxShadow: ring ? '0 0 0 2.5px #fff, 0 0 0 4px rgba(15,110,86,0.18)' : 'none' };
  if (src) return <img src={src} alt="" style={{ ...common, objectFit: 'cover', background: '#EAF1ED' }} />;
  return (
    <span style={{ ...common, background: avColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 800 }}>
      {initialsOf(name)}
    </span>
  );
}

function Empty({ children }) {
  return <div style={{ padding: '30px 18px', textAlign: 'center', color: MUTED, fontSize: 13 }}>{children}</div>;
}

function StatusPill({ s }) {
  const m = {
    sent:     { t: 'En attente', bg: '#FEF3DC', c: '#8A6210' },
    accepted: { t: 'Accepté',    bg: '#E7F6EE', c: '#0E7C52' },
    declined: { t: 'Refusé',     bg: '#FCE7EE', c: '#C2466A' },
    done:     { t: 'Traité',     bg: '#EEF3F0', c: MUTED },
  }[s] || { t: s, bg: '#EEF3F0', c: MUTED };
  return <span style={{ background: m.bg, color: m.c, borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{m.t}</span>;
}

function ColleagueRow({ c, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #F1F6F3' }}>
      <Avatar name={c.name} src={c.avatar} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docDisplayName(c.name, c.spec)}</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {specLabel(c.spec)} · {c.city}{c.years ? ` · ${c.years} ans d’exercice` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

function ReferralCard({ r, other, busy, onAnswer, onNote }) {
  return (
    <div style={{ ...CARD, padding: 15, borderInlineStart: `3px solid ${r.urgency === 'urgent' ? URGENT : BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: DARK }}>{r.patientName}</span>
            {r.urgency === 'urgent' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FCE7EE', color: URGENT, borderRadius: 7, padding: '3px 8px', fontSize: 10.5, fontWeight: 800 }}>
                {IC.alert} Urgent
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>
            {r.incoming ? 'Adressé par ' : 'Adressé à '}
            <strong style={{ color: DARK }}>{other ? docDisplayName(other.name, other.spec) : 'un confrère'}</strong>
            {' · '}{fmtDate(r.createdAt)}
          </div>
        </div>
        <StatusPill s={r.status} />
      </div>
      <div style={{ fontSize: 13, color: DARK, fontWeight: 600 }}>{r.reason}</div>
      {r.note && <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, margin: '6px 0 0' }}>{r.note}</p>}
      {r.patientPhone && (
        <a href={`tel:${String(r.patientPhone).replace(/\s/g, '')}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9, fontSize: 12.5, fontWeight: 700, color: TEAL, textDecoration: 'none' }}>
          {IC.phone} {r.patientPhone}
        </a>
      )}
      {r.incoming && r.status === 'sent' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={() => onAnswer(r, 'accepted')} disabled={busy === r.id} style={BTN_PRI}>{IC.check} Je prends ce patient</button>
          <button onClick={() => onAnswer(r, 'declined')} disabled={busy === r.id} style={BTN_GHOST}>{IC.close} Ne peux pas</button>
        </div>
      )}
      {r.incoming && r.status === 'accepted' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={() => onAnswer(r, 'done')} disabled={busy === r.id} style={BTN_GHOST}>{IC.check} Patient vu — clôturer</button>
          {other && <button onClick={() => onNote(other)} style={BTN_GHOST}>{IC.note} Écrire au confrère</button>}
        </div>
      )}
    </div>
  );
}

// ── Une pièce jointe dans le fil ────────────────────────────────────────────
// L'image se résout par une adresse signée, valable une heure : aucun fichier
// du réseau n'a d'adresse publique.
function Attachment({ file, mine, onOpen }) {
  const [url, setUrl] = useState('');
  const img = isImageFile(file);
  useEffect(() => {
    let alive = true;
    if (!img) return undefined;
    getConfrereFileUrl(file.path).then((u) => { if (alive) setUrl(u); }).catch(() => {});
    return () => { alive = false; };
  }, [file.path, img]);

  if (img) {
    return (
      <button onClick={() => onOpen(file)} title={file.name}
        style={{ display: 'block', padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 12, overflow: 'hidden', lineHeight: 0, maxWidth: 260 }}>
        {url
          ? <img src={url} alt={file.name} style={{ width: '100%', maxWidth: 260, borderRadius: 12, display: 'block' }} />
          : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 220, height: 130, background: '#EDF3F0', color: MUTED, borderRadius: 12, fontSize: 12 }}>Chargement…</span>}
      </button>
    );
  }
  return (
    <button onClick={() => onOpen(file)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: mine ? 'rgba(255,255,255,0.18)' : '#F4F8F6', border: `1px solid ${mine ? 'rgba(255,255,255,0.28)' : BORDER}`, borderRadius: 11, padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', maxWidth: 260 }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: mine ? 'rgba(255,255,255,0.22)' : '#E9F5F0', color: mine ? '#fff' : TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{IC.doc}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: mine ? '#fff' : DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
        <span style={{ display: 'block', fontSize: 11, color: mine ? 'rgba(255,255,255,0.82)' : MUTED }}>{fmtSize(file.size)} · ouvrir</span>
      </span>
    </button>
  );
}

// ── Une ligne du fil ────────────────────────────────────────────────────────
function Bubble({ n, onOpenFile, onJoinCall }) {
  const mine = n.mine;
  if (n.kind === 'call') {
    const audio = /audio/i.test(n.body || '');
    return (
      <div style={{ alignSelf: 'center', maxWidth: 340, width: '100%', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11, boxShadow: SHADOW }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{audio ? IC.phone : IC.video}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: DARK }}>{audio ? 'Appel audio' : 'Appel vidéo'}</span>
          <span style={{ display: 'block', fontSize: 11, color: MUTED }}>{mine ? 'Vous avez ouvert le salon' : 'Votre confrère vous appelle'} · {fmtTime(n.createdAt)}</span>
        </span>
        <button onClick={() => onJoinCall(n)} style={{ ...BTN_PRI, padding: '7px 12px', fontSize: 12 }}>Rejoindre</button>
      </div>
    );
  }
  return (
    <div style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 5 }}>
      <div style={{
        background: mine ? BTN_GREEN : '#fff', color: mine ? '#fff' : DARK,
        border: mine ? 'none' : `1px solid ${BORDER}`,
        borderRadius: 16, borderBottomRightRadius: mine ? 5 : 16, borderBottomLeftRadius: mine ? 16 : 5,
        padding: n.file && !n.body ? 5 : '9px 13px', fontSize: 13.2, lineHeight: 1.55,
        boxShadow: mine ? '0 6px 16px -10px rgba(11,106,70,0.8)' : SHADOW, wordBreak: 'break-word',
      }}>
        {n.file && <Attachment file={n.file} mine={mine} onOpen={onOpenFile} />}
        {n.body && <div style={{ marginTop: n.file ? 7 : 0, padding: n.file ? '0 8px 5px' : 0 }}>{n.body}</div>}
      </div>
      <span style={{ fontSize: 10.5, color: '#9AAAA4', paddingInline: 4 }}>
        {fmtTime(n.createdAt)}{mine && n.readAt ? ' · lu' : ''}
      </span>
    </div>
  );
}

// ── La messagerie ───────────────────────────────────────────────────────────
function Messenger({
  colleagues, threads, activeId, onOpen, messages, loading,
  onSend, onAttach, onCall, onOpenFile, onProfile, onRefer, isMobile, sending,
}) {
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const active = colleagues.find((c) => c.id === activeId) || null;

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, activeId]);

  const list = colleagues.filter((c) => {
    const s = q.trim().toLowerCase();
    return !s || (c.name || '').toLowerCase().includes(s) || specLabel(c.spec).toLowerCase().includes(s);
  });

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    onSend(t);
  };

  const showList = !isMobile || !activeId;
  const showThread = !isMobile || !!activeId;

  // Fil groupé par jour — un fil de conversation se lit par journées.
  const groups = [];
  for (const m of messages) {
    const k = dayKey(m.createdAt);
    if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, iso: m.createdAt, items: [] });
    groups[groups.length - 1].items.push(m);
  }

  return (
    <div style={{ ...CARD, overflow: 'hidden', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '310px minmax(0,1fr)', height: isMobile ? 'auto' : 'calc(100vh - 250px)', minHeight: 460 }}>
      {/* ── Les conversations ── */}
      {showList && (
        <div style={{ borderInlineEnd: isMobile ? 'none' : `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#FCFDFD' }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${BORDER}`, position: 'relative' }}>
            <span style={{ position: 'absolute', insetInlineStart: 22, top: '50%', transform: 'translateY(-50%)', color: MUTED, display: 'flex' }}>{IC.search}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un confrère…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 36px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff', color: DARK }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {list.length === 0 && <Empty>Reliez-vous à un confrère pour lui écrire.</Empty>}
            {list.map((c) => {
              const t = threads[c.id] || {};
              const on = c.id === activeId;
              const preview = t.last
                ? (t.last.kind === 'call' ? (/audio/i.test(t.last.body || '') ? 'Appel audio' : 'Appel vidéo')
                  : t.last.file ? (isImageFile(t.last.file) ? 'Photo' : t.last.file.name)
                  : t.last.body)
                : 'Aucun message';
              return (
                <button key={c.id} onClick={() => onOpen(c)}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#F3F8F5'; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'start', padding: '11px 13px', border: 'none', borderInlineStart: `3px solid ${on ? TEAL : 'transparent'}`, background: on ? '#E9F5F0' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'background .12s' }}>
                  <Avatar name={c.name} src={c.avatar} size={42} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docDisplayName(c.name, c.spec)}</span>
                      {t.last && <span style={{ fontSize: 10.5, color: MUTED, flexShrink: 0 }}>{fmtDate(t.last.createdAt)}</span>}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 11.8, color: t.unread ? DARK : MUTED, fontWeight: t.unread ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</span>
                      {t.unread ? <span style={{ background: BTN_GREEN, color: '#fff', borderRadius: 99, minWidth: 18, height: 18, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, flexShrink: 0 }}>{t.unread}</span> : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Le fil ── */}
      {showThread && (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: isMobile ? 420 : 0, background: BG }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: MUTED, padding: 30, textAlign: 'center' }}>
              <span style={{ width: 54, height: 54, borderRadius: 16, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.chat}</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>Choisissez un confrère</div>
              <div style={{ fontSize: 12.5, maxWidth: 320, lineHeight: 1.6 }}>Écrivez-lui, envoyez une image ou un document, ou ouvrez un appel — sans quitter Tabibo.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: `1px solid ${BORDER}`, background: '#fff', flexShrink: 0 }}>
                {isMobile && (
                  <button onClick={() => onOpen(null)} aria-label="Retour" style={{ background: 'none', border: 'none', color: DARK, cursor: 'pointer', display: 'flex', padding: 4 }}>{IC.back}</button>
                )}
                <button onClick={() => onProfile(active)} title="Voir la fiche du confrère"
                  style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit' }}>
                  <Avatar name={active.name} src={active.avatar} size={40} ring />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docDisplayName(active.name, active.spec)}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: MUTED }}>{specLabel(active.spec)} · {active.city}</span>
                  </span>
                </button>
                <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                  <button onClick={() => onCall('audio')} title="Appel audio" aria-label="Appel audio"
                    style={{ width: 36, height: 36, borderRadius: 11, border: `1px solid ${BORDER}`, background: '#fff', color: TEAL, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.phone}</button>
                  <button onClick={() => onCall('video')} title="Appel vidéo" aria-label="Appel vidéo"
                    style={{ width: 36, height: 36, borderRadius: 11, border: 'none', background: BTN_GREEN, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px -8px rgba(11,106,70,0.9)' }}>{IC.video}</button>
                  {!isMobile && (
                    <button onClick={() => onRefer(active)} style={{ ...BTN_GHOST, height: 36 }}>{IC.send} Adresser un patient</button>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading && <div style={{ textAlign: 'center', color: MUTED, fontSize: 12.5 }}>Chargement de la conversation…</div>}
                {!loading && messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: MUTED, fontSize: 12.5, marginTop: 28, lineHeight: 1.6 }}>
                    Aucun message pour l’instant.<br />Écrivez le premier mot à {docDisplayName(active.name, active.spec)}.
                  </div>
                )}
                {groups.map((g) => (
                  <div key={g.k} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ alignSelf: 'center', background: '#E4EDE8', color: '#587068', borderRadius: 99, padding: '3px 12px', fontSize: 10.5, fontWeight: 700 }}>{dayLabel(g.iso)}</div>
                    {g.items.map((n) => <Bubble key={n.id} n={n} onOpenFile={onOpenFile} onJoinCall={(m) => onCall(/audio/i.test(m.body || '') ? 'audio' : 'video', m.callRoom)} />)}
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, padding: 12, borderTop: `1px solid ${BORDER}`, background: '#fff', flexShrink: 0 }}>
                <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onAttach(f); }} />
                <button onClick={() => fileRef.current?.click()} disabled={sending} title="Joindre une image ou un document" aria-label="Joindre un fichier"
                  style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${BORDER}`, background: '#fff', color: TEAL, cursor: sending ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{IC.clip}</button>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                  placeholder="Écrire à votre confrère…"
                  style={{ flex: 1, minWidth: 0, resize: 'none', maxHeight: 110, padding: '10px 14px', borderRadius: 18, border: `1px solid ${BORDER}`, fontSize: 13.2, outline: 'none', fontFamily: 'inherit', color: DARK, lineHeight: 1.5, boxSizing: 'border-box' }} />
                <button onClick={submit} disabled={!draft.trim() || sending} aria-label="Envoyer"
                  style={{ width: 38, height: 38, borderRadius: '50%', background: BTN_GREEN, border: 'none', color: '#fff', cursor: draft.trim() && !sending ? 'pointer' : 'default', opacity: draft.trim() && !sending ? 1 : 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 14px -8px rgba(11,106,70,0.9)' }}>
                  {IC.send}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── La fiche d'un confrère ──────────────────────────────────────────────────
function ProfileDrawer({ colleague, onClose, onRefer, onMessage, isMobile }) {
  const c = colleague;
  const rows = [
    ['Spécialité', specLabel(c.spec)],
    ['Ville', c.city],
    ['Cabinet', c.clinic],
    ['Expérience', c.years ? `${c.years} ans d’exercice` : null],
    ['Langues', (c.languages || []).length ? c.languages.join(', ') : null],
    ['Téléconsultation', c.teleconsultation ? 'Proposée' : 'Non proposée'],
    ['Conventionnement', c.cnss ? 'CNSS / CNOPS' : 'Non conventionné'],
  ].filter(([, v]) => v);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(9,32,23,0.42)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: isMobile ? '100%' : 400, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-18px 0 50px -24px rgba(9,32,23,0.5)' }}>
        <div style={{ background: 'linear-gradient(140deg,#0C4A37,#0F6E56)', padding: '20px 20px 24px', color: '#fff', position: 'relative' }}>
          <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', insetInlineEnd: 14, top: 14, background: 'rgba(255,255,255,0.16)', border: 'none', borderRadius: 9, width: 30, height: 30, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.close}</button>
          <Avatar name={c.name} src={c.avatar} size={66} ring />
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 12 }}>{docDisplayName(c.name, c.spec)}</div>
          <div style={{ fontSize: 12.5, opacity: 0.86, marginTop: 3 }}>{specLabel(c.spec)} · {c.city}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ minWidth: 130, fontSize: 12.5, color: MUTED }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{v}</span>
            </div>
          ))}
          {c.slug && (
            <a href={`/medecin/${c.slug}`} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 14, fontSize: 12.5, fontWeight: 700, color: TEAL, textDecoration: 'none' }}>
              {IC.arrow} Voir sa page publique
            </a>
          )}
        </div>
        <div style={{ padding: 14, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 9 }}>
          <button onClick={() => onMessage(c)} style={{ ...BTN_GHOST, flex: 1, justifyContent: 'center' }}>{IC.chat} Écrire</button>
          <button onClick={() => onRefer(c)} style={{ ...BTN_PRI, flex: 1, justifyContent: 'center' }}>{IC.send} Adresser un patient</button>
        </div>
      </div>
    </div>
  );
}

export default function Network({ state, setState, go }) {
  const { isMobile } = useViewport();
  const myDoctorId = state?.myDoctor?.id || null;
  const isDemo = !myDoctorId && !!state?.demoDoctor;
  const live = !!myDoctorId;

  const [tab, setTab] = useState('reseau');           // reseau | messages | adressages | annuaire
  const [colleagues, setColleagues] = useState(isDemo ? DEMO_COLLEAGUES : []);
  const [links, setLinks] = useState(isDemo ? DEMO_LINKS : []);
  const [referrals, setReferrals] = useState(isDemo ? DEMO_REFERRALS : []);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState('');
  const [spec, setSpec] = useState('all');
  const [city, setCity] = useState('all');

  const [refFor, setRefFor] = useState(null);         // confrère à qui adresser
  const [profileFor, setProfileFor] = useState(null); // fiche ouverte
  const [busy, setBusy] = useState(null);

  // Messagerie
  const [chatWith, setChatWith] = useState(null);     // identifiant du confrère
  const [threads, setThreads] = useState(isDemo
    ? Object.fromEntries(Object.entries(DEMO_NOTES).map(([k, v]) => [k, { last: v[v.length - 1], unread: k === 'demo_c1' ? 1 : 0 }]))
    : {});
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const demoNotes = useRef({ ...DEMO_NOTES });

  const toast = (t) => setState({ toast: t, toastShow: true });
  const demoBlock = () => { toast('Mode démonstration — créez votre compte pour vous relier à un confrère.'); return true; };

  // ── Chargement ────────────────────────────────────────────────────────────
  const reload = async () => {
    if (!live) return;
    setLoading(true);
    try {
      const [ls, rs, th] = await Promise.all([fetchMyLinks(myDoctorId), fetchReferrals(myDoctorId), fetchNetworkThreads(myDoctorId).catch(() => ({}))]);
      setLinks(ls); setReferrals(rs); setThreads(th || {});
      const ids = [...new Set(ls.map((l) => l.otherId))];
      if (ids.length) {
        const dir = await fetchColleagues({});
        setColleagues((c) => {
          const known = new Map(c.map((x) => [x.id, x]));
          dir.forEach((d) => known.set(d.id, d));
          return [...known.values()];
        });
      }
    } catch (e) { toast('Chargement du réseau impossible : ' + (e?.message || 'erreur')); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [myDoctorId]);

  // Recherche dans l'annuaire — côté serveur quand le compte est actif.
  const runSearch = async () => {
    if (!live) return;
    setLoading(true);
    try { setColleagues(await fetchColleagues({ q, specialty: spec, city, exclude: myDoctorId })); }
    catch (e) { toast('Recherche impossible : ' + (e?.message || 'erreur')); }
    finally { setLoading(false); }
  };

  const byId = useMemo(() => Object.fromEntries(colleagues.map((c) => [c.id, c])), [colleagues]);
  const linkOf = (id) => links.find((l) => l.otherId === id) || null;

  const accepted = links.filter((l) => l.status === 'accepted');
  const incoming = links.filter((l) => l.status === 'pending' && l.incoming);
  const outgoing = links.filter((l) => l.status === 'pending' && !l.incoming);
  const inRefs = referrals.filter((r) => r.incoming);
  const outRefs = referrals.filter((r) => !r.incoming);
  const newInRefs = inRefs.filter((r) => r.status === 'sent').length;
  const linkedColleagues = accepted.map((l) => byId[l.otherId]).filter(Boolean);
  const unreadTotal = Object.values(threads).reduce((s, t) => s + (t.unread || 0), 0);

  // Annuaire filtré (en démonstration, le filtrage est local).
  const directory = useMemo(() => {
    const s = q.trim().toLowerCase();
    return colleagues.filter((c) => (
      (spec === 'all' || c.spec === spec) &&
      (city === 'all' || c.city === city) &&
      (!s || (c.name || '').toLowerCase().includes(s) || specLabel(c.spec).toLowerCase().includes(s))
    ));
  }, [colleagues, q, spec, city]);

  // ── Gestes ────────────────────────────────────────────────────────────────
  const ask = async (c) => {
    if (!live) return void demoBlock();
    setBusy(c.id);
    try { await requestLink(myDoctorId, c.id); await reload(); toast(`Demande envoyée à ${docDisplayName(c.name, c.spec)}.`); }
    catch (e) { toast('Demande impossible : ' + (e?.message || 'erreur')); }
    finally { setBusy(null); }
  };
  const answer = async (l, accept) => {
    if (!live) return void demoBlock();
    setBusy(l.id);
    try { await respondLink(l.id, accept); await reload(); toast(accept ? 'Confrère ajouté à votre réseau.' : 'Demande refusée.'); }
    catch (e) { toast('Réponse impossible : ' + (e?.message || 'erreur')); }
    finally { setBusy(null); }
  };
  const unlink = async (l) => {
    if (!live) return void demoBlock();
    if (!window.confirm('Retirer ce confrère de votre réseau ? Vous ne pourrez plus lui adresser de patient ni lui écrire.')) return;
    setBusy(l.id);
    try { await removeLink(l.id); await reload(); toast('Confrère retiré du réseau.'); }
    catch (e) { toast('Retrait impossible : ' + (e?.message || 'erreur')); }
    finally { setBusy(null); }
  };
  const answerRef = async (r, status) => {
    if (!live) {
      setReferrals((l) => l.map((x) => x.id === r.id ? { ...x, status } : x));
      toast(status === 'accepted' ? 'Patient accepté (démonstration).' : status === 'done' ? 'Adressage clôturé (démonstration).' : 'Adressage refusé (démonstration).');
      return;
    }
    setBusy(r.id);
    try { await updateReferralStatus(r.id, status); await reload(); toast('Adressage mis à jour.'); }
    catch (e) { toast('Mise à jour impossible : ' + (e?.message || 'erreur')); }
    finally { setBusy(null); }
  };

  // ── Messagerie ────────────────────────────────────────────────────────────
  const openChat = async (c) => {
    setProfileFor(null);
    if (!c) { setChatWith(null); setMessages([]); return; }
    setTab('messages'); setChatWith(c.id);
    setThreads((t) => ({ ...t, [c.id]: { ...(t[c.id] || {}), unread: 0 } }));
    if (!live) { setMessages(demoNotes.current[c.id] || []); return; }
    setChatLoading(true);
    try {
      setMessages(await fetchColleagueNotes(myDoctorId, c.id));
      await markColleagueNotesRead(myDoctorId, c.id).catch(() => {});
    } catch (e) { toast('Conversation indisponible : ' + (e?.message || 'erreur')); setMessages([]); }
    finally { setChatLoading(false); }
  };

  const pushDemo = (n) => {
    const id = chatWith;
    const next = [...(demoNotes.current[id] || []), n];
    demoNotes.current = { ...demoNotes.current, [id]: next };
    setMessages(next);
    setThreads((t) => ({ ...t, [id]: { last: n, unread: 0 } }));
  };

  const sendText = async (body) => {
    if (!chatWith) return;
    if (!live) { pushDemo({ id: 'd' + Date.now(), mine: true, kind: 'text', body, createdAt: new Date().toISOString() }); return; }
    setSending(true);
    try {
      const n = await sendColleagueNote(myDoctorId, chatWith, { body });
      setMessages((m) => [...m, n]);
      setThreads((t) => ({ ...t, [chatWith]: { last: n, unread: 0 } }));
    } catch (e) { toast('Envoi impossible : ' + (e?.message || 'erreur')); }
    finally { setSending(false); }
  };

  const sendFile = async (f) => {
    if (!chatWith) return;
    if (!live) {
      const url = URL.createObjectURL(f);
      pushDemo({ id: 'd' + Date.now(), mine: true, kind: 'file', body: '', file: { path: url, name: f.name, type: f.type, size: f.size }, createdAt: new Date().toISOString() });
      toast('Pièce jointe affichée localement — en démonstration, rien n’est envoyé.');
      return;
    }
    setSending(true);
    try {
      const file = await uploadConfrereFile(f);
      const n = await sendColleagueNote(myDoctorId, chatWith, { file });
      setMessages((m) => [...m, n]);
      setThreads((t) => ({ ...t, [chatWith]: { last: n, unread: 0 } }));
    } catch (e) { toast('Envoi impossible : ' + (e?.message || 'erreur')); }
    finally { setSending(false); }
  };

  const openFile = async (file) => {
    try {
      const url = await getConfrereFileUrl(file.path);
      if (url) window.open(url, '_blank', 'noopener');
      else toast('Pièce jointe indisponible.');
    } catch { toast('Pièce jointe indisponible.'); }
  };

  // Un appel n'est pas hébergé par Tabibo : on ouvre un salon chez le
  // fournisseur de visioconférence, et on dépose le lien dans le fil pour que
  // le confrère absent le retrouve.
  const startCall = async (mode, existingRoom = null) => {
    if (!chatWith) return;
    const room = existingRoom || callRoomFor(myDoctorId || 'demo', chatWith);
    const url = `https://meet.jit.si/${room}${mode === 'audio' ? '#config.startWithVideoMuted=true' : ''}`;
    if (!existingRoom) {
      const body = mode === 'audio' ? 'Appel audio' : 'Appel vidéo';
      if (!live) pushDemo({ id: 'd' + Date.now(), mine: true, kind: 'call', body, callRoom: room, createdAt: new Date().toISOString() });
      else {
        try {
          const n = await sendColleagueNote(myDoctorId, chatWith, { body, callRoom: room });
          setMessages((m) => [...m, n]);
          setThreads((t) => ({ ...t, [chatWith]: { last: n, unread: 0 } }));
        } catch { /* l'appel s'ouvre quand même */ }
      }
    }
    window.open(url, '_blank', 'noopener');
  };

  // ── Fragments d'interface ─────────────────────────────────────────────────
  const card = CARD;
  const btnPri = BTN_PRI;
  const btnGhost = BTN_GHOST;
  const input = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13.5, color: DARK, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'reseau',     label: 'Mon réseau',   count: accepted.length },
    { key: 'messages',   label: 'Messagerie',   count: unreadTotal || null },
    { key: 'adressages', label: 'Adressages',   count: newInRefs || null },
    { key: 'annuaire',   label: 'Trouver un confrère', count: null },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 32, background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <Hero tint={SEC.consult} icon={ICONS.team} isMobile={isMobile}
        title="Tabibo Network"
        sub="Reliez votre cabinet à ceux de vos confrères, parlez-leur directement, adressez-leur un patient en trois champs. Aucune pièce du dossier ne circule d’elle-même : vous seul décidez d’envoyer un document."
        chips={[
          { value: accepted.length, label: accepted.length > 1 ? 'confrères reliés' : 'confrère relié' },
          { value: unreadTotal, label: 'messages non lus', color: unreadTotal ? '#C2263F' : undefined },
          { value: newInRefs, label: 'adressages à traiter', color: newInRefs ? '#B45309' : undefined },
        ]}
        right={<span style={{ background: '#E7F6EE', color: '#0E7C52', borderRadius: 99, padding: '6px 13px', fontSize: 11.5, fontWeight: 800 }}>Le réseau des confrères</span>} />

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 10, border: `1px solid ${on ? 'transparent' : BORDER}`, background: on ? BTN_GREEN : '#fff', color: on ? '#fff' : DARK, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t.label}
              {t.count ? (
                <span style={{ background: on ? 'rgba(255,255,255,0.24)' : '#E7F6EE', color: on ? '#fff' : '#0E7C52', borderRadius: 99, minWidth: 20, height: 20, padding: '0 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{t.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {isDemo && (
        <div style={{ ...card, padding: '11px 15px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: MUTED }}>
          <span style={{ color: TEAL, display: 'flex' }}>{IC.link}</span>
          Confrères, conversations et adressages présentés ici sont fictifs — ils montrent le fonctionnement de Tabibo Network. Créez votre compte pour rejoindre le réseau réel.
        </div>
      )}

      {/* ── Mon réseau ──────────────────────────────────────────────────── */}
      {tab === 'reseau' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 340px', gap: 16, alignItems: isMobile ? 'start' : 'stretch' }}>
          <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '15px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: DARK }}>Mes confrères</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{accepted.length} cabinet{accepted.length > 1 ? 's' : ''} relié{accepted.length > 1 ? 's' : ''} — vous pouvez leur écrire et leur adresser un patient</div>
            </div>
            <div style={{ flex: 1 }}>
              {accepted.length === 0 && <Empty>Aucun confrère pour l’instant. Ouvrez « Trouver un confrère » pour bâtir votre réseau.</Empty>}
              {accepted.map((l) => {
                const c = byId[l.otherId];
                if (!c) return null;
                const th = threads[c.id];
                return (
                  <ColleagueRow key={l.id} c={c} right={<>
                    <button onClick={() => setRefFor(c)} style={btnPri}>{IC.send} Adresser un patient</button>
                    <button onClick={() => openChat(c)} title="Écrire au confrère" style={{ ...btnGhost, position: 'relative' }}>
                      {IC.chat}
                      {th?.unread ? <span style={{ position: 'absolute', top: -5, insetInlineEnd: -5, background: BTN_GREEN, color: '#fff', borderRadius: 99, minWidth: 17, height: 17, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{th.unread}</span> : null}
                    </button>
                    <button onClick={() => setProfileFor(c)} title="Voir sa fiche" style={btnGhost}>{IC.user}</button>
                    <button onClick={() => unlink(l)} disabled={busy === l.id} title="Retirer du réseau" style={{ ...btnGhost, color: MUTED }}>{IC.close}</button>
                  </>} />
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, fontSize: 13.5, fontWeight: 800, color: DARK }}>
                Demandes reçues {incoming.length ? `(${incoming.length})` : ''}
              </div>
              {incoming.length === 0 && <Empty>Aucune demande en attente.</Empty>}
              {incoming.map((l) => {
                const c = byId[l.otherId];
                return (
                  <div key={l.id} style={{ padding: '13px 16px', borderBottom: `1px solid #F1F6F3` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={c?.name} src={c?.avatar} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{c ? docDisplayName(c.name, c.spec) : 'Un confrère'}</div>
                        <div style={{ fontSize: 11.5, color: MUTED }}>{c ? `${specLabel(c.spec)} · ${c.city}` : ''}</div>
                      </div>
                    </div>
                    {l.message && <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, margin: '9px 0 0' }}>« {l.message} »</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                      <button onClick={() => answer(l, true)} disabled={busy === l.id} style={btnPri}>{IC.check} Accepter</button>
                      <button onClick={() => answer(l, false)} disabled={busy === l.id} style={btnGhost}>Refuser</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {outgoing.length > 0 && (
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, fontSize: 13.5, fontWeight: 800, color: DARK }}>Demandes envoyées</div>
                {outgoing.map((l) => {
                  const c = byId[l.otherId];
                  return (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid #F1F6F3` }}>
                      <Avatar name={c?.name} src={c?.avatar} size={30} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: DARK, fontWeight: 600 }}>{c ? docDisplayName(c.name, c.spec) : 'Un confrère'}</div>
                      <StatusPill s="sent" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Messagerie ──────────────────────────────────────────────────── */}
      {tab === 'messages' && (
        <Messenger
          colleagues={linkedColleagues} threads={threads} activeId={chatWith}
          messages={messages} loading={chatLoading} sending={sending} isMobile={isMobile}
          onOpen={openChat} onSend={sendText} onAttach={sendFile} onCall={startCall}
          onOpenFile={openFile} onProfile={setProfileFor} onRefer={setRefFor}
        />
      )}

      {/* ── Adressages ──────────────────────────────────────────────────── */}
      {tab === 'adressages' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 11 }}>Patients qu’on m’adresse</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {inRefs.length === 0 && <div style={{ ...card, ...{ padding: 0 } }}><Empty>Aucun patient adressé pour l’instant.</Empty></div>}
              {inRefs.map((r) => <ReferralCard key={r.id} r={r} other={byId[r.fromId]} busy={busy} onAnswer={answerRef} onNote={openChat} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 11 }}>Patients que j’ai adressés</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {outRefs.length === 0 && <div style={{ ...card }}><Empty>Vous n’avez encore adressé aucun patient.</Empty></div>}
              {outRefs.map((r) => <ReferralCard key={r.id} r={r} other={byId[r.toId]} busy={busy} onAnswer={answerRef} onNote={openChat} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── Annuaire ────────────────────────────────────────────────────── */}
      {tab === 'annuaire' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 190px 190px auto', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED, display: 'flex' }}>{IC.search}</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="Nom du confrère ou spécialité…" style={{ ...input, paddingInlineStart: 36 }} />
            </div>
            <select value={spec} onChange={(e) => setSpec(e.target.value)} style={input}>
              <option value="all">Toutes les spécialités</option>
              {SPEC_OPTS.filter((s) => s.value !== 'all').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={city} onChange={(e) => setCity(e.target.value)} style={input}>
              <option value="all">Toutes les villes</option>
              {CITY_OPTS.filter((c) => c.value !== 'all').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={runSearch} style={{ ...btnPri, height: 40, justifyContent: 'center' }}>{IC.search} Rechercher</button>
          </div>
          {loading && <Empty>Recherche en cours…</Empty>}
          {!loading && directory.length === 0 && <Empty>Aucun confrère ne correspond à cette recherche.</Empty>}
          {!loading && directory.map((c) => {
            const l = linkOf(c.id);
            return (
              <ColleagueRow key={c.id} c={c} right={<>
                <button onClick={() => setProfileFor(c)} title="Voir sa fiche" style={btnGhost}>{IC.user}</button>
                {l?.status === 'accepted' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0E7C52', fontSize: 12.5, fontWeight: 700 }}>{IC.check} Dans mon réseau</span>
                  : l?.status === 'pending' ? <StatusPill s="sent" />
                  : <button onClick={() => ask(c)} disabled={busy === c.id} style={btnPri}>{IC.link} Se relier</button>}
              </>} />
            );
          })}
        </div>
      )}

      {/* ── Fenêtre : adresser un patient ───────────────────────────────── */}
      {refFor && (
        <ReferralForm
          colleague={refFor}
          patients={state?.patients || []}
          onClose={() => setRefFor(null)}
          isMobile={isMobile}
          onSend={async (payload) => {
            if (!live) {
              setReferrals((l) => [{ id: 'demo_' + Date.now(), fromId: 'me', toId: refFor.id, incoming: false, status: 'sent', createdAt: new Date().toISOString(), ...payload }, ...l]);
              setRefFor(null); setTab('adressages');
              toast('Adressage créé (démonstration).');
              return;
            }
            try {
              await sendReferral(myDoctorId, { toDoctorId: refFor.id, ...payload });
              await reload(); setRefFor(null); setTab('adressages');
              toast(`Patient adressé à ${docDisplayName(refFor.name, refFor.spec)} ✓`);
            } catch (e) { toast('Envoi impossible : ' + (e?.message || 'erreur')); }
          }}
        />
      )}

      {/* ── Fiche du confrère ───────────────────────────────────────────── */}
      {profileFor && (
        <ProfileDrawer colleague={profileFor} isMobile={isMobile}
          onClose={() => setProfileFor(null)}
          onRefer={(c) => { setProfileFor(null); setRefFor(c); }}
          onMessage={(c) => openChat(c)} />
      )}
      <span style={{ display: 'none' }}>{String(go && '')}</span>
    </div>
  );
}

// ── Adresser un patient ─────────────────────────────────────────────────────
function ReferralForm({ colleague, patients, onClose, onSend, isMobile }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sug, setSug] = useState(false);

  const matches = (patients || []).filter((p) => name.trim() && (p.name || '').toLowerCase().includes(name.trim().toLowerCase())).slice(0, 5);
  const input = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13.5, color: DARK, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' };
  const lab = { display: 'block', fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 5 };

  const submit = async () => {
    if (!name.trim() || !reason.trim()) return;
    setBusy(true);
    await onSend({ patientName: name.trim(), patientPhone: phone.trim() || null, reason: reason.trim(), note: note.trim() || null, urgency: urgent ? 'urgent' : 'normal' });
    setBusy(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(9,32,23,0.42)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: isMobile ? '100%' : 520, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px -20px rgba(9,32,23,0.5)' }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: DARK }}>Adresser un patient</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>à {docDisplayName(colleague.name, colleague.spec)} · {specLabel(colleague.spec)}</div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <label style={lab}>Nom du patient *</label>
            <input value={name} onChange={(e) => { setName(e.target.value); setSug(true); }} placeholder="Nom et prénom" style={input} />
            {sug && matches.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', insetInlineStart: 0, insetInlineEnd: 0, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, marginTop: 4, boxShadow: SHADOW, zIndex: 5, overflow: 'hidden' }}>
                {matches.map((p) => (
                  <button key={p.id} onClick={() => { setName(p.name || ''); setPhone(p.phone || ''); setSug(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'start', background: 'none', border: 'none', padding: '9px 12px', fontSize: 13, color: DARK, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {p.name} <span style={{ color: MUTED, fontSize: 12 }}>{p.phone || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={lab}>Téléphone du patient</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6 …" style={input} />
          </div>
          <div>
            <label style={lab}>Motif de l’adressage *</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. avis cardiologique, échographie, bilan pré-opératoire" style={input} />
          </div>
          <div>
            <label style={lab}>Précisions pour le confrère</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Ce que le confrère doit savoir avant de recevoir le patient." style={{ ...input, resize: 'vertical' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: DARK, cursor: 'pointer' }}>
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} style={{ accentColor: URGENT, width: 16, height: 16, cursor: 'pointer' }} />
            Marquer comme urgent
          </label>
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 13px', fontSize: 12, color: MUTED, lineHeight: 1.55 }}>
            Seuls ces champs sont transmis. Aucune pièce du dossier — observation, ordonnance, résultat, document — n’est envoyée automatiquement : si vous voulez en joindre une, faites-le vous-même depuis la messagerie.
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#fff', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button onClick={submit} disabled={busy || !name.trim() || !reason.trim()}
            style={{ background: (name.trim() && reason.trim() && !busy) ? BTN_GREEN : '#EAF0EC', color: (name.trim() && reason.trim() && !busy) ? '#fff' : MUTED, border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: (name.trim() && reason.trim() && !busy) ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            {busy ? 'Envoi…' : 'Adresser le patient'}
          </button>
        </div>
      </div>
    </div>
  );
}

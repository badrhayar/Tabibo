import { useState, useEffect, useMemo } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { SPEC_OPTS, CITY_OPTS, SPEC_INFO, docDisplayName, initials as initialsOf, BTN_GREEN } from '../../shared.jsx';
import {
  fetchColleagues, fetchMyLinks, requestLink, respondLink, removeLink,
  fetchReferrals, sendReferral, updateReferralStatus,
  fetchColleagueNotes, sendColleagueNote,
} from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Sila — le réseau des confrères.
//   « Sila » (صِلة) : le lien. Trois gestes, et rien de plus :
//     1. Trouver un confrère et se relier à lui
//     2. Lui adresser un patient, avec le motif et le degré d'urgence
//     3. Lui écrire un mot
//   Ce qui NE circule PAS : le dossier du patient. Un adressage porte un nom,
//   un téléphone et un motif — la pièce médicale reste au cabinet qui l'a
//   constituée. C'est écrit en toutes lettres sur l'écran, pas seulement ici.
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
  search: <svg {...I}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  link:   <svg {...I}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>,
  send:   <svg {...I}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></svg>,
  note:   <svg {...I}><path d="M4 5h16v11H9l-4 4z" /></svg>,
  check:  <svg {...I}><path d="M20 6L9 17l-5-5" /></svg>,
  close:  <svg {...I}><path d="M18 6L6 18M6 6l12 12" /></svg>,
  alert:  <svg {...I}><path d="M12 4.5L2.8 20h18.4z" /><path d="M12 10v4M12 17.2v.1" /></svg>,
  arrow:  <svg {...I}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  phone:  <svg {...I}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>,
};

const AV = ['#0F6E56', '#2563EB', '#9333EA', '#EA580C', '#DB2777', '#0891B2'];
const avColor = (name) => AV[[...String(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % AV.length];
const specLabel = (k) => SPEC_INFO[k]?.label || k || 'Médecin';
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); } catch { return ''; } };

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


// ── Fragments réutilisés ────────────────────────────────────────────────────
// Définis au niveau du module, jamais dans le corps du composant : React
// remonterait sinon l'arbre à chaque rendu.
const CARD = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW };
const BTN_PRI = { display: 'inline-flex', alignItems: 'center', gap: 6, background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const BTN_GHOST = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '8px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };

function Avatar({ name, size = 40 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: avColor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 800, flexShrink: 0 }}>
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
      <Avatar name={c.name} />
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
                {IC.alert} URGENT
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

export default function Network({ state, setState, go }) {
  const { isMobile } = useViewport();
  const myDoctorId = state?.myDoctor?.id || null;
  const isDemo = !myDoctorId && !!state?.demoDoctor;
  const live = !!myDoctorId;

  const [tab, setTab] = useState('reseau');           // reseau | adressages | annuaire
  const [colleagues, setColleagues] = useState(isDemo ? DEMO_COLLEAGUES : []);
  const [links, setLinks] = useState(isDemo ? DEMO_LINKS : []);
  const [referrals, setReferrals] = useState(isDemo ? DEMO_REFERRALS : []);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState('');
  const [spec, setSpec] = useState('all');
  const [city, setCity] = useState('all');

  const [refFor, setRefFor] = useState(null);         // confrère à qui adresser
  const [noteFor, setNoteFor] = useState(null);       // confrère à qui écrire
  const [notes, setNotes] = useState([]);
  const [busy, setBusy] = useState(null);

  const toast = (t) => setState({ toast: t, toastShow: true });
  const demoBlock = () => { toast('Mode démonstration — créez votre compte pour vous relier à un confrère.'); return true; };

  // ── Chargement ────────────────────────────────────────────────────────────
  const reload = async () => {
    if (!live) return;
    setLoading(true);
    try {
      const [ls, rs] = await Promise.all([fetchMyLinks(myDoctorId), fetchReferrals(myDoctorId)]);
      setLinks(ls); setReferrals(rs);
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
    if (!window.confirm('Retirer ce confrère de votre réseau ? Vous ne pourrez plus lui adresser de patient.')) return;
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

  const openNotes = async (c) => {
    setNoteFor(c);
    if (!live) { setNotes([{ id: 'd1', mine: false, body: 'Merci pour l’adressage, je la reçois jeudi.', createdAt: new Date().toISOString() }]); return; }
    try { setNotes(await fetchColleagueNotes(myDoctorId, c.id)); }
    catch { setNotes([]); }
  };

  // ── Fragments d'interface ─────────────────────────────────────────────────
  const card = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW };
  const btnPri = { display: 'inline-flex', alignItems: 'center', gap: 6, background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  const btnGhost = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '8px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
  const input = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13.5, color: DARK, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'reseau',     label: 'Mon réseau',   count: accepted.length },
    { key: 'adressages', label: 'Adressages',   count: newInRefs || null },
    { key: 'annuaire',   label: 'Trouver un confrère', count: null },
  ];

  return (
    <div style={{ padding: isMobile ? 10 : 32, background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* En-tête */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: DARK, letterSpacing: '-0.3px' }}>Sila</h1>
          <span style={{ background: '#E7F6EE', color: '#0E7C52', borderRadius: 99, padding: '4px 11px', fontSize: 11.5, fontWeight: 800 }}>Le réseau des confrères</span>
        </div>
        <p style={{ margin: '7px 0 0', fontSize: 13.5, color: MUTED, lineHeight: 1.6, maxWidth: 760 }}>
          Reliez votre cabinet à ceux de vos confrères, adressez-leur un patient en trois champs, et suivez ce qu’il devient.
          <strong style={{ color: DARK }}> Aucune pièce du dossier ne circule</strong> : un adressage porte un nom, un téléphone et un motif — le dossier reste chez vous.
        </p>
      </div>

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
          Confrères, liens et adressages présentés ici sont fictifs — ils montrent le fonctionnement de Sila. Créez votre compte pour rejoindre le réseau réel.
        </div>
      )}

      {/* ── Mon réseau ──────────────────────────────────────────────────── */}
      {tab === 'reseau' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 340px', gap: 16, alignItems: isMobile ? 'start' : 'stretch' }}>
          <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '15px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: DARK }}>Mes confrères</div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{accepted.length} cabinet{accepted.length > 1 ? 's' : ''} relié{accepted.length > 1 ? 's' : ''} — vous pouvez leur adresser un patient</div>
            </div>
            <div style={{ flex: 1 }}>
              {accepted.length === 0 && <Empty>Aucun confrère pour l’instant. Ouvrez « Trouver un confrère » pour bâtir votre réseau.</Empty>}
              {accepted.map((l) => {
                const c = byId[l.otherId];
                if (!c) return null;
                return (
                  <ColleagueRow key={l.id} c={c} right={<>
                    <button onClick={() => setRefFor(c)} style={btnPri}>{IC.send} Adresser un patient</button>
                    <button onClick={() => openNotes(c)} style={btnGhost}>{IC.note}</button>
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
                      <Avatar name={c?.name} size={34} />
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
                      <Avatar name={c?.name} size={30} />
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

      {/* ── Adressages ──────────────────────────────────────────────────── */}
      {tab === 'adressages' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 11 }}>Patients qu’on m’adresse</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {inRefs.length === 0 && <div style={{ ...card, ...{ padding: 0 } }}><Empty>Aucun patient adressé pour l’instant.</Empty></div>}
              {inRefs.map((r) => <ReferralCard key={r.id} r={r} other={byId[r.fromId]} busy={busy} onAnswer={answerRef} onNote={openNotes} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 11 }}>Patients que j’ai adressés</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {outRefs.length === 0 && <div style={{ ...card }}><Empty>Vous n’avez encore adressé aucun patient.</Empty></div>}
              {outRefs.map((r) => <ReferralCard key={r.id} r={r} other={byId[r.toId]} busy={busy} onAnswer={answerRef} onNote={openNotes} />)}
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
              <ColleagueRow key={c.id} c={c} right={
                l?.status === 'accepted' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0E7C52', fontSize: 12.5, fontWeight: 700 }}>{IC.check} Dans mon réseau</span>
                : l?.status === 'pending' ? <StatusPill s="sent" />
                : <button onClick={() => ask(c)} disabled={busy === c.id} style={btnPri}>{IC.link} Se relier</button>
              } />
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

      {/* ── Fenêtre : écrire au confrère ────────────────────────────────── */}
      {noteFor && (
        <NoteDrawer
          colleague={noteFor} notes={notes} isMobile={isMobile}
          onClose={() => { setNoteFor(null); setNotes([]); }}
          onSend={async (body) => {
            if (!live) { setNotes((l) => [...l, { id: 'd' + Date.now(), mine: true, body, createdAt: new Date().toISOString() }]); return; }
            try {
              await sendColleagueNote(myDoctorId, noteFor.id, body);
              setNotes(await fetchColleagueNotes(myDoctorId, noteFor.id));
            } catch (e) { toast('Envoi impossible : ' + (e?.message || 'erreur')); }
          }}
        />
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
            Seuls ces champs sont transmis. Aucune pièce du dossier — observation, ordonnance, résultat, document — n’est envoyée : le dossier reste dans votre cabinet.
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

// ── Écrire au confrère ──────────────────────────────────────────────────────
function NoteDrawer({ colleague, notes, onClose, onSend, isMobile }) {
  const [body, setBody] = useState('');
  const send = async () => { const t = body.trim(); if (!t) return; setBody(''); await onSend(t); };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(9,32,23,0.42)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: isMobile ? '100%' : 430, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-18px 0 50px -24px rgba(9,32,23,0.5)' }}>
        <div style={{ padding: '17px 19px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: DARK }}>{docDisplayName(colleague.name, colleague.spec)}</div>
            <div style={{ fontSize: 12, color: MUTED }}>{specLabel(colleague.spec)} · {colleague.city}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', padding: 4 }}>{IC.close}</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 17, display: 'flex', flexDirection: 'column', gap: 9, background: BG }}>
          {notes.length === 0 && <div style={{ color: MUTED, fontSize: 12.5, textAlign: 'center', marginTop: 24 }}>Aucun message pour l’instant.</div>}
          {notes.map((n) => (
            <div key={n.id} style={{ alignSelf: n.mine ? 'flex-end' : 'flex-start', maxWidth: '82%', background: n.mine ? '#E7F6EE' : '#fff', border: `1px solid ${n.mine ? '#CDEBDC' : BORDER}`, borderRadius: 13, padding: '9px 12px', fontSize: 13, color: DARK, lineHeight: 1.5 }}>
              {n.body}
            </div>
          ))}
        </div>
        <div style={{ padding: 13, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 9 }}>
          <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Écrire un mot à votre confrère…" style={{ flex: 1, minWidth: 0, padding: '10px 13px', borderRadius: 20, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          <button onClick={send} disabled={!body.trim()} aria-label="Envoyer"
            style={{ width: 38, height: 38, borderRadius: '50%', background: BTN_GREEN, border: 'none', color: '#fff', cursor: body.trim() ? 'pointer' : 'default', opacity: body.trim() ? 1 : 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {IC.send}
          </button>
        </div>
      </div>
    </div>
  );
}

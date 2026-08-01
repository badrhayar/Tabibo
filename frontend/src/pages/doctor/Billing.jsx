import { useState, useMemo, useEffect } from 'react';
import { fetchInvoices, createInvoice, updateInvoice, deleteInvoice } from '../../lib/api';
import { BTN_GREEN, BTN_GREEN_SOLID } from '../../shared.jsx';
import { SEC, Hero, ICONS } from '../../components/SectionKit.jsx';
import { useViewport } from '../../hooks/useViewport';
import { moroccoNow } from '../../lib/time';
import {
  STATUS, statusOf, KINDS, kindOf, RECIPIENTS, METHODS, methodLabel,
  OPEN_STATES, OPEN_BREAKDOWN, PERIODS, periodRange, summarize, notInvoiced,
  loadInvoices, saveInvoices, makeInvoice, advance, frShort, mad,
} from '../../lib/billing';

// ─────────────────────────────────────────────────────────────────────────────
// Facturation — le poste de facturation du cabinet.
//   Trois onglets : Facturation AMO (feuilles de soins par trimestre),
//   Facturation privée (le registre des factures) et Chiffre d'affaires (ce qui
//   reste à facturer, les recettes de la période et le suivi des paiements).
// ─────────────────────────────────────────────────────────────────────────────

const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';
const SHADOW = '0 1px 3px rgba(13,43,30,0.05), 0 10px 26px -16px rgba(13,43,30,0.18)';
const card = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, boxShadow: SHADOW };
const inp = { width: '100%', padding: '9px 11px', fontSize: 13, border: `1px solid #DCE6E1`, borderRadius: 10, color: DARK, background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };
const fieldLbl = { display: 'block', fontSize: 11.5, fontWeight: 600, color: MUTED, marginBottom: 5 };

const I = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IC = {
  info:     <svg {...I}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/></svg>,
  chevron:  <svg {...I}><path d="M9 18l6-6-6-6"/></svg>,
  left:     <svg {...I}><path d="M15 18l-6-6 6-6"/></svg>,
  right:    <svg {...I}><path d="M9 18l6-6-6-6"/></svg>,
  dots:     <svg {...I}><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>,
  transfer: <svg {...I}><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>,
  globe:    <svg {...I}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></svg>,
  cash:     <svg {...I}><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>,
  card:     <svg {...I}><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg>,
  print:    <svg {...I}><path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7"/><path d="M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/></svg>,
  plus:     <svg {...I}><path d="M12 5v14M5 12h14"/></svg>,
  close:    <svg {...I}><path d="M18 6 6 18M6 6l12 12"/></svg>,
};
const METHOD_IC = { virement: IC.transfer, enligne: IC.globe, especes: IC.cash, carte: IC.card };

// Barre empilée — la répartition d'un total, chaque segment à sa couleur.
function StackedBar({ parts, height = 12 }) {
  const total = parts.reduce((t, p) => t + p.total, 0) || 1;
  return (
    <div style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', background: '#EEF3F0' }}>
      {parts.map((p) => (
        <div key={p.key} title={`${p.label} — ${mad(p.total)}`} style={{ width: `${(p.total / total) * 100}%`, background: p.color }} />
      ))}
    </div>
  );
}

// Ligne de légende sous une barre empilée.
function LegendRow({ dot, label, count, amount, onClick, last }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 2px', border: 'none', background: 'transparent', borderBottom: last ? 'none' : `1px solid #F2F6F4`, textAlign: 'start', cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: DARK, fontWeight: 500 }}>{label}</span>
      {count != null && <span style={{ fontSize: 12.5, color: MUTED }}>({count} facture{count > 1 ? 's' : ''})</span>}
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap' }}>{mad(amount)}</span>
      {onClick && <span style={{ color: '#B7C2BD', display: 'flex', flexShrink: 0 }}>{IC.chevron}</span>}
    </Tag>
  );
}

const H2 = ({ children, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '26px 0 14px', flexWrap: 'wrap' }}>
    <h2 style={{ fontSize: 19, fontWeight: 800, color: DARK, margin: 0, letterSpacing: '-0.3px' }}>{children}</h2>
    {right}
  </div>
);

export default function Billing({ state, setState, go }) {
  const { isMobile } = useViewport();
  const today = moroccoNow().dateISO;

  const [tab, setTab] = useState(state?.billTab || 'ca');
  // ── Persistance ───────────────────────────────────────────────────────────
  // La facturation ne vivait que dans le localStorage : invisible depuis un
  // autre poste, effacée avec le cache du navigateur. Elle passe en base (table
  // `invoices`). Le stockage local reste le socle de la DÉMONSTRATION ; dès
  // qu'un cabinet réel est actif, la base fait foi.
  const doctorId = state?.myDoctor?.id || null;
  const [list, setList] = useState(() => loadInvoices(state));
  const [syncErr, setSyncErr] = useState('');

  useEffect(() => {
    if (!doctorId) return undefined;
    let alive = true;
    fetchInvoices(doctorId)
      .then((rows) => { if (alive) { setList(rows); setSyncErr(''); } })
      .catch((e) => { if (alive) setSyncErr(e?.message || 'chargement impossible'); });
    return () => { alive = false; };
  }, [doctorId]);

  // Optimiste à l'écran, confirmé par la base. Si le serveur refuse, on
  // recharge : jamais d'écran qui affirme un enregistrement qui n'a pas eu lieu.
  const patch = (next) => { setList(next); if (!doctorId) saveInvoices(state, next); };
  const persist = async (next, run) => {
    patch(next);
    if (!doctorId) return;
    try { await run(); setSyncErr(''); }
    catch (e) {
      setSyncErr(e?.message || 'enregistrement refusé');
      setState({ toast: 'Enregistrement refusé : ' + (e?.message || 'erreur'), toastShow: true });
      try { setList(await fetchInvoices(doctorId)); } catch { /* hors ligne */ }
    }
  };

  // ── Chiffre d'affaires ────────────────────────────────────────────────────
  const [pKind, setPKind] = useState('quarter');
  const [pOff, setPOff] = useState(0);
  const [custom, setCustom] = useState({ from: today, to: today });
  const range = periodRange(pKind, pOff, today, custom);
  const sum = useMemo(() => summarize(list, range.from, range.to), [list, range.from, range.to]);
  const ni = useMemo(() => notInvoiced(state, list, today), [state, list, today]);
  const [niOpen, setNiOpen] = useState(false);

  // ── Facturation privée ────────────────────────────────────────────────────
  const [sTab, setSTab] = useState(state?.billStatus || 'all');
  const [q, setQ] = useState('');
  const [fSent, setFSent] = useState('');
  const [fKind, setFKind] = useState('');
  const [fMin, setFMin] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [checked, setChecked] = useState([]);
  const [menuFor, setMenuFor] = useState(null);
  const [detail, setDetail] = useState(null);

  const STATUS_TABS = [
    { key: 'draft',    label: 'Brouillons',   match: (i) => i.status === 'draft' },
    { key: 'open',     label: 'Ouvertes',     match: (i) => i.status === 'open' || i.status === 'sent' },
    { key: 'reminded', label: 'Relancées',    match: (i) => i.status === 'reminded' },
    { key: 'paid',     label: 'Payées',       match: (i) => i.status === 'paid' },
    { key: 'recovery', label: 'Recouvrement', match: (i) => i.status === 'recovery' },
    { key: 'all',      label: 'Toutes',       match: () => true },
  ];

  const rows = useMemo(() => {
    const t = STATUS_TABS.find((x) => x.key === sTab) || STATUS_TABS[5];
    const n = (s) => String(s || '').toLowerCase();
    return list
      .filter(t.match)
      .filter((i) => !q.trim() || n(i.patient).includes(n(q)) || String(i.no).includes(q.trim()))
      .filter((i) => !fSent || i.sentTo === fSent)
      .filter((i) => !fKind || i.kind === fKind)
      .filter((i) => !fMin || (i.amount || 0) >= Number(fMin))
      .filter((i) => !fFrom || i.date >= fFrom)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [list, sTab, q, fSent, fKind, fMin, fFrom]);

  const act = (inv, status, extra) => {
    const next = advance(inv, status, extra);
    persist(list.map((i) => (i.id === inv.id ? next : i)),
      () => updateInvoice(inv.id, { status: next.status, method: next.method, amount: next.amount, history: next.history, sentTo: next.sentTo }));
    setMenuFor(null);
  };
  const remove = (inv) => {
    persist(list.filter((i) => i.id !== inv.id), () => deleteInvoice(inv.id));
    setMenuFor(null); setDetail(null);
  };

  // Facturer une consultation réalisée : crée une vraie facture ouverte.
  const invoiceConsult = (c) => {
    const inv = advance(makeInvoice({
      list, patient: c.patient, service: c.service, amount: c.amount || c.fee || 0,
      kind: c.kind || 'prive', date: c.date,
    }), 'sent');
    if (doctorId) {
      // L'identifiant définitif vient de la base : on remplace la ligne
      // provisoire pour que « Envoyer »/« Encaisser » visent la bonne facture.
      setList([inv, ...list]);
      createInvoice(doctorId, inv)
        .then((saved) => { setList((l) => l.map((i) => (i.id === inv.id ? saved : i))); setSyncErr(''); })
        .catch((e) => {
          setSyncErr(e?.message || 'création refusée');
          setState({ toast: 'Facture non enregistrée : ' + (e?.message || 'erreur'), toastShow: true });
          setList((l) => l.filter((i) => i.id !== inv.id));
        });
    } else patch([inv, ...list]);
    setState({ toast: `Facture n° ${inv.no} créée pour ${c.patient} ✓`, toastShow: true });
  };

  const goStatus = (k) => { setSTab(k); setTab('prive'); };

  // ── Feuilles de soins AMO ─────────────────────────────────────────────────
  const amoRange = periodRange('quarter', pOff, today);
  const amoRows = list.filter((i) => i.kind === 'amo' && i.date >= amoRange.from && i.date <= amoRange.to);
  const amoOpen = amoRows.filter((i) => i.status !== 'paid' && i.status !== 'canceled');
  const amoPaid = amoRows.filter((i) => i.status === 'paid');
  const amoSum = (l) => l.reduce((t, i) => t + (i.amount || 0), 0);

  const printBordereau = () => {
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const docName = state?.appUser?.full_name || state?.myDoctor?.full_name || 'Cabinet médical';
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) { setState({ toast: 'Autorisez les fenêtres pop-up pour imprimer le bordereau.', toastShow: true }); return; }
    const lines = amoRows.map((i) => `<tr><td>${esc(i.no)}</td><td>${esc(frShort(i.date))}</td><td>${esc(i.patient)}</td><td>${esc(i.sentTo)}</td><td>${esc(i.service)}</td><td class="r">${esc(mad(i.amount))}</td></tr>`).join('');
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bordereau AMO — ${esc(amoRange.label)}</title>
      <style>body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1b2b26;max-width:760px;margin:0 auto;padding:36px;font-size:13px}
      h1{font-size:20px;color:#0C4A37;margin:0 0 4px}.s{color:#5A6B65;font-size:12.5px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;margin-top:12px}th{text-align:left;font-size:11px;color:#0F6E56;border-bottom:2px solid #0F6E56;padding:7px 6px}
      td{padding:7px 6px;border-bottom:1px solid #eef3f0}.r{text-align:right;font-weight:700}
      .tot{margin-top:18px;text-align:right;font-size:15px;font-weight:800;color:#0C4A37}
      .ft{margin-top:30px;padding-top:12px;border-top:1px solid #e0e8e4;font-size:11px;color:#8a988f}</style></head><body>
      <h1>Bordereau de télétransmission AMO</h1>
      <div class="s">${esc(docName)} · ${esc(amoRange.label)} (${esc(frShort(amoRange.from))} – ${esc(frShort(amoRange.to))}) · ${amoRows.length} feuille(s) de soins</div>
      <table><thead><tr><th>N°</th><th>Date</th><th>Patient</th><th>Organisme</th><th>Acte</th><th class="r">Montant</th></tr></thead><tbody>${lines}</tbody></table>
      <div class="tot">Total du trimestre : ${esc(mad(amoSum(amoRows)))}</div>
      <div class="ft">Document généré par Tabibo — à joindre à l'envoi destiné à l'organisme.</div>
      <script>window.onload=()=>window.print()</` + `script></body></html>`);
    w.document.close();
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'amo',   label: 'Facturation AMO' },
    { key: 'prive', label: 'Facturation privée' },
    { key: 'ca',    label: "Chiffre d'affaires" },
  ];
  const cabinet = state?.myDoctor?.name || state?.appUser?.full_name || 'Mon cabinet';
  // N° de facturation du cabinet : dérivé de l'identifiant du praticien, stable
  // dans le temps. En démonstration, un numéro d'exemple.
  const billNo = (() => {
    const raw = String(state?.myDoctor?.id || '').replace(/\D/g, '');
    if (raw.length >= 8) return raw.slice(0, 8);
    if (!raw) return '64700675';
    return raw.padStart(8, '4');
  })();

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* En-tête + onglets */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: isMobile ? '14px 14px 0' : '20px 32px 0' }}>
        <Hero tint={SEC.factures} icon={ICONS.euro} isMobile={isMobile}
          title="Facturation"
          sub={`${cabinet} · N° de facturation ${billNo}`} />
        {syncErr && (
          <div style={{ margin: '12px 0 0', background: '#FCE7EE', border: '1px solid #F2C2CD', borderRadius: 12, padding: '11px 15px', fontSize: 13, fontWeight: 600, color: '#C2415C' }}>
            Facturation non synchronisée : {syncErr}. Les montants affichés peuvent ne pas refléter la base — rechargez la page.
          </div>
        )}
        <div style={{ display: 'flex', gap: isMobile ? 14 : 22, marginTop: 16, overflowX: 'auto' }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ background: 'none', border: 'none', borderBottom: `3px solid ${on ? TEAL : 'transparent'}`, padding: '0 2px 11px', fontSize: 14, fontWeight: on ? 700 : 600, color: on ? TEAL : MUTED, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: isMobile ? 14 : '10px 32px 40px' }}>

        {/* ══ Chiffre d'affaires ══════════════════════════════════════════ */}
        {tab === 'ca' && (
          <>
            <H2 right={<span title="Consultations réalisées pour lesquelles aucune facture n'existe encore." style={{ color: MUTED, display: 'flex' }}>{IC.info}</span>}>Pas encore facturé</H2>
            <div style={{ ...card, maxWidth: 420 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>Facturable</div>
              <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 800, color: DARK, letterSpacing: '-1px', margin: '8px 0 10px' }}>{mad(ni.total)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: MUTED }}>{ni.count} consultation{ni.count > 1 ? 's' : ''} non facturée{ni.count > 1 ? 's' : ''}</span>
                {ni.count > 0 && (
                  <button onClick={() => setNiOpen(true)} style={{ background: 'none', border: 'none', color: TEAL, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Voir le détail</button>
                )}
              </div>
            </div>

            <H2>Recettes par période</H2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <button onClick={() => { setPOff(0); }} style={{ height: 34, display: 'inline-flex', alignItems: 'center', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '0 15px', fontSize: 13, fontWeight: 700, color: DARK, cursor: 'pointer', fontFamily: 'inherit', boxShadow: SHADOW }}>Aujourd'hui</button>
              <button onClick={() => setPOff((o) => o - 1)} aria-label="Période précédente" style={{ height: 34, width: 34, background: 'none', border: 'none', cursor: 'pointer', color: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{IC.left}</button>
              <button onClick={() => setPOff((o) => o + 1)} aria-label="Période suivante" style={{ height: 34, width: 34, background: 'none', border: 'none', cursor: 'pointer', color: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{IC.right}</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: DARK, textTransform: 'capitalize' }}>{range.label}</span>
              <span style={{ flex: 1 }} />
              <div style={{ display: 'flex', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 3, boxShadow: SHADOW }}>
                {PERIODS.map((p) => {
                  const on = pKind === p.key;
                  return (
                    <button key={p.key} onClick={() => { setPKind(p.key); setPOff(0); }}
                      style={{ background: on ? BTN_GREEN : 'transparent', color: on ? '#fff' : MUTED, border: 'none', borderRadius: 9, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{p.label}</button>
                  );
                })}
              </div>
            </div>
            {pKind === 'custom' && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div><label style={fieldLbl}>Du</label><input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} style={{ ...inp, width: 170 }} /></div>
                <div><label style={fieldLbl}>Au</label><input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} style={{ ...inp, width: 170 }} /></div>
              </div>
            )}

            <h3 style={{ fontSize: 15.5, fontWeight: 700, color: DARK, margin: '0 0 12px' }}>Toutes les factures déjà envoyées</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 6 }}>
              <div style={card}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>Factures envoyées aux patients</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>entre {frShort(range.from)} et {frShort(range.to)}</div>
                <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 800, color: DARK, letterSpacing: '-1px', margin: '16px 0 8px' }}>{mad(sum.sentTotal)}</div>
                <div style={{ fontSize: 12.5, color: MUTED }}>{sum.sentCount} facture{sum.sentCount > 1 ? 's' : ''}</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>Par type de facturation</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: DARK, margin: '6px 0 12px' }}>{mad(sum.sentTotal)}</div>
                {sum.byKind.length > 0 ? (
                  <>
                    <StackedBar parts={sum.byKind} />
                    <div style={{ marginTop: 6 }}>
                      {sum.byKind.map((k, i) => (
                        <LegendRow key={k.key} dot={k.color} label={k.label} count={k.count} amount={k.total} last={i === sum.byKind.length - 1} />
                      ))}
                    </div>
                  </>
                ) : <div style={{ fontSize: 13, color: MUTED, padding: '10px 0' }}>Aucune facture sur cette période.</div>}
              </div>
            </div>

            <H2>Paiement</H2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
              {/* Ouvert */}
              <div style={card}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>Ouvert</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: DARK, margin: '4px 0 12px' }}>{mad(sum.openTotal)}</div>
                {sum.openByState.length > 0 ? (
                  <>
                    <StackedBar parts={sum.openByState} />
                    <div style={{ marginTop: 6 }}>
                      {sum.openByState.map((s, i) => (
                        <LegendRow key={s.key} dot={s.color} label={s.label} amount={s.total} onClick={() => goStatus(s.key === 'sent' ? 'open' : s.key)} last={i === sum.openByState.length - 1} />
                      ))}
                    </div>
                  </>
                ) : <div style={{ fontSize: 13, color: MUTED, padding: '10px 0' }}>Rien en attente de paiement.</div>}
              </div>
              {/* Payé */}
              <div style={card}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>Payé</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: DARK, margin: '4px 0 12px' }}>{mad(sum.paidTotal)}</div>
                {sum.paidByKind.length > 0 ? (
                  <>
                    <StackedBar parts={sum.paidByKind} />
                    <div style={{ marginTop: 6 }}>
                      {sum.paidByKind.map((k, i) => (
                        <LegendRow key={k.key} dot={k.color} label={k.label} amount={k.total} last={i === sum.paidByKind.length - 1} />
                      ))}
                    </div>
                  </>
                ) : <div style={{ fontSize: 13, color: MUTED, padding: '10px 0' }}>Aucun encaissement sur cette période.</div>}
              </div>
              {/* Méthode de paiement */}
              <div style={card}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK, marginBottom: 8 }}>Méthode de paiement</div>
                {sum.byMethod.length > 0 ? sum.byMethod.map((m, i) => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 2px', borderBottom: i === sum.byMethod.length - 1 ? 'none' : '1px solid #F2F6F4' }}>
                    <span style={{ color: TEAL, display: 'flex', flexShrink: 0 }}>{METHOD_IC[m.key]}</span>
                    <span style={{ fontSize: 13, color: DARK, fontWeight: 500 }}>{m.label}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap' }}>{mad(m.total)}</span>
                  </div>
                )) : <div style={{ fontSize: 13, color: MUTED, padding: '10px 0' }}>Aucun encaissement sur cette période.</div>}
              </div>
            </div>
          </>
        )}

        {/* ══ Facturation privée ══════════════════════════════════════════ */}
        {tab === 'prive' && (
          <>
            {/* Onglets d'état, avec leur compte */}
            <div style={{ display: 'flex', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', margin: '18px 0 16px', boxShadow: SHADOW, overflowX: 'auto' }}>
              {STATUS_TABS.map((t, i) => {
                const n = list.filter(t.match).length;
                const on = sTab === t.key;
                return (
                  <button key={t.key} onClick={() => setSTab(t.key)}
                    style={{ flex: '1 0 auto', minWidth: 130, padding: '15px 14px', border: 'none', borderLeft: i === 0 ? 'none' : `1px solid ${BORDER}`, borderBottom: `3px solid ${on ? TEAL : 'transparent'}`, background: on ? '#F4FAF7' : '#fff', color: on ? TEAL : DARK, fontSize: 13.5, fontWeight: on ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {t.label} ({n})
                  </button>
                );
              })}
            </div>

            {/* Filtres */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ ...card, padding: 12 }}>
                <label style={fieldLbl}>Patient ou n° de facture</label>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" style={inp} />
              </div>
              <div style={{ ...card, padding: 12 }}>
                <label style={fieldLbl}>Envoyée à</label>
                <select value={fSent} onChange={(e) => setFSent(e.target.value)} style={inp}>
                  <option value="">Tous</option>
                  {RECIPIENTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ ...card, padding: 12 }}>
                <label style={fieldLbl}>Type</label>
                <select value={fKind} onChange={(e) => setFKind(e.target.value)} style={inp}>
                  <option value="">Tous</option>
                  {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
              </div>
              <div style={{ ...card, padding: 12 }}>
                <label style={fieldLbl}>Montant minimum (MAD)</label>
                <input type="number" min="0" value={fMin} onChange={(e) => setFMin(e.target.value)} placeholder="0" style={inp} />
              </div>
              <div style={{ ...card, padding: 12 }}>
                <label style={fieldLbl}>Créée à partir du</label>
                <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} style={inp} />
              </div>
            </div>

            {/* Tableau */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                  <thead>
                    <tr>
                      {['', 'N°', 'Patient', 'Envoyée à', 'Type', 'Historique de la facture', 'Statut', 'Somme', ''].map((h, i) => (
                        <th key={i} style={{ textAlign: i === 7 ? 'right' : 'left', padding: '13px 12px', fontSize: 11, fontWeight: 700, color: MUTED, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap', background: '#FBFDFC' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={9} style={{ padding: '30px 12px', textAlign: 'center', color: MUTED, fontSize: 13 }}>Aucune facture ne correspond à ces filtres.</td></tr>
                    )}
                    {rows.slice(0, 60).map((i) => {
                      const st = statusOf(i.status);
                      const kd = kindOf(i.kind);
                      const on = checked.includes(i.id);
                      return (
                        <tr key={i.id} style={{ borderBottom: '1px solid #F4F7F5' }}>
                          <td style={{ padding: '11px 12px', width: 34 }}>
                            <input type="checkbox" checked={on} onChange={() => setChecked((l) => (on ? l.filter((x) => x !== i.id) : [...l, i.id]))} style={{ accentColor: BTN_GREEN_SOLID, width: 15, height: 15, cursor: 'pointer' }} />
                          </td>
                          <td onClick={() => setDetail(i)} style={{ padding: '11px 12px', cursor: 'pointer' }}>
                            <div style={{ fontWeight: 700, color: DARK }}>{i.no}</div>
                            <div style={{ fontSize: 11.5, color: MUTED }}>{frShort(i.date)}</div>
                          </td>
                          <td onClick={() => setDetail(i)} style={{ padding: '11px 12px', color: DARK, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>{i.patient}</td>
                          <td style={{ padding: '11px 12px', color: DARK }}>{i.sentTo}</td>
                          <td style={{ padding: '11px 12px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: DARK }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: kd.color }} />{kd.label}
                            </span>
                          </td>
                          <td style={{ padding: '11px 12px', color: MUTED, fontSize: 12 }}>
                            {(i.history || []).slice(0, 2).map((h, k) => (
                              <div key={k}>{h.label} : {frShort(h.date)}</div>
                            ))}
                          </td>
                          <td style={{ padding: '11px 12px' }}>
                            <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '3px 11px', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{st.label}</span>
                          </td>
                          <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: DARK, whiteSpace: 'nowrap' }}>{mad(i.amount)}</td>
                          <td style={{ padding: '11px 12px', position: 'relative', width: 40 }}>
                            <button onClick={() => setMenuFor(menuFor === i.id ? null : i.id)} aria-label="Actions"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', padding: 4 }}>{IC.dots}</button>
                            {menuFor === i.id && (
                              <>
                                <div onClick={() => setMenuFor(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                                <div style={{ position: 'absolute', top: 36, right: 8, width: 210, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 18px 44px rgba(21,49,74,.16)', zIndex: 40, overflow: 'hidden' }}>
                                  {[
                                    i.status === 'draft' && ['Envoyer la facture', () => act(i, 'sent')],
                                    i.status !== 'paid' && ['Marquer comme payée', () => act(i, 'paid', { method: 'especes' })],
                                    OPEN_STATES.includes(i.status) && ['Relancer le patient', () => act(i, 'reminded')],
                                    OPEN_STATES.includes(i.status) && ['Passer en recouvrement', () => act(i, 'recovery')],
                                    i.status !== 'canceled' && ['Annuler la facture', () => act(i, 'canceled')],
                                    ['Supprimer', () => remove(i)],
                                  ].filter(Boolean).map(([label, fn]) => (
                                    <button key={label} onClick={fn}
                                      style={{ display: 'block', width: '100%', textAlign: 'start', padding: '10px 13px', border: 'none', borderBottom: '1px solid #F4F7F5', background: 'none', fontSize: 12.5, fontWeight: 600, color: label === 'Supprimer' ? '#C2466A' : DARK, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                                  ))}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 60 && (
                <div style={{ padding: '12px 14px', fontSize: 12.5, color: MUTED, borderTop: `1px solid ${BORDER}` }}>60 premières factures affichées sur {rows.length} — affinez les filtres pour voir les suivantes.</div>
              )}
            </div>
          </>
        )}

        {/* ══ Facturation AMO ═════════════════════════════════════════════ */}
        {tab === 'amo' && (
          <>
            <H2>Feuilles de soins du trimestre</H2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <button onClick={() => setPOff(0)} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 15px', fontSize: 13, fontWeight: 700, color: DARK, cursor: 'pointer', fontFamily: 'inherit', boxShadow: SHADOW }}>Trimestre en cours</button>
              <button onClick={() => setPOff((o) => o - 1)} aria-label="Trimestre précédent" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DARK, display: 'flex', padding: 6 }}>{IC.left}</button>
              <button onClick={() => setPOff((o) => o + 1)} aria-label="Trimestre suivant" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DARK, display: 'flex', padding: 6 }}>{IC.right}</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{amoRange.label}</span>
              <span style={{ flex: 1 }} />
              <button onClick={printBordereau} disabled={amoRows.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: amoRows.length ? BTN_GREEN : '#EAF0EC', color: amoRows.length ? '#fff' : MUTED, border: 'none', borderRadius: 11, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: amoRows.length ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                {IC.print} Générer le bordereau
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              {[
                ['Feuilles du trimestre', amoRows.length, amoSum(amoRows), TEAL],
                ['En attente de remboursement', amoOpen.length, amoSum(amoOpen), '#C28A1B'],
                ['Remboursées', amoPaid.length, amoSum(amoPaid), '#0E7C52'],
              ].map(([label, count, total, color]) => (
                <div key={label} style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>{label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.6px', margin: '6px 0 4px' }}>{mad(total)}</div>
                  <div style={{ fontSize: 12.5, color: MUTED }}>{count} feuille{count > 1 ? 's' : ''} de soins</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
                  <thead>
                    <tr>
                      {['N°', 'Date', 'Patient', 'Organisme', 'Acte', 'Statut', 'Montant'].map((h, i) => (
                        <th key={h} style={{ textAlign: i === 6 ? 'right' : 'left', padding: '13px 12px', fontSize: 11, fontWeight: 700, color: MUTED, borderBottom: `1px solid ${BORDER}`, background: '#FBFDFC', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {amoRows.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '30px 12px', textAlign: 'center', color: MUTED, fontSize: 13 }}>Aucune feuille de soins AMO sur ce trimestre.</td></tr>
                    )}
                    {amoRows.map((i) => {
                      const st = statusOf(i.status);
                      return (
                        <tr key={i.id} onClick={() => setDetail(i)} style={{ borderBottom: '1px solid #F4F7F5', cursor: 'pointer' }}>
                          <td style={{ padding: '11px 12px', fontWeight: 700, color: DARK }}>{i.no}</td>
                          <td style={{ padding: '11px 12px', color: MUTED }}>{frShort(i.date)}</td>
                          <td style={{ padding: '11px 12px', color: DARK, fontWeight: 500 }}>{i.patient}</td>
                          <td style={{ padding: '11px 12px', color: DARK }}>{i.sentTo}</td>
                          <td style={{ padding: '11px 12px', color: MUTED }}>{i.service}</td>
                          <td style={{ padding: '11px 12px' }}><span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '3px 11px', fontSize: 11.5, fontWeight: 700 }}>{st.label}</span></td>
                          <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: DARK, whiteSpace: 'nowrap' }}>{mad(i.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Détail « Pas encore facturé » */}
      {niOpen && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setNiOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(12,40,30,0.42)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 'min(560px, 100%)', background: BG, height: '100%', overflowY: 'auto', boxShadow: '-18px 0 46px rgba(6,32,23,0.28)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #0C4A37 100%)', color: '#fff', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Consultations non facturées</div>
                <div style={{ fontSize: 12.5, opacity: 0.9 }}>{ni.count} consultation(s) · {mad(ni.total)}</div>
              </div>
              <button onClick={() => setNiOpen(false)} aria-label="Fermer" style={{ background: 'rgba(255,255,255,0.16)', border: 'none', borderRadius: 9, width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.close}</button>
            </div>
            <div style={{ padding: 16 }}>
              {ni.rows.map((c) => (
                <div key={c.id} style={{ ...card, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>{c.patient}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{frShort(c.date)} · {c.service || 'Consultation'}</div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap' }}>{mad(c.amount || c.fee || 0)}</div>
                  <button onClick={() => invoiceConsult(c)}
                    style={{ background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Facturer</button>
                </div>
              ))}
              {ni.rows.length === 0 && <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', padding: 24 }}>Tout est facturé.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Détail d'une facture */}
      {detail && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(12,40,30,0.42)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 'min(480px, 100%)', background: BG, height: '100%', overflowY: 'auto', boxShadow: '-18px 0 46px rgba(6,32,23,0.28)' }}>
            <div style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #0C4A37 100%)', color: '#fff', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Facture n° {detail.no}</div>
                <div style={{ fontSize: 12.5, opacity: 0.9 }}>{detail.patient} · {frShort(detail.date)}</div>
              </div>
              <button onClick={() => setDetail(null)} aria-label="Fermer" style={{ background: 'rgba(255,255,255,0.16)', border: 'none', borderRadius: 9, width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.close}</button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ ...card, marginBottom: 12 }}>
                {[
                  ['Acte', detail.service || '—'],
                  ['Type de facturation', kindOf(detail.kind).label],
                  ['Envoyée à', detail.sentTo],
                  ['Statut', statusOf(detail.status).label],
                  ['Moyen de paiement', detail.method ? methodLabel(detail.method) : '—'],
                  ['Montant', mad(detail.amount)],
                ].map(([k, v], i, a) => (
                  <div key={k} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: i === a.length - 1 ? 'none' : '1px solid #F2F6F4' }}>
                    <span style={{ fontSize: 12.5, color: MUTED, minWidth: 150 }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 800, color: TEAL, marginBottom: 10 }}>Historique de la facture</div>
                {(detail.history || []).map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? TEAL : '#C9D8D1', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: DARK, fontWeight: 600 }}>{h.label}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 12.5, color: MUTED }}>{frShort(h.date)}</span>
                  </div>
                ))}
              </div>
              {detail.status !== 'paid' && detail.status !== 'canceled' && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 8 }}>Encaisser cette facture</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {METHODS.map((m) => (
                      <button key={m.key} onClick={() => { act(detail, 'paid', { method: m.key }); setDetail({ ...advance(detail, 'paid', { method: m.key }) }); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '9px 13px', fontSize: 12.5, fontWeight: 700, color: DARK, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span style={{ color: TEAL, display: 'flex' }}>{METHOD_IC[m.key]}</span>{m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

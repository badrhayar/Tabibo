import { useState } from 'react';
import { BTN_GREEN } from '../../shared.jsx';
import { useViewport } from '../../hooks/useViewport';
import { PLAN_DEF, planFeatures, PRO_PRICE } from '../../lib/plans';

// ─────────────────────────────────────────────────────────────────────────────
// Détail des formules — la page longue derrière le bouton « Plus de détails »
// des cartes d'abonnement. Chaque fonction y est décrite comme elle le serait
// dans une documentation commerciale : à quoi elle sert, pourquoi elle compte
// pour un cabinet marocain, et ce qu'elle sait faire précisément.
// ─────────────────────────────────────────────────────────────────────────────

const TEAL = '#0F6E56';
const DARK = '#15314A';
const MUTED = '#6B7B76';
const BORDER = '#E8EFEB';
const BG = '#F5F9F7';
const SHADOW = '0 1px 3px rgba(13,43,30,0.05), 0 10px 26px -16px rgba(13,43,30,0.18)';

const I = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const ICONS = {
  file:     <svg {...I}><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg>,
  folder:   <svg {...I}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  chart:    <svg {...I}><path d="M4 4v16h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/></svg>,
  calendar: <svg {...I}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>,
  bell:     <svg {...I}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  chat:     <svg {...I}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  shield:   <svg {...I}><path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M9.5 12l1.8 1.8 3.4-3.4"/></svg>,
  check:    <svg {...I}><path d="M20 6 9 17l-5-5"/></svg>,
  phone:    <svg {...I}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.8 2.2z"/></svg>,
  mic:      <svg {...I}><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></svg>,
  receipt:  <svg {...I}><path d="M6 2.5h12v19l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9.5 7.5h5M9.5 11h5M9.5 14.5h3"/></svg>,
  video:    <svg {...I}><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
};

const CheckMark = ({ c = TEAL }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M20 6 9 17l-5-5"/></svg>
);

export default function PlanDetails({ state, setState, go }) {
  const { isMobile } = useViewport();
  const [tab, setTab] = useState(state?.planDetail === 'premium' ? 'premium' : 'pro');
  const plan = PLAN_DEF[tab];
  const feats = planFeatures(tab);

  const back = () => { setState({ planDetail: null }); go('dabo'); };

  return (
    <div style={{ padding: isMobile ? 12 : 32, background: BG, minHeight: '100vh' }}>
      {/* Retour */}
      <button onClick={back}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 11, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: DARK, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18, boxShadow: SHADOW }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        Retour à l'abonnement
      </button>

      {/* En-tête de la formule */}
      <div style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #0C4A37 100%)', borderRadius: 18, padding: isMobile ? '22px 20px' : '30px 34px', marginBottom: 22, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, margin: 0, letterSpacing: '-0.6px' }}>Formule {plan.name}</h1>
          {plan.available
            ? <span style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>Disponible</span>
            : <span style={{ background: '#FEF3DC', color: '#8A6210', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>Bientôt disponible</span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.95 }}>{plan.tagline}</div>
        <p style={{ fontSize: 14, lineHeight: 1.65, margin: '12px 0 0', maxWidth: 720, opacity: 0.92 }}>{plan.pitch}</p>
        <div style={{ marginTop: 16, fontSize: 22, fontWeight: 800 }}>
          {plan.price ? <>{plan.price} MAD<span style={{ fontSize: 13, fontWeight: 500, opacity: 0.85 }}>/mois</span></> : <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.9 }}>Tarif annoncé à l'ouverture</span>}
        </div>
      </div>

      {/* Sélecteur de formule */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {['pro', 'premium'].map((k) => {
          const on = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 11, border: `1px solid ${on ? TEAL : BORDER}`, background: on ? BTN_GREEN : '#fff', color: on ? '#fff' : DARK, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {PLAN_DEF[k].name}
              <span style={{ fontSize: 11.5, fontWeight: 600, opacity: on ? 0.85 : 0.7 }}>
                {PLAN_DEF[k].available ? `${PLAN_DEF[k].price} MAD` : 'bientôt'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sommaire */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: isMobile ? 16 : 20, marginBottom: 20, boxShadow: SHADOW }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Ce que contient la formule {plan.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {feats.map((f) => (
            <a key={f.key} href={`#f-${f.key}`}
              onClick={(e) => { e.preventDefault(); const el = document.getElementById(`f-${f.key}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 11, textDecoration: 'none', color: DARK, background: '#F6FAF8', border: `1px solid ${BORDER}` }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ICONS[f.icon]}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{f.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Une section détaillée par fonction */}
      {feats.map((f) => (
        <section key={f.key} id={`f-${f.key}`} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: isMobile ? 18 : 26, marginBottom: 16, boxShadow: SHADOW, scrollMarginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: '#E9F5F0', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ICONS[f.icon]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: isMobile ? 17 : 19, fontWeight: 800, color: DARK, margin: 0, letterSpacing: '-0.3px' }}>{f.label}</h2>
              <div style={{ fontSize: 13.5, color: MUTED, marginTop: 3 }}>{f.short}</div>
            </div>
            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '4px 11px', background: f.plan === 'pro' ? '#E7F6EE' : '#EFEAFB', color: f.plan === 'pro' ? '#0E7C52' : '#5B45A0' }}>
              {f.plan === 'pro' ? 'Inclus dans Pro' : 'Premium'}
            </span>
          </div>

          {f.long.map((p, i) => (
            <p key={i} style={{ fontSize: 14, lineHeight: 1.75, color: '#3A4A45', margin: '0 0 12px' }}>{p}</p>
          ))}

          <div style={{ background: '#F6FAF8', border: `1px solid ${BORDER}`, borderRadius: 13, padding: '14px 16px', marginTop: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 9 }}>En pratique</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px 20px' }}>
              {f.bullets.map((b) => (
                <li key={b} style={{ display: 'flex', gap: 9, fontSize: 13, color: DARK, lineHeight: 1.5 }}><CheckMark />{b}</li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {/* Pied de page — retour à la décision */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: isMobile ? 18 : 24, boxShadow: SHADOW, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: DARK }}>
            {plan.available ? `La formule Pro est à ${PRO_PRICE} MAD par mois` : "Premium ouvre prochainement"}
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>
            {plan.available
              ? 'Sans engagement de durée : vous pouvez arrêter à la fin de n\'importe quel mois.'
              : 'La formule Pro reste la seule formule ouverte aujourd\'hui ; Premium s\'y ajoutera sans changer vos données.'}
          </div>
        </div>
        <button onClick={back}
          style={{ background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 11, padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Retour à l'abonnement
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · le vocabulaire visuel des écrans du cabinet
//
//   Une section = une couleur, un bandeau, des sous-cartes. Ce fichier est la
//   seule définition de ces trois formes : les écrans les importent, personne
//   ne les redessine. C'est ce qui fait que le dossier patient, l'ordonnancier,
//   les documents, l'accueil et les paramètres se ressemblent — et se lisent de
//   la même façon.
//
//   La règle de couleur ne change pas : les verts profonds sont des SURFACES
//   (rails, en-têtes), le vert d'action reste `BTN_GREEN`. Les couleurs
//   ci-dessous ne colorent que des pastilles, des fonds très clairs et des
//   chiffres — jamais un bouton.
// ─────────────────────────────────────────────────────────────────────────────

const DARK = '#15314A';
const MUTED = '#6B7B76';
export const KIT_SHADOW = '0 1px 2px rgba(16,42,32,0.04), 0 14px 34px -22px rgba(16,42,32,0.20)';

// Les pictogrammes des bandeaux. Un seul jeu, un seul trait, une seule taille —
// pour que deux écrans n'aient jamais deux calendriers différents.
const KI = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
export const ICONS = {
  calendar: <svg {...KI}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  clock:    <svg {...KI}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.2V12l3.4 2.2" /></svg>,
  users:    <svg {...KI}><circle cx="9.5" cy="8" r="3.4" /><path d="M2.6 20c.7-3.6 3.5-5.5 6.9-5.5s6.2 1.9 6.9 5.5" /><circle cx="18" cy="9" r="2.4" /><path d="M17 14.2c2.4.2 4.1 1.8 4.5 4.3" /></svg>,
  navigator:<svg {...KI}><circle cx="9.4" cy="7.6" r="3.4" /><path d="M2.8 19.5c.6-3.3 3.2-5 6.6-5 1.1 0 2.1.2 3 .5" /><circle cx="17.5" cy="17" r="4.6" /><path d="M15.5 17.2l1.4 1.4 2.6-2.6" /></svg>,
  check:    <svg {...KI}><circle cx="12" cy="12" r="8.6" /><path d="M8.4 12.2l2.5 2.5 4.7-5" /></svg>,
  chat:     <svg {...KI}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-5A8 8 0 1 1 21 12z" /></svg>,
  bell:     <svg {...KI}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  euro:     <svg {...KI}><path d="M17 6.5A6.5 6.5 0 1 0 17 17.5" /><path d="M4.5 10.5h8M4.5 13.5h8" /></svg>,
  chart:    <svg {...KI}><path d="M4 4v16h16" /><path d="M8 16v-5M12 16V8M16 16v-3" /></svg>,
  team:     <svg {...KI}><circle cx="12" cy="7.6" r="3.4" /><path d="M5.5 19.5c.6-3.3 3.2-5 6.5-5s5.9 1.7 6.5 5" /><circle cx="4.5" cy="9.6" r="2.4" /><circle cx="19.5" cy="9.6" r="2.4" /></svg>,
  share:    <svg {...KI}><circle cx="18" cy="5.5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="18.5" r="2.6" /><path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4" /></svg>,
  station:  <svg {...KI}><circle cx="12" cy="12" r="3.4" /><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7" /></svg>,
  card:     <svg {...KI}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" /></svg>,
  inbox:    <svg {...KI}><path d="M3 13h5l1.6 3h4.8L16 13h5" /><path d="M4.6 5.4L3 13v4.5A2.5 2.5 0 0 0 5.5 20h13a2.5 2.5 0 0 0 2.5-2.5V13l-1.6-7.6A2 2 0 0 0 17.5 4h-11a2 2 0 0 0-1.9 1.4z" /></svg>,
  rx:       <svg {...KI}><path d="M4 3h9a4 4 0 0 1 0 8H4zM4 11l9 10M13 13l7 8M20 13l-7 8" /></svg>,
  file:     <svg {...KI}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /></svg>,
};

/** La palette : une entrée par section d'écran. */
export const SEC = {
  // Dossier patient
  consult:  { c: '#0E7C52', bg: '#E7F6EE' },
  profil:   { c: '#0891B2', bg: '#E3F5FA' },
  admin:    { c: '#3B6FB0', bg: '#E8F1FC' },
  histo:    { c: '#6B57A6', bg: '#EFEAFB' },
  antec:    { c: '#C2466A', bg: '#FCE7EE' },
  ttt:      { c: '#B45309', bg: '#FDF1E0' },
  suivi:    { c: '#0E7C52', bg: '#E7F6EE' },
  bio:      { c: '#12875A', bg: '#E3F8EE' },
  docs:     { c: '#3B6FB0', bg: '#E8F1FC' },
  prev:     { c: '#0891B2', bg: '#E3F5FA' },
  vaccin:   { c: '#6B57A6', bg: '#EFEAFB' },
  factures: { c: '#C28A1B', bg: '#FEF3DC' },
  // Autres écrans
  ordo:     { c: '#6B57A6', bg: '#EFEAFB' },
  accueil:  { c: '#0E7C52', bg: '#E7F6EE' },
  reglages: { c: '#3B6FB0', bg: '#E8F1FC' },
  urgent:   { c: '#C2263F', bg: '#FCE7EE' },
};
export const secOf = (id) => SEC[id] || SEC.consult;

/**
 * Bandeau de section : la couleur, l'icône, le titre, et les repères chiffrés.
 * `chips` accepte des entrées `{ value, label, color }` — les valeurs nulles
 * sont ignorées, ce qui évite de conditionner chaque repère à l'appel.
 */
export function Hero({ tint, icon, title, sub, chips = [], right, isMobile }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 20, marginBottom: 16,
      padding: isMobile ? '16px 16px' : '20px 22px',
      background: `linear-gradient(132deg, ${tint.bg} 0%, #FFFFFF 68%)`,
      border: `1px solid ${tint.bg}`, boxShadow: KIT_SHADOW,
    }}>
      <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -46, top: -70, width: 200, height: 200, borderRadius: '50%', background: tint.c, opacity: 0.07 }} />
      <span aria-hidden style={{ position: 'absolute', insetInlineEnd: 60, bottom: -80, width: 130, height: 130, borderRadius: '50%', background: tint.c, opacity: 0.05 }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ width: 48, height: 48, borderRadius: 15, background: '#fff', color: tint.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 8px 18px -10px ${tint.c}` }}>
          <span style={{ display: 'flex', transform: 'scale(1.35)' }}>{icon}</span>
        </span>
        <div style={{ flex: 1, minWidth: 170 }}>
          <div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 800, color: DARK, letterSpacing: '-0.45px' }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2, lineHeight: 1.5 }}>{sub}</div>}
        </div>
        {right}
      </div>
      {chips.filter(Boolean).length > 0 && (
        <div style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 15 }}>
          {chips.filter(Boolean).map((ch, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, background: '#fff', border: `1px solid ${tint.bg}`, borderRadius: 11, padding: '7px 13px', boxShadow: '0 1px 2px rgba(16,42,32,0.04)' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: ch.color || tint.c, letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums' }}>{ch.value}</span>
              <span style={{ fontSize: 11.5, color: MUTED, fontWeight: 600 }}>{ch.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sous-carte titrée : un bloc de la section, avec sa pastille de couleur. */
export function Panel({ tint, icon, title, sub, right, children, pad = 16, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EAF1ED', borderRadius: 16, boxShadow: KIT_SHADOW, marginBottom: 14, overflow: 'hidden', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px', borderBottom: '1px solid #F1F6F3', background: `linear-gradient(90deg, ${tint.bg} 0%, #FFFFFF 55%)`, flexWrap: 'wrap' }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, background: '#fff', color: tint.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 10px -6px ${tint.c}` }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK, letterSpacing: '-0.2px' }}>{title}</div>
          {sub && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{sub}</div>}
        </div>
        {right}
      </div>
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

/** Une donnée chiffrée, en grand. */
export function Metric({ tint, label, value, unit, note, noteColor, icon }) {
  const has = value != null && value !== '' && value !== '—';
  return (
    <div style={{ background: '#fff', border: '1px solid #EAF1ED', borderRadius: 15, padding: '13px 15px', boxShadow: KIT_SHADOW, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ width: 26, height: 26, borderRadius: 9, background: tint.bg, color: tint.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>}
        <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, minWidth: 0 }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 5 }}>
        <span style={{ fontSize: 23, fontWeight: 800, color: has ? DARK : '#C3D0CA', letterSpacing: '-0.7px', fontVariantNumeric: 'tabular-nums' }}>{has ? value : '—'}</span>
        {has && unit && <span style={{ fontSize: 11.5, color: MUTED, fontWeight: 600 }}>{unit}</span>}
      </div>
      {note && <div style={{ marginTop: 7, display: 'inline-flex', background: (noteColor || tint.c) + '18', color: noteColor || tint.c, borderRadius: 8, padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>{note}</div>}
    </div>
  );
}

/** Une ligne « intitulé → valeur », avec l'action qui va avec quand il y en a une. */
export function Field({ label, value, href, tint }) {
  const has = value && value !== '—';
  const body = has ? value : <span style={{ color: '#B7C2BD', fontWeight: 500 }}>Non renseigné</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F2F6F4', minWidth: 0 }}>
      <span style={{ minWidth: 118, fontSize: 12, color: MUTED, flexShrink: 0 }}>{label}</span>
      {has && href
        ? <a href={href} style={{ fontSize: 13.5, fontWeight: 700, color: tint.c, textDecoration: 'none', wordBreak: 'break-word' }}>{value}</a>
        : <span style={{ fontSize: 13.5, fontWeight: 700, color: DARK, wordBreak: 'break-word' }}>{body}</span>}
    </div>
  );
}

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

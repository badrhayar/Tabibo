import { WORDMARK_VIEWBOX, WORDMARK_RATIO, WORDMARK_TRANSFORM, WORDMARK_PATHS } from './wordmarkPath';
import { STETH_VIEWBOX, STETH_RATIO, STETH_TRANSFORM, STETH_PATH, stethPlacement } from './stethoscopePath';

// Tabibo brand mark — the single source of truth for the logo icon.
// Same form as the historical mark (rounded green square + white stethoscope)
// but vector-crisp at any size, optically centered, with the app's brand
// gradient. Used in every header/footer; the PWA PNG icons are generated
// from this exact drawing (scripts/render-icons.mjs) so all surfaces match.
// `plain` renders ONLY the white stethoscope (no tile) — for the deep-green
// surfaces (rails, headers, footer). The tile version is for white backgrounds
// and is the exact drawing the PWA icons are rendered from.
// "Tabibo" wordmark — le logotype fourni par le cabinet, tel quel.
// Le dessin vient de l'image d'origine (public/brand/logo-tabibo.png),
// vectorisée sans retouche : mêmes contours, mais net à toutes les tailles et
// colorable (blanc sur les fonds verts, vert profond sur les fonds clairs).
// Source unique : à utiliser partout où le nom de la marque est écrit.
export { WORDMARK_RATIO, STETH_RATIO };

// Pictogramme stéthoscope de la marque — recadré au plus juste (aucune marge
// morte), donc il remplit vraiment la taille demandée. `size` = hauteur en px.
export function Stethoscope({ size = 16, color = 'currentColor', style }) {
  return (
    <svg width={Math.round(size * STETH_RATIO)} height={size} viewBox={STETH_VIEWBOX} role="img" aria-label="Stéthoscope"
      style={{ display: 'block', flexShrink: 0, ...style }}>
      <g transform={STETH_TRANSFORM} fill={color} stroke="none"><path d={STETH_PATH} /></g>
    </svg>
  );
}

export function Wordmark({ size = 21, color = '#fff', style }) {
  const h = Math.round(size * 1.05);
  const w = Math.round(h * WORDMARK_RATIO);
  return (
    <svg width={w} height={h} viewBox={WORDMARK_VIEWBOX} role="img" aria-label="Tabibo" style={{ display: 'block', flexShrink: 0, ...style }}>
      <g transform={WORDMARK_TRANSFORM} fill={color} stroke="none">
        {WORDMARK_PATHS.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  );
}

export default function BrandMark({ size = 32, radius = 11.5, shadow = false, plain = false, style }) {
  // Sans tuile : le pictogramme seul, presque plein cadre (marges réduites au
  // strict nécessaire) — pour les rails et en-têtes vert profond.
  if (plain) return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block', flexShrink: 0, ...style }}>
      <g transform={stethPlacement(42)}>
        <g transform={STETH_TRANSFORM} fill="#fff" stroke="none"><path d={STETH_PATH} /></g>
      </g>
    </svg>
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, borderRadius: (radius / 48) * size, boxShadow: shadow ? '0 4px 12px -3px rgba(12,74,55,0.5)' : undefined, ...style }}
    >
      <defs>
        {/* Official brand background: the deep rail green. */}
        <linearGradient id="tbm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#115C46" />
          <stop offset="0.55" stopColor="#0C4A37" />
          <stop offset="1" stopColor="#093226" />
        </linearGradient>
        <linearGradient id="tbm-hl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx={radius} fill="url(#tbm-g)" />
      <rect width="48" height="48" rx={radius} fill="url(#tbm-hl)" />
      {/* Pictogramme centré dans la tuile — 34/48 de hauteur : la zone utile
          d'une icône d'application, sans marge inutile. */}
      <g transform={stethPlacement(34)}>
        <g transform={STETH_TRANSFORM} fill="#fff" stroke="none"><path d={STETH_PATH} /></g>
      </g>
    </svg>
  );
}

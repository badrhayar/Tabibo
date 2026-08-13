import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cleanMoroccoMap } from '../lib/mapClean';
import { reportHandledError } from '../lib/monitor.js';

const KEY = import.meta.env.VITE_MAPTILER_KEY;
// MapTiler when a key is set, else MapLibre's free demo style (no key needed).
const STYLE = KEY
  ? `https://api.maptiler.com/maps/019f0e8b-b600-725f-9c7c-1aa8b98c84eb/style.json?key=${KEY}`
  : 'https://demotiles.maplibre.org/style.json';
const MOROCCO_CENTER = [-7.5, 29.5];

// ── Pin: a thin metal needle with a glossy green head ─────────────────────────
// IMPORTANT: MapLibre sets `transform` on the marker's ROOT element to position
// it. So our hover/scale transforms live on an INNER element — otherwise they
// fight MapLibre's positioning and the pin lands in the wrong place.
const PIN_CSS = `
.tbpin-anchor{width:22px;height:34px}
.tbpin-zoom{width:22px;height:34px;transform-origin:50% 100%;will-change:transform;transition:transform .12s ease}
.tbpin{position:relative;width:22px;height:34px;cursor:pointer;transition:transform .15s ease;transform-origin:50% 100%;will-change:transform}
.tbpin:hover{transform:scale(1.2) translateY(-2px)}
.tbpin.sel{transform:scale(1.28) translateY(-3px)}
.tbpin .stem{position:absolute;left:50%;top:13px;width:3px;height:21px;transform:translateX(-50%);border-radius:2px;
  background:linear-gradient(90deg,#7f8a93 0%,#eef1f3 45%,#7f8a93 100%);box-shadow:0 1px 1px rgba(0,0,0,.25)}
.tbpin .head{position:absolute;left:50%;top:0;width:18px;height:18px;transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(circle at 34% 30%,#5ad6a0,#16A06A 55%,#0E7C52);
  box-shadow:0 3px 6px rgba(14,124,82,.45),inset 0 -1px 2px rgba(0,0,0,.18);
  animation:tbGlow 2s ease-in-out infinite}
/* Live "on/off" beacon: an expanding ring behind the head + a gentle glow breathe,
   so every pin reads as a live, active marker even when the map is zoomed out. */
.tbpin .head::before{content:'';position:absolute;left:50%;top:50%;width:18px;height:18px;
  transform:translate(-50%,-50%);border-radius:50%;background:rgba(22,160,106,.5);z-index:-1;
  animation:tbPulse 2s ease-out infinite}
.tbpin .head::after{content:'';position:absolute;left:4px;top:3px;width:6px;height:5px;border-radius:50%;background:rgba(255,255,255,.6);z-index:1}
.tbpin.sel .head{box-shadow:0 0 0 4px rgba(22,160,106,.25),0 4px 8px rgba(14,124,82,.5);animation:none}
.tbpin.sel .head::before{animation-duration:1.4s;background:rgba(22,160,106,.6)}
@keyframes tbPulse{0%{transform:translate(-50%,-50%) scale(1);opacity:.65}70%{transform:translate(-50%,-50%) scale(2.8);opacity:0}100%{transform:translate(-50%,-50%) scale(2.8);opacity:0}}
@keyframes tbGlow{0%,100%{box-shadow:0 3px 6px rgba(14,124,82,.45),inset 0 -1px 2px rgba(0,0,0,.18),0 0 0 0 rgba(22,160,106,0)}50%{box-shadow:0 3px 10px rgba(14,124,82,.6),inset 0 -1px 2px rgba(0,0,0,.18),0 0 12px 2px rgba(90,214,160,.55)}}
@media (prefers-reduced-motion:reduce){.tbpin .head,.tbpin .head::before{animation:none}}
`;
function injectCss() {
  if (typeof document === 'undefined' || document.getElementById('tbpin-css')) return;
  const s = document.createElement('style');
  s.id = 'tbpin-css';
  s.textContent = PIN_CSS;
  document.head.appendChild(s);
}
// Pins are small when the map is zoomed out (so they don't blanket the map)
// and grow to full size as the visitor zooms in. 0.5× at z≤5.5 → 1.0× at z≥12.
function zoomScale(z) {
  const t = (z - 5.5) / (12 - 5.5);
  return Math.max(0.5, Math.min(1, 0.5 + t * 0.5));
}
function makePinEl(selected) {
  const root = document.createElement('div');     // MapLibre positions this (no CSS transform here)
  root.className = 'tbpin-anchor';
  const zoom = document.createElement('div');     // zoom-driven scale lives here
  zoom.className = 'tbpin-zoom';
  const inner = document.createElement('div');    // our hover/scale transforms live here
  inner.className = 'tbpin' + (selected ? ' sel' : '');
  inner.innerHTML = '<div class="stem"></div><div class="head"></div>';
  zoom.appendChild(inner);
  root.appendChild(zoom);
  return root;
}

export default function NearbyMap({ doctors = [], onSelect, selectedId }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());   // id -> maplibregl.Marker
  const onSelectRef = useRef(onSelect);
  const lastSigRef = useRef('');
  // Une carte qui échoue rendait un rectangle crème muet : le style se charge,
  // les tuiles non (clé absente, restreinte au mauvais domaine, quota dépassé).
  // Rien à l'écran, rien dans le journal — impossible à diagnostiquer à distance.
  const [mapErr, setMapErr] = useState('');
  onSelectRef.current = onSelect;
  injectCss();

  // Scale every pin to match the current zoom level (small when zoomed out).
  const applyPinZoom = (map) => {
    const s = zoomScale(map.getZoom());
    markersRef.current.forEach((m) => {
      const z = m.getElement()?.querySelector('.tbpin-zoom');
      if (z) z.style.transform = `scale(${s})`;
    });
  };

  // Create the map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    let map;
    try {
      map = new maplibregl.Map({
        container: elRef.current,
        style: STYLE,
        center: MOROCCO_CENTER,
        zoom: 4.6,
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.warn('NearbyMap: init failed', err);
      return;
    }
    mapRef.current = map;
    map.on('error', (e) => {
      const err = e?.error || e;
      const msg = String(err?.message || err || '');
      console.warn('NearbyMap:', msg);
      // 401/403 = clé absente, invalide ou restreinte à un autre domaine.
      if (/401|403|Unauthorized|Forbidden/i.test(msg)) {
        setMapErr(KEY ? 'cle' : 'absente');
      } else if (/style|Failed to fetch/i.test(msg)) {
        setMapErr('reseau');
      }
      reportHandledError('carte', err);
    });
    // A 0-size container at init is the usual cause of a blank map (style loads
    // but no tiles are ever requested). Force a resize on load and whenever the
    // container changes size.
    map.on('load', () => { cleanMoroccoMap(map); try { map.resize(); } catch (e) { /* ignore */ } });
    map.on('styledata', () => cleanMoroccoMap(map));
    map.on('zoom', () => applyPinZoom(map));
    let ro;
    try {
      ro = new ResizeObserver(() => { try { map.resize(); } catch (e) { /* ignore */ } });
      ro.observe(elRef.current);
    } catch (e) { /* ResizeObserver unavailable */ }
    const resizeT = setTimeout(() => { try { map.resize(); } catch (e) { /* ignore */ } }, 400);
    const canvas = map.getCanvas();
    const onCtxLost = (ev) => { ev.preventDefault(); };
    canvas.addEventListener('webglcontextlost', onCtxLost, false);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true }), 'top-right');

    return () => {
      clearTimeout(resizeT);
      try { ro && ro.disconnect(); } catch (e) { /* ignore */ }
      canvas.removeEventListener('webglcontextlost', onCtxLost);
      markersRef.current.forEach((m) => { try { m.remove(); } catch (e) { /* ignore */ } });
      markersRef.current.clear();
      try { map.remove(); } catch (e) { /* ignore */ }
      mapRef.current = null;
    };
  }, []);

  // (Re)build the HTML markers whenever the doctor list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const render = () => {
      const valid = (doctors || []).filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number');
      const seen = new Set();
      valid.forEach((d) => {
        const id = String(d.id);
        seen.add(id);
        let m = markersRef.current.get(id);
        if (!m) {
          const el = makePinEl(String(selectedId) === id);
          el.addEventListener('click', (ev) => { ev.stopPropagation(); onSelectRef.current?.(id); });
          // anchor 'bottom' → the needle TIP sits exactly on the coordinate.
          m = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([d.lng, d.lat]).addTo(map);
          markersRef.current.set(id, m);
        } else {
          m.setLngLat([d.lng, d.lat]);
        }
      });
      for (const [id, m] of markersRef.current) {
        if (!seen.has(id)) { try { m.remove(); } catch (e) { /* ignore */ } markersRef.current.delete(id); }
      }
      applyPinZoom(map);
      const sig = signature(doctors);
      if (sig !== lastSigRef.current) { lastSigRef.current = sig; fitTo(map, doctors); }
    };
    if (map.loaded()) render(); else map.once('load', render);
  }, [doctors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle the "selected" highlight without rebuilding markers.
  useEffect(() => {
    for (const [id, m] of markersRef.current) {
      const inner = m.getElement()?.querySelector('.tbpin');
      if (inner) inner.classList.toggle('sel', String(selectedId) === id);
    }
  }, [selectedId]);

  const ERR_TEXT = {
    absente: 'Carte indisponible — la clé MapTiler n’est pas configurée (VITE_MAPTILER_KEY).',
    cle: 'Carte indisponible — la clé MapTiler est refusée (invalide, expirée, ou restreinte à un autre domaine).',
    reseau: 'Carte indisponible — le fond de carte n’a pas pu être chargé.',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={elRef} style={{ width: '100%', height: '100%' }} />
      {mapErr && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(255,255,255,0.92)', textAlign: 'center' }}>
          <div style={{ maxWidth: 340 }}>
            <div style={{ color: '#B4374F', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#15314A', lineHeight: 1.55 }}>{ERR_TEXT[mapErr]}</div>
            <div style={{ fontSize: 12.5, color: '#6B7B76', marginTop: 8, lineHeight: 1.55 }}>
              La liste des médecins ci-contre reste utilisable normalement.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stable key for the current set of doctor positions (decides camera re-fit).
function signature(doctors) {
  return (doctors || [])
    .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map((d) => `${d.id}:${d.lat.toFixed(4)},${d.lng.toFixed(4)}`)
    .sort()
    .join('|');
}

function fitTo(map, doctors) {
  const pts = (doctors || []).filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number');
  if (!pts.length) return;
  const b = new maplibregl.LngLatBounds();
  pts.forEach((d) => b.extend([d.lng, d.lat]));
  try { map.fitBounds(b, { padding: 70, maxZoom: 13.5, duration: 600 }); } catch (e) { /* ignore */ }
}

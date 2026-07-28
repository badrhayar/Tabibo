import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { docDisplayName, BTN_GREEN } from '../../shared.jsx';

const G = '#16A06A';
const DARK = '#15314A';
const BG = '#F5F9F7';
const BORDER = '#E8EFEB';
const MUT = '#6B7B76';

export default function BookingShare() {
  const { state, setState } = useApp();
  const doctorId = state.myDoctor?.id;
  const slug = state.myDoctor?.slug;
  const rawDocName = state.myDoctor?.name || state.appUser?.full_name || '';
  const docSpec = state.myDoctor?.specialty || state.myDoctor?.spec;
  const docName = docDisplayName(rawDocName, docSpec) || 'votre médecin';
  // Always the PUBLIC production domain (not the Vercel preview), so the shared
  // link + QR point to tabibo.ma/dr-… wherever the doctor generated them.
  const PUBLIC_BASE = (import.meta.env.VITE_APP_URL || 'https://tabibo.ma').replace(/\/$/, '');
  // En démonstration (compte pas encore activé) on prévisualise la page avec un
  // lien d'exemple, pour que le médecin voie exactement ce qu'il aura.
  const preview = !doctorId;
  const link = slug ? `${PUBLIC_BASE}/${slug}`
    : (doctorId ? `${PUBLIC_BASE}/?doc=${doctorId}` : `${PUBLIC_BASE}/dr-exemple-cabinet`);
  const prettyLink = 'www.' + link.replace(/^https?:\/\//, '').replace(/^www\./, '');

  // Visiting this page = the "Invitez vos patients" onboarding step is done —
  // however the doctor got here (checklist card, sidebar, deep link). Marking it
  // only on the checklist click made the step reappear on every login.
  useEffect(() => {
    if (doctorId) { try { localStorage.setItem(`tabibo_ob_shared_${doctorId}`, '1'); } catch (_) { /* ignore */ } }
  }, [doctorId]);

  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 520, margin: 1, color: { dark: '#15314A', light: '#ffffff' } })
      .then(setQr).catch(() => {});
  }, [link]);

  const toast = (msg) => setState({ toast: msg, toastShow: true });
  // Escape anything interpolated into the poster HTML (defense-in-depth).
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const previewToast = () => toast("Aperçu de démonstration — actif dès l'activation de votre compte.");
  const copy = async () => {
    if (!doctorId) { previewToast(); return; }
    try { await navigator.clipboard.writeText(link); toast('Lien copié ✓'); }
    catch { toast('Copie impossible — sélectionnez le lien manuellement.'); }
  };
  const waText = encodeURIComponent(`Bonjour, vous pouvez désormais réserver votre rendez-vous chez ${docName} en ligne : ${link}`);
  const printPoster = () => {
    if (!qr) return;
    const w = window.open('', '_blank');
    if (!w) { toast('Autorisez les pop-ups pour imprimer l’affiche.'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Affiche Tabibo</title>
      <style>@page{margin:0} html,body{height:100%} body{margin:0}</style></head>
      <body style="font-family:'Segoe UI',Arial,sans-serif;color:#15314A">
        <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;box-sizing:border-box">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <svg width="54" height="54" viewBox="0 0 48 48" aria-label="Tabibo"><defs><linearGradient id="tbm-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#115C46"/><stop offset="0.55" stop-color="#0C4A37"/><stop offset="1" stop-color="#093226"/></linearGradient></defs><rect width="48" height="48" rx="11.5" fill="url(#tbm-g)"/><g transform="translate(-7.593 -7.021) scale(0.06018)"><g transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)" fill="#fff"><path d="M3490 7900 c-19 -5 -73 -19 -120 -31 -116 -29 -204 -65 -272 -112 -59 -41 -129 -121 -147 -170 -15 -39 -15 -1955 0 -2064 46 -345 219 -631 499 -828 148 -105 279 -160 470 -198 l65 -13 6 -409 c6 -436 9 -467 65 -670 54 -198 160 -418 269 -560 80 -104 256 -270 359 -339 174 -115 382 -196 600 -232 134 -22 391 -15 521 15 178 42 294 88 460 184 292 169 529 464 648 807 94 271 123 517 113 950 l-7 275 88 33 c142 53 238 130 330 265 241 350 115 835 -266 1030 -121 62 -211 81 -359 75 -92 -4 -133 -10 -190 -31 -250 -88 -430 -292 -481 -545 -16 -77 -13 -226 5 -301 55 -226 226 -420 439 -496 44 -15 84 -31 88 -35 4 -4 3 -182 -2 -396 -11 -411 -19 -484 -72 -658 -58 -189 -196 -409 -330 -529 -118 -106 -290 -207 -424 -250 -210 -67 -484 -67 -685 0 -396 133 -688 469 -779 897 -34 161 -42 293 -39 616 l3 305 40 8 c221 47 379 115 533 231 221 167 371 396 441 673 34 131 39 309 37 1268 l-2 900 -22 46 c-55 113 -199 209 -365 243 -42 8 -90 22 -106 31 -42 21 -157 30 -210 15 -110 -29 -166 -105 -159 -215 5 -78 35 -122 110 -159 59 -29 110 -33 229 -15 73 12 78 11 120 -12 l44 -24 0 -965 c0 -1081 4 -1019 -74 -1185 -102 -219 -307 -395 -532 -459 -210 -59 -497 -36 -673 55 -193 99 -351 280 -415 477 -44 137 -47 212 -47 1171 l1 904 28 21 c25 18 39 20 105 17 231 -13 274 -4 336 73 29 35 31 44 31 115 0 69 -3 81 -28 114 -41 54 -100 84 -177 90 -36 3 -81 2 -100 -3z m3507 -2375 c65 -30 142 -105 180 -176 25 -49 28 -64 28 -149 -1 -82 -4 -102 -27 -150 -15 -30 -49 -77 -75 -104 -168 -171 -428 -142 -567 63 -47 70 -59 119 -54 216 4 59 11 92 29 125 49 91 155 174 256 200 59 15 170 3 230 -25z"/></g></g></svg>
            <svg width="168" height="47" viewBox="301 197 980 274" role="img" aria-label="Tabibo"><g transform="translate(0.000000,672.000000) scale(0.100000,-0.100000)" fill="#0C4A37" stroke="none"><path d="M7120 4733 c-19 -8 -43 -22 -54 -31 -22 -20 -68 -109 -71 -137 -2 -11 -10 -49 -19 -85 -8 -36 -20 -90 -25 -120 -21 -122 -39 -209 -45 -219 -4 -5 -15 -68 -26 -138 -11 -70 -31 -198 -45 -283 -14 -85 -30 -195 -36 -245 -5 -49 -15 -105 -20 -123 -6 -18 -15 -88 -19 -157 -5 -68 -14 -154 -21 -191 -15 -88 -6 -454 14 -544 20 -87 50 -164 84 -213 15 -22 34 -49 42 -61 29 -45 117 -103 203 -135 86 -32 90 -32 225 -28 147 5 213 14 213 28 0 5 9 9 20 9 25 0 90 35 112 61 9 10 23 19 31 19 27 0 187 160 214 214 14 28 33 60 43 71 10 11 23 37 30 58 6 20 16 37 21 37 5 0 9 9 9 19 0 11 9 40 20 66 11 26 20 60 20 75 0 16 5 32 10 35 6 3 10 16 10 27 0 46 23 86 51 92 16 3 38 15 49 26 16 16 33 20 92 20 39 0 68 3 65 7 -8 7 38 33 60 33 7 0 23 9 35 20 12 11 28 20 35 20 7 0 13 4 13 9 0 5 14 14 30 21 17 7 30 16 30 21 0 5 9 9 20 9 16 0 19 -5 15 -27 -2 -16 -9 -59 -16 -98 -6 -38 -15 -108 -20 -155 -5 -47 -15 -132 -23 -190 -20 -162 -15 -304 13 -365 24 -54 71 -109 112 -130 14 -8 67 -17 117 -21 82 -6 98 -4 174 21 57 18 99 40 133 68 28 23 52 45 53 49 2 5 10 8 17 8 12 0 29 18 116 124 56 68 67 86 89 147 24 65 26 129 4 170 -15 29 -16 30 -30 12 -14 -17 -15 -17 -9 4 5 18 1 25 -20 33 -31 12 -56 2 -32 -12 15 -8 14 -12 -6 -34 l-22 -26 -6 24 c-6 23 -6 23 -14 -4 -4 -16 -11 -28 -15 -28 -15 0 -61 -54 -56 -67 3 -7 1 -13 -4 -13 -6 0 -40 -32 -77 -71 -71 -75 -98 -93 -154 -104 -32 -6 -39 -3 -58 20 -16 22 -21 41 -21 90 0 78 27 329 40 370 5 17 12 64 15 105 4 41 10 86 15 100 33 102 75 353 75 449 0 71 -1 74 -35 102 -38 32 -80 37 -156 18 -56 -15 -97 -60 -118 -133 -9 -31 -21 -56 -26 -56 -6 0 -10 -6 -10 -12 0 -15 -44 -62 -90 -98 -18 -14 -47 -40 -64 -57 -17 -18 -35 -33 -41 -33 -13 0 -112 -70 -99 -70 10 -1 -52 -30 -76 -35 -8 -2 -28 -8 -45 -13 -16 -5 -47 -7 -67 -4 l-37 4 -11 72 c-33 217 -100 326 -242 401 -69 36 -79 39 -179 43 -72 3 -109 1 -113 -7 -4 -6 -18 -11 -32 -11 -30 0 -110 -39 -152 -74 -16 -15 -39 -26 -51 -26 -12 0 -21 -5 -21 -11 0 -7 -6 -17 -14 -23 -22 -18 -126 -145 -126 -154 0 -9 -42 -52 -51 -52 -7 0 9 202 17 220 4 8 11 41 16 73 8 55 16 106 37 227 5 30 16 84 24 120 8 36 20 92 25 125 6 33 18 89 27 125 9 36 20 81 24 101 4 19 10 40 14 46 3 5 9 25 12 43 3 19 13 48 21 66 11 22 16 70 17 159 l2 126 -35 30 c-19 17 -40 34 -47 39 -18 14 -83 11 -123 -7z m507 -1447 c42 -22 83 -71 83 -99 0 -13 -9 -32 -20 -42 -36 -33 -53 -81 -46 -132 7 -54 59 -131 100 -152 26 -12 28 -16 22 -55 -21 -129 -125 -328 -216 -410 -79 -71 -201 -106 -291 -84 -57 15 -132 91 -158 162 -29 78 -51 248 -40 306 16 89 26 126 42 157 9 18 17 39 17 48 0 8 3 15 8 15 4 0 18 20 31 45 27 50 160 195 181 195 7 0 20 8 29 18 42 48 190 64 258 28z"/><path d="M9816 4733 c-80 -43 -121 -129 -156 -328 -5 -27 -16 -86 -25 -130 -8 -44 -21 -116 -29 -160 -8 -44 -19 -102 -25 -130 -7 -27 -12 -57 -12 -65 0 -8 -5 -37 -9 -65 -30 -167 -40 -228 -46 -295 -3 -41 -10 -77 -13 -80 -9 -6 -35 -216 -55 -440 -23 -248 -18 -472 12 -606 25 -112 130 -272 217 -329 94 -63 252 -101 371 -91 76 7 201 39 218 56 5 5 20 10 33 10 13 0 23 4 23 9 0 5 14 14 30 21 17 7 30 16 30 20 0 4 14 13 31 20 69 29 174 155 254 305 44 82 54 111 72 198 3 15 9 27 13 27 4 0 11 32 15 70 4 39 11 73 16 76 5 3 9 36 9 75 l0 69 85 0 85 0 0 -45 c0 -38 3 -45 20 -45 11 0 20 7 20 15 0 8 8 15 19 15 20 0 31 -26 31 -77 0 -31 2 -33 35 -33 34 0 35 -1 35 -40 0 -38 -1 -40 -32 -40 -60 0 -62 -5 -54 -142 3 -69 12 -136 20 -153 8 -16 27 -59 42 -94 30 -66 88 -148 133 -187 30 -26 171 -98 222 -113 67 -21 349 -3 349 21 0 4 8 8 19 8 22 0 114 46 161 80 102 75 260 274 260 328 0 8 10 30 22 50 25 40 34 80 53 217 7 55 14 101 14 102 1 0 25 6 54 13 73 17 117 32 152 52 17 10 38 18 48 18 9 0 17 3 17 8 0 4 20 17 43 30 65 35 147 121 157 168 15 63 12 91 -16 123 -32 39 -81 42 -116 9 -42 -40 -91 -78 -120 -90 -15 -7 -28 -16 -28 -20 0 -5 -9 -8 -19 -8 -11 0 -22 -4 -25 -9 -3 -5 -16 -11 -28 -14 -77 -19 -115 -28 -130 -33 -13 -4 -20 5 -28 37 -16 58 -71 179 -81 179 -5 0 -9 6 -9 14 0 16 -74 85 -118 108 -23 12 -32 24 -32 42 0 38 -44 81 -113 110 -59 25 -71 27 -182 24 -97 -3 -131 -8 -175 -27 -30 -12 -64 -25 -75 -28 -11 -4 -36 -18 -55 -33 -19 -15 -50 -35 -68 -44 -47 -24 -87 -62 -140 -131 -25 -33 -51 -63 -57 -67 -10 -6 -32 -23 -89 -68 -39 -31 -64 -47 -96 -61 -14 -6 -32 -15 -40 -20 -42 -26 -89 -41 -130 -43 l-45 -1 -6 70 c-14 150 -64 261 -158 352 -36 34 -73 63 -82 63 -8 0 -19 4 -25 9 -14 14 -59 22 -150 26 -68 3 -93 -1 -160 -25 -115 -40 -116 -41 -146 -71 -15 -16 -40 -35 -56 -43 -16 -8 -69 -57 -117 -108 l-88 -93 7 95 c8 113 34 303 47 346 5 17 9 47 9 67 0 20 4 37 9 37 4 0 11 24 14 53 4 29 16 88 28 132 12 44 25 97 30 118 5 20 13 54 19 75 12 50 27 109 39 157 5 22 14 58 20 80 18 72 24 199 11 239 -17 54 -79 96 -139 96 -25 -1 -59 -8 -75 -17z m1962 -1435 c7 -9 6 -25 -3 -52 -10 -29 -11 -53 -4 -99 11 -66 63 -176 88 -185 9 -3 31 -23 49 -44 19 -21 41 -38 51 -38 9 0 26 -6 37 -14 20 -14 20 -18 8 -88 -22 -122 -30 -149 -72 -239 -46 -97 -76 -132 -164 -186 -59 -36 -65 -38 -144 -37 -75 0 -87 3 -125 30 -50 34 -94 91 -109 142 -6 20 -15 46 -20 57 -24 57 -13 355 14 400 7 11 15 31 19 45 26 120 125 243 237 297 50 24 122 30 138 11z m-1450 -18 c51 -27 65 -40 88 -78 19 -34 19 -34 -2 -51 -60 -49 -72 -151 -26 -225 15 -25 42 -51 61 -60 30 -15 33 -20 28 -49 -19 -116 -78 -248 -153 -347 -61 -81 -86 -103 -149 -135 -82 -41 -213 -35 -262 12 -7 6 -16 13 -20 15 -19 8 -73 88 -88 129 -35 94 -37 115 -33 249 5 129 7 138 40 205 19 39 46 89 61 112 15 24 27 47 27 53 0 5 4 10 8 10 4 0 35 27 67 60 33 33 65 60 70 60 6 0 16 9 23 20 9 15 23 20 52 20 22 0 40 5 40 10 0 19 128 12 168 -10z m552 -230 c0 -6 -27 -10 -62 -9 -45 0 -57 3 -43 9 28 12 105 12 105 0z"/><path d="M4945 4709 c-99 -5 -261 -15 -360 -23 -98 -8 -183 -12 -187 -10 -4 3 -16 1 -25 -5 -10 -5 -72 -12 -138 -15 -133 -7 -275 -19 -405 -35 -47 -5 -134 -12 -194 -16 -59 -3 -116 -9 -125 -14 -9 -5 -83 -14 -165 -21 -151 -12 -187 -22 -258 -66 -53 -34 -81 -99 -75 -173 6 -75 35 -101 115 -101 31 0 73 5 92 10 51 15 194 41 280 50 41 5 143 18 225 29 83 12 167 21 189 21 38 0 38 0 33 -32 -3 -18 -15 -107 -27 -198 -12 -91 -26 -181 -30 -200 -5 -19 -14 -78 -21 -130 -6 -52 -16 -103 -20 -112 -5 -9 -16 -77 -24 -150 -8 -73 -19 -155 -24 -183 -11 -58 -26 -149 -41 -255 -6 -41 -16 -103 -21 -137 -30 -172 -67 -495 -75 -648 -5 -117 -4 -135 14 -176 11 -25 33 -56 48 -69 26 -20 37 -22 109 -17 92 5 148 29 183 81 20 30 22 44 22 172 0 76 7 209 15 294 9 85 20 205 25 265 12 147 88 752 100 790 8 28 14 63 40 245 6 41 17 120 25 175 8 55 19 116 24 135 6 19 13 65 16 102 4 37 12 71 18 77 31 25 614 40 818 21 98 -9 111 -8 150 9 59 27 72 38 97 92 43 88 21 171 -54 208 -49 23 -61 24 -369 10z"/><path d="M8880 4407 c-37 -17 -105 -70 -134 -104 -49 -59 -62 -200 -24 -262 29 -45 68 -80 91 -81 10 0 26 -4 35 -9 28 -14 161 7 196 32 52 36 76 65 101 120 34 71 33 136 -2 205 -23 46 -36 58 -85 83 -62 31 -131 38 -178 16z"/><path d="M5600 3576 c-77 -26 -252 -123 -324 -180 -51 -40 -119 -110 -197 -203 -46 -53 -151 -254 -189 -358 -40 -110 -51 -178 -57 -346 l-5 -165 32 -75 c37 -85 93 -150 162 -185 42 -21 60 -24 162 -24 98 0 121 3 148 20 18 11 40 20 48 20 8 0 26 9 40 20 14 11 32 20 40 20 8 0 29 13 45 30 17 16 71 69 121 118 50 49 97 103 105 121 8 17 17 31 21 31 5 0 8 6 8 14 0 7 11 21 24 30 l24 15 5 -67 c10 -163 77 -290 180 -343 56 -29 185 -37 232 -15 20 10 47 20 60 22 28 5 101 52 129 83 10 11 22 18 26 16 4 -3 28 21 54 53 25 31 50 62 56 69 5 7 10 16 10 21 0 5 7 16 17 23 9 8 29 41 45 74 22 48 28 74 28 129 0 66 -1 70 -39 107 -37 37 -61 49 -61 31 0 -5 -15 -26 -32 -47 -18 -21 -40 -48 -48 -60 -8 -12 -28 -42 -44 -65 -36 -55 -109 -123 -162 -151 -37 -20 -44 -21 -74 -9 -25 10 -39 27 -58 68 -25 54 -25 58 -18 226 3 94 13 216 21 271 26 180 35 239 45 275 5 19 14 69 20 110 6 41 15 92 20 113 10 48 -20 112 -69 144 -62 42 -175 28 -218 -27 -9 -12 -17 -8 -52 28 l-41 42 -87 -1 c-63 0 -107 -7 -153 -23z m100 -266 c8 6 49 10 91 10 93 0 104 -9 90 -71 -11 -46 -25 -117 -42 -206 -11 -63 -106 -317 -119 -321 -6 -2 -10 -10 -10 -17 0 -30 -91 -154 -185 -250 -101 -104 -142 -128 -223 -131 -38 -2 -72 2 -80 8 -7 7 -25 34 -39 62 -24 47 -25 57 -21 170 4 113 7 127 41 206 20 47 37 91 37 97 0 6 3 13 8 15 4 2 22 32 41 68 19 36 53 87 75 115 51 61 167 175 179 175 5 0 20 9 34 20 14 11 34 20 44 20 11 0 19 5 19 10 0 6 7 10 15 10 8 0 15 6 15 13 0 9 2 9 8 0 5 -8 13 -9 22 -3z"/></g></svg>
          </div>
          <div style="font-size:34px;font-weight:800;margin:16px 0 30px">${esc(docName)}</div>
          <h1 style="font-size:34px;line-height:1.2;margin:0 0 12px">Réservez votre rendez-vous en ligne</h1>
          <p style="font-size:18px;color:#6B7B76;margin:0 0 28px">Scannez ce QR code avec l'appareil photo de votre téléphone</p>
          <img src="${qr}" style="width:300px;height:300px"/>
          <p style="font-size:20px;font-weight:800;color:${G};margin:26px 0 0">${esc(prettyLink)}</p>
          <p style="font-size:15px;color:#6B7B76;margin-top:26px">Plus d'attente au téléphone — choisissez votre créneau en quelques secondes.</p>
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
      </body></html>`);
    w.document.close();
  };

  const card = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 22 };
  const btn = (bg, color, border) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: bg, color, border: border || 'none', textDecoration: 'none' });


  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: DARK, margin: '0 0 4px' }}>Invitez vos patients à réserver en ligne</h1>
      {preview && (
        <div style={{ background: '#FEF6E7', border: '1px solid #F0DCAE', borderRadius: 14, padding: '13px 17px', fontSize: 13.5, lineHeight: 1.6, color: '#7A5A10', display: 'flex', gap: 11, margin: '12px 0 18px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.1"/></svg>
          <span><strong>Aperçu de démonstration.</strong> Le lien et le QR code ci-dessous sont des exemples. À l'activation de votre compte, ils sont remplacés par votre adresse réelle — de la forme <em>tabibo.ma/dr-votre-nom</em> — et toutes les commandes deviennent actives.</span>
        </div>
      )}
      <p style={{ fontSize: 14, color: MUT, margin: '0 0 22px', lineHeight: 1.6 }}>
        Partagez votre lien ou votre QR code avec vos patients actuels. Ils réservent en quelques
        secondes — vous réduisez les appels et remplissez votre agenda automatiquement.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {/* Link + actions */}
        <div style={card}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#9AA8A2', marginBottom: 10 }}>Votre lien de réservation</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <input readOnly value={link} onFocus={(e) => e.target.select()} style={{ flex: '1 1 280px', minWidth: 0, padding: '11px 13px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13.5, background: BG, color: DARK, direction: 'ltr' }} />
            <button onClick={copy} style={btn(BTN_GREEN, '#fff')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              Copier
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={preview ? undefined : `https://wa.me/?text=${waText}`} onClick={(e) => { if (preview) { e.preventDefault(); previewToast(); } }} target="_blank" rel="noreferrer" style={btn(BTN_GREEN, '#fff')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-3.3-1-5.4-4.4-5.6-4.6-.2-.2-1.4-1.8-1.4-3.5s.9-2.5 1.2-2.8c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l.9 2c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2 1.3 2.3 1.5.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.4z"/></svg>
              Partager sur WhatsApp
            </a>
            <a href={preview ? undefined : (qr || '#')} onClick={(e) => { if (preview) { e.preventDefault(); previewToast(); } }} download={`tabibo-qr-${doctorId || 'exemple'}.png`} style={btn(BG, DARK, `1px solid ${BORDER}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Télécharger le QR
            </a>
            <button onClick={() => (preview ? previewToast() : printPoster())} style={btn(BG, DARK, `1px solid ${BORDER}`)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
              Imprimer l'affiche
            </button>
          </div>
        </div>

        {/* QR preview */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <div style={{ width: 168, height: 168, borderRadius: 14, border: `1px solid ${BORDER}`, padding: 10, background: '#fff', flexShrink: 0 }}>
            {qr ? <img src={qr} alt="QR code de réservation" style={{ width: '100%', height: '100%' }} /> : <div style={{ width: '100%', height: '100%', background: BG, borderRadius: 8 }} />}
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 6 }}>Affichez ce QR au cabinet</div>
            <p style={{ fontSize: 13.5, color: MUT, lineHeight: 1.6, margin: 0 }}>
              Imprimez l'affiche et posez-la à l'accueil ou en salle d'attente. Vos patients scannent
              avec leur téléphone et réservent leur prochain rendez-vous sans passer par le secrétariat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { docDisplayName } from '../../shared.jsx';

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
            <svg width="54" height="54" viewBox="0 0 48 48" aria-label="Tabibo">
              <defs><linearGradient id="tbm-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#115C46"/><stop offset="0.55" stop-color="#0C4A37"/><stop offset="1" stop-color="#093226"/></linearGradient></defs>
              <rect width="48" height="48" rx="11.5" fill="url(#tbm-g)"/>
              <g transform="translate(3.84 8.81) scale(1.44)" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3v-.5a1.4 1.4 0 0 1 1.4-1.4h.4"/><path d="M14 3v-.5a1.4 1.4 0 0 0-1.4-1.4h-.4"/><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/>
              </g>
            </svg>
            <svg width="112" height="49" viewBox="0 0 92 40" role="img" aria-label="Tabibo">
              <g transform="translate(1.2 0) skewX(-6)" fill="none" stroke="#0C4A37" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3.4 12.4 Q2.6 8.4 7.6 8 Q13.2 7.6 19 8.9"/><path d="M11.3 8.4 Q10.7 17 10.9 25.6 Q11 31.2 16.5 30.7"/>
                <circle cx="27.5" cy="25.4" r="5.6"/><path d="M33.1 19.8 V31"/><path d="M38.3 9 V31"/><circle cx="43.9" cy="25.4" r="5.6"/>
                <path d="M54.7 19.8 V31"/><ellipse cx="54.9" cy="14" rx="2" ry="1.5" fill="#0C4A37" stroke="none" transform="rotate(-14 54.9 14)"/>
                <path d="M59.9 9 V31"/><circle cx="65.5" cy="25.4" r="5.6"/><circle cx="81.9" cy="25.4" r="5.6"/>
              </g>
            </svg>
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
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#9AA8A2', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Votre lien de réservation</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <input readOnly value={link} onFocus={(e) => e.target.select()} style={{ flex: '1 1 280px', minWidth: 0, padding: '11px 13px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13.5, background: BG, color: DARK, direction: 'ltr' }} />
            <button onClick={copy} style={btn(G, '#fff')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              Copier
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={preview ? undefined : `https://wa.me/?text=${waText}`} onClick={(e) => { if (preview) { e.preventDefault(); previewToast(); } }} target="_blank" rel="noreferrer" style={btn('#16A06A', '#fff')}>
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

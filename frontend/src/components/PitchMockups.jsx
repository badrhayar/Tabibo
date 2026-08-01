// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · Vignettes illustrées de la page « Pour les médecins »
//
//   Ces visuels sont des RECONSTRUCTIONS, pas des captures : ils redessinent en
//   SVG/CSS des écrans réels de l'application. Deux raisons de ne pas
//   photographier l'écran ici :
//
//     · certains états ne se capturent pas proprement (un appel vidéo en cours,
//       un WhatsApp reçu sur le téléphone du patient) ;
//     · une capture d'appel vidéo montrerait des visages. Les portraits sont
//       donc dessinés — aucune personne réelle, aucune photo de banque d'images.
//
//   Règle de fidélité : ce qui est dessiné doit exister dans l'application. Les
//   libellés, les états de créneau, les rubriques du profil et les colonnes du
//   réseau sont ceux du produit. Le jour où un écran change, cette vignette
//   ment — c'est le prix de la reconstruction, et il est assumé ici parce que
//   l'alternative (photographier des visages) est pire.
//
//   Aucune image binaire : tout est vectoriel, net à toute résolution, et la
//   page ne charge rien de plus.
// ─────────────────────────────────────────────────────────────────────────────
import { Fragment } from 'react';

const DARK   = '#15314A';
const BODY   = '#3A4A45';
const MUTED  = '#6B7B76';
const GREEN  = '#0E7C52';
const LIGHT  = '#E9F6EF';
// Liseré des cartes de repères : le contour reprenait la teinte du fond,
// donc invisible sur blanc. Un vert franc redonne un bord net à la carte.
const CARD_EDGE = '#8CCCAE';

const tr = (lang, fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

/* Les animations sont discrètes et respectent `prefers-reduced-motion` : une
   page de présentation ne doit pas bouger dans le dos de qui a demandé le
   calme. */
const KEYFRAMES = `
@keyframes tbPulse   { 0%,100% { opacity:.35; transform:scale(1) }   50% { opacity:.9; transform:scale(1.35) } }
@keyframes tbBreathe { 0%,100% { transform:translateY(0) }            50% { transform:translateY(-1.6px) } }
@keyframes tbWave    { 0%,100% { transform:scaleY(.35) }              50% { transform:scaleY(1) } }
@keyframes tbBlink   { 0%,92%,100% { transform:scaleY(1) }            96% { transform:scaleY(.1) } }
@keyframes tbSlide   { 0% { opacity:0; transform:translateY(6px) }    100% { opacity:1; transform:translateY(0) } }
@keyframes tbSweep   { 0% { transform:translateX(-120%) }             100% { transform:translateX(320%) } }
@keyframes tbHalo    { 0%,100% { opacity:.30; transform:scale(1) }    50% { opacity:.55; transform:scale(1.06) } }
@keyframes tbPop     { 0% { transform:scale(.86); opacity:0 }  60% { transform:scale(1.05) }  100% { transform:scale(1); opacity:1 } }
@keyframes tbDrift   { 0%,100% { transform:translateY(0) }            50% { transform:translateY(-7px) } }
@keyframes tbRing    { 0% { box-shadow:0 0 0 0 rgba(46,204,113,.55) } 70% { box-shadow:0 0 0 12px rgba(46,204,113,0) } 100% { box-shadow:0 0 0 0 rgba(46,204,113,0) } }
@keyframes tbDraw    { to { stroke-dashoffset: 0 } }
@keyframes tbFade    { from { opacity:0 } to { opacity:1 } }
@keyframes tbSpinSlow{ to { transform: rotate(360deg) } }
@media (prefers-reduced-motion: reduce) {
  .tb-anim, .tb-anim * { animation: none !important; }
}
`;
const Style = () => <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />;

// ── Coque de téléphone ──────────────────────────────────────────────────────
const Phone = ({ children, w = 178 }) => (
  <div style={{
    width: w, flexShrink: 0, borderRadius: 22, padding: 5,
    background: 'linear-gradient(160deg,#12332A 0%,#0A2620 100%)',
    boxShadow: '0 16px 34px -18px rgba(6,40,30,.7)',
  }}>
    <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)',
        width: 44, height: 4, borderRadius: 3, background: 'rgba(15,45,35,.18)', zIndex: 2,
      }} />
      {children}
    </div>
  </div>
);

const PhoneHead = ({ children }) => (
  <div style={{
    background: 'linear-gradient(90deg,#0C4A37 0%,#0A3D2D 100%)', color: '#fff',
    padding: '15px 11px 10px', fontSize: 10.5, fontWeight: 800,
  }}>{children}</div>
);

/* Portraits illustrés — style « anime » épuré : grands yeux avec reflet,
   traits nets, aplats modernes. `seed` choisit le personnage (carnation,
   coiffure, tenue), `role` habille en blouse de médecin ou en civil. Tout est
   dessiné ici, sans image externe : la CSP ne laisse rien entrer d'autre. */
const AV_CAST = [
  // [peau, ombre peau, cheveux, reflet cheveux, tenue, accessoire]
  ['#F2C9A0', '#DEAE84', '#26201C', '#3D332C', '#1C6FA8', 'none'],     // 0 · homme, coupe courte
  ['#F7D6B8', '#E4BB9A', '#33251E', '#4A362C', '#0E7C52', 'earring'],  // 1 · femme, carré lisse
  ['#C98F63', '#B27A51', '#1E1916', '#332A24', '#0C6B62', 'glasses'],  // 2 · homme, lunettes
  ['#EFC29B', '#D9A87E', '#241C18', '#3A2E26', '#7A4A8C', 'bun'],      // 3 · femme, chignon
];

const Avatar = ({ size = 46, seed = 0, ring = true, role = 'patient' }) => {
  const [skin, shade, hair, hairHi, wear, extra] = AV_CAST[seed % AV_CAST.length];
  const female = seed % 2 === 1;
  const doctor = role === 'doctor';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="tb-anim"
      style={{ display: 'block', borderRadius: '50%',
               background: 'radial-gradient(circle at 32% 26%, #F0FBF5 0%, #D9F0E4 100%)',
               ...(ring ? { boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${GREEN}` } : {}) }}
      role="img" aria-label="Portrait illustré">
      <g style={{ animation: 'tbBreathe 4.6s ease-in-out infinite' }}>
        {/* buste */}
        <path d="M8 64c0-12 10.5-18 24-18s24 6 24 18z" fill={doctor ? '#F7FAF9' : wear} />
        {doctor && (
          <>
            <path d="M8 64c0-12 10.5-18 24-18s24 6 24 18z" fill="none" stroke="#DEE9E4" strokeWidth="1" />
            {/* col en V de la tunique sous la blouse */}
            <path d="M26 47.5l6 7 6-7 3 2-9 9.5-9-9.5z" fill={GREEN} />
            <path d="M25 48l7 8.5L25 63zM39 48l-7 8.5L39 63z" fill="#fff" opacity=".9" />
            {/* stéthoscope */}
            <path d="M25.5 52c0 5.5 2.6 8.4 6.2 9" fill="none" stroke="#3A4A52" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="34" cy="61.4" r="2.3" fill="#3A4A52" />
            <circle cx="34" cy="61.4" r="1" fill="#8FA6B0" />
          </>
        )}
        {!doctor && <path d="M27 47c1.6 2.6 8.4 2.6 10 0l1.6 3.4c-2.4 2-10.8 2-13.2 0z" fill="#fff" opacity=".22" />}
        {/* cou */}
        <path d="M27.5 42h9v8a4.5 4.5 0 0 1-9 0z" fill={skin} />
        <path d="M27.5 42c1.2 3 7.8 3 9 0v3.6c-1.2 1.6-7.8 1.6-9 0z" fill={shade} opacity=".55" />
        {/* oreilles */}
        <circle cx="19.8" cy="30.5" r="2.4" fill={skin} />
        <circle cx="44.2" cy="30.5" r="2.4" fill={skin} />
        {extra === 'earring' && <><circle cx="19.8" cy="33.6" r="1" fill="#D9A441" /><circle cx="44.2" cy="33.6" r="1" fill="#D9A441" /></>}
        {/* tête */}
        <path d="M32 15.5c7.6 0 12.3 5.6 12.3 13 0 8.2-5.4 14-12.3 14s-12.3-5.8-12.3-14c0-7.4 4.7-13 12.3-13z" fill={skin} />
        <ellipse cx="28" cy="22.5" rx="6" ry="3" fill="#fff" opacity=".14" />
        {/* chevelures */}
        {female ? (
          extra === 'bun' ? (
            <>
              <circle cx="43" cy="14.8" r="4.6" fill={hair} />
              <circle cx="41.6" cy="13.6" r="1.4" fill={hairHi} opacity=".8" />
              <path d="M18.8 27c-1-9.6 4.8-15.4 13.2-15.4S46.2 17.4 45.2 27c-2-4.4-2.9-6.2-3.8-7.3-2.2 1.5-5.6 2.2-9.4 2.2s-7.2-.7-9.4-2.2c-.9 1.1-1.8 2.9-3.8 7.3z" fill={hair} />
              <path d="M22 18.5c2.4-3.6 6-5.4 10-5.4" stroke={hairHi} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".7" />
            </>
          ) : (
            <>
              <path d="M18.6 27.5c-1-10 5-16.5 13.4-16.5s14.4 6.5 13.4 16.5c-1.9-4.6-2.8-6.6-3.7-7.8-2.2 1.5-5.8 2.2-9.7 2.2s-7.5-.7-9.7-2.2c-.9 1.2-1.8 3.2-3.7 7.8z" fill={hair} />
              <path d="M18.9 22.5c-1.7 5.8-1.5 13 .8 18 1.5.75 3 .7 4.1-.1-1.9-4.6-2.5-10.2-1.7-15.3z" fill={hair} />
              <path d="M45.1 22.5c1.7 5.8 1.5 13-.8 18-1.5.75-3 .7-4.1-.1 1.9-4.6 2.5-10.2 1.7-15.3z" fill={hair} />
              <path d="M23 17.5c2.4-3.4 5.6-5 9-5" stroke={hairHi} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".75" />
            </>
          )
        ) : (
          <>
            <path d="M20 27c-1-9.2 4.6-14.8 12-14.8S45 17.8 44 27c-2.3-4.2-3.3-5.8-4.1-6.8-2 1.35-4.9 1.95-7.9 1.95s-5.9-.6-7.9-1.95c-.8 1-1.8 2.6-4.1 6.8z" fill={hair} />
            <path d="M24 16.8c2.2-1.9 5-2.9 8-2.9" stroke={hairHi} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".7" />
          </>
        )}
        {/* sourcils */}
        <path d="M24.4 25.2q2.3-1.7 4.6-.7" stroke={hair} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M39.6 25.2q-2.3-1.7-4.6-.7" stroke={hair} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {/* yeux « anime » : iris sombre + reflet */}
        <g style={{ animation: 'tbBlink 6.5s ease-in-out infinite', transformOrigin: '32px 29.5px' }}>
          <ellipse cx="26.8" cy="29.6" rx="2" ry="2.8" fill="#241D19" />
          <ellipse cx="37.2" cy="29.6" rx="2" ry="2.8" fill="#241D19" />
          <circle cx="27.5" cy="28.6" r=".8" fill="#fff" />
          <circle cx="37.9" cy="28.6" r=".8" fill="#fff" />
        </g>
        {extra === 'glasses' && (
          <g stroke="#2A3238" strokeWidth="1.2" fill="none" opacity=".85">
            <rect x="22.6" y="26.2" width="8.2" height="6.6" rx="3.2" />
            <rect x="33.2" y="26.2" width="8.2" height="6.6" rx="3.2" />
            <path d="M30.8 29h2.4" />
          </g>
        )}
        {/* nez + bouche + joues */}
        <path d="M32 31.6q-.9 1.7 0 2.5" stroke={shade} strokeWidth="1" fill="none" strokeLinecap="round" opacity=".7" />
        <path d="M28.7 37.4q3.3 2.5 6.6 0" stroke="#A9604C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <ellipse cx="24.6" cy="34.2" rx="2.3" ry="1.2" fill="#F09A7E" opacity=".3" />
        <ellipse cx="39.4" cy="34.2" rx="2.3" ry="1.2" fill="#F09A7E" opacity=".3" />
      </g>
    </svg>
  );
};

const Dot = ({ c = '#2ECC71', s = 6 }) => (
  <span className="tb-anim" style={{
    width: s, height: s, borderRadius: '50%', background: c, display: 'inline-block',
    animation: 'tbPulse 2s ease-in-out infinite',
  }} />
);

const Chip = ({ children, bg = LIGHT, fg = GREEN }) => (
  <span style={{ fontSize: 7.5, fontWeight: 800, color: fg, background: bg, padding: '2.5px 6px', borderRadius: 20, whiteSpace: 'nowrap' }}>{children}</span>
);

const Row = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8, padding: '3.5px 0', borderBottom: '1px solid #F1F5F3' }}>
    <span style={{ color: MUTED, fontWeight: 600 }}>{k}</span>
    <span style={{ color: DARK, fontWeight: 800 }}>{v}</span>
  </div>
);

// ═══ 1 · Page publique : profil + créneaux, côté patient ════════════════════
export function VisibiliteVisual({ lang = 'fr' }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  const slot = (h, state) => {
    const st = {
      free:   { bg: '#fff',    bd: '#BFE3D0', fg: GREEN,   deco: 'none' },
      taken:  { bg: '#F4F6F5', bd: '#E6EBE8', fg: '#A9B5B0', deco: 'line-through' },
      prayer: { bg: '#FFF6E8', bd: '#F3DFBC', fg: '#9A6B22', deco: 'none' },
      picked: { bg: GREEN,     bd: GREEN,     fg: '#fff',    deco: 'none' },
    }[state];
    return (
      <div key={h + state} style={{
        background: st.bg, border: `1px solid ${st.bd}`, color: st.fg, textDecoration: st.deco,
        borderRadius: 6, padding: '4.5px 0', textAlign: 'center', fontSize: 8.5, fontWeight: 800,
      }}>{h}</div>
    );
  };
  return (
    <>
      <Style />
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Profil ── */}
        <Phone>
          <PhoneHead>tabibo.ma/dr-el-amrani</PhoneHead>
          <div style={{ padding: 11 }}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <Avatar size={44} seed={1} role="doctor" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 900, color: DARK, lineHeight: 1.2 }}>Dr Nadia El Amrani</div>
                <div style={{ fontSize: 8, color: MUTED, fontWeight: 700, marginTop: 1 }}>{T('Cardiologue', 'Cardiologist', 'طبيبة قلب')} · Casablanca</div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginTop: 3 }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: '#D9A400' }}>★★★★★</span>
                  <span style={{ fontSize: 7.5, color: MUTED, fontWeight: 700 }}>4,9 · 128 {T('avis', 'reviews', 'رأي')}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 9 }}>
              <Chip>✓ INPE {T('vérifié', 'verified', 'موثّق')}</Chip>
              <Chip>{T('Téléconsultation', 'Teleconsult', 'عن بُعد')}</Chip>
              <Chip bg="#EEF4FB" fg="#1C6FA8">CNSS · CNOPS</Chip>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK, marginBottom: 3 }}>{T('Actes et tarifs', 'Services and fees', 'الخدمات والأسعار')}</div>
              <Row k={T('Consultation générale', 'General consultation', 'استشارة عامة')} v="300 MAD" />
              <Row k={T('Bilan complet', 'Full check-up', 'فحص شامل')} v="500 MAD" />
              <Row k={T('Téléconsultation', 'Teleconsultation', 'استشارة عن بُعد')} v="250 MAD" />
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK, marginBottom: 3 }}>{T('Langues', 'Languages', 'اللغات')}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Chip bg="#F4F8F5" fg={BODY}>{T('Arabe', 'Arabic', 'العربية')}</Chip>
                <Chip bg="#F4F8F5" fg={BODY}>{T('Français', 'French', 'الفرنسية')}</Chip>
                <Chip bg="#F4F8F5" fg={BODY}>{T('Anglais', 'English', 'الإنجليزية')}</Chip>
              </div>
            </div>

            <div style={{ marginTop: 8, background: '#F4F8F5', borderRadius: 7, padding: 7 }}>
              <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK }}>{T('Adresse', 'Address', 'العنوان')}</div>
              <div style={{ fontSize: 7.5, color: MUTED, fontWeight: 600, lineHeight: 1.45, marginTop: 1 }}>
                12, rue Ibn Sina · Maârif<br />Casablanca 20100
              </div>
              <div style={{ height: 26, borderRadius: 5, marginTop: 5, background: 'linear-gradient(120deg,#DCEDE3,#C9E4D5)', position: 'relative', overflow: 'hidden' }}>
                <span className="tb-anim" style={{ position: 'absolute', left: '46%', top: '38%', width: 6, height: 6, borderRadius: '50%', background: GREEN, animation: 'tbPulse 2.2s ease-in-out infinite' }} />
              </div>
            </div>

            <div style={{ marginTop: 9, background: GREEN, color: '#fff', textAlign: 'center', borderRadius: 7, padding: '7px 0', fontSize: 9, fontWeight: 900 }}>
              {T('Prendre rendez-vous', 'Book an appointment', 'حجز موعد')}
            </div>
          </div>
        </Phone>

        {/* ── Créneaux ── */}
        <Phone>
          <PhoneHead>{T('Choisir un créneau', 'Choose a slot', 'اختيار موعد')}</PhoneHead>
          <div style={{ padding: 11 }}>
            <div style={{ display: 'flex', gap: 3, marginBottom: 9 }}>
              {[[T('Lun', 'Mon', 'إث'), '4'], [T('Mar', 'Tue', 'ثل'), '5'], [T('Mer', 'Wed', 'أر'), '6'], [T('Jeu', 'Thu', 'خم'), '7'], [T('Ven', 'Fri', 'جم'), '8']].map(([d, n], i) => (
                <div key={d} style={{
                  flex: 1, textAlign: 'center', borderRadius: 6, padding: '4px 0',
                  background: i === 1 ? GREEN : '#F4F8F5', color: i === 1 ? '#fff' : MUTED,
                }}>
                  <div style={{ fontSize: 6.5, fontWeight: 700 }}>{d}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 900 }}>{n}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK, marginBottom: 4 }}>{T('Matin', 'Morning', 'صباحاً')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {slot('09:00', 'taken')}{slot('09:30', 'free')}{slot('10:00', 'free')}
              {slot('10:30', 'taken')}{slot('11:00', 'free')}{slot('11:30', 'free')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFF6E8', border: '1px solid #F3DFBC', borderRadius: 7, padding: '6px 7px', margin: '8px 0' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9A6B22" strokeWidth="2" strokeLinecap="round">
                <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z" />
              </svg>
              <div>
                <div style={{ fontSize: 7.5, fontWeight: 900, color: '#7A5418' }}>{T('Pause de prière — Dhohr', 'Prayer break — Dhuhr', 'استراحة الصلاة — الظهر')}</div>
                <div style={{ fontSize: 7, color: '#9A6B22', fontWeight: 600 }}>13:20 – 13:50 · {T('non réservable', 'not bookable', 'غير متاح')}</div>
              </div>
            </div>

            <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK, marginBottom: 4 }}>{T('Après-midi', 'Afternoon', 'بعد الظهر')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {slot('14:00', 'free')}{slot('14:30', 'picked')}{slot('15:00', 'free')}
              {slot('15:30', 'taken')}{slot('16:00', 'free')}{slot('16:30', 'free')}
            </div>

            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9, paddingTop: 7, borderTop: '1px solid #F1F5F3' }}>
              {[[T('Libre', 'Free', 'متاح'), '#fff', '#BFE3D0'], [T('Pris', 'Taken', 'محجوز'), '#F4F6F5', '#E6EBE8'], [T('Prière', 'Prayer', 'صلاة'), '#FFF6E8', '#F3DFBC'], [T('Choisi', 'Chosen', 'مختار'), GREEN, GREEN]].map(([l, bg, bd]) => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 7, color: MUTED, fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2.5, background: bg, border: `1px solid ${bd}` }} />{l}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 8, background: GREEN, color: '#fff', textAlign: 'center', borderRadius: 7, padding: '7px 0', fontSize: 9, fontWeight: 900 }}>
              {T('Confirmer 14:30', 'Confirm 14:30', 'تأكيد 14:30')}
            </div>
          </div>
        </Phone>
      </div>
    </>
  );
}

// ═══ 2 · Ce que le patient reçoit : WhatsApp + courriel ═════════════════════
export function RappelsVisual({ lang = 'fr' }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  return (
    <>
      <Style />
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── WhatsApp : confirmation ── */}
        <Phone>
          <div style={{ background: '#075E54', color: '#fff', padding: '15px 10px 9px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 10 }}>🩺</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800 }}>Tabibo</div>
              <div style={{ fontSize: 6.5, opacity: .8 }}>{T('compte professionnel', 'business account', 'حساب مهني')}</div>
            </div>
          </div>
          <div style={{ background: '#ECE5DD', padding: 9, minHeight: 232 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 6.5, background: '#D6E7DA', color: '#4A5A52', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                {T('Aujourd’hui', 'Today', 'اليوم')}
              </span>
            </div>
            <div className="tb-anim" style={{
              background: '#fff', borderRadius: '9px 9px 9px 2px', padding: 9,
              boxShadow: '0 1px 2px rgba(0,0,0,.13)', animation: 'tbSlide .6s ease-out both',
            }}>
              <div style={{ fontSize: 8.5, fontWeight: 900, color: '#075E54', marginBottom: 4 }}>
                ✅ {T('Rendez-vous confirmé', 'Appointment confirmed', 'تم تأكيد الموعد')}
              </div>
              <div style={{ fontSize: 8, color: '#2A3A34', lineHeight: 1.55 }}>
                {T('Bonjour Fatima Zahra,', 'Hello Fatima Zahra,', 'مرحباً فاطمة الزهراء،')}<br />
                {T('Votre rendez-vous avec', 'Your appointment with', 'موعدكم مع')} <b>Dr N. El Amrani</b> {T('est confirmé.', 'is confirmed.', 'مؤكَّد.')}
              </div>
              <div style={{ background: '#F4F8F5', borderRadius: 6, padding: 6, marginTop: 6 }}>
                <div style={{ fontSize: 8, fontWeight: 900, color: DARK }}>📅 {T('Mardi 5 août · 14:30', 'Tuesday 5 August · 14:30', 'الثلاثاء 5 غشت · 14:30')}</div>
                <div style={{ fontSize: 7.5, color: MUTED, fontWeight: 600, marginTop: 2 }}>12, rue Ibn Sina · Maârif, Casablanca</div>
              </div>
              <div style={{ borderTop: '1px solid #EDF1EF', marginTop: 7, paddingTop: 5, display: 'flex', gap: 5 }}>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 7.5, fontWeight: 800, color: '#075E54' }}>{T('Confirmer', 'Confirm', 'تأكيد')}</span>
                <span style={{ width: 1, background: '#EDF1EF' }} />
                <span style={{ flex: 1, textAlign: 'center', fontSize: 7.5, fontWeight: 800, color: '#075E54' }}>{T('Annuler', 'Cancel', 'إلغاء')}</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 6.5, color: '#9AA8A2', marginTop: 3 }}>14:02 ✓✓</div>
            </div>
          </div>
        </Phone>

        {/* ── Courriel : rappel ── */}
        <Phone>
          <PhoneHead>{T('Boîte de réception', 'Inbox', 'صندوق الوارد')}</PhoneHead>
          <div style={{ padding: 10, minHeight: 232 }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #F1F5F3' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: LIGHT, display: 'grid', placeItems: 'center', fontSize: 10 }}>🩺</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 8.5, fontWeight: 900, color: DARK }}>Tabibo</div>
                <div style={{ fontSize: 7, color: MUTED, fontWeight: 600 }}>rappels@tabibo.ma</div>
              </div>
              <span style={{ fontSize: 6.5, color: MUTED, fontWeight: 700 }}>08:00</span>
            </div>

            <div style={{ fontSize: 9.5, fontWeight: 900, color: DARK, margin: '9px 0 3px', lineHeight: 1.3 }}>
              ⏰ {T('Rappel — votre rendez-vous demain', 'Reminder — your appointment tomorrow', 'تذكير — موعدكم غداً')}
            </div>

            <div className="tb-anim" style={{ background: '#F4F8F5', borderRadius: 8, padding: 8, marginTop: 7, animation: 'tbSlide .7s ease-out both' }}>
              <div style={{ fontSize: 8, color: BODY, lineHeight: 1.55 }}>
                {T('Bonjour Fatima Zahra,', 'Hello Fatima Zahra,', 'مرحباً فاطمة الزهراء،')}
              </div>
              <div style={{ fontSize: 8, color: BODY, lineHeight: 1.55, marginTop: 3 }}>
                {T('Nous vous rappelons votre rendez-vous :', 'A reminder of your appointment:', 'نذكّركم بموعدكم:')}
              </div>
              <div style={{ background: '#fff', borderRadius: 6, padding: 7, marginTop: 6, borderInlineStart: `2.5px solid ${GREEN}` }}>
                <Row k={T('Praticien', 'Practitioner', 'الطبيب')} v="Dr N. El Amrani" />
                <Row k={T('Date', 'Date', 'التاريخ')} v={T('Mar. 5 août', 'Tue 5 Aug', 'الثلاثاء 5 غشت')} />
                <Row k={T('Heure', 'Time', 'الساعة')} v="14:30" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, paddingTop: 3.5 }}>
                  <span style={{ color: MUTED, fontWeight: 600 }}>{T('Lieu', 'Place', 'المكان')}</span>
                  <span style={{ color: DARK, fontWeight: 800 }}>Maârif, Casablanca</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                <span style={{ flex: 1, textAlign: 'center', background: GREEN, color: '#fff', borderRadius: 5, padding: '5px 0', fontSize: 7.5, fontWeight: 900 }}>
                  {T('Je confirme', 'Confirm', 'أؤكّد')}
                </span>
                <span style={{ flex: 1, textAlign: 'center', background: '#fff', color: GREEN, border: `1px solid #BFE3D0`, borderRadius: 5, padding: '5px 0', fontSize: 7.5, fontWeight: 900 }}>
                  {T('Reporter', 'Reschedule', 'تأجيل')}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 6.5, color: MUTED, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
              {T('Envoyé par Tabibo pour le compte du cabinet.', 'Sent by Tabibo on behalf of the practice.', 'مُرسَل من Tabibo نيابة عن العيادة.')}
            </div>
          </div>
        </Phone>
      </div>
    </>
  );
}

// ═══ 3 · Téléconsultation — portraits dessinés, aucune personne réelle ══════
export function TeleconsultVisual({ lang = 'fr' }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  return (
    <>
      <Style />
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#0A2620' }}>
        {/* barre d'appel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 11px', background: 'linear-gradient(90deg,#0C4A37,#0A3D2D)' }}>
          <Dot c="#FF6B5A" s={7} />
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>
            {T('Téléconsultation en cours', 'Teleconsultation in progress', 'استشارة عن بُعد جارية')}
          </span>
          <span style={{ marginInlineStart: 'auto', fontSize: 9.5, fontWeight: 800, color: '#9FE3C4', fontVariantNumeric: 'tabular-nums' }}>12:04</span>
        </div>

        <div style={{ display: 'flex', gap: 9, padding: 11 }}>
          {/* flux vidéo */}
          <div style={{ flex: 1.35, position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(150deg,#123C30,#0D2E26)', minHeight: 156 }}>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <Avatar size={78} seed={3} ring={false} />
            </div>
            <div style={{ position: 'absolute', insetInlineStart: 8, bottom: 8, maxWidth: 'calc(100% - 100px)', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(6,30,24,.62)', borderRadius: 20, padding: '3px 8px' }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>Mme Fatima Zahra B.</span>
              {/* onde de voix — l'appel est vivant */}
              <span className="tb-anim" style={{ display: 'inline-flex', gap: 1.5, alignItems: 'center', height: 9 }}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} style={{
                    width: 2, height: 9, borderRadius: 1, background: '#6FE0AC', display: 'block',
                    animation: `tbWave ${0.72 + i * 0.13}s ease-in-out infinite`, transformOrigin: 'center',
                  }} />
                ))}
              </span>
            </div>

            {/* incrustation médecin */}
            <div style={{ position: 'absolute', insetInlineEnd: 8, top: 8, width: 52, borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,.28)', background: 'linear-gradient(150deg,#164A3B,#10382D)' }}>
              <div style={{ display: 'grid', placeItems: 'center', padding: 5 }}>
                <Avatar size={36} seed={1} ring={false} role="doctor" />
              </div>
              <div style={{ fontSize: 6, fontWeight: 800, color: '#fff', textAlign: 'center', padding: '0 0 3px' }}>{T('Vous', 'You', 'أنتم')}</div>
            </div>

            {/* commandes */}
            <div style={{ position: 'absolute', insetInlineEnd: 8, bottom: 8, display: 'flex', gap: 6 }}>
              {[['#fff', 'rgba(255,255,255,.18)', 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM5 11a7 7 0 0 0 14 0M12 18v3'],
                ['#fff', 'rgba(255,255,255,.18)', 'M23 7l-7 5 7 5V7zM1 5h15v14H1z'],
                ['#fff', '#E0483A', 'M21 15.5a15 15 0 0 1-19 0v-3a1.9 1.9 0 0 1 2-2h3l1 3-2 1a11 11 0 0 0 5 5l1-2 3 1v3a1.9 1.9 0 0 1-2 2z']].map(([stroke, bg, d], i) => (
                <span key={i} style={{ width: 21, height: 21, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center', backdropFilter: 'blur(4px)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
                </span>
              ))}
            </div>
          </div>

          {/* dossier affiché pendant l'appel */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: 9, minWidth: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 900, color: DARK, marginBottom: 5 }}>
              {T('Dossier — affiché pendant l’appel', 'Record — shown during the call', 'الملف — معروض أثناء المكالمة')}
            </div>
            <Row k={T('Motif', 'Reason', 'السبب')} v={T('Contrôle', 'Follow-up', 'مراقبة')} />
            <Row k={T('Tension', 'Blood pressure', 'الضغط')} v="12/8" />
            <Row k={T('Traitement', 'Treatment', 'العلاج')} v="Amlodipine" />
            <Row k={T('Allergies', 'Allergies', 'الحساسية')} v={T('Pénicilline', 'Penicillin', 'بنسلين')} />
            <div style={{ background: LIGHT, borderRadius: 6, padding: 6, marginTop: 7 }}>
              <div style={{ fontSize: 7, fontWeight: 900, color: GREEN, marginBottom: 2 }}>{T('Note de consultation', 'Consultation note', 'ملاحظة الاستشارة')}</div>
              <div style={{ fontSize: 7, color: BODY, lineHeight: 1.5 }}>
                {T('Bonne tolérance. Poursuite du traitement, contrôle à 3 mois.', 'Well tolerated. Continue treatment, review in 3 months.', 'تحمّل جيد. مواصلة العلاج، مراجعة بعد 3 أشهر.')}
              </div>
            </div>
            <div style={{ marginTop: 7, background: GREEN, color: '#fff', textAlign: 'center', borderRadius: 6, padding: '5.5px 0', fontSize: 8, fontWeight: 900 }}>
              {T('Rédiger l’ordonnance', 'Write the prescription', 'تحرير الوصفة')}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 11px 10px', fontSize: 7, color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>
          {T('Portraits illustrés — aucune personne réelle.', 'Illustrated portraits — no real people.', 'صور توضيحية — لا أشخاص حقيقيين.')}
        </div>
      </div>
    </>
  );
}

// ═══ 4 · Tabibo Network — trois écrans empilés ══════════════════════════════
export function NetworkVisual({ lang = 'fr' }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  const Card = ({ title, children }) => (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 10px 24px -16px rgba(9,50,38,.5)' }}>
      <div style={{ background: 'linear-gradient(90deg,#0C4A37,#0A3D2D)', padding: '6px 10px', fontSize: 9, fontWeight: 800, color: '#fff' }}>{title}</div>
      <div style={{ padding: 9 }}>{children}</div>
    </div>
  );
  return (
    <>
      <Style />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>

        {/* 1 — trouver et se relier */}
        <Card title={T('Trouver un confrère', 'Find a colleague', 'البحث عن زميل')}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
            <div style={{ flex: 1, background: '#F4F8F5', borderRadius: 5, padding: '4px 7px', fontSize: 7.5, color: MUTED, fontWeight: 600 }}>
              {T('Cardiologie · Casablanca', 'Cardiology · Casablanca', 'أمراض القلب · الدار البيضاء')}
            </div>
            <div style={{ background: GREEN, color: '#fff', borderRadius: 5, padding: '4px 9px', fontSize: 7.5, fontWeight: 900 }}>{T('Chercher', 'Search', 'بحث')}</div>
          </div>
          {[['Dr Karim Benali', T('Cardiologue', 'Cardiologist', 'طبيب قلب'), T('Relié', 'Linked', 'مرتبط'), true],
            ['Dr Salma Idrissi', T('Radiologue', 'Radiologist', 'أشعة'), T('Demander', 'Request', 'طلب'), false]].map(([n, s, a, linked], i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderTop: i ? '1px solid #F1F5F3' : 'none' }}>
              <Avatar size={22} seed={i + 2} ring={false} role="doctor" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8, fontWeight: 900, color: DARK }}>{n}</div>
                <div style={{ fontSize: 7, color: MUTED, fontWeight: 600 }}>{s}</div>
              </div>
              <Chip bg={linked ? LIGHT : '#F4F8F5'} fg={linked ? GREEN : MUTED}>{a}</Chip>
            </div>
          ))}
        </Card>

        {/* 2 — adresser un patient */}
        <Card title={T('Adresser un patient', 'Refer a patient', 'إحالة مريض')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFF1EE', border: '1px solid #F7D5CE', borderRadius: 6, padding: '5px 7px', marginBottom: 7 }}>
            <Dot c="#E0483A" s={5} />
            <span style={{ fontSize: 7.5, fontWeight: 900, color: '#A33325' }}>{T('Adressage urgent', 'Urgent referral', 'إحالة عاجلة')}</span>
          </div>
          <Row k={T('Patient', 'Patient', 'المريض')} v="Mme F. Z. Benali" />
          <Row k={T('Téléphone', 'Phone', 'الهاتف')} v="+212 6 12 •• •• ••" />
          <Row k={T('Motif', 'Reason', 'السبب')} v={T('Écho-doppler', 'Doppler ultrasound', 'دوبلر')} />
          <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
            {[[T('Envoyé', 'Sent', 'أُرسل'), true], [T('Accepté', 'Accepted', 'قُبل'), true], [T('En cours', 'In progress', 'جارٍ'), false], [T('Clôturé', 'Closed', 'أُغلق'), false]].map(([l, done]) => (
              <div key={l} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 3, borderRadius: 2, background: done ? GREEN : '#E6EBE8' }} />
                <div style={{ fontSize: 6, fontWeight: 700, color: done ? GREEN : MUTED, marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 7, color: MUTED, fontWeight: 600, marginTop: 7, lineHeight: 1.45 }}>
            {T('Nom, téléphone, motif — le dossier ne circule pas.', 'Name, phone, reason — the record does not travel.', 'الاسم والهاتف والسبب — الملف لا ينتقل.')}
          </div>
        </Card>

        {/* 3 — messagerie */}
        <Card title={T('Messagerie confrères', 'Colleague messaging', 'مراسلة الزملاء')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingBottom: 6, borderBottom: '1px solid #F1F5F3' }}>
            <Avatar size={20} seed={2} ring={false} role="doctor" />
            <span style={{ fontSize: 8, fontWeight: 900, color: DARK, flex: 1 }}>Dr Karim Benali</span>
            <Dot />
            <span style={{ fontSize: 6.5, color: GREEN, fontWeight: 800 }}>{T('en ligne', 'online', 'متصل')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 7 }}>
            <div style={{ alignSelf: 'flex-start', maxWidth: '82%', background: '#F4F8F5', borderRadius: '8px 8px 8px 2px', padding: '5px 7px', fontSize: 7.5, color: BODY, lineHeight: 1.45 }}>
              {T('Bonjour confrère, je vous adresse Mme Benali. L’échographie est jointe.', 'Hello, I am referring Mrs Benali. The ultrasound is attached.', 'مرحباً، أُحيل إليكم السيدة بنعلي. التصوير مرفق.')}
            </div>
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #E6EBE8', borderRadius: 7, padding: '5px 7px', maxWidth: '82%' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" /></svg>
              <div>
                <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK }}>echo-doppler.pdf</div>
                <div style={{ fontSize: 6.5, color: MUTED, fontWeight: 700 }}>🔒 {T('adresse qui expire', 'expiring link', 'رابط ينتهي')}</div>
              </div>
            </div>
            <div style={{ alignSelf: 'flex-end', background: GREEN, color: '#fff', borderRadius: '8px 8px 2px 8px', padding: '5px 7px', fontSize: 7.5, maxWidth: '82%' }}>
              {T('Bien reçu, je la vois jeudi.', 'Received, I will see her Thursday.', 'وصلني، سأراها الخميس.')}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

// ═══ 5 · Vos données, protégées — schéma, pas capture d'écran ═══════════════
export function SecuriteVisual({ lang = 'fr' }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  return (
    <>
      <Style />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Le cloisonnement, montré plutôt qu'affirmé */}
        <div style={{ background: '#fff', borderRadius: 11, padding: 12, boxShadow: '0 10px 24px -16px rgba(9,50,38,.5)' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: DARK, marginBottom: 8 }}>
            {T('Une requête qui sort du cabinet ne renvoie rien', 'A query leaving your practice returns nothing', 'طلب يخرج عن عيادتكم لا يُرجع شيئاً')}
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
            <div style={{ flex: 1, background: LIGHT, border: `1px solid #BFE3D0`, borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 7.5, fontWeight: 900, color: GREEN, marginBottom: 4 }}>{T('Votre cabinet', 'Your practice', 'عيادتكم')}</div>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 1.5, background: GREEN }} />
                  <span style={{ height: 4, flex: 1, borderRadius: 2, background: 'rgba(14,124,82,.28)' }} />
                </div>
              ))}
              <div style={{ fontSize: 6.5, fontWeight: 800, color: GREEN, marginTop: 4 }}>✓ {T('lisible', 'readable', 'مقروء')}</div>
            </div>

            <div style={{ display: 'grid', placeItems: 'center', width: 30, position: 'relative' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E0483A" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" /><path d="M6 18L18 6" />
              </svg>
            </div>

            <div style={{ flex: 1, background: '#F7F8F8', border: '1px dashed #D9E0DC', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 7.5, fontWeight: 900, color: MUTED, marginBottom: 4 }}>{T('Un autre cabinet', 'Another practice', 'عيادة أخرى')}</div>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 1.5, background: '#CFD8D4' }} />
                  <span style={{ height: 4, flex: 1, borderRadius: 2, background: 'repeating-linear-gradient(90deg,#E3E9E6 0 4px,transparent 4px 8px)' }} />
                </div>
              ))}
              <div style={{ fontSize: 6.5, fontWeight: 800, color: '#A9B5B0', marginTop: 4 }}>{T('aucune ligne rendue', 'no rows returned', 'لا نتائج')}</div>
            </div>
          </div>
          <div style={{ fontSize: 6.5, color: MUTED, fontWeight: 700, marginTop: 7, textAlign: 'center' }}>
            {T('Appliqué par la base de données, pas par l’écran.', 'Enforced by the database, not by the screen.', 'مطبَّق من قاعدة البيانات، لا من الشاشة.')}
          </div>
        </div>

        {/* Chacun voit ce qui le concerne */}
        <div style={{ background: '#fff', borderRadius: 11, padding: 12, boxShadow: '0 10px 24px -16px rgba(9,50,38,.5)' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: DARK, marginBottom: 8 }}>
            {T('Chacun voit ce qui le concerne', 'Each person sees what concerns them', 'كل شخص يرى ما يخصّه')}
          </div>
          {/* Colonnes à parts égales : avec `1fr auto auto auto`, tout le mou
              allait au libellé et les trois colonnes se collaient au bord
              droit dès que le conteneur s'élargissait. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '5px 6px', alignItems: 'center' }}>
            <span />
            {[T('Agenda', 'Agenda', 'الأجندة'), T('Dossiers', 'Records', 'الملفات'), T('Factures', 'Billing', 'الفوترة')].map((h) => (
              <span key={h} style={{ fontSize: 6.5, fontWeight: 800, color: MUTED, textAlign: 'center' }}>{h}</span>
            ))}
            {[[T('Médecin', 'Doctor', 'الطبيب'), 1, 1, 1], [T('Secrétaire', 'Secretary', 'السكرتيرة'), 1, 0, 0], [T('Patient', 'Patient', 'المريض'), 2, 2, 0]].map(([who, a, b, c]) => (
              <Fragment key={who}>
                <span style={{ fontSize: 7.5, fontWeight: 800, color: DARK }}>{who}</span>
                {[a, b, c].map((v, i) => (
                  <span key={who + i} style={{ textAlign: 'center' }}>
                    {v === 1
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
                      : v === 2
                        ? <span style={{ fontSize: 6, fontWeight: 800, color: GREEN, whiteSpace: 'nowrap' }}>{T('les siens', 'own only', 'ملفه فقط')}</span>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CFD8D4" strokeWidth="3" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg>}
                  </span>
                ))}
              </Fragment>
            ))}
          </div>
          <div style={{ fontSize: 6.5, color: MUTED, fontWeight: 700, marginTop: 7 }}>
            {T('Le patient ne voit que son propre dossier.', 'A patient sees only their own record.', 'المريض يرى ملفه فقط.')}
          </div>
        </div>

        {/* Chiffrement + rien sur le poste */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'linear-gradient(150deg,#0C4A37,#09362A)', borderRadius: 11, padding: 11, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div className="tb-anim" style={{
              position: 'absolute', top: 0, bottom: 0, width: 40, opacity: .1,
              background: 'linear-gradient(90deg,transparent,#fff,transparent)',
              animation: 'tbSweep 3.4s linear infinite',
            }} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6FE0AC" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10" width="16" height="11" rx="2.2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <div style={{ fontSize: 8.5, fontWeight: 900, marginTop: 6 }}>{T('En transit et au repos', 'In transit and at rest', 'أثناء النقل وفي التخزين')}</div>
            <div style={{ fontSize: 7, opacity: .82, lineHeight: 1.5, marginTop: 3 }}>
              {T('HTTPS sur le réseau, stockage chiffré, accès journalisés.', 'HTTPS end-to-end on the wire, encrypted storage, logged access.', 'HTTPS، تخزين مشفَّر، ولوج مسجَّل.')}
            </div>
          </div>

          <div style={{ flex: 1, background: '#fff', borderRadius: 11, padding: 11, boxShadow: '0 10px 24px -16px rgba(9,50,38,.5)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8 21h8M12 17v4" /><path d="M8.5 10.5l7-3M8.5 7.5l7 3" opacity=".45" />
            </svg>
            <div style={{ fontSize: 8.5, fontWeight: 900, color: DARK, marginTop: 6 }}>{T('Rien ne reste sur le poste', 'Nothing stays on the machine', 'لا شيء يبقى على الجهاز')}</div>
            <div style={{ fontSize: 7, color: MUTED, fontWeight: 600, lineHeight: 1.5, marginTop: 3 }}>
              {T('À la déconnexion, le poste partagé ne conserve aucun nom ni motif lisible.', 'On sign-out, a shared machine keeps no readable name or reason.', 'عند الخروج، لا يحتفظ الجهاز المشترك بأي اسم أو سبب مقروء.')}
            </div>
          </div>
        </div>

        {/* Loi 09-08 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: LIGHT, borderRadius: 11, padding: '9px 12px' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z" /><path d="M9.5 12l1.8 1.8 3.4-3.4" />
          </svg>
          <span style={{ fontSize: 8, fontWeight: 800, color: DARK }}>
            {T('Loi n° 09-08 · déclaré et contrôlé par la CNDP', 'Law 09-08 · declared to and overseen by the CNDP', 'القانون 09-08 · مُصرَّح به لدى CNDP')}
          </span>
        </div>
      </div>
    </>
  );
}

// ═══ Briques partagées par « Pour les médecins » et « Pour les patients » ═══

/* Le fond menthe des vignettes, sans carte blanche : les visuels ci-dessus
   apportent déjà leur habillage. */
export const Canvas = ({ children, pad = 20 }) => (
  <div style={{ borderRadius: 20, padding: pad, background: 'linear-gradient(150deg, #E9F6EF 0%, #DCF0E6 100%)' }}>
    {children}
  </div>
);

/* Bandeau de repères chiffrés. Même traitement que « Pour les médecins » :
   une teinte par carte, un halo décalé, l'icône sur pastille blanche. */
export const MetricBand = ({ items, isMobile, note, cols }) => (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : `repeat(${cols || items.length}, 1fr)`, gap: isMobile ? 12 : 16 }}>
      {items.map((m, mi) => (
        <div key={m.big} style={{
          ...(isMobile && items.length % 2 === 1 && mi === items.length - 1
            ? { gridColumn: '1 / -1', width: 'calc(50% - 6px)', justifySelf: 'center' } : {}),
          position: 'relative', overflow: 'hidden', textAlign: 'center',
          background: `linear-gradient(160deg, ${m.tint} 0%, #E3F5EC 100%)`,
          border: `1px solid ${CARD_EDGE}`, borderRadius: 18,
          padding: isMobile ? '18px 12px' : '22px 16px',
          boxShadow: '0 1px 2px rgba(16,42,32,0.05), 0 16px 34px -24px rgba(11,90,60,0.5)',
        }}>
          <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -30, top: -44, width: 120, height: 120, borderRadius: '50%', background: m.color, opacity: 0.055 }} />
          {m.icon && (
            <span style={{ position: 'relative', display: 'inline-flex', width: 38, height: 38, borderRadius: 12, background: '#fff', color: m.color, alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: `0 8px 18px -10px ${m.color}` }}>{m.icon}</span>
          )}
          <div style={{ position: 'relative', fontSize: isMobile ? 25 : 32, fontWeight: 900, color: m.color, letterSpacing: '-1px', lineHeight: 1.1 }}>{m.big}</div>
          <div style={{ position: 'relative', fontSize: isMobile ? 11.5 : 12.5, color: BODY, marginTop: 7, lineHeight: 1.5 }}>{m.sub}</div>
        </div>
      ))}
    </div>
    {note && (
      <p style={{ fontSize: isMobile ? 11 : 11.5, color: MUTED, textAlign: 'center', margin: '16px auto 0', maxWidth: 720, lineHeight: 1.6 }}>{note}</p>
    )}
  </>
);

/* Vignette + texte à puces, alternés — le même rythme que la page médecins. */
export const FeatureBlock = ({ visual, title, eyebrow, points, isMobile, flip }) => {
  const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
      <path d="M4 12h14M13 6l6 6-6 6" />
    </svg>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 22 : 56, alignItems: 'center', marginBottom: isMobile ? 44 : 78 }}>
      <div style={{ order: isMobile ? 0 : (flip ? 1 : 0) }}>{visual}</div>
      <div style={{ order: isMobile ? 1 : (flip ? 0 : 1) }}>
        <h3 style={{ fontSize: isMobile ? 21 : 26, fontWeight: 800, color: DARK, margin: '0 0 14px', letterSpacing: '-0.4px', lineHeight: 1.25 }}>{title}</h3>
        {eyebrow && <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK, marginBottom: 10 }}>{eyebrow}</div>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
          {points.map((p, j) => (
            <li key={j} style={{ display: 'flex', gap: 10, fontSize: 14.5, color: BODY, lineHeight: 1.62 }}>
              <Arrow /><span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ═══ Dossier du patient — ses documents, sur son téléphone ══════════════════
export function DossierPatientVisual({ lang = 'fr' }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  const doc = (icon, name, meta, tintBg, tintFg) => (
    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 0', borderBottom: '1px solid #F1F5F3' }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: tintBg, color: tintFg, display: 'grid', placeItems: 'center', fontSize: 10, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 8, fontWeight: 900, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 7, color: MUTED, fontWeight: 600 }}>{meta}</div>
      </div>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.4" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
    </div>
  );
  return (
    <>
      <Style />
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        <Phone>
          <PhoneHead>{T('Mon dossier', 'My record', 'ملفي')}</PhoneHead>
          <div style={{ padding: 11 }}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #F1F5F3' }}>
              <Avatar size={36} seed={3} />
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 900, color: DARK }}>Fatima Zahra Benali</div>
                <div style={{ fontSize: 7.5, color: MUTED, fontWeight: 700 }}>34 {T('ans', 'years', 'سنة')} · {T('Groupe', 'Blood', 'الفصيلة')} O+</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {[[T('Documents', 'Documents', 'وثائق'), '12'], [T('Ordonnances', 'Prescriptions', 'وصفات'), '4'], [T('Analyses', 'Lab results', 'تحاليل'), '7']].map(([l, n]) => (
                <div key={l} style={{ flex: 1, background: LIGHT, borderRadius: 6, padding: '5px 3px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: GREEN, lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: 6.5, color: MUTED, fontWeight: 700, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK, margin: '9px 0 2px' }}>{T('Récents', 'Recent', 'الأحدث')}</div>
            {doc('℞', T('Ordonnance — Dr El Amrani', 'Prescription — Dr El Amrani', 'وصفة — د. العمراني'), T('5 août · PDF', '5 Aug · PDF', '5 غشت · PDF'), '#EFEAFB', '#6B57A6')}
            {doc('🧪', T('Bilan lipidique', 'Lipid panel', 'تحليل الدهون'), T('28 juillet · Laboratoire Ibn Sina', '28 July · Ibn Sina Lab', '28 يوليوز · مختبر ابن سينا'), '#E3F5FA', '#0891B2')}
            {doc('📄', T('Compte rendu — échographie', 'Report — ultrasound', 'تقرير — تصوير'), T('14 juillet · 2 pages', '14 July · 2 pages', '14 يوليوز · صفحتان'), '#FDF1E0', '#B45309')}

            <div style={{ background: LIGHT, borderRadius: 7, padding: 7, marginTop: 9 }}>
              <div style={{ fontSize: 7.5, fontWeight: 900, color: GREEN }}>🔒 {T('Vous seul y accédez', 'Only you can see it', 'أنتم وحدكم ترونه')}</div>
              <div style={{ fontSize: 7, color: BODY, fontWeight: 600, lineHeight: 1.45, marginTop: 2 }}>
                {T('Un médecin ne voit que ce que vous lui montrez en consultation.', 'A doctor sees only what you show them in consultation.', 'الطبيب لا يرى إلا ما تعرضونه عليه أثناء الاستشارة.')}
              </div>
            </div>
          </div>
        </Phone>

        <Phone>
          <PhoneHead>{T('Mes rendez-vous', 'My appointments', 'مواعيدي')}</PhoneHead>
          <div style={{ padding: 11 }}>
            <div className="tb-anim" style={{ background: LIGHT, border: `1px solid #BFE3D0`, borderRadius: 8, padding: 8, animation: 'tbSlide .6s ease-out both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Dot /><span style={{ fontSize: 7, fontWeight: 900, color: GREEN }}>{T('À venir', 'Upcoming', 'قادم')}</span>
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 900, color: DARK, marginTop: 3 }}>Dr Nadia El Amrani</div>
              <div style={{ fontSize: 7.5, color: MUTED, fontWeight: 700 }}>{T('Cardiologue', 'Cardiologist', 'طبيبة قلب')}</div>
              <div style={{ fontSize: 8, fontWeight: 900, color: DARK, marginTop: 5 }}>📅 {T('Mar. 5 août · 14:30', 'Tue 5 Aug · 14:30', 'الثلاثاء 5 غشت · 14:30')}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <span style={{ flex: 1, textAlign: 'center', background: GREEN, color: '#fff', borderRadius: 5, padding: '4px 0', fontSize: 7, fontWeight: 900 }}>{T('Itinéraire', 'Directions', 'الاتجاهات')}</span>
                <span style={{ flex: 1, textAlign: 'center', background: '#fff', color: GREEN, border: '1px solid #BFE3D0', borderRadius: 5, padding: '4px 0', fontSize: 7, fontWeight: 900 }}>{T('Reporter', 'Reschedule', 'تأجيل')}</span>
              </div>
            </div>

            <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK, margin: '9px 0 3px' }}>{T('Pour un proche', 'For a family member', 'لأحد الأقارب')}</div>
            {[['Youssef', '8 ' + T('ans', 'yrs', 'سنوات'), 4], ['Mme Rkia', '67 ' + T('ans', 'yrs', 'سنة'), 1]].map(([n, a, s]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid #F1F5F3' }}>
                <Avatar size={20} seed={s} ring={false} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, fontWeight: 900, color: DARK }}>{n}</div>
                  <div style={{ fontSize: 7, color: MUTED, fontWeight: 600 }}>{a}</div>
                </div>
                <Chip>{T('Réserver', 'Book', 'حجز')}</Chip>
              </div>
            ))}

            <div style={{ fontSize: 7.5, fontWeight: 900, color: DARK, margin: '9px 0 3px' }}>{T('Passés', 'Past', 'سابقة')}</div>
            <Row k="Dr K. Benali" v={T('12 juin', '12 June', '12 يونيو')} />
            <Row k="Dr S. Idrissi" v={T('3 mai', '3 May', '3 ماي')} />
          </div>
        </Phone>
      </div>
    </>
  );
}

// ═══ Avis vérifiés — un avis suppose une consultation terminée ══════════════
export function AvisVerifiesVisual({ lang = 'fr' }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  const review = (seed, name, when, stars, text) => (
    <div key={name} style={{ padding: '8px 0', borderTop: '1px solid #F1F5F3' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Avatar size={22} seed={seed} ring={false} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8, fontWeight: 900, color: DARK }}>{name}</div>
          <div style={{ fontSize: 6.5, color: MUTED, fontWeight: 700 }}>{when}</div>
        </div>
        <span style={{ fontSize: 8, fontWeight: 900, color: '#D9A400' }}>{'★'.repeat(stars)}</span>
      </div>
      <div style={{ fontSize: 7.5, color: BODY, lineHeight: 1.5, marginTop: 4 }}>{text}</div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 6.5, fontWeight: 800, color: GREEN, background: LIGHT, borderRadius: 20, padding: '2px 6px', marginTop: 4 }}>
        ✓ {T('Consultation vérifiée', 'Verified consultation', 'استشارة موثّقة')}
      </span>
    </div>
  );
  return (
    <>
      <Style />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>

        <div style={{ background: '#fff', borderRadius: 11, padding: 12, boxShadow: '0 10px 24px -16px rgba(9,50,38,.5)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: DARK, lineHeight: 1 }}>4,9</span>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#D9A400' }}>★★★★★</span>
            <span style={{ fontSize: 8, color: MUTED, fontWeight: 700 }}>128 {T('avis', 'reviews', 'رأي')}</span>
          </div>
          {[[5, 88], [4, 9], [3, 2], [2, 1], [1, 0]].map(([s, pct]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span style={{ fontSize: 7, color: MUTED, fontWeight: 800, width: 8 }}>{s}</span>
              <span style={{ flex: 1, height: 4, borderRadius: 2, background: '#F1F5F3', overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: '#D9A400', borderRadius: 2 }} />
              </span>
              <span style={{ fontSize: 6.5, color: MUTED, fontWeight: 700, width: 18, textAlign: 'right' }}>{pct} %</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 11, padding: 12, boxShadow: '0 10px 24px -16px rgba(9,50,38,.5)' }}>
          {review(3, 'Fatima Zahra B.', T('il y a 3 jours', '3 days ago', 'قبل 3 أيام'), 5,
            T('Ponctuelle, à l’écoute, explications claires. La réservation en ligne m’a évité trois appels.',
              'Punctual, attentive, clear explanations. Online booking saved me three phone calls.',
              'دقيقة في المواعيد، مُنصتة، شرح واضح. الحجز عبر الإنترنت وفّر عليّ ثلاث مكالمات.'))}
          {review(2, 'Karim T.', T('il y a 2 semaines', '2 weeks ago', 'قبل أسبوعين'), 5,
            T('Cabinet propre, peu d’attente. Le rappel WhatsApp la veille est très pratique.',
              'Clean practice, little waiting. The WhatsApp reminder the day before is very handy.',
              'عيادة نظيفة، انتظار قليل. تذكير واتساب في اليوم السابق مفيد جداً.'))}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: LIGHT, borderRadius: 11, padding: '10px 12px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z" /><path d="M9.5 12l1.8 1.8 3.4-3.4" />
          </svg>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 900, color: DARK }}>{T('Pourquoi ces avis sont fiables', 'Why these reviews are reliable', 'لماذا هذه الآراء موثوقة')}</div>
            <div style={{ fontSize: 7.5, color: BODY, fontWeight: 600, lineHeight: 1.5, marginTop: 2 }}>
              {T('Un avis n’est possible qu’après une consultation réellement terminée, et une seule fois par rendez-vous. La règle est appliquée par la base de données.',
                 'A review is only possible after a consultation that actually took place, once per appointment. The rule is enforced by the database.',
                 'لا يُمكن ترك رأي إلا بعد استشارة تمّت فعلاً، ومرة واحدة لكل موعد. القاعدة مطبَّقة في قاعدة البيانات.')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const HeroFloat = ({ side, top, bottom, icon, title, sub, delay, rtl, isMobile }) => (
  <div className="tb-anim" style={{
    position: 'absolute', top, bottom,
    [side === 'start' ? (rtl ? 'right' : 'left') : (rtl ? 'left' : 'right')]: isMobile ? 4 : -32,
    display: 'flex', alignItems: 'center', gap: 9, zIndex: 3,
    background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,.75)', borderRadius: 14, padding: '9px 12px',
    boxShadow: '0 18px 40px -16px rgba(6,40,30,.55)',
    animation: `tbSlide .55s cubic-bezier(.16,.8,.3,1) both ${delay}s, tbDrift 6.5s ease-in-out infinite ${delay + 0.6}s`,
  }}>
    <span style={{ width: 30, height: 30, borderRadius: 9, background: LIGHT, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: DARK, whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  </div>
);

// ═══ Accueil · le parcours de réservation, mis en scène ═════════════════════
/* Trois cartes de verre inclinées en perspective — la fiche vérifiée, le choix
   du créneau, le récapitulatif — reliées par un fil lumineux qui se trace dans
   l'ordre où le patient les traverse. Chaque carte est l'écran RÉEL (mêmes
   libellés que la page de réservation) ; seule la mise en scène est décorative :
   aurores, orbite, particules, reflet. */
export function HeroBookingVisual({ lang = 'fr', isMobile = false, rtl = false }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  const calm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const card = (extra) => ({
    position: 'absolute', background: 'rgba(255,255,255,.97)',
    border: '1px solid rgba(255,255,255,.85)', borderRadius: 16,
    boxShadow: '0 0 0 1px rgba(122,245,193,.14), 0 34px 60px -28px rgba(2,24,16,.75)',
    zIndex: 2, ...extra,
  });
  const badge = (n) => (
    <span style={{ position: 'absolute', top: -11, insetInlineStart: -11, width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(150deg,#16A06A,#0B5C3E)', color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px -6px rgba(4,40,26,.8), inset 0 1px 0 rgba(255,255,255,.35)' }}>{n}</span>
  );
  const SLOT = {
    free:   { bg: '#fff', bd: '#BFE3D0', fg: GREEN, deco: 'none' },
    taken:  { bg: '#F4F6F5', bd: '#E6EBE8', fg: '#A9B5B0', deco: 'line-through' },
    picked: { bg: GREEN, bd: GREEN, fg: '#fff', deco: 'none' },
  };
  const slot = (h, state, i = 0) => {
    const st = SLOT[state];
    return (
      <div key={h} className="tb-anim" style={{
        background: st.bg, border: `1px solid ${st.bd}`, color: st.fg, textDecoration: st.deco,
        borderRadius: 7, padding: '5.5px 0', textAlign: 'center', fontSize: 9, fontWeight: 800,
        animation: state === 'picked'
          ? 'tbPop .5s cubic-bezier(.16,.8,.3,1) both 1.5s, tbRing 2.6s ease-out infinite 2.1s'
          : `tbSlide .4s ease both ${0.7 + i * 0.05}s`,
        boxShadow: state === 'picked' ? '0 10px 18px -8px rgba(11,90,60,.95)' : 'none',
      }}>{h}</div>
    );
  };
  const recapRow = (k, v, strong) => (
    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid #F1F5F3', fontSize: 9.5 }}>
      <span style={{ color: MUTED, fontWeight: 600 }}>{k}</span>
      <span style={{ color: DARK, fontWeight: strong ? 900 : 700 }}>{v}</span>
    </div>
  );

  // La scène est composée en 560×430 puis mise à l'échelle : la perspective et
  // les ancres du fil lumineux restent justes à toutes les largeurs.
  const scale = isMobile ? 0.58 : 1;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Style />
      {/* Fond : dégradé profond + aurores + orbite en rotation lente. */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden',
        background: 'radial-gradient(130% 110% at 18% 0%, #17916A 0%, #0F6E56 40%, #082E23 100%)',
        boxShadow: '0 30px 70px -28px rgba(11,106,70,.75), inset 0 1px 0 rgba(255,255,255,.14)',
      }}>
        <span aria-hidden className="tb-anim" style={{ position: 'absolute', top: -80, right: -70, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(122,245,193,.35) 0%, rgba(122,245,193,0) 70%)', animation: 'tbHalo 7s ease-in-out infinite' }} />
        <span aria-hidden className="tb-anim" style={{ position: 'absolute', bottom: -90, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(90,220,255,.22) 0%, rgba(90,220,255,0) 70%)', animation: 'tbHalo 9s ease-in-out infinite 1.5s' }} />
        <span aria-hidden className="tb-anim" style={{ position: 'absolute', top: '50%', left: '50%', width: 460, height: 460, marginTop: -230, marginLeft: -230, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,.14)', animation: 'tbSpinSlow 60s linear infinite' }} />
        <span aria-hidden style={{
          position: 'absolute', inset: 0, opacity: .45,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(85% 75% at 50% 45%, #000 25%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(85% 75% at 50% 45%, #000 25%, transparent 100%)',
        }} />
        {/* particules */}
        {[[52, 60, 0], [500, 90, 1.2], [70, 330, 2.1], [480, 350, .6], [280, 30, 1.7]].map(([x, y, d]) => (
          <span key={x + '-' + y} aria-hidden className="tb-anim" style={{ position: 'absolute', left: x, top: y, width: 5, height: 5, borderRadius: '50%', background: 'rgba(160,255,214,.7)', boxShadow: '0 0 10px 2px rgba(160,255,214,.45)', animation: `tbDrift ${5.5 + d}s ease-in-out infinite ${d}s` }} />
        ))}
      </div>

      {/* Scène en perspective */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 560, height: 430, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, perspective: 1100 }}>

          {/* Fil lumineux 1 → 2 → 3, tracé dans l'ordre du parcours. */}
          <svg aria-hidden width="560" height="430" style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'visible' }}>
            <defs>
              <filter id="tbHeroGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path id="tbHeroPath" d="M170 128 C 270 152, 380 108, 428 168 C 468 220, 430 272, 340 298 C 312 306, 288 310, 264 316"
              fill="none" stroke="rgba(140,255,205,.95)" strokeWidth="3" strokeLinecap="round"
              filter="url(#tbHeroGlow)" pathLength="100" strokeDasharray="100" strokeDashoffset="100"
              className="tb-anim" style={{ animation: 'tbDraw 1.6s cubic-bezier(.4,0,.2,1) both .9s' }} />
            {!calm && (
              <circle r="4" fill="#B8FFD9" filter="url(#tbHeroGlow)">
                <animateMotion dur="4.5s" begin="2.6s" repeatCount="indefinite" rotate="none">
                  <mpath href="#tbHeroPath" />
                </animateMotion>
              </circle>
            )}
          </svg>

          {/* 1 · La fiche vérifiée */}
          <div className="tb-anim" style={card({ top: 20, insetInlineStart: 30, width: 234, padding: '13px 14px', transform: 'rotateY(10deg) rotateX(3deg)', animation: 'tbFade .6s ease both .15s' })}>
            {badge(1)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar size={44} seed={1} role="doctor" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 900, color: DARK }}>Dr Leila Marmioui</div>
                <div style={{ fontSize: 9.5, color: MUTED, fontWeight: 600 }}>{T('Gynécologue · Tanger', 'Gynaecologist · Tangier', 'طبيبة نساء · طنجة')}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <Chip>{T('Conventionné', 'Insurance-approved', 'مُتعاقد')}</Chip>
                  <Chip bg="#FEF6E7" fg="#9A6510">★ 4,8 · 128 {T('avis', 'reviews', 'رأي')}</Chip>
                </div>
              </div>
            </div>
          </div>

          {/* 2 · Le créneau */}
          <div className="tb-anim" style={card({ top: 108, insetInlineEnd: 20, width: 252, padding: '12px 13px 13px', transform: 'rotateY(-9deg) rotateX(2deg)', animation: 'tbFade .6s ease both .55s' })}>
            {badge(2)}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: DARK }}>{T('Août 2026', 'August 2026', 'غشت 2026')}</span>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: MUTED }}>{T('Choisissez une date et une heure', 'Pick a date and time', 'اختر التاريخ والساعة')}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {[['Lun', '10'], ['Mar', '11'], ['Mer', '12'], ['Jeu', '13'], ['Ven', '14']].map(([d, n], i) => (
                <div key={n} style={{ flex: 1, textAlign: 'center', borderRadius: 7, padding: '4px 0', background: i === 2 ? GREEN : '#F4F8F6', color: i === 2 ? '#fff' : MUTED, boxShadow: i === 2 ? '0 6px 14px -8px rgba(11,90,60,.9)' : 'none' }}>
                  <div style={{ fontSize: 6.5, fontWeight: 700, opacity: .85 }}>{d}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 900 }}>{n}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {slot('09:00', 'taken', 0)}{slot('09:30', 'free', 1)}{slot('10:00', 'free', 2)}
              {slot('10:30', 'picked', 3)}{slot('11:00', 'free', 4)}{slot('11:30', 'taken', 5)}
              {slot('12:00', 'free', 6)}{slot('12:30', 'free', 7)}{slot('14:00', 'free', 8)}
            </div>
          </div>

          {/* 3 · Le récapitulatif */}
          <div className="tb-anim" style={card({ bottom: 16, insetInlineStart: 74, width: 250, padding: '12px 14px 13px', transform: 'rotateY(7deg) rotateX(-2deg)', animation: 'tbFade .6s ease both 1.9s' })}>
            {badge(3)}
            {recapRow(T('Honoraires', 'Fee', 'الأتعاب'), '300 MAD', true)}
            {recapRow(T('Durée', 'Duration', 'المدة'), T('20 minutes', '20 minutes', '20 دقيقة'))}
            {recapRow(T('Paiement', 'Payment', 'الدفع'), T('Espèces · Carte · M-Wallet', 'Cash · Card · M-Wallet', 'نقداً · بطاقة · M-Wallet'))}
            <div className="tb-anim" style={{ marginTop: 10, background: 'linear-gradient(150deg,#16A06A 0%,#0E7C52 100%)', color: '#fff', borderRadius: 9, padding: '8px 0', textAlign: 'center', fontSize: 10, fontWeight: 900, boxShadow: '0 14px 24px -12px rgba(11,90,60,1)', animation: 'tbPop .5s cubic-bezier(.16,.8,.3,1) both 2.5s, tbRing 2.8s ease-out infinite 3.1s' }}>
              {T('Confirmer · 10:30', 'Confirm · 10:30', 'تأكيد · 10:30')}
            </div>
          </div>
        </div>
      </div>

      {!isMobile && (
        <>
          <HeroFloat side="end" top={16} delay={3.1} rtl={rtl} isMobile={isMobile}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
            title={T('Rendez-vous confirmé', 'Appointment confirmed', 'تم تأكيد الموعد')}
            sub={T('Mer. 12 août · 10:30', 'Wed 12 Aug · 10:30', 'الأربعاء 12 غشت · 10:30')} />
          <HeroFloat side="end" bottom={16} delay={3.6} rtl={rtl} isMobile={isMobile}
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>}
            title={T('Rappel WhatsApp', 'WhatsApp reminder', 'تذكير واتساب')}
            sub={T('La veille à 18:00', 'The day before at 6 PM', 'اليوم السابق على 18:00')} />
        </>
      )}
    </div>
  );
}

// ═══ Accueil · les trois scènes du parcours (sous « Comment ça marche ») ════
/* Même matière que le hero : panneau vert profond, halos, grille masquée,
   verre dépoli. Chaque scène illustre l'étape au-dessus d'elle avec les
   ÉCRANS réels — la carte du Maroc et les fiches pour la recherche, la grille
   de créneaux pour le choix, la conversation WhatsApp pour la confirmation. */

const SCENE_H = { desktop: 252, mobile: 216 };

function Scene({ children, isMobile }) {
  return (
    <div style={{
      position: 'relative', height: isMobile ? SCENE_H.mobile : SCENE_H.desktop,
      borderRadius: 20, overflow: 'hidden',
      background: 'radial-gradient(130% 115% at 20% 0%, #148363 0%, #0E6650 45%, #08291F 100%)',
      boxShadow: '0 24px 48px -24px rgba(9,52,39,.7), inset 0 1px 0 rgba(255,255,255,.13)',
    }}>
      <Style />
      <span aria-hidden className="tb-anim" style={{ position: 'absolute', top: -60, right: -50, width: 190, height: 190, borderRadius: '50%', background: 'radial-gradient(circle, rgba(122,245,193,.30) 0%, rgba(122,245,193,0) 70%)', animation: 'tbHalo 7s ease-in-out infinite' }} />
      <span aria-hidden style={{
        position: 'absolute', inset: 0, opacity: .4,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(90% 80% at 50% 45%, #000 25%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(90% 80% at 50% 45%, #000 25%, transparent 100%)',
      }} />
      {children}
    </div>
  );
}

/* Silhouette stylisée du Maroc (Sahara compris), tracée en « low-poly » :
   points projetés depuis les vraies latitudes/longitudes, arêtes franches,
   contour lumineux. Les capitales de la couverture pulsent dessus. */
const MA_OUTLINE = 'M211 8 L264 17 L283 26 L296 78 L237 82 L211 114 L171 126 L158 166 L158 294 L6 300 L23 246 L50 198 L75 177 L80 162 L130 132 L141 112 L138 90 L178 49 L192 40 L197 35 L205 16 Z';
const MA_PINS = [
  [178, 49], [192, 40], [170, 87], [208, 12], [226, 39], [141, 112], [278, 28], [75, 177], [26, 246],
];

function StepSearchVisual({ T, isMobile }) {
  return (
    <Scene isMobile={isMobile}>
      {/* la carte, légèrement inclinée — un plateau, pas un document */}
      <svg viewBox="0 0 300 310" aria-hidden style={{ position: 'absolute', insetInlineEnd: 4, top: 4, height: 'calc(100% - 8px)', transform: 'rotate(4deg)', opacity: .96 }}>
        <path d={MA_OUTLINE} fill="rgba(122,245,193,.09)" stroke="rgba(140,255,205,.75)" strokeWidth="2" strokeLinejoin="round" />
        <path d={MA_OUTLINE} fill="none" stroke="rgba(140,255,205,.22)" strokeWidth="7" strokeLinejoin="round" />
        {MA_PINS.map(([x, y], i) => (
          <g key={i} className="tb-anim">
            <circle cx={x} cy={y} r="7" fill="rgba(122,245,193,.25)" style={{ animation: `tbPulse ${2 + (i % 3) * .5}s ease-in-out infinite ${i * .3}s`, transformOrigin: `${x}px ${y}px` }} />
            <circle cx={x} cy={y} r="2.6" fill="#B8FFD9" />
          </g>
        ))}
      </svg>

      {/* la recherche tapée… */}
      <div className="tb-anim" style={{ position: 'absolute', top: 14, insetInlineStart: 12, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.96)', borderRadius: 20, padding: '7px 12px', boxShadow: '0 14px 28px -14px rgba(2,24,16,.8)', animation: 'tbSlide .5s ease both .2s' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.6" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <span style={{ fontSize: 10, fontWeight: 800, color: DARK }}>{T('Cardiologue · Casablanca', 'Cardiologist · Casablanca', 'طبيب القلب · الدار البيضاء')}</span>
      </div>

      {/* …fait surgir la fiche du médecin, reliée à sa ville */}
      <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <line x1="46%" y1="62%" x2="72%" y2="24%" stroke="rgba(140,255,205,.6)" strokeWidth="1.6" strokeDasharray="4 4" className="tb-anim" style={{ animation: 'tbSlide .01s both 1s' }} />
      </svg>
      <div className="tb-anim" style={{ position: 'absolute', bottom: 16, insetInlineStart: 12, width: 168, background: 'rgba(255,255,255,.97)', borderRadius: 13, padding: '10px 11px', boxShadow: '0 0 0 1px rgba(122,245,193,.16), 0 22px 40px -20px rgba(2,24,16,.9)', animation: 'tbPop .55s cubic-bezier(.16,.8,.3,1) both .9s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={34} seed={3} role="doctor" ring={false} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: DARK }}>Dr Aya Chakkour</div>
            <div style={{ fontSize: 8, color: MUTED, fontWeight: 700 }}>{T('Cardiologue · 4,9 ★', 'Cardiologist · 4.9 ★', 'طبيبة القلب · 4,9 ★')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
          <Chip>{T('INPE vérifié', 'INPE verified', 'INPE موثّق')}</Chip>
          <Chip bg="#FEF6E7" fg="#9A6510">{T('Auj. 14:30', 'Today 2:30', 'اليوم 14:30')}</Chip>
        </div>
      </div>

      {/* le repère qui relie la scène au chiffre de la page */}
      <div className="tb-anim" style={{ position: 'absolute', bottom: 14, insetInlineEnd: 12, background: 'rgba(6,30,24,.55)', border: '1px solid rgba(140,255,205,.35)', borderRadius: 20, padding: '4px 10px', fontSize: 8.5, fontWeight: 800, color: '#B8FFD9', backdropFilter: 'blur(4px)', animation: 'tbSlide .5s ease both 1.4s' }}>
        {T('72 villes couvertes', '72 cities covered', '72 مدينة مغطاة')}
      </div>
    </Scene>
  );
}

function StepSlotVisual({ T, isMobile }) {
  const SL = {
    free:   { bg: '#fff', bd: '#BFE3D0', fg: GREEN, deco: 'none' },
    taken:  { bg: '#F4F6F5', bd: '#E6EBE8', fg: '#A9B5B0', deco: 'line-through' },
    picked: { bg: GREEN, bd: GREEN, fg: '#fff', deco: 'none' },
  };
  const cell = (h, st, i) => (
    <div key={h} className="tb-anim" style={{
      background: SL[st].bg, border: `1px solid ${SL[st].bd}`, color: SL[st].fg, textDecoration: SL[st].deco,
      borderRadius: 7, padding: '5px 0', textAlign: 'center', fontSize: 8.5, fontWeight: 800,
      animation: st === 'picked' ? 'tbPop .5s cubic-bezier(.16,.8,.3,1) both 1.2s, tbRing 2.6s ease-out infinite 1.8s' : `tbSlide .4s ease both ${.3 + i * .06}s`,
      boxShadow: st === 'picked' ? '0 10px 18px -8px rgba(11,90,60,.95)' : 'none',
    }}>{h}</div>
  );
  return (
    <Scene isMobile={isMobile}>
      {/* orbite décorative derrière la carte */}
      <span aria-hidden className="tb-anim" style={{ position: 'absolute', top: '50%', left: '50%', width: 300, height: 300, marginTop: -150, marginLeft: -150, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,.14)', animation: 'tbSpinSlow 50s linear infinite' }} />
      <div className="tb-anim" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 196, background: 'rgba(255,255,255,.97)', borderRadius: 14, padding: '11px 12px 12px', boxShadow: '0 0 0 1px rgba(122,245,193,.16), 0 26px 48px -22px rgba(2,24,16,.95)', animation: 'tbFade .55s ease both .15s' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 7 }}>
          {[['Mar', '11'], ['Mer', '12'], ['Jeu', '13']].map(([d, n], i) => (
            <div key={n} style={{ flex: 1, textAlign: 'center', borderRadius: 7, padding: '3.5px 0', background: i === 1 ? GREEN : '#F4F8F6', color: i === 1 ? '#fff' : MUTED, boxShadow: i === 1 ? '0 6px 14px -8px rgba(11,90,60,.9)' : 'none' }}>
              <div style={{ fontSize: 6.5, fontWeight: 700, opacity: .85 }}>{d}</div>
              <div style={{ fontSize: 9.5, fontWeight: 900 }}>{n}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {cell('09:00', 'taken', 0)}{cell('09:30', 'free', 1)}{cell('10:00', 'free', 2)}
          {cell('10:30', 'picked', 3)}{cell('11:00', 'free', 4)}{cell('11:30', 'taken', 5)}
        </div>
      </div>
      <div className="tb-anim" style={{ position: 'absolute', top: 12, insetInlineEnd: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(6,30,24,.55)', border: '1px solid rgba(140,255,205,.35)', borderRadius: 20, padding: '4px 10px', backdropFilter: 'blur(4px)', animation: 'tbSlide .5s ease both 1.6s' }}>
        <Dot s={5} />
        <span style={{ fontSize: 8.5, fontWeight: 800, color: '#B8FFD9' }}>{T('Agenda en direct — créneaux réellement libres', 'Live diary — genuinely free slots', 'مفكرة مباشرة — مواعيد شاغرة فعلاً')}</span>
      </div>
    </Scene>
  );
}

function StepConfirmVisual({ T, isMobile }) {
  return (
    <Scene isMobile={isMobile}>
      {/* le grand ✓ qui se dessine */}
      <svg aria-hidden width="72" height="72" viewBox="0 0 72 72" style={{ position: 'absolute', top: 14, insetInlineStart: 14 }}>
        <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(140,255,205,.85)" strokeWidth="3" pathLength="100" strokeDasharray="100" strokeDashoffset="100" className="tb-anim" style={{ animation: 'tbDraw 1s cubic-bezier(.4,0,.2,1) both .3s' }} />
        <path d="M23 37l9 9 17-18" fill="none" stroke="#B8FFD9" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" pathLength="100" strokeDasharray="100" strokeDashoffset="100" className="tb-anim" style={{ animation: 'tbDraw .5s ease-out both 1.2s' }} />
      </svg>

      {/* la conversation WhatsApp, telle que le patient la reçoit */}
      <div style={{ position: 'absolute', insetInlineEnd: 12, top: 16, bottom: 16, width: 190, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7 }}>
        <div className="tb-anim" style={{ background: '#E9FBEF', borderRadius: '12px 12px 4px 12px', padding: '8px 10px', boxShadow: '0 16px 30px -16px rgba(2,24,16,.9)', animation: 'tbSlide .5s ease both .5s' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: DARK }}>{T('Rendez-vous confirmé ✓', 'Appointment confirmed ✓', 'تم تأكيد الموعد ✓')}</div>
          <div style={{ fontSize: 8, color: BODY, fontWeight: 600, marginTop: 2, lineHeight: 1.5 }}>
            {T('Dr Leila Marmioui — mer. 12 août à 10:30, Clinique du Parc, Tanger.', 'Dr Leila Marmioui — Wed 12 Aug, 10:30, Clinique du Parc, Tangier.', 'د. ليلى مرميوي — الأربعاء 12 غشت 10:30، مصحة الحديقة، طنجة.')}
          </div>
          <div style={{ textAlign: 'end', fontSize: 7, color: '#53BDEB', fontWeight: 900, marginTop: 2 }}>✓✓ 10:31</div>
        </div>
        <div className="tb-anim" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.97)', borderRadius: '12px 12px 12px 4px', padding: '7px 10px', boxShadow: '0 16px 30px -16px rgba(2,24,16,.9)', animation: 'tbSlide .5s ease both 1.5s' }}>
          <span style={{ width: 24, height: 24, borderRadius: 8, background: LIGHT, color: GREEN, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          </span>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 900, color: DARK }}>{T('Rappel automatique', 'Automatic reminder', 'تذكير تلقائي')}</div>
            <div style={{ fontSize: 7.5, color: MUTED, fontWeight: 700 }}>{T('La veille à 18:00 — WhatsApp', 'The day before at 6 PM — WhatsApp', 'اليوم السابق 18:00 — واتساب')}</div>
          </div>
        </div>
      </div>

      {[[30, 118, 0], [72, 138, .8], [46, 160, 1.6]].map(([x, y, d]) => (
        <span key={x} aria-hidden className="tb-anim" style={{ position: 'absolute', insetInlineStart: x, top: y, width: 5, height: 5, borderRadius: '50%', background: 'rgba(160,255,214,.75)', boxShadow: '0 0 10px 2px rgba(160,255,214,.4)', animation: `tbDrift ${5 + d}s ease-in-out infinite ${d}s` }} />
      ))}
      <div className="tb-anim" style={{ position: 'absolute', bottom: 13, insetInlineStart: 14, fontSize: 8.5, fontWeight: 800, color: 'rgba(255,255,255,.75)', animation: 'tbSlide .5s ease both 2s' }}>
        {T('Aucune application à installer', 'No app to install', 'دون تثبيت أي تطبيق')}
      </div>
    </Scene>
  );
}

export function WorkflowStepVisual({ step = 0, lang = 'fr', isMobile = false }) {
  const T = (fr, en, ar) => tr(lang, fr, en, ar);
  if (step === 1) return <StepSlotVisual T={T} isMobile={isMobile} />;
  if (step === 2) return <StepConfirmVisual T={T} isMobile={isMobile} />;
  return <StepSearchVisual T={T} isMobile={isMobile} />;
}

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

/* Portrait dessiné — géométrique, sans prétention photographique. `seed` change
   la carnation, la coiffure et la tenue pour que deux portraits ne soient pas
   le même visage recoloré. */
const Avatar = ({ size = 46, seed = 0, ring = true }) => {
  const skins  = ['#E4B98F', '#C98F63', '#A9714A', '#EFCBA6'];
  const hairs  = ['#2E2622', '#1C1714', '#4A342A', '#241C18'];
  const wears  = ['#0E7C52', '#1C6FA8', '#7A4A8C', '#0C6B62'];
  const skin = skins[seed % skins.length];
  const hair = hairs[seed % hairs.length];
  const wear = wears[seed % wears.length];
  const scarf = seed % 2 === 1;               // hijab sur un portrait sur deux
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="tb-anim"
      style={{ display: 'block', borderRadius: '50%', background: LIGHT, ...(ring ? { boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${GREEN}` } : {}) }}
      role="img" aria-label="Portrait illustré">
      <g style={{ animation: 'tbBreathe 4.2s ease-in-out infinite' }}>
        {/* épaules */}
        <path d="M10 64c0-11.5 9.8-17 22-17s22 5.5 22 17z" fill={wear} />
        <path d="M27 47h10v7a5 5 0 0 1-10 0z" fill={skin} />
        {scarf
          ? <path d="M32 10c-11 0-17 8-17 18 0 8 3 13 6 16l-4 5h30l-4-5c3-3 6-8 6-16 0-10-6-18-17-18z" fill={wear} opacity=".92" />
          : <path d="M15 27c0-11 7-17 17-17s17 6 17 17c0 3-1 5-1 5l-2-9-14-4-14 6z" fill={hair} />}
        {/* visage */}
        <ellipse cx="32" cy="30" rx="12.5" ry="14" fill={skin} />
        {/* yeux — clignement lent */}
        <g style={{ animation: 'tbBlink 6.5s ease-in-out infinite', transformOrigin: '32px 29px' }}>
          <ellipse cx="27" cy="29" rx="1.5" ry="1.9" fill="#2A2320" />
          <ellipse cx="37" cy="29" rx="1.5" ry="1.9" fill="#2A2320" />
        </g>
        <path d="M28.5 36.5c1.6 1.5 5.4 1.5 7 0" stroke="#8A5A48" strokeWidth="1.4" fill="none" strokeLinecap="round" />
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
              <Avatar size={44} seed={1} />
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
            <div style={{ position: 'absolute', insetInlineStart: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(6,30,24,.62)', borderRadius: 20, padding: '3px 8px' }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>Mme Fatima Zahra B.</span>
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
                <Avatar size={36} seed={1} ring={false} />
              </div>
              <div style={{ fontSize: 6, fontWeight: 800, color: '#fff', textAlign: 'center', padding: '0 0 3px' }}>{T('Vous', 'You', 'أنتم')}</div>
            </div>

            {/* commandes */}
            <div style={{ position: 'absolute', insetInline: 0, bottom: 8, display: 'flex', justifyContent: 'center', gap: 6 }}>
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
              <Avatar size={22} seed={i + 2} ring={false} />
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
            <Avatar size={20} seed={2} ring={false} />
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
      {items.map((m) => (
        <div key={m.big} style={{
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

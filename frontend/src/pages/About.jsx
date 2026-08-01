import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { I18N, CITY_OPTS } from '../shared.jsx';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { MetricBand } from '../components/PitchMockups.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// « À propos ». Réécrite pour porter le sérieux du service : ce que fait Tabibo,
// pour qui, ce qui le distingue, comment il tient ses promesses de sécurité, et
// où en est le projet — sans inventer de chiffres d'usage avant le lancement.
//
// La page reprend la grammaire visuelle des pages « Pour les patients » et
// « Pour les médecins » : le bandeau de repères teintés (MetricBand, partagé),
// les halos décalés, la même famille de couleurs. Rien de fabriqué : les
// chiffres du bandeau sont des capacités vérifiables (villes, spécialités,
// disponibilité, langues), pas des résultats mesurés.
// ─────────────────────────────────────────────────────────────────────────────

const DARK  = '#15314A';
const BODY  = '#3A4A45';
const MUTED = '#6B7B76';
const GREEN = '#0E7C52';
// Liseré des cartes de repères : le contour reprenait la teinte du fond,
// donc invisible sur blanc. Un vert franc redonne un bord net à la carte.
const CARD_EDGE = '#8CCCAE';
const BG    = '#F4F8F5';

const tr = (lang, fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

// Jeu d'icônes en trait, cohérent avec le reste du site.
const IC = { w: 22, h: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const I = {
  building: <svg {...IC}><path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16" /><path d="M12 9h7a1 1 0 0 1 1 1v11" /><path d="M7 8h1M7 12h1M7 16h1M15 13h1M15 17h1" /></svg>,
  stetho:   <svg {...IC}><path d="M6 3v6a5 5 0 0 0 10 0V3" /><path d="M4 3h3M15 3h3" /><path d="M11 14v2a5 5 0 0 0 10 0v-1" /><circle cx="21" cy="13" r="2" /></svg>,
  clock:    <svg {...IC}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.2V12l3.4 2.2" /></svg>,
  globe:    <svg {...IC}><circle cx="12" cy="12" r="8.6" /><path d="M3.4 12h17.2" /><path d="M12 3.4c2.2 2.4 3.4 5.4 3.4 8.6s-1.2 6.2-3.4 8.6c-2.2-2.4-3.4-5.4-3.4-8.6S9.8 5.8 12 3.4z" /></svg>,
  target:   <svg {...IC}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></svg>,
  shield:   <svg {...IC}><path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z" /><path d="M9.5 12l1.8 1.8 3.4-3.4" /></svg>,
  heart:    <svg {...IC}><path d="M12 20.6l-1.6-1.5C5.4 14.6 2.5 12 2.5 8.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 9.5 2.8c0 3.2-2.9 5.8-7.9 10.3z" /></svg>,
  moon:     <svg {...IC}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z" /></svg>,
  users:    <svg {...IC}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17 20a5.5 5.5 0 0 0-2.5-4.6" /></svg>,
  lock:     <svg {...IC}><rect x="4" y="10" width="16" height="11" rx="2.2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>,
  scale:    <svg {...IC}><path d="M12 3v18M7 21h10" /><path d="M12 5L5 8l-2.5 5a3 3 0 0 0 6 0L6 8M12 5l7 3 2.5 5a3 3 0 0 1-6 0L18 8" /></svg>,
  check:    <svg {...IC}><path d="M20 6L9 17l-5-5" /></svg>,
  spark:    <svg {...IC}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>,
};

const Eyebrow = ({ children }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: GREEN, letterSpacing: '0.3px', textTransform: 'none', marginBottom: 12 }}>
    <span style={{ width: 18, height: 2, borderRadius: 2, background: GREEN, opacity: 0.6 }} />
    {children}
  </div>
);

const SectionTitle = ({ children, isMobile }) => (
  <h2 style={{ fontSize: isMobile ? 25 : 34, fontWeight: 800, color: DARK, letterSpacing: '-0.6px', lineHeight: 1.2, margin: 0 }}>{children}</h2>
);

export default function About() {
  const { state, go } = useApp();
  const { lang } = state;
  const t = (fr, en, ar) => tr(lang, fr, en, ar);
  const T = I18N[lang] || I18N.fr;
  const dir = T.dir || 'ltr';
  const { isMobile } = useViewport();
  const wrap = { maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' };

  // Trois piliers du produit — chacun avec son sujet et son grain de couleur.
  const pillars = [
    { icon: I.target, tint: '#C7E9D8', color: '#0E7C52',
      title: t('Notre mission', 'Our mission', 'مهمتنا'),
      desc: t('Rendre la prise de rendez-vous médical au Maroc aussi simple qu’un message : trouver le bon praticien, réserver en quelques secondes, être rappelé — sans file d’attente téléphonique, à toute heure.',
              'Make booking a doctor in Morocco as simple as sending a message: find the right practitioner, book in seconds, get reminded — no phone queues, any time.',
              'جعل حجز موعد طبي في المغرب بسهولة إرسال رسالة: إيجاد الطبيب المناسب، الحجز في ثوانٍ، والتذكير — دون انتظار هاتفي، في أي وقت.') },
    { icon: I.shield, tint: '#C7E9D8', color: '#0E7C52',
      title: t('Confiance et sécurité', 'Trust and security', 'الثقة والأمان'),
      desc: t('Chaque profil de médecin est vérifié avant publication — INPE et diplômes contrôlés. Les données de santé sont cloisonnées cabinet par cabinet, par la base de données elle-même, dans le cadre de la loi 09-08 et sous le contrôle de la CNDP.',
              'Every doctor profile is verified before publication — INPE and diplomas checked. Health data is partitioned practice by practice, by the database itself, within Law 09-08 and under CNDP oversight.',
              'يتم التحقق من كل ملف طبيب قبل النشر — INPE والشهادات. البيانات الصحية معزولة لكل عيادة، من قاعدة البيانات نفسها، في إطار القانون 09-08 وتحت إشراف CNDP.') },
    { icon: I.heart, tint: '#C7E9D8', color: '#0E7C52',
      title: t('Proximité patient', 'Patient proximity', 'القرب من المريض'),
      desc: t('Réservation pour soi ou pour un proche, en français comme en arabe, avec les heures de prière respectées dans l’agenda et le rappel envoyé sur WhatsApp — les usages réels du Maroc, pas une traduction.',
              'Book for yourself or a relative, in French or Arabic, with prayer times respected in the calendar and the reminder sent over WhatsApp — Morocco’s real habits, not a translation.',
              'الحجز لنفسك أو لأحد أقاربك، بالفرنسية أو العربية، مع احترام أوقات الصلاة في الأجندة والتذكير عبر واتساب — عادات المغرب الحقيقية، لا ترجمة.') },
  ];

  // Ce qui distingue Tabibo — liste concrète, vérifiable.
  const distinctives = [
    { icon: I.check, title: t('Médecins vérifiés', 'Verified doctors', 'أطباء موثّقون'),
      desc: t('INPE et diplômes contrôlés avant qu’un profil n’apparaisse dans l’annuaire.', 'INPE and diplomas checked before a profile appears in the directory.', 'التحقق من INPE والشهادات قبل ظهور الملف في الدليل.') },
    { icon: I.moon, title: t('Pensé pour le Maroc', 'Built for Morocco', 'مصمَّم للمغرب'),
      desc: t('Dirham, CNSS/CNOPS, heures de prière, français et arabe, rappel WhatsApp.', 'Dirham, CNSS/CNOPS, prayer times, French and Arabic, WhatsApp reminders.', 'الدرهم، CNSS/CNOPS، أوقات الصلاة، الفرنسية والعربية، تذكير واتساب.') },
    { icon: I.lock, title: t('Données cloisonnées', 'Partitioned data', 'بيانات معزولة'),
      desc: t('L’isolement entre cabinets est appliqué par la base, pas seulement par l’écran.', 'Isolation between practices is enforced by the database, not just the screen.', 'العزل بين العيادات مطبَّق من قاعدة البيانات، لا من الشاشة فقط.') },
    { icon: I.users, title: t('Pour toute la famille', 'For the whole family', 'لكل العائلة'),
      desc: t('Réservez pour un enfant ou un parent depuis un seul compte.', 'Book for a child or a parent from a single account.', 'احجز لطفل أو والد من حساب واحد.') },
    { icon: I.clock, title: t('Disponible en continu', 'Always available', 'متاح باستمرار'),
      desc: t('Réservation en ligne 24 h/24, un créneau libéré redevient réservable à l’instant.', 'Online booking around the clock; a freed slot becomes bookable instantly.', 'حجز على مدار الساعة؛ الموعد المُلغى يصبح متاحاً فوراً.') },
    { icon: I.scale, title: t('Gratuit pour les patients', 'Free for patients', 'مجاني للمرضى'),
      desc: t('Aucun frais de réservation. Le patient ne paie que sa consultation, au cabinet.', 'No booking fee. The patient only pays for the consultation, at the practice.', 'لا رسوم حجز. يدفع المريض ثمن الاستشارة فقط، في العيادة.') },
  ];

  // Parcours en trois temps, côté patient.
  const journey = [
    { n: '01', tint: '#C7E9D8', color: '#0E7C52', title: t('Trouver', 'Find', 'ابحث'),
      desc: t('Cherchez par spécialité et par ville. Chaque profil affiche tarifs, langues et conventions.', 'Search by specialty and city. Each profile shows fees, languages and coverage.', 'ابحث حسب التخصص والمدينة. يعرض كل ملف الأسعار واللغات والتغطية.') },
    { n: '02', tint: '#C7E9D8', color: '#0E7C52', title: t('Réserver', 'Book', 'احجز'),
      desc: t('Choisissez un créneau réellement libre, pour vous ou pour un proche, en quelques secondes.', 'Pick a genuinely free slot, for yourself or a relative, in seconds.', 'اختر موعداً متاحاً فعلاً، لك أو لأحد أقاربك، في ثوانٍ.') },
    { n: '03', tint: '#C7E9D8', color: '#0E7C52', title: t('Être suivi', 'Be followed up', 'تابع'),
      desc: t('Confirmation immédiate, rappel avant l’échéance, et vos documents regroupés dans votre espace.', 'Immediate confirmation, a reminder before the date, and your documents in one place.', 'تأكيد فوري، تذكير قبل الموعد، ووثائقكم في مكان واحد.') },
  ];

  return (
    <div dir={dir} style={{ fontFamily: 'Inter, sans-serif', background: '#fff', minHeight: '100vh' }}>
      <MarketingHeader activeKey="about" audience="patient" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(180deg, #EAF6F0 0%, #F4F8F5 100%)', padding: isMobile ? '46px 16px 44px' : '84px 24px 72px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#D4F0E5', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#0D7A50', marginBottom: 20 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 4 13c0-5 3-8 9-9 0 4-1 6-4 7" /><path d="M11 20c0-4 2-7 6-8" /></svg>
            <span>{t('À propos de Tabibo', 'About Tabibo', 'عن Tabibo')}</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 29 : 42, fontWeight: 800, color: DARK, lineHeight: 1.13, margin: '0 0 18px', letterSpacing: '-0.6px' }}>
            {t('Faciliter l’accès aux soins au Maroc', 'Making healthcare accessible across Morocco', 'تيسير الوصول إلى العلاج في المغرب')}
          </h1>
          <p style={{ fontSize: isMobile ? 15.5 : 17.5, color: BODY, lineHeight: 1.68, margin: '0 auto', maxWidth: 580 }}>
            {t('Tabibo est une plateforme numérique marocaine qui relie les patients aux médecins — simplement, rapidement et en sécurité, à toute heure et partout au Maroc.',
               'Tabibo is a Moroccan digital platform connecting patients with doctors — simply, quickly and securely, any time, anywhere in Morocco.',
               'Tabibo منصة رقمية مغربية تربط المرضى بالأطباء — ببساطة وسرعة وأمان، في أي وقت وأي مكان في المغرب.')}
          </p>
        </div>
      </section>

      {/* ── Bandeau de repères (teintes partagées avec les autres pages) ── */}
      <section style={{ background: '#fff', padding: isMobile ? '26px 0 6px' : '58px 0 12px' }}>
        <div style={wrap}>
          <MetricBand
            isMobile={isMobile}
            cols={4}
            items={[
              { big: `${CITY_OPTS.length}`, icon: I.building, tint: '#C7E9D8', color: '#0E7C52',
                sub: t('villes du Maroc couvertes', 'Moroccan cities covered', 'مدينة مغربية مغطاة') },
              { big: '50+', icon: I.stetho, tint: '#C7E9D8', color: '#0E7C52',
                sub: t('spécialités médicales', 'medical specialties', 'تخصصاً طبياً') },
              { big: '24 h/24', icon: I.clock, tint: '#C7E9D8', color: '#0E7C52',
                sub: t('réservation en ligne, sans appeler', 'online booking, without calling', 'حجز عبر الإنترنت، دون اتصال') },
              { big: t('2 langues', '2 languages', 'لغتان'), icon: I.globe, tint: '#C7E9D8', color: '#0E7C52',
                sub: t('français et arabe, l’écran suit le patient', 'French and Arabic, the screen follows the patient', 'الفرنسية والعربية، تتبع الواجهة المريض') },
            ]}
            note={t('Ce sont des capacités du produit — villes desservies, spécialités, disponibilité, langues — et non des résultats d’usage : Tabibo ouvre.',
                    'These are product capabilities — cities served, specialties, availability, languages — not usage results: Tabibo is launching.',
                    'هذه قدرات المنتج — المدن، التخصصات، التوفر، اللغات — وليست نتائج استعمال: Tabibo في طور الإطلاق.')}
          />
        </div>
      </section>

      {/* ── Trois piliers ───────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '28px 0 6px' : '64px 0 16px' }}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 20 : 44 }}>
            <Eyebrow>{t('Ce qui nous guide', 'What guides us', 'ما يوجّهنا')}</Eyebrow>
            <SectionTitle isMobile={isMobile}>{t('Trois engagements, tenus par le produit', 'Three commitments, kept by the product', 'ثلاثة التزامات، يحفظها المنتج')}</SectionTitle>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 16 : 24 }}>
            {pillars.map((p) => (
              <div key={p.title} style={{
                position: 'relative', overflow: 'hidden',
                background: `linear-gradient(160deg, ${p.tint} 0%, #E3F5EC 100%)`,
                border: `1px solid ${CARD_EDGE}`, borderRadius: 20,
                padding: isMobile ? '24px 22px' : '30px 28px',
                boxShadow: '0 1px 2px rgba(16,42,32,0.05), 0 20px 44px -28px rgba(11,90,60,0.55)',
              }}>
                <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -34, top: -46, width: 130, height: 130, borderRadius: '50%', background: p.color, opacity: 0.055 }} />
                <span style={{ position: 'relative', display: 'inline-flex', width: 48, height: 48, borderRadius: 14, background: '#fff', color: p.color, alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: `0 10px 22px -12px ${p.color}` }}>{p.icon}</span>
                <h3 style={{ position: 'relative', fontSize: isMobile ? 18 : 20, fontWeight: 800, color: DARK, margin: '0 0 10px', letterSpacing: '-0.3px' }}>{p.title}</h3>
                <p style={{ position: 'relative', fontSize: 14.5, color: BODY, lineHeight: 1.62, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parcours patient ────────────────────────────────────────────── */}
      <section style={{ background: BG, padding: isMobile ? '30px 0' : '72px 0', marginTop: isMobile ? 40 : 64 }}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 22 : 48 }}>
            <Eyebrow>{t('Le parcours', 'The journey', 'المسار')}</Eyebrow>
            <SectionTitle isMobile={isMobile}>{t('Du besoin de soin au suivi, en trois temps', 'From needing care to follow-up, in three steps', 'من الحاجة إلى الرعاية إلى المتابعة، في ثلاث خطوات')}</SectionTitle>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 16 : 26 }}>
            {journey.map((j) => (
              <div key={j.n} style={{
                position: 'relative', overflow: 'hidden',
                background: `linear-gradient(160deg, ${j.tint} 0%, #E3F5EC 100%)`,
                border: `1px solid ${CARD_EDGE}`, borderRadius: 20,
                padding: isMobile ? '26px 24px' : '34px 30px',
                boxShadow: '0 2px 10px -4px rgba(13,43,30,0.09), 0 20px 40px -30px rgba(11,90,60,0.5)',
              }}>
                <div style={{ position: 'absolute', top: 14, insetInlineEnd: 22, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 46, fontWeight: 800, color: j.color, opacity: 0.13, lineHeight: 1 }}>{j.n}</div>
                <span style={{ position: 'relative', display: 'inline-flex', width: 40, height: 40, borderRadius: 12, background: '#fff', color: j.color, alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: `0 8px 18px -10px ${j.color}`, fontSize: 17, fontWeight: 900 }}>{j.n.slice(1)}</span>
                <h3 style={{ position: 'relative', fontSize: isMobile ? 18 : 20, fontWeight: 800, color: DARK, margin: '0 0 9px' }}>{j.title}</h3>
                <p style={{ position: 'relative', fontSize: 14.5, color: BODY, lineHeight: 1.62, margin: 0 }}>{j.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ce qui distingue Tabibo ─────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '30px 0' : '72px 0' }}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 22 : 48 }}>
            <Eyebrow>{t('Ce qui nous distingue', 'What sets us apart', 'ما يميّزنا')}</Eyebrow>
            <SectionTitle isMobile={isMobile}>{t('Une plateforme pensée ici, pour ici', 'A platform built here, for here', 'منصة صُمّمت هنا، لأجل هنا')}</SectionTitle>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 12 : 20 }}>
            {distinctives.map((d) => (
              <div key={d.title} style={{ position: 'relative', overflow: 'hidden', display: 'flex', gap: 14, alignItems: 'flex-start', background: 'linear-gradient(160deg, #C7E9D8 0%, #E3F5EC 100%)', border: `1px solid ${CARD_EDGE}`, borderRadius: 18, padding: isMobile ? '18px 18px' : '22px 22px', boxShadow: '0 1px 2px rgba(16,42,32,0.05), 0 16px 34px -24px rgba(11,90,60,0.5)' }}>
                <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -30, top: -44, width: 120, height: 120, borderRadius: '50%', background: GREEN, opacity: 0.055 }} />
                <span style={{ flexShrink: 0, display: 'inline-flex', width: 40, height: 40, borderRadius: 11, background: '#fff', color: GREEN, alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px -12px rgba(14,124,82,0.9)' }}>{d.icon}</span>
                <div>
                  <h3 style={{ fontSize: 15.5, fontWeight: 800, color: DARK, margin: '2px 0 6px' }}>{d.title}</h3>
                  <p style={{ fontSize: 13.5, color: BODY, lineHeight: 1.55, margin: 0 }}>{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parole de l'éditeur ─────────────────────────────────────────── */}
      <section style={{ background: '#EAF4EF', padding: isMobile ? '30px 0' : '68px 0' }}>
        <div style={{ ...wrap, maxWidth: 860, textAlign: 'center' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill={GREEN} opacity="0.22" style={{ display: 'block', margin: '0 auto 14px' }}>
            <path d="M9.5 5C6 5 3.2 7.9 3.2 11.4c0 3.2 2.4 5.6 5.4 5.6.5 0 1-.1 1.4-.2-.6 1.4-2 2.4-3.7 2.6l.5 2.6c4.2-.5 7.2-4 7.2-9.2C14 7.6 12 5 9.5 5zm10 0C16 5 13.2 7.9 13.2 11.4c0 3.2 2.4 5.6 5.4 5.6.5 0 1-.1 1.4-.2-.6 1.4-2 2.4-3.7 2.6l.5 2.6c4.2-.5 7.2-4 7.2-9.2C24 7.6 22 5 19.5 5z" />
          </svg>
          <p style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: DARK, lineHeight: 1.5, margin: 0, letterSpacing: '-0.3px' }}>
            {t('Tabibo est né au Maroc, pour les cabinets et les patients marocains. Le dirham, la CNSS, les heures de prière, le français et l’arabe, le rappel par WhatsApp : rien n’a été traduit — tout a été pensé ici.',
               'Tabibo was born in Morocco, for Moroccan practices and patients. The dirham, CNSS, prayer times, French and Arabic, the WhatsApp reminder: nothing was translated — everything was designed here.',
               'وُلد Tabibo في المغرب، للعيادات والمرضى المغاربة. الدرهم، الضمان الاجتماعي، أوقات الصلاة، الفرنسية والعربية، التذكير عبر واتساب: لم يُترجَم شيء — كل شيء صُمّم هنا.')}
          </p>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: GREEN, marginTop: 16 }}>{t('L’équipe Tabibo', 'The Tabibo team', 'فريق Tabibo')}</div>
        </div>
      </section>

      {/* ── Sécurité et conformité ──────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '30px 0' : '72px 0' }}>
        <div style={wrap}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '0.85fr 1.15fr', gap: isMobile ? 26 : 48, alignItems: 'center' }}>
            <div>
              <Eyebrow>{t('Sécurité et conformité', 'Security and compliance', 'الأمان والامتثال')}</Eyebrow>
              <SectionTitle isMobile={isMobile}>{t('La confidentialité n’est pas une promesse d’affiche', 'Privacy is not a poster promise', 'الخصوصية ليست وعداً على لوحة')}</SectionTitle>
              <p style={{ fontSize: 15, color: BODY, lineHeight: 1.68, marginTop: 16 }}>
                {t('Le cloisonnement entre cabinets est appliqué par la base de données, pas seulement par l’interface : une requête qui sortirait de son cabinet ne renvoie rien. Les échanges et les fichiers sont chiffrés en transit et au repos, les accès sont journalisés, et vos données restent exportables à tout moment.',
                   'Isolation between practices is enforced by the database, not just the interface: a query straying outside its practice returns nothing. Exchanges and files are encrypted in transit and at rest, access is logged, and your data stays exportable at any time.',
                   'العزل بين العيادات مطبَّق من قاعدة البيانات، لا من الواجهة فقط: طلب يخرج عن عيادته لا يُرجع شيئاً. المراسلات والملفات مشفَّرة أثناء النقل وفي التخزين، والولوج مسجَّل، وبياناتكم قابلة للتصدير في أي وقت.')}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { icon: I.check, tint: '#C7E9D8', color: '#0E7C52', k: t('Médecins vérifiés', 'Verified doctors', 'أطباء موثّقون'), v: t('INPE et diplômes contrôlés', 'INPE and diplomas checked', 'التحقق من INPE والشهادات') },
                { icon: I.lock, tint: '#C7E9D8', color: '#0E7C52', k: t('Cloisonnement en base', 'Database partitioning', 'العزل في القاعدة'), v: t('appliqué serveur, pas écran', 'server-enforced, not screen', 'مطبَّق في الخادم لا الشاشة') },
                { icon: I.shield, tint: '#C7E9D8', color: '#0E7C52', k: t('Chiffrement', 'Encryption', 'التشفير'), v: t('en transit (HTTPS) et au repos', 'in transit (HTTPS) and at rest', 'أثناء النقل والتخزين') },
                { icon: I.scale, tint: '#C7E9D8', color: '#0E7C52', k: t('Loi 09-08', 'Law 09-08', 'القانون 09-08'), v: t('déclaré, sous contrôle CNDP', 'declared, under CNDP oversight', 'مُصرَّح، تحت إشراف CNDP') },
              ].map((c) => (
                <div key={c.k} style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(160deg, ${c.tint} 0%, #E3F5EC 100%)`, border: `1px solid ${CARD_EDGE}`, borderRadius: 16, padding: '16px 16px' }}>
                  <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -22, top: -30, width: 84, height: 84, borderRadius: '50%', background: c.color, opacity: 0.06 }} />
                  <span style={{ position: 'relative', display: 'inline-flex', width: 34, height: 34, borderRadius: 10, background: '#fff', color: c.color, alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: `0 8px 16px -10px ${c.color}` }}>{c.icon}</span>
                  <div style={{ position: 'relative', fontSize: 13.5, fontWeight: 800, color: DARK, lineHeight: 1.3 }}>{c.k}</div>
                  <div style={{ position: 'relative', fontSize: 12, color: MUTED, fontWeight: 600, marginTop: 3, lineHeight: 1.4 }}>{c.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── État du projet — honnêteté pré-lancement ────────────────────── */}
      <section style={{ background: BG, padding: isMobile ? '28px 0' : '60px 0' }}>
        <div style={{ ...wrap, maxWidth: 820 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#fff', border: '1px solid #EAEFEC', borderRadius: 18, padding: isMobile ? '20px 20px' : '26px 30px' }}>
            <span style={{ flexShrink: 0, display: 'inline-flex', width: 42, height: 42, borderRadius: 12, background: '#E7F6EE', color: GREEN, alignItems: 'center', justifyContent: 'center' }}>{I.spark}</span>
            <div>
              <h3 style={{ fontSize: isMobile ? 17 : 19, fontWeight: 800, color: DARK, margin: '2px 0 8px' }}>{t('Où en est Tabibo', 'Where Tabibo stands', 'أين وصل Tabibo')}</h3>
              <p style={{ fontSize: 14.5, color: BODY, lineHeight: 1.66, margin: 0 }}>
                {t('Tabibo ouvre. Nous ne mettons en avant aucun chiffre d’usage que nous n’avons pas encore : les nombres de cette page décrivent ce que le produit couvre — villes, spécialités, disponibilité, langues. Notre engagement est de le dire clairement, ici comme partout sur le site.',
                   'Tabibo is launching. We show no usage figures we do not yet have: the numbers on this page describe what the product covers — cities, specialties, availability, languages. Our commitment is to say so plainly, here and everywhere on the site.',
                   'Tabibo في طور الإطلاق. لا نعرض أرقام استعمال لا نملكها بعد: أرقام هذه الصفحة تصف ما يغطيه المنتج — المدن والتخصصات والتوفر واللغات. التزامنا أن نقول ذلك بوضوح، هنا وفي كل مكان بالموقع.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Double CTA : patient et médecin ─────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '8px 0 52px' : '16px 0 84px' }}>
        <div style={wrap}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 26, background: 'linear-gradient(135deg, #0C4A37 0%, #0A3D2D 100%)', padding: isMobile ? '32px 22px' : '52px 56px', boxShadow: '0 30px 70px -34px rgba(11,74,50,0.6)' }}>
            <span aria-hidden style={{ position: 'absolute', top: -70, insetInlineEnd: -40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? 20 : 32 }}>
              <div style={{ maxWidth: 560 }}>
                <h2 style={{ fontSize: isMobile ? 23 : 30, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
                  {t('Rejoignez Tabibo dès aujourd’hui', 'Join Tabibo today', 'انضموا إلى Tabibo اليوم')}
                </h2>
                <p style={{ fontSize: isMobile ? 15 : 16, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, margin: 0 }}>
                  {t('Patients : créez un compte gratuit et réservez en quelques secondes. Médecins : inscrivez votre cabinet et gérez tout depuis une seule plateforme.',
                     'Patients: create a free account and book in seconds. Doctors: register your practice and manage everything from one platform.',
                     'المرضى: أنشئوا حساباً مجانياً واحجزوا في ثوانٍ. الأطباء: سجّلوا عيادتكم وأديروا كل شيء من منصة واحدة.')}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, flexShrink: 0 }}>
                <button onClick={() => go('pregister')} style={{ background: '#fff', color: GREEN, border: 'none', borderRadius: 12, padding: '14px 26px', fontSize: 15, fontWeight: 800, cursor: 'pointer', minHeight: 48, boxShadow: '0 10px 24px -8px rgba(0,0,0,0.3)' }}>
                  {t('Créer un compte gratuit', 'Create a free account', 'إنشاء حساب مجاني')}
                </button>
                <button onClick={() => go('docregister')} style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 800, cursor: 'pointer', minHeight: 48 }}>
                  {t('Inscrire mon cabinet', 'Register my practice', 'سجّل عيادتي')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

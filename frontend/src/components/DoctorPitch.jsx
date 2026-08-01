import { useState } from 'react';
import { BTN_GREEN } from '../shared.jsx';
import { buildPrivacyPaper, PAPER_FILE } from '../lib/privacyPaper.js';
import { VisibiliteVisual, RappelsVisual, TeleconsultVisual, NetworkVisual, SecuriteVisual } from './PitchMockups.jsx';
import { pdfOpen } from '../lib/pdf.js';

// ─────────────────────────────────────────────────────────────────────────────
// La présentation de Tabibo aux médecins.
//
// Structure : bandeau de repères → « Un cabinet mieux organisé » → parole de
// l'éditeur → « Une communication patient simplifiée » → « Tabibo Network, le réseau des
// confrères » → « Vos données, protégées ». Chaque bloc alterne une vignette de
// l'écran RÉEL et un texte à puces.
//
// Les visuels sont de DEUX natures, et il faut savoir laquelle on regarde :
//
//   · `Shot` — de VRAIES captures de l'application, produites par
//     `npm run shots` depuis la démonstration. Ni montage, ni retouche.
//   · `Canvas` + PitchMockups.jsx — des RECONSTRUCTIONS vectorielles, pour les
//     cinq écrans qui ne se capturent pas honnêtement : la page publique et les
//     créneaux vus du téléphone du patient, le WhatsApp et le courriel reçus
//     par le patient, l'appel vidéo, les trois faces du réseau confrères, et le
//     schéma de cloisonnement des données.
//
// Aucune photo de personne dans les deux cas : les portraits de l'appel vidéo
// sont dessinés. Une capture d'appel réel montrerait des visages, et une photo
// de banque d'images ferait passer des inconnus pour nos patients.
//
// La règle qui tient l'ensemble : une reconstruction ne montre que ce qui
// existe dans l'application. Elle peut vieillir mal — c'est le prix — mais elle
// ne doit jamais promettre une fonction que le produit n'a pas.
//
// Le bandeau de repères mêle deux natures de chiffres, et le dit : les deux
// premiers sont les effets ATTENDUS des rappels et de la réservation en ligne
// (observés dans le secteur, pas encore chez nous) ; les trois suivants sont
// des caractéristiques vérifiables du produit. La note sous le bandeau fait la
// différence — annoncer des résultats qu'on n'a pas serait mentir au premier
// écran.
// ─────────────────────────────────────────────────────────────────────────────

const DARK   = '#15314A';
const BODY   = '#3A4A45';
const MUTED  = '#6B7B76';
const BORDER = '#EAEFEC';
const GREEN  = '#0E7C52';
// Liseré des cartes de repères : le contour reprenait la teinte du fond,
// donc invisible sur blanc. Un vert franc redonne un bord net à la carte.
const CARD_EDGE = '#8CCCAE';
const BG     = '#F4F8F5';

const tr = (lang, fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

// Les pictogrammes du bandeau de repères.
const MIC = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
const MI = {
  noshow: <svg {...MIC}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M10 15l4 4M14 15l-4 4" /></svg>,
  clock:  <svg {...MIC}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.2V12l3.4 2.2" /></svg>,
  book:   <svg {...MIC}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M8.8 15.4l2.1 2.1 4.3-4.3" /></svg>,
  globe:  <svg {...MIC}><circle cx="12" cy="12" r="8.6" /><path d="M3.4 12h17.2" /><path d="M12 3.4c2.2 2.4 3.4 5.4 3.4 8.6s-1.2 6.2-3.4 8.6c-2.2-2.4-3.4-5.4-3.4-8.6S9.8 5.8 12 3.4z" /></svg>,
  shield: <svg {...MIC}><path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z" /><path d="M9.5 12l1.8 1.8 3.4-3.4" /></svg>,
};

// ── La fenêtre qui encadre chaque capture d'écran ──────────────────────────
const Frame = ({ children, tone = 'mint' }) => (
  <div style={{
    borderRadius: 20, padding: 22, minHeight: 268,
    background: tone === 'mint'
      ? 'linear-gradient(150deg, #E9F6EF 0%, #DCF0E6 100%)'
      : 'linear-gradient(150deg, #0C4A37 0%, #09362A 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{ width: '100%', background: '#fff', borderRadius: 13, boxShadow: '0 18px 40px -22px rgba(9,50,38,0.55)', overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);
/* Même fond que `Frame`, mais sans la carte blanche : les vignettes illustrées
   de PitchMockups apportent leur propre habillage (téléphones, cartes, écran
   d'appel). Les emboîter dans `Frame` ajouterait un cadre blanc parasite. */
const Canvas = ({ children, pad = 20 }) => (
  <div style={{
    borderRadius: 20, padding: pad,
    background: 'linear-gradient(150deg, #E9F6EF 0%, #DCF0E6 100%)',
  }}>{children}</div>
);
const Bar = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', background: 'linear-gradient(90deg, #0C4A37 0%, #0A3D2D 100%)' }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.28)' }} />
    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', marginInlineStart: 6, letterSpacing: '0.2px' }}>{label}</span>
  </div>
);
/**
 * Une capture d'écran RÉELLE de l'application, dans la même fenêtre que les
 * vignettes. Les images sont produites par `npm run shots` : elles viennent de
 * la démonstration, jamais d'un montage. Chargement différé — la page reste
 * légère au premier affichage.
 */
const Shot = ({ src, label, alt, tone = 'mint' }) => (
  <Frame tone={tone}>
    <Bar label={label} />
    <img src={`/ecrans/${src}.jpg`} alt={alt} loading="lazy" decoding="async"
      style={{ display: 'block', width: '100%', height: 'auto' }} />
  </Frame>
);


// ── Un bloc : vignette + texte à puces, alternés ────────────────────────────
function Block({ visual, groups, isMobile, flip, lang, onMore }) {
  const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
      <path d="M4 12h14M13 6l6 6-6 6" />
    </svg>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 22 : 56, alignItems: 'center', marginBottom: isMobile ? 44 : 78 }}>
      <div style={{ order: isMobile ? 0 : (flip ? 1 : 0) }}>{visual}</div>
      <div style={{ order: isMobile ? 1 : (flip ? 0 : 1) }}>
        {groups.map((g, i) => (
          <div key={i} style={{ marginBottom: i < groups.length - 1 ? 26 : 0 }}>
            {g.title && (
              <h3 style={{ fontSize: isMobile ? 21 : 26, fontWeight: 800, color: DARK, margin: '0 0 14px', letterSpacing: '-0.4px', lineHeight: 1.25 }}>{g.title}</h3>
            )}
            {g.eyebrow && (
              <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK, marginBottom: 10 }}>{g.eyebrow}</div>
            )}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
              {g.points.map((p, j) => (
                <li key={j} style={{ display: 'flex', gap: 10, fontSize: 14.5, color: BODY, lineHeight: 1.62 }}>
                  <Arrow />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {onMore && (
          <button onClick={onMore}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, background: 'none', border: 'none', padding: 0, color: GREEN, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            {tr(lang, 'En savoir plus', 'Learn more', 'اعرف المزيد')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

const SectionTitle = ({ children, isMobile }) => (
  <h2 style={{ fontSize: isMobile ? 25 : 36, fontWeight: 800, color: DARK, textAlign: 'center', margin: isMobile ? '0 0 34px' : '0 0 56px', letterSpacing: '-0.7px', lineHeight: 1.2 }}>
    {children}
  </h2>
);

export default function DoctorPitch({ lang = 'fr', isMobile = false, go }) {
  const t = (fr, en, ar) => tr(lang, fr, en, ar);
  const wrap = { maxWidth: 1120, margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' };

  // Le livre blanc est composé dans le navigateur : aucun fichier à héberger,
  // et le document porte toujours la date du jour où il a été téléchargé.
  const [busy, setBusy] = useState(false);
  const downloadPaper = async () => {
    setBusy(true);
    try { pdfOpen(buildPrivacyPaper(), PAPER_FILE); }
    finally { setBusy(false); }
  };

  // Les repères du bandeau.
  //   Les deux premiers sont les effets ATTENDUS des deux mécanismes — la
  //   réservation en ligne et les rappels automatiques — tels qu'ils sont
  //   observés dans le secteur. Tabibo n'a pas encore ouvert : ce sont des
  //   objectifs, et la note sous le bandeau le dit en toutes lettres. Les trois
  //   suivants sont des caractéristiques vérifiables du produit.
  const MARKERS = [
    { big: '40 %', icon: MI.noshow, tint: '#C7E9D8', color: '#0E7C52',
      sub: t('de rendez-vous manqués en moins, grâce aux rappels automatiques',
             'fewer missed appointments, thanks to automatic reminders',
             'مواعيد ضائعة أقل، بفضل التذكيرات التلقائية') },
    { big: '16 h', icon: MI.clock, tint: '#C7E9D8', color: '#0E7C52',
      sub: t('de travail administratif en moins par semaine',
             'less administrative work per week',
             'من العمل الإداري أقل في الأسبوع') },
    { big: '24 h/24', icon: MI.book, tint: '#C7E9D8', color: '#0E7C52',
      sub: t('vos patients réservent quand ils veulent, sans appeler',
             'your patients book whenever they want, without calling',
             'مرضاكم يحجزون في أي وقت، دون اتصال') },
    { big: t('3 langues', '3 languages', '3 لغات'), icon: MI.globe, tint: '#C7E9D8', color: '#0E7C52',
      sub: t('français, arabe, anglais — l’écran suit le patient',
             'French, Arabic, English — the screen follows the patient',
             'الفرنسية والعربية والإنجليزية — تتبع الواجهة المريض') },
    { big: '09-08', icon: MI.shield, tint: '#C7E9D8', color: '#0E7C52',
      sub: t('loi marocaine sur les données, et une base cloisonnée cabinet par cabinet',
             'Moroccan data-protection law, with a database partitioned practice by practice',
             'القانون المغربي لحماية البيانات، وقاعدة بيانات معزولة لكل عيادة') },
  ];

  return (
    <>
      {/* ── Repères ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '34px 0 8px' : '56px 0 16px' }}>
        <div style={wrap}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: isMobile ? 12 : 16 }}>
            {MARKERS.map((m, mi) => (
              <div key={m.big} style={{
                ...(isMobile && MARKERS.length % 2 === 1 && mi === MARKERS.length - 1
                  ? { gridColumn: '1 / -1', width: 'calc(50% - 6px)', justifySelf: 'center' } : {}),
                position: 'relative', overflow: 'hidden', textAlign: 'center',
                background: `linear-gradient(160deg, ${m.tint} 0%, #E3F5EC 100%)`,
                border: `1px solid ${CARD_EDGE}`, borderRadius: 18,
                padding: isMobile ? '18px 12px' : '22px 16px',
                boxShadow: '0 1px 2px rgba(16,42,32,0.05), 0 16px 34px -24px rgba(11,90,60,0.5)',
              }}>
                <span aria-hidden style={{ position: 'absolute', insetInlineEnd: -30, top: -44, width: 120, height: 120, borderRadius: '50%', background: m.color, opacity: 0.055 }} />
                <span style={{ position: 'relative', display: 'inline-flex', width: 38, height: 38, borderRadius: 12, background: '#fff', color: m.color, alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: `0 8px 18px -10px ${m.color}` }}>{m.icon}</span>
                <div style={{ position: 'relative', fontSize: isMobile ? 25 : 32, fontWeight: 900, color: m.color, letterSpacing: '-1px', lineHeight: 1.1 }}>{m.big}</div>
                <div style={{ position: 'relative', fontSize: isMobile ? 11.5 : 12.5, color: BODY, marginTop: 7, lineHeight: 1.5 }}>{m.sub}</div>
              </div>
            ))}
          </div>
          {/* Dire d'où viennent les deux premiers chiffres : ils ne sont pas
              mesurés chez nous, ils sont ce que le cabinet peut viser. */}
          <p style={{ fontSize: isMobile ? 11 : 11.5, color: MUTED, textAlign: 'center', margin: '16px auto 0', maxWidth: 720, lineHeight: 1.6 }}>
            {t('Les deux premiers repères sont les effets observés dans le secteur pour la réservation en ligne et les rappels automatiques. Tabibo ouvre : ce sont les objectifs du produit, pas encore des résultats mesurés sur nos cabinets.',
               'The first two figures are the effects observed across the sector for online booking and automatic reminders. Tabibo is launching: these are the product’s targets, not yet results measured in our practices.',
               'الرقمان الأولان يعكسان ما لوحظ في القطاع بخصوص الحجز عبر الإنترنت والتذكيرات التلقائية. Tabibo في طور الإطلاق: هذه أهداف المنتج، وليست نتائج مقيسة في عياداتنا بعد.')}
          </p>
        </div>
      </section>

      {/* ── Un cabinet mieux organisé ────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '44px 0 10px' : '76px 0 20px' }}>
        <div style={wrap}>
          <SectionTitle isMobile={isMobile}>
            {t('Un cabinet mieux organisé', 'A better-organised practice', 'عيادة أفضل تنظيماً')}
          </SectionTitle>

          <Block isMobile={isMobile} lang={lang} visual={<Shot src="agenda" label={tr(lang, 'Agenda — la semaine', 'Agenda — the week', 'الأجندة — الأسبوع')} alt={tr(lang, 'L’agenda de la semaine dans Tabibo', 'The weekly agenda in Tabibo', 'أجندة الأسبوع في Tabibo')} />} groups={[{
            title: t('L’agenda plein, la tête libre', 'Full calendar, clear head', 'أجندة ممتلئة وذهن صافٍ'),
            eyebrow: t('Réservation en ligne', 'Online booking', 'الحجز عبر الإنترنت'),
            points: [
              t('Vos patients réservent eux-mêmes, pour eux ou pour un proche, 24 h/24 — sans appeler le cabinet.',
                'Patients book for themselves or a family member, around the clock — without calling the practice.',
                'يحجز مرضاكم لأنفسهم أو لأحد أقاربهم على مدار الساعة — دون الاتصال بالعيادة.'),
              t('Vous gardez la main : horaires par jour, durée de créneau, congés, plafond de rendez-vous, pauses de prière.',
                'You stay in control: daily hours, slot length, leave, daily cap, prayer breaks.',
                'تبقى السيطرة لكم: ساعات كل يوم، مدة الموعد، العطل، الحد اليومي، أوقات الصلاة.'),
              t('Un créneau libéré redevient réservable à l’instant même : personne n’appelle pour rien.',
                'A freed slot becomes bookable instantly — nobody calls for nothing.',
                'الموعد المُلغى يصبح متاحاً فوراً — لا أحد يتصل دون جدوى.'),
            ],
          }]} />

          <Block isMobile={isMobile} lang={lang} flip visual={<Shot src="navigateur" label={tr(lang, 'Navigateur patients', 'Patient navigator', 'مُوجّه المرضى')} alt={tr(lang, 'Le navigateur patients, de l’arrivée à la sortie', 'The patient navigator, from arrival to check-out', 'مُوجّه المرضى من الوصول إلى المغادرة')} />} groups={[{
            title: t('Le cabinet au quotidien', 'The practice, day to day', 'العيادة يوماً بيوم'),
            points: [],
          }, {
            eyebrow: t('Navigateur patients', 'Patient navigator', 'مُوجّه المرضى'),
            points: [
              t('Qui arrive, qui attend, qui est en soins et à quel poste : le secrétariat déplace le patient d’une colonne à l’autre, le médecin voit la salle d’attente sans se lever.',
                'Who has arrived, who is waiting, who is being seen and where: the front desk moves each patient across the board, the doctor sees the waiting room without leaving the room.',
                'من وصل ومن ينتظر ومن هو قيد العلاج وفي أي محطة: يحرّك الاستقبال المريض من عمود إلى آخر، ويرى الطبيب قاعة الانتظار دون أن يغادر مكتبه.'),
              t('Une note urgente laissée à l’accueil s’affiche immédiatement sur la fiche du patient.',
                'An urgent note left at the desk appears immediately on the patient’s record.',
                'ملاحظة عاجلة تُترك في الاستقبال تظهر فوراً في ملف المريض.'),
            ],
          }, {
            eyebrow: t('Tâches', 'Tasks', 'المهام'),
            points: [
              t('Rappels à passer, ordonnances à renouveler, résultats à commenter : chaque tâche a un responsable, une échéance et un état — rien ne se perd entre deux consultations.',
                'Calls to return, prescriptions to renew, results to review: every task has an owner, a due date and a status — nothing slips between two consultations.',
                'مكالمات يجب ردّها، وصفات تُجدَّد، نتائج تُراجَع: لكل مهمة مسؤول وأجل وحالة — لا شيء يضيع بين استشارتين.'),
            ],
          }]} />

          <Block isMobile={isMobile} lang={lang} visual={<Canvas><VisibiliteVisual lang={lang} /></Canvas>} onMore={() => go && go('docregister')} groups={[{
            title: t('Une meilleure visibilité', 'Better visibility', 'حضور أفضل'),
            eyebrow: t('Votre page publique', 'Your public page', 'صفحتكم العمومية'),
            points: [
              t('Une adresse à vous — tabibo.ma/dr-votre-nom — et une affiche QR pour la salle d’attente : vos patients réservent depuis leur téléphone.',
                'Your own address — tabibo.ma/dr-your-name — and a QR poster for the waiting room: patients book from their phone.',
                'عنوان خاص بكم — tabibo.ma/dr-اسمكم — وملصق QR لقاعة الانتظار: يحجز مرضاكم من هواتفهم.'),
              t('Vous choisissez ce qui s’affiche : actes et tarifs, langues parlées, conventions CNSS/CNOPS, téléconsultation, adresse et plan d’accès.',
                'You choose what appears: services and fees, languages spoken, CNSS/CNOPS coverage, teleconsultation, address and directions.',
                'أنتم تختارون ما يظهر: الخدمات والأسعار، اللغات، التغطية CNSS/CNOPS، الاستشارة عن بُعد، العنوان والوصول.'),
              t('Votre profil professionnel est vérifié avant publication — INPE et diplômes contrôlés. Le patient le voit, et cela change tout.',
                'Your professional profile is verified before publication — INPE and diplomas checked. Patients see it, and it changes everything.',
                'يتم التحقق من ملفكم المهني قبل النشر — INPE والشهادات. يرى المريض ذلك، وهذا يغيّر كل شيء.'),
            ],
          }]} />
        </div>
      </section>

      {/* ── Parole de l'éditeur (à la place d'un témoignage inventé) ─────── */}
      <section style={{ background: '#EAF4EF', padding: isMobile ? '40px 0' : '64px 0' }}>
        <div style={{ ...wrap, maxWidth: 860, textAlign: 'center', position: 'relative' }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill={GREEN} opacity="0.22" style={{ display: 'block', margin: '0 auto 14px' }}>
            <path d="M9.5 5C6 5 3.2 7.9 3.2 11.4c0 3.2 2.4 5.6 5.4 5.6.5 0 1-.1 1.4-.2-.6 1.4-2 2.4-3.7 2.6l.5 2.6c4.2-.5 7.2-4 7.2-9.2C14 7.6 12 5 9.5 5zm10 0C16 5 13.2 7.9 13.2 11.4c0 3.2 2.4 5.6 5.4 5.6.5 0 1-.1 1.4-.2-.6 1.4-2 2.4-3.7 2.6l.5 2.6c4.2-.5 7.2-4 7.2-9.2C24 7.6 22 5 19.5 5z" />
          </svg>
          <p style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: DARK, lineHeight: 1.5, margin: 0, letterSpacing: '-0.3px' }}>
            {t('Tabibo est né au Maroc, pour les cabinets marocains : le dirham, la CNSS, les heures de prière, le français et l’arabe, le rappel par WhatsApp. Rien n’a été traduit — tout a été pensé ici.',
               'Tabibo was built in Morocco, for Moroccan practices: the dirham, CNSS, prayer times, French and Arabic, the WhatsApp reminder. Nothing was translated — everything was designed here.',
               'وُلد Tabibo في المغرب، للعيادات المغربية: الدرهم، الضمان الاجتماعي، أوقات الصلاة، الفرنسية والعربية، التذكير عبر واتساب. لم يُترجَم شيء — كل شيء صُمّم هنا.')}
          </p>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: GREEN, marginTop: 16 }}>
            {t('L’équipe Tabibo', 'The Tabibo team', 'فريق Tabibo')}
          </div>
        </div>
      </section>

      {/* ── Communication patient ────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '44px 0 10px' : '76px 0 20px' }}>
        <div style={wrap}>
          <SectionTitle isMobile={isMobile}>
            {t('Une communication patient simplifiée', 'Simpler patient communication', 'تواصل أبسط مع المرضى')}
          </SectionTitle>

          <Block isMobile={isMobile} lang={lang} visual={<Shot src="demandes" label={tr(lang, 'Demandes patients', 'Patient requests', 'طلبات المرضى')} alt={tr(lang, 'Les demandes des patients et leurs réponses', 'Patient requests and their replies', 'طلبات المرضى وأجوبتها')} />} groups={[{
            title: t('Le téléphone se tait', 'The phone goes quiet', 'يهدأ الهاتف'),
            eyebrow: t('Demandes et messagerie', 'Requests and messaging', 'الطلبات والمراسلة'),
            points: [
              t('Le patient écrit au cabinet plutôt que d’appeler : renouvellement, question sur un résultat, certificat, demande administrative — avec une pièce jointe si besoin.',
                'Patients write to the practice instead of calling: refills, a question about a result, a certificate, an administrative request — with an attachment if needed.',
                'يكتب المريض إلى العيادة بدل الاتصال: تجديد وصفة، سؤال عن نتيجة، شهادة، طلب إداري — مع مرفق عند الحاجة.'),
              t('Les demandes arrivent classées par catégorie et par statut, avec des modèles de réponse prêts à ajuster. Chaque demande traitée est clôturée et archivée.',
                'Requests arrive sorted by category and status, with ready-made reply templates. Each handled request is closed and archived.',
                'تصل الطلبات مصنّفة حسب الفئة والحالة، مع نماذج ردود جاهزة للتعديل. كل طلب مُعالَج يُغلق ويُؤرشف.'),
            ],
          }]} />

          <Block isMobile={isMobile} lang={lang} flip visual={<Canvas><RappelsVisual lang={lang} /></Canvas>} groups={[{
            title: t('Moins de rendez-vous manqués', 'Fewer missed appointments', 'مواعيد ضائعة أقل'),
            eyebrow: t('Confirmations et rappels', 'Confirmations and reminders', 'التأكيدات والتذكيرات'),
            points: [
              t('Confirmation immédiate à la réservation, puis rappel avant l’échéance — par e-mail et par WhatsApp, les deux canaux réellement lus au Maroc.',
                'Immediate confirmation on booking, then a reminder before the appointment — by email and WhatsApp, the two channels actually read in Morocco.',
                'تأكيد فوري عند الحجز، ثم تذكير قبل الموعد — بالبريد وواتساب، القناتان المقروءتان فعلاً في المغرب.'),
              t('Vous fixez le délai et le texte. Le compteur des envois est visible dans vos paramètres, et rien n’est facturé au-delà sans votre accord.',
                'You set the timing and the wording. The send counter is visible in your settings, and nothing beyond is billed without your agreement.',
                'أنتم تحدّدون التوقيت والنص. عدّاد الإرسال ظاهر في إعداداتكم، ولا يُفوتر شيء فوقه دون موافقتكم.'),
              t('Aucun SMS payant à la carte : e-mail et WhatsApp, un point c’est tout.',
                'No per-message SMS billing: email and WhatsApp, full stop.',
                'لا رسائل SMS مدفوعة بالوحدة: البريد وواتساب فقط.'),
            ],
          }]} />

          <Block isMobile={isMobile} lang={lang} visual={<Shot src="prevention" label={tr(lang, 'Prévention et dépistages', 'Prevention and screening', 'الوقاية والفحوصات')} alt={tr(lang, 'Le suivi des dépistages dans le dossier du patient', 'Screening follow-up inside the patient record', 'متابعة الفحوصات داخل ملف المريض')} />} groups={[{
            title: t('Prévention et suivi', 'Prevention and follow-up', 'الوقاية والتتبع'),
            eyebrow: t('Relances et campagnes', 'Recalls and campaigns', 'الاستدعاءات والحملات'),
            points: [
              t('Relancez d’un seul geste les patients qu’il faut revoir : rappel de vaccination, contrôle annuel, dépistage, renouvellement d’un traitement de fond.',
                'Recall the patients who need to come back, in one move: vaccination reminders, annual check-ups, screening, long-term treatment renewals.',
                'استدعوا بضغطة واحدة المرضى الذين يجب إعادة رؤيتهم: تذكير باللقاح، فحص سنوي، كشف مبكر، تجديد علاج مزمن.'),
              t('Vous composez la liste depuis votre propre patientèle — tranche d’âge, date de dernière visite, motif — et vous voyez combien de patients elle représente avant d’envoyer.',
                'You build the list from your own patient base — age range, last visit, reason — and see how many patients it covers before sending.',
                'تُكوّنون القائمة من مرضاكم — الفئة العمرية، تاريخ آخر زيارة، السبب — وترون عددهم قبل الإرسال.'),
              t('Le message part d’un modèle que vous ajustez, et l’envoi est décompté du forfait de rappels de votre formule — sans surprise.',
                'The message starts from a template you adjust, and the send is counted against your plan’s reminder allowance — no surprises.',
                'تنطلق الرسالة من نموذج تعدّلونه، ويُحتسب الإرسال من رصيد التذكيرات في صيغتكم — دون مفاجآت.'),
            ],
          }]} />

          <Block isMobile={isMobile} lang={lang} flip visual={<Canvas><TeleconsultVisual lang={lang} /></Canvas>} groups={[{
            title: t('Soigner à distance', 'Care at a distance', 'العلاج عن بُعد'),
            eyebrow: t('Téléconsultation vidéo', 'Video teleconsultation', 'الاستشارة بالفيديو'),
            points: [
              t('Une première évaluation, un contrôle, l’explication d’un résultat : autant de motifs qui ne réclament pas un déplacement.',
                'A first assessment, a check-up, explaining a result: reasons that do not require travel.',
                'تقييم أولي، مراقبة، شرح نتيجة: أسباب لا تستدعي التنقل.'),
              t('L’appel se lance depuis le rendez-vous, dans le navigateur — rien à installer pour le patient, qui reçoit un simple lien. Le dossier reste affiché pendant l’appel.',
                'The call starts from the appointment, in the browser — nothing to install for the patient, who simply receives a link. The record stays on screen during the call.',
                'تنطلق المكالمة من الموعد داخل المتصفح — لا شيء يُثبَّت لدى المريض، يتوصل برابط فقط. ويبقى الملف معروضاً أثناء المكالمة.'),
              t('La téléconsultation se facture comme une consultation ordinaire et entre dans vos statistiques au même titre. Pour vos patients éloignés, c’est une attente en moins.',
                'A teleconsultation is billed like an ordinary visit and counts in your statistics all the same. For distant patients, it is one less wait.',
                'تُفوتَر الاستشارة عن بُعد كاستشارة عادية وتدخل في إحصائياتكم. ولمرضاكم البعيدين، انتظار أقل.'),
            ],
          }]} />
        </div>
      </section>

      {/* ── Tabibo Network ─────────────────────────────────────────────────────────── */}
      <section style={{ background: BG, padding: isMobile ? '44px 0' : '76px 0' }}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 30 : 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 99, padding: '6px 15px', fontSize: 12, fontWeight: 800, color: GREEN, marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.6" r="3.5" /><path d="M12 12.6c-3.35 0-6.05 2.05-6.05 4.75 0 .72.58 1.3 1.3 1.3h9.5c.72 0 1.3-.58 1.3-1.3 0-2.7-2.7-4.75-6.05-4.75z" /><circle cx="4.5" cy="9.6" r="2.7" /><circle cx="19.5" cy="9.6" r="2.7" /></svg>
              {t('Nouveau', 'New', 'جديد')}
            </div>
            <h2 style={{ fontSize: isMobile ? 25 : 36, fontWeight: 800, color: DARK, margin: '0 0 12px', letterSpacing: '-0.7px', lineHeight: 1.2 }}>
              {t('Tabibo Network — le réseau des confrères', 'Tabibo Network — the colleague network', 'Tabibo Network — شبكة الزملاء')}
            </h2>
            <p style={{ fontSize: isMobile ? 14.5 : 16, color: BODY, maxWidth: 640, margin: '0 auto', lineHeight: 1.65 }}>
              {t('Reliez votre cabinet à celui de vos confrères : parlez-leur directement et cessez d’adresser un patient sur un bout de papier.',
                 'Connect your practice to your colleagues’: talk to them directly and stop referring patients on a scrap of paper.',
                 'اربطوا عيادتكم بعيادات زملائكم: تحدثوا إليهم مباشرة وتوقفوا عن التحويل بورقة صغيرة.')}
            </p>
          </div>

          <Block isMobile={isMobile} lang={lang} visual={<Canvas><NetworkVisual lang={lang} /></Canvas>} groups={[{
            eyebrow: t('Trouver et se relier', 'Find and connect', 'البحث والارتباط'),
            points: [
              t('Cherchez un confrère par spécialité et par ville dans l’annuaire des cabinets Tabibo, et demandez le lien. Il accepte — vous êtes reliés.',
                'Search for a colleague by specialty and city in the Tabibo practice directory, and request a link. They accept — you are connected.',
                'ابحثوا عن زميل حسب التخصص والمدينة في دليل عيادات Tabibo، واطلبوا الارتباط. يقبل — فتصبحون مرتبطين.'),
            ],
          }, {
            eyebrow: t('Adresser un patient', 'Refer a patient', 'تحويل مريض'),
            points: [
              t('Nom, téléphone, motif — et c’est parti. Le confrère reçoit l’adressage, l’accepte ou non, et vous voyez où en est votre patient jusqu’à la clôture.',
                'Name, phone, reason — done. Your colleague receives the referral, accepts or declines, and you follow your patient through to closure.',
                'الاسم، الهاتف، السبب — وانتهى. يتوصل الزميل بالتحويل، يقبله أو لا، وتتابعون مريضكم حتى الإغلاق.'),
              t('Un adressage urgent est signalé comme tel, et se voit du premier coup d’œil.',
                'An urgent referral is flagged as such, and stands out at a glance.',
                'التحويل العاجل يُعلَّم بذلك، ويُرى من النظرة الأولى.'),
            ],
          }, {
            eyebrow: t('Se parler, vraiment', 'Actually talk', 'تواصل حقيقي'),
            points: [
              t('Une messagerie entre confrères reliés : un message, une photo, un document — et un appel audio ou vidéo qui s’ouvre d’un bouton, sans rendez-vous ni logiciel à installer.',
                'A messenger between connected colleagues: a message, a photo, a document — and an audio or video call one button away, with no appointment and nothing to install.',
                'مراسلة بين الزملاء المرتبطين: رسالة، صورة، وثيقة — ومكالمة صوتية أو مرئية بنقرة واحدة، دون موعد ودون برنامج يُثبَّت.'),
              t('Une pièce jointe n’est lisible que par les deux confrères de la conversation, par une adresse qui expire.',
                'An attachment is readable only by the two colleagues in the conversation, through an expiring link.',
                'المرفق لا يقرأه إلا الزميلان في المحادثة، عبر رابط ينتهي مفعوله.'),
            ],
          }, {
            eyebrow: t('Ce qui ne circule pas', 'What never travels', 'ما لا ينتقل'),
            points: [
              t('Le dossier du patient. Un adressage porte un nom, un téléphone et un motif — l’observation, l’ordonnance et les documents restent dans le cabinet qui les a constitués, sauf si vous décidez vous-même d’en envoyer un.',
                'The patient record. A referral carries a name, a phone number and a reason — notes, prescriptions and documents stay in the practice that created them, unless you choose to send one yourself.',
                'ملف المريض. يحمل التحويل اسماً ورقماً وسبباً — أما الملاحظات والوصفات والوثائق فتبقى في العيادة التي أنشأتها، إلا إذا قررتم أنتم إرسال واحدة.'),
            ],
          }]} />
        </div>
      </section>

      {/* ── Protection des données ───────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '44px 0 10px' : '76px 0 24px' }}>
        <div style={wrap}>
          <SectionTitle isMobile={isMobile}>
            {t('Vos données, et celles de vos patients', 'Your data, and your patients’ data', 'بياناتكم وبيانات مرضاكم')}
          </SectionTitle>

          <Block isMobile={isMobile} lang={lang} flip visual={<Canvas><SecuriteVisual lang={lang} /></Canvas>} groups={[{
            eyebrow: t('Chaque cabinet est cloisonné', 'Every practice is isolated', 'كل عيادة معزولة'),
            points: [
              t('Le cloisonnement est appliqué par la base de données elle-même, pas seulement par l’écran : une requête qui sortirait de votre cabinet ne renvoie rien.',
                'Isolation is enforced by the database itself, not just by the interface: a query reaching outside your practice returns nothing.',
                'العزل مفروض من قاعدة البيانات نفسها، لا من الواجهة فقط: أي استعلام يتجاوز عيادتكم لا يُرجع شيئاً.'),
            ],
          }, {
            eyebrow: t('Chacun voit ce qui le concerne', 'Everyone sees only their part', 'كل واحد يرى ما يخصّه'),
            points: [
              t('Chaque membre de l’équipe a son accès nominatif, limité à sa fonction : une secrétaire ne voit ni la facturation du cabinet, ni les ordonnances.',
                'Each team member has a named account limited to their role: a receptionist sees neither the practice’s billing nor prescriptions.',
                'لكل عضو في الفريق حساب باسمه محدود بوظيفته: لا ترى السكرتيرة فوترة العيادة ولا الوصفات.'),
            ],
          }, {
            eyebrow: t('Rien ne reste sur le poste', 'Nothing stays on the machine', 'لا شيء يبقى على الجهاز'),
            points: [
              t('L’application fonctionne hors ligne pour son interface, jamais pour les dossiers : un ordinateur partagé au cabinet ne conserve rien de lisible.',
                'The app works offline for its interface, never for records: a shared machine at the practice keeps nothing readable.',
                'يعمل التطبيق دون اتصال لواجهته فقط، لا للملفات: لا يحتفظ الحاسوب المشترك بأي شيء مقروء.'),
              t('Échanges et fichiers stockés sont chiffrés, les accès sont journalisés, et vos données restent exportables à tout moment — elles sont les vôtres.',
                'Traffic and stored files are encrypted, access is logged, and your data stays exportable at any time — it is yours.',
                'التبادلات والملفات المخزّنة مشفّرة، والولوج مسجّل، وبياناتكم قابلة للتصدير في أي وقت — فهي ملككم.'),
              t('Le tout dans le cadre de la loi n° 09-08 et sous le contrôle de la CNDP.',
                'All of it within Law 09-08 and under CNDP oversight.',
                'كل ذلك في إطار القانون 09-08 وتحت إشراف CNDP.'),
            ],
          }]} />

          {/* Le livre blanc : le même contenu, en document imprimable. */}
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: isMobile ? 22 : 30, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto', gap: isMobile ? 16 : 24, alignItems: 'center', marginTop: isMobile ? 4 : 12 }}>
            <span style={{ width: 54, height: 54, borderRadius: 14, background: '#fff', border: `1px solid ${BORDER}`, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v5h5" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M9 14h6M9 17h4" />
              </svg>
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: DARK, letterSpacing: '-0.2px' }}>
                {t('La protection des données chez Tabibo', 'Data protection at Tabibo', 'حماية البيانات لدى Tabibo')}
              </div>
              <p style={{ margin: '5px 0 0', fontSize: 13.5, color: BODY, lineHeight: 1.6 }}>
                {t('Le livre blanc : le cadre de la loi 09-08, les mesures réellement en place, et ce qui reste de la responsabilité du cabinet — scénario par scénario, de l’inscription à la demande d’accès d’un patient.',
                   'The white paper: the Law 09-08 framework, the measures actually in place, and what remains the practice’s responsibility — scenario by scenario, from sign-up to a patient’s access request.',
                   'الكتاب الأبيض: إطار القانون 09-08، والتدابير المطبّقة فعلاً، وما يبقى من مسؤولية العيادة — سيناريو بسيناريو، من التسجيل إلى طلب الاطلاع.')}
              </p>
            </div>
            <button onClick={downloadPaper} disabled={busy}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: BTN_GREEN, color: '#fff', border: 'none', borderRadius: 11, height: 46, padding: '0 20px', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              {busy ? t('Préparation…', 'Preparing…', 'جارٍ التحضير…') : t('Télécharger le PDF', 'Download the PDF', 'تحميل الملف')}
            </button>
          </div>
        </div>
      </section>

      {/* ── Appel final ──────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '10px 0 48px' : '24px 0 80px' }}>
        <div style={wrap}>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 20, padding: isMobile ? '30px 20px' : '46px 40px', textAlign: 'center', background: 'linear-gradient(160deg, #F6FBF8 0%, #EAF4EF 100%)' }}>
            <h2 style={{ fontSize: isMobile ? 24 : 33, fontWeight: 800, color: DARK, margin: '0 0 12px', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
              {t('Parce que demain, c’est déjà aujourd’hui.', 'Because tomorrow is already today.', 'لأن الغد قد بدأ اليوم.')}
            </h2>
            <p style={{ fontSize: isMobile ? 14.5 : 16, color: BODY, margin: '0 auto 26px', maxWidth: 560, lineHeight: 1.65 }}>
              {t('Ouvrez votre cabinet numérique en quatorze jours d’essai, sans carte bancaire et sans engagement.',
                 'Open your digital practice with a fourteen-day trial, no card and no commitment.',
                 'افتحوا عيادتكم الرقمية بتجربة أربعة عشر يوماً، دون بطاقة بنكية ودون التزام.')}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => go && go('docregister')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: BTN_GREEN, color: '#fff', border: '1.5px solid transparent', borderRadius: 11, height: 50, padding: '0 26px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('Commencer l’essai gratuit', 'Start the free trial', 'ابدأ التجربة المجانية')}
              </button>
              <button onClick={() => go && go('contact')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: GREEN, border: `1.5px solid ${GREEN}`, borderRadius: 11, height: 50, padding: '0 26px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('Parler à quelqu’un', 'Talk to someone', 'تحدّثوا إلينا')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

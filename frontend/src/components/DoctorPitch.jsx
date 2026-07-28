import { BTN_GREEN } from '../shared.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// La présentation de Tabibo aux médecins.
//
// Structure : bandeau de repères → « Un cabinet mieux organisé » → parole de
// l'éditeur → « Une communication patient simplifiée » → « Sila, le réseau des
// confrères » → « Vos données, protégées ». Chaque bloc alterne une vignette de
// l'écran RÉEL et un texte à puces.
//
// Les vignettes sont dessinées ici, à partir des vrais écrans : pas de photo de
// personne, pas de capture retouchée. Ce que le médecin voit sur cette page est
// ce qu'il trouvera dans l'application.
//
// Les repères du bandeau sont des CARACTÉRISTIQUES du produit (durée d'essai,
// disponibilité, langues, cadre légal) — jamais des chiffres d'adoption : Tabibo
// n'a pas encore ouvert, et annoncer une audience qu'on n'a pas serait mentir
// au premier écran.
// ─────────────────────────────────────────────────────────────────────────────

const DARK   = '#15314A';
const BODY   = '#3A4A45';
const MUTED  = '#6B7B76';
const BORDER = '#EAEFEC';
const GREEN  = '#0E7C52';
const MINT   = '#EAF6F0';
const BG     = '#F4F8F5';

const tr = (lang, fr, en, ar) => (lang === 'en' ? en : lang === 'ar' ? ar : fr);

// ── Vignettes : des miniatures fidèles des écrans de Tabibo ────────────────
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
const Bar = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', background: 'linear-gradient(90deg, #0C4A37 0%, #0A3D2D 100%)' }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.28)' }} />
    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', marginInlineStart: 6, letterSpacing: '0.2px' }}>{label}</span>
  </div>
);
const Row = ({ c, w, h = 8 }) => (
  <span style={{ display: 'block', height: h, width: w, borderRadius: 4, background: c }} />
);

/** Agenda : la grille de la journée avec des rendez-vous posés. */
const VisualAgenda = ({ lang }) => (
  <Frame>
    <Bar label={tr(lang, 'Agenda — aujourd’hui', 'Agenda — today', 'الأجندة — اليوم')} />
    <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 0, padding: '10px 12px 14px' }}>
      {[
        ['09:00', '#0F6E56', 74], ['09:30', '#2563EB', 56], ['10:00', null, 0],
        ['10:30', '#9333EA', 88], ['11:00', '#0891B2', 64], ['11:30', null, 0],
      ].map(([t, c, w], i) => (
        <div key={t} style={{ display: 'contents' }}>
          <div style={{ fontSize: 9.5, color: MUTED, padding: '9px 0', borderTop: i ? `1px solid #F1F6F3` : 'none' }}>{t}</div>
          <div style={{ padding: '6px 0', borderTop: i ? `1px solid #F1F6F3` : 'none' }}>
            {c ? (
              <div style={{ background: '#F5FAF7', borderInlineStart: `3px solid ${c}`, borderRadius: 6, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Row c="#CBD9D3" w={w} h={6} />
                <Row c="#E3EBE7" w={w * 0.62} h={5} />
              </div>
            ) : <div style={{ height: 22 }} />}
          </div>
        </div>
      ))}
    </div>
  </Frame>
);

/** Navigateur patients : les colonnes du parcours. */
const VisualNavigator = ({ lang }) => (
  <Frame>
    <Bar label={tr(lang, 'Navigateur patients', 'Patient navigator', 'مُوجّه المرضى')} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 12 }}>
      {[
        [tr(lang, 'À venir', 'Upcoming', 'قادمون'), 3, '#3B6FB0'],
        [tr(lang, 'Salle d’attente', 'Waiting room', 'قاعة الانتظار'), 2, '#C28A1B'],
        [tr(lang, 'En consultation', 'In consultation', 'في الاستشارة'), 1, '#0E7C52'],
      ].map(([t, n, c]) => (
        <div key={t} style={{ background: '#F7FBF9', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: DARK, marginBottom: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</div>
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderInlineStart: `2.5px solid ${c}`, borderRadius: 6, padding: '6px 7px', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: c, opacity: 0.85, flexShrink: 0 }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                <Row c="#CBD9D3" w="80%" h={4.5} /><Row c="#E6EEEA" w="55%" h={4} />
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  </Frame>
);

/** Page publique du cabinet, telle que le patient la voit. */
const VisualProfile = ({ lang }) => (
  <Frame>
    <Bar label="tabibo.ma/dr-…" />
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: '50%', background: BTN_GREEN, flexShrink: 0 }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
          <Row c="#B9CDC5" w="52%" h={7} /><Row c="#DCE7E2" w="34%" h={5.5} />
        </span>
        <span style={{ background: MINT, color: GREEN, borderRadius: 6, padding: '3px 7px', fontSize: 8.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {tr(lang, 'Vérifié', 'Verified', 'موثّق')}
        </span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 800, color: MUTED, marginBottom: 6, letterSpacing: '0.3px' }}>
        {tr(lang, 'PROCHAINS CRÉNEAUX', 'NEXT SLOTS', 'المواعيد القادمة')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {['09:00', '09:30', '11:00', '14:30', '15:00', '16:00', '16:30', '17:00'].map((t, i) => (
          <div key={t} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, padding: '6px 0', borderRadius: 6, border: `1px solid ${i === 2 ? 'transparent' : BORDER}`, background: i === 2 ? BTN_GREEN : '#fff', color: i === 2 ? '#fff' : DARK }}>{t}</div>
        ))}
      </div>
    </div>
  </Frame>
);

/** Messagerie : une demande patient et sa réponse. */
const VisualMessages = ({ lang }) => (
  <Frame>
    <Bar label={tr(lang, 'Demandes patients', 'Patient requests', 'طلبات المرضى')} />
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { me: false, w: '78%', tag: tr(lang, 'Renouvellement', 'Refill', 'تجديد') },
        { me: true,  w: '62%', tag: null },
        { me: false, w: '70%', tag: tr(lang, 'Résultat', 'Result', 'نتيجة') },
      ].map((m, i) => (
        <div key={i} style={{ alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth: '84%', background: m.me ? MINT : '#F7FBF9', border: `1px solid ${m.me ? '#CDEBDC' : BORDER}`, borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {m.tag && <span style={{ fontSize: 8, fontWeight: 800, color: GREEN, letterSpacing: '0.3px' }}>{m.tag}</span>}
          <Row c={m.me ? '#A9D8C2' : '#CBD9D3'} w={m.w} h={5} />
          <Row c={m.me ? '#C4E5D5' : '#E3EBE7'} w="48%" h={4.5} />
        </div>
      ))}
    </div>
  </Frame>
);

/** Rappel WhatsApp / e-mail tel qu'il part au patient. */
const VisualReminder = ({ lang }) => (
  <Frame tone="deep">
    <Bar label={tr(lang, 'Rappel automatique', 'Automatic reminder', 'تذكير تلقائي')} />
    <div style={{ padding: 16 }}>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 11, padding: 12, background: '#F7FBF9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: MINT, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2z" /></svg>
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: DARK }}>Tabibo</span>
          <span style={{ marginInlineStart: 'auto', fontSize: 8.5, color: MUTED }}>08:45</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row c="#C3D5CD" w="94%" h={5.5} /><Row c="#D5E3DD" w="86%" h={5} /><Row c="#DFEAE5" w="58%" h={5} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 11 }}>
          <span style={{ flex: 1, textAlign: 'center', background: BTN_GREEN, color: '#fff', borderRadius: 6, padding: '5px 0', fontSize: 8.5, fontWeight: 800 }}>
            {tr(lang, 'Je confirme', 'Confirm', 'أؤكّد')}
          </span>
          <span style={{ flex: 1, textAlign: 'center', background: '#fff', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 0', fontSize: 8.5, fontWeight: 700 }}>
            {tr(lang, 'Reporter', 'Reschedule', 'تأجيل')}
          </span>
        </div>
      </div>
    </div>
  </Frame>
);

/** Sila : deux cabinets reliés et un patient adressé. */
const VisualSila = ({ lang }) => (
  <Frame tone="deep">
    <Bar label={tr(lang, 'Sila — réseau des confrères', 'Sila — colleague network', 'صِلة — شبكة الزملاء')} />
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {['#0F6E56', '#9333EA'].map((c, i) => (
          <div key={c} style={{ display: 'contents' }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: c, flexShrink: 0 }} />
            {i === 0 && (
              <span style={{ flex: 1, height: 2, background: `repeating-linear-gradient(90deg, ${GREEN} 0 6px, transparent 6px 11px)` }} />
            )}
          </div>
        ))}
        <span style={{ marginInlineStart: 'auto', background: MINT, color: GREEN, borderRadius: 6, padding: '3px 8px', fontSize: 8.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {tr(lang, 'Reliés', 'Linked', 'مرتبطان')}
        </span>
      </div>
      <div style={{ border: `1px solid ${BORDER}`, borderInlineStart: '3px solid #C2263F', borderRadius: 9, padding: 10, background: '#F7FBF9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <Row c="#B9CDC5" w={82} h={6} />
          <span style={{ background: '#FCE7EE', color: '#C2263F', borderRadius: 5, padding: '2px 6px', fontSize: 7.5, fontWeight: 800 }}>URGENT</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <Row c="#D2E0DA" w="88%" h={4.5} /><Row c="#E1EAE6" w="64%" h={4.5} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
          <span style={{ background: BTN_GREEN, color: '#fff', borderRadius: 6, padding: '4px 9px', fontSize: 8, fontWeight: 800 }}>
            {tr(lang, 'Je prends ce patient', 'I’ll take this patient', 'أستقبل هذا المريض')}
          </span>
        </div>
      </div>
    </div>
  </Frame>
);

/** Protection des données : cloisonnement et chiffrement. */
const VisualPrivacy = ({ lang }) => (
  <Frame tone="deep">
    <Bar label={tr(lang, 'Protection des données', 'Data protection', 'حماية البيانات')} />
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
      {[
        [tr(lang, 'Cabinet A', 'Practice A', 'العيادة أ'), '#0F6E56'],
        [tr(lang, 'Cabinet B', 'Practice B', 'العيادة ب'), '#2563EB'],
        [tr(lang, 'Cabinet C', 'Practice C', 'العيادة ج'), '#9333EA'],
      ].map(([t, c]) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${BORDER}`, borderRadius: 9, padding: '9px 11px', background: '#F7FBF9' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: DARK, flex: 1 }}>{t}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: GREEN, fontSize: 8.5, fontWeight: 800 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            {tr(lang, 'Cloisonné', 'Isolated', 'معزولة')}
          </span>
        </div>
      ))}
      <div style={{ fontSize: 8.5, color: MUTED, textAlign: 'center', marginTop: 2 }}>
        {tr(lang, 'Aucun cabinet ne peut lire les données d’un autre.', 'No practice can read another’s data.', 'لا يمكن لأي عيادة الاطلاع على بيانات أخرى.')}
      </div>
    </div>
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

  // Des repères FACTUELS sur le produit — jamais des chiffres d'adoption.
  const MARKERS = [
    { big: t('14 jours', '14 days', '14 يوماً'),   sub: t('d’essai, sans carte bancaire', 'free trial, no card required', 'تجربة مجانية بدون بطاقة بنكية') },
    { big: '24 h/24',                               sub: t('vos patients réservent quand ils veulent', 'your patients book whenever they want', 'مرضاكم يحجزون في أي وقت') },
    { big: t('3 langues', '3 languages', '3 لغات'), sub: t('français, arabe, anglais', 'French, Arabic, English', 'الفرنسية والعربية والإنجليزية') },
    { big: '09-08',                                 sub: t('conforme à la loi marocaine sur les données', 'compliant with Moroccan data-protection law', 'مطابق للقانون المغربي لحماية البيانات') },
  ];

  return (
    <>
      {/* ── Repères ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '38px 0 8px' : '60px 0 16px' }}>
        <div style={wrap}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 22 : 30 }}>
            {MARKERS.map((m) => (
              <div key={m.big} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? 27 : 38, fontWeight: 900, color: GREEN, letterSpacing: '-1px', lineHeight: 1.1 }}>{m.big}</div>
                <div style={{ fontSize: isMobile ? 12.5 : 14, color: BODY, marginTop: 7, lineHeight: 1.5 }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Un cabinet mieux organisé ────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '44px 0 10px' : '76px 0 20px' }}>
        <div style={wrap}>
          <SectionTitle isMobile={isMobile}>
            {t('Un cabinet mieux organisé', 'A better-organised practice', 'عيادة أفضل تنظيماً')}
          </SectionTitle>

          <Block isMobile={isMobile} lang={lang} visual={<VisualAgenda lang={lang} />} groups={[{
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

          <Block isMobile={isMobile} lang={lang} flip visual={<VisualNavigator lang={lang} />} groups={[{
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

          <Block isMobile={isMobile} lang={lang} visual={<VisualProfile lang={lang} />} onMore={() => go && go('docregister')} groups={[{
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

          <Block isMobile={isMobile} lang={lang} visual={<VisualMessages lang={lang} />} groups={[{
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

          <Block isMobile={isMobile} lang={lang} flip visual={<VisualReminder lang={lang} />} groups={[{
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
        </div>
      </section>

      {/* ── Sila ─────────────────────────────────────────────────────────── */}
      <section style={{ background: BG, padding: isMobile ? '44px 0' : '76px 0' }}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 30 : 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 99, padding: '6px 15px', fontSize: 12, fontWeight: 800, color: GREEN, marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.6" r="3.5" /><path d="M12 12.6c-3.35 0-6.05 2.05-6.05 4.75 0 .72.58 1.3 1.3 1.3h9.5c.72 0 1.3-.58 1.3-1.3 0-2.7-2.7-4.75-6.05-4.75z" /><circle cx="4.5" cy="9.6" r="2.7" /><circle cx="19.5" cy="9.6" r="2.7" /></svg>
              {t('Nouveau', 'New', 'جديد')}
            </div>
            <h2 style={{ fontSize: isMobile ? 25 : 36, fontWeight: 800, color: DARK, margin: '0 0 12px', letterSpacing: '-0.7px', lineHeight: 1.2 }}>
              {t('Sila — le réseau des confrères', 'Sila — the colleague network', 'صِلة — شبكة الزملاء')}
            </h2>
            <p style={{ fontSize: isMobile ? 14.5 : 16, color: BODY, maxWidth: 640, margin: '0 auto', lineHeight: 1.65 }}>
              {t('« Sila » (صِلة), c’est le lien. Reliez votre cabinet à celui de vos confrères et cessez d’adresser un patient sur un bout de papier.',
                 '“Sila” (صِلة) means the link. Connect your practice to your colleagues’ and stop referring patients on a scrap of paper.',
                 '«صِلة» هي الرابط. اربطوا عيادتكم بعيادات زملائكم وتوقفوا عن التحويل بورقة صغيرة.')}
            </p>
          </div>

          <Block isMobile={isMobile} lang={lang} visual={<VisualSila lang={lang} />} groups={[{
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
            eyebrow: t('Ce qui ne circule pas', 'What never travels', 'ما لا ينتقل'),
            points: [
              t('Le dossier du patient. Un adressage porte un nom, un téléphone et un motif — l’observation, l’ordonnance et les documents restent dans le cabinet qui les a constitués.',
                'The patient record. A referral carries a name, a phone number and a reason — notes, prescriptions and documents stay in the practice that created them.',
                'ملف المريض. يحمل التحويل اسماً ورقماً وسبباً — أما الملاحظات والوصفات والوثائق فتبقى في العيادة التي أنشأتها.'),
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

          <Block isMobile={isMobile} lang={lang} flip visual={<VisualPrivacy lang={lang} />} groups={[{
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
        </div>
      </section>
    </>
  );
}

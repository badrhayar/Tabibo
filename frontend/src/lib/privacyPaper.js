// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · « La protection des données chez Tabibo » — le livre blanc.
//
// Document A4 destiné aux médecins : ce qu'il advient des données de leurs
// patients, sous quel régime juridique, et ce qu'ils doivent eux-mêmes faire.
// Généré côté navigateur (jsPDF), sans dépendance ni requête réseau.
//
// Deux règles d'écriture, tenues d'un bout à l'autre :
//   • aucune certification n'est revendiquée. Tabibo n'ouvre pas encore ; là où
//     Doctolib cite ISO 27001 ou BSI C5, ce document décrit ce qui EST fait et
//     annonce ce qui est engagé — jamais un label qu'on n'a pas.
//   • le cadre est marocain : loi n° 09-08 et CNDP, pas le RGPD.
// ─────────────────────────────────────────────────────────────────────────────
import { jsPDF } from 'jspdf';

const GREEN = [18, 135, 90];
const DEEP  = [12, 74, 55];
const DARK  = [21, 49, 74];
const BODY  = [58, 74, 69];
const MUT   = [107, 123, 118];
const RULE  = [222, 233, 228];

/**
 * Les polices standard de jsPDF n'écrivent que les caractères jusqu'à U+00FF :
 * l'apostrophe courbe, le tiret cadratin, les points de suspension et le « œ »
 * sont purement PERDUS à l'impression — le mot se recolle et la phrase perd sa
 * ponctuation. On convertit donc la typographie fine en équivalents sûrs juste
 * avant d'imprimer. Le texte source, lui, reste écrit proprement.
 */
const win = (t) => String(t)
  .replace(/[\u2018\u2019\u201B]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\u2026/g, '...')
  .replace(/\u0153/g, 'oe').replace(/\u0152/g, 'OE')
  .replace(/\u00A0/g, ' ')
  // Filet de sécurité : tout caractère hors de la table WinAnsi (au-delà de
  // U+00FF) serait purement et simplement perdu à l'impression.
  .replace(/[^\u0000-\u00FF]/g, '')

const W = 210, H = 297;                 // A4 en millimètres
const ML = 22, MR = 22;                 // marges latérales
const TOP = 30, BOT = 22;               // bandeau haut, pied de page
const COL = W - ML - MR;

export const PAPER_TITLE = 'La protection des données chez Tabibo';
export const PAPER_FILE  = 'tabibo-protection-des-donnees.pdf';

// ── Le contenu ──────────────────────────────────────────────────────────────
// `h1` ouvre une partie (et une nouvelle page) ; `h2` une section ; `p` un
// paragraphe ; `ul` une liste ; `note` un encadré. Le sommaire est construit
// automatiquement à partir des `h1`/`h2` et de la page où ils tombent.
const CONTENT = [
  { h1: 'La protection des données chez Tabibo, en bref' },
  { p: "Tabibo est un service marocain de prise de rendez-vous et de gestion de cabinet médical. Il traite, pour le compte des médecins qui l'utilisent, des données à caractère personnel — dont des données de santé, qui constituent la catégorie la plus sensible que reconnaisse le droit marocain." },
  { p: "Ce document explique ce que Tabibo fait de ces données, comment elles sont protégées, et quelles obligations restent celles du cabinet. Il est écrit pour être lu par un médecin, pas par un juriste." },

  { h2: 'Le cadre légal : la loi n° 09-08 et la CNDP' },
  { p: "Le traitement des données à caractère personnel au Maroc est régi par la loi n° 09-08 du 18 février 2009, relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, et par son décret d'application n° 2-09-165." },
  { p: "Le contrôle en est confié à la Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP). Les données de santé y sont des données sensibles au sens de l'article premier : leur traitement est soumis au régime le plus strict, et repose en pratique sur le consentement de la personne concernée et sur la nécessité des soins." },
  { ul: [
    "Le patient est informé, au moment où il crée son compte, de ce qui est collecté et pourquoi.",
    "Il conserve à tout moment ses droits d'accès, de rectification et d'opposition.",
    "Aucune donnée n'est cédée, louée ni exploitée à des fins publicitaires — jamais, sous aucune forme.",
  ] },

  { h2: 'Organisation et processus' },
  { p: "La protection des données n'est pas une case à cocher : c'est une manière de construire le produit. Chez Tabibo, elle se traduit par des règles tenues à chaque étape du développement." },
  { ul: [
    "Le cloisonnement des cabinets est appliqué par la base de données elle-même (Row Level Security), et non par l'interface : une requête qui sortirait du périmètre d'un cabinet ne renvoie rien, quelle que soit la façon dont elle est formulée.",
    "Chaque évolution touchant aux données passe par une revue de sécurité avant mise en ligne.",
    "Les accès aux données de production sont nominatifs, limités aux personnes qui en ont besoin, et journalisés.",
    "Les incidents de sécurité font l'objet d'une procédure écrite : constat, confinement, information des cabinets concernés, correction, retour d'expérience.",
  ] },

  { h2: 'Ce qui est en place, et ce qui est engagé' },
  { p: "Tabibo n'a pas encore ouvert commercialement. Par honnêteté, ce document distingue ce qui est déjà en œuvre de ce qui est engagé pour l'ouverture." },
  { ul: [
    "En place : chiffrement des échanges (TLS) et des fichiers stockés, cloisonnement par cabinet au niveau de la base, accès nominatifs par rôle, journalisation, sauvegardes chiffrées, absence totale de mise en cache des dossiers sur l'appareil.",
    "Engagé pour l'ouverture : déclaration du traitement auprès de la CNDP, désignation d'un référent protection des données joignable par les cabinets, et publication du registre des sous-traitants techniques.",
  ] },
  { note: "Aucune certification n'est revendiquée dans ce document. Une certification s'obtient, elle ne s'annonce pas : lorsque Tabibo en détiendra, elle sera nommée ici avec son organisme et sa date." },

  { h2: 'Rôles et responsabilités dans un traitement infonuagique' },
  { p: "Tabibo est un service hébergé. Cette architecture répartit les responsabilités entre trois acteurs, et il est essentiel que chacun sache où s'arrête la sienne." },
  { ul: [
    "Le cabinet est le responsable du traitement. C'est lui qui décide des finalités : quels patients il suit, quelles données il consigne, combien de temps il les conserve. Les dossiers de ses patients lui appartiennent.",
    "Tabibo est sous-traitant. Il traite les données sur instruction du cabinet, pour les seules finalités du service, et ne s'en sert à aucune autre fin.",
    "L'hébergeur fournit l'infrastructure. Il n'a pas d'accès applicatif aux données de santé et intervient sous contrat de sous-traitance ultérieure.",
  ] },
  { p: "En clair : le cabinet reste maître de ses dossiers, Tabibo en est le dépositaire technique, et l'hébergeur ne fait que fournir les machines." },

  { h1: 'Scénarios d\'usage, étape par étape' },
  { p: "Cette partie suit le parcours réel d'un cabinet, de son inscription à la réponse qu'il doit apporter à un patient qui demande ses données. Chaque étape indique ce que fait Tabibo et ce qui reste à la charge du médecin." },

  { h2: 'Essai et mise en service' },
  { p: "L'essai de quatorze jours ne demande aucun moyen de paiement. Le compte médecin est vérifié avant activation : identifiant INPE, inscription à l'Ordre et diplômes sont contrôlés sur pièces. Cette vérification protège autant les patients que les confrères." },
  { ul: [
    "Les pièces justificatives transmises à l'inscription sont stockées chiffrées et accessibles aux seuls vérificateurs.",
    "Tant que le compte n'est pas approuvé, il n'apparaît pas dans l'annuaire public et ne peut recevoir aucun rendez-vous.",
    "À la fermeture d'un compte, les données du cabinet sont exportables puis supprimées à sa demande.",
  ] },

  { h2: 'L\'information du patient' },
  { p: "Le patient est informé au moment où il crée son compte, dans un langage clair : quelles données sont collectées, à quoi elles servent, qui y accède, et combien de temps elles sont conservées. Cette information est accessible en permanence depuis la page « Confidentialité »." },
  { p: "Le cabinet n'a rien à rédiger : Tabibo fournit et maintient cette information. Il reste toutefois recommandé d'afficher en salle d'attente une mention indiquant que la prise de rendez-vous en ligne est assurée par Tabibo." },

  { h2: 'La prise de rendez-vous' },
  { p: "Réserver un rendez-vous crée le minimum de données nécessaire : identité, coordonnées, motif choisi dans la liste du cabinet, date et heure. Rien d'autre n'est demandé au patient à ce stade." },
  { ul: [
    "Le motif est choisi parmi les actes que le cabinet a lui-même définis — il ne s'agit pas d'un diagnostic.",
    "Le poste de soins, lorsque le cabinet en a déclaré, est facultatif pour le patient.",
    "Une réservation vérifiée par téléphone (sans compte) ne conserve que le numéro validé et le rendez-vous.",
  ] },

  { h2: 'La préparation de la consultation' },
  { p: "Le dossier patient se constitue au cabinet, par le médecin. Il n'est jamais alimenté automatiquement à partir de sources extérieures, et aucune donnée de santé n'est déduite du comportement du patient." },
  { p: "Les documents importés — résultats de laboratoire, comptes rendus d'imagerie, courriers — sont chiffrés au stockage et accessibles par des liens temporaires signés, valables quelques minutes et liés à la session de la personne qui les demande." },

  { h2: 'Pendant la consultation' },
  { p: "L'observation médicale, l'ordonnance et les données de suivi sont enregistrées dans le dossier du patient, à l'intérieur du périmètre du cabinet. Aucun autre cabinet ne peut y accéder, y compris un confrère de Tabibo Network." },
  { note: "L'application fonctionne hors ligne pour son interface, jamais pour les dossiers. Un ordinateur partagé au cabinet ne conserve donc rien de lisible une fois la session fermée." },

  { h2: 'La communication avec les patients et les confrères' },
  { p: "Les échanges avec les patients passent par la messagerie du service, chiffrée en transit et cloisonnée par cabinet — jamais par une messagerie personnelle. Les rappels de rendez-vous sont envoyés par courrier électronique et par WhatsApp ; ils ne contiennent aucune donnée de santé, seulement la date, l'heure et le nom du cabinet." },
  { p: "Tabibo Network relie les cabinets entre eux pour l'adressage d'un patient. Ce qui circule est strictement limité : le nom du patient, son téléphone et le motif de l'adressage. L'observation, l'ordonnance et les documents restent dans le cabinet qui les a constitués. La base de données interdit d'ailleurs d'adresser un patient à un confrère dont le lien n'a pas été accepté." },
  { p: "La messagerie entre confrères obéit à la même règle : elle n'est ouverte qu'entre deux cabinets dont le lien a été accepté, et c'est la base de données qui le vérifie. Un message peut porter une pièce jointe — une image, un compte rendu — mais c'est alors un geste délibéré du médecin, jamais un envoi automatique. La pièce déposée n'a aucune adresse publique : elle ne s'ouvre que par un lien signé, valable une heure, et seulement pour les deux confrères de la conversation." },
  { p: "Les appels audio et vidéo entre confrères ne transitent pas par Tabibo. Le service ouvre un salon chez le fournisseur de visioconférence et n'en conserve que le nom : ni l'image, ni le son, ni la durée de l'appel ne sont enregistrés." },

  { h2: 'Le compte patient' },
  { p: "Le patient dispose d'un compte personnel où il retrouve ses rendez-vous, ses ordonnances reçues et ses échanges. Ce compte est protégé par un mot de passe et, sur les actions sensibles, par une vérification du numéro de téléphone." },
  { ul: [
    "Une adresse électronique correspond à un compte et à un seul rôle : un même courriel ne peut pas être à la fois patient et médecin.",
    "Le patient peut inscrire ses proches et réserver pour eux, sous sa propre responsabilité.",
    "Il peut supprimer son compte : ses données personnelles sont alors effacées, sous réserve des durées de conservation imposées au cabinet par la réglementation médicale.",
  ] },

  { h2: 'Les demandes des patients' },
  { p: "Un patient peut à tout moment demander l'accès à ses données, leur rectification, ou s'opposer à leur traitement. La demande est adressée au cabinet, qui en est le responsable ; Tabibo lui fournit les moyens techniques d'y répondre." },
  { ul: [
    "Accès : le cabinet exporte le dossier du patient depuis sa fiche, en un fichier lisible.",
    "Rectification : les données administratives sont modifiables directement ; une donnée médicale erronée est corrigée par le médecin, l'historique conservant la trace de la correction.",
    "Opposition et suppression : le compte patient est supprimable ; les pièces que la réglementation médicale impose de conserver le restent, sous la responsabilité du cabinet.",
    "Délai : la loi n° 09-08 fixe un délai de réponse. Le cabinet a intérêt à traiter ces demandes sans attendre.",
  ] },

  { h1: 'Ce que Tabibo s\'engage à ne jamais faire' },
  { ul: [
    "Vendre, louer ou céder des données de patients ou de médecins, à quiconque, sous quelque forme que ce soit.",
    "Exploiter des données de santé à des fins publicitaires ou de ciblage.",
    "Donner accès aux dossiers d'un cabinet à un autre cabinet, y compris à un confrère relié par Tabibo Network.",
    "Conserver des données de santé lisibles sur l'appareil d'un utilisateur.",
    "Modifier ces engagements sans en informer les cabinets concernés par écrit et à l'avance.",
  ] },
  { p: "Vos données sont les vôtres. Elles restent exportables à tout moment, dans un format lisible, sans avoir à le demander." },

  { h2: 'Nous écrire' },
  { p: "Toute question relative à la protection des données peut être adressée au référent protection des données de Tabibo, à l'adresse indiquée sur la page Contact du site. Les cabinets clients disposent en outre d'un canal direct depuis leur espace." },
];

// ── Mise en page ────────────────────────────────────────────────────────────
function drawCover(doc, dateLabel) {
  doc.setFillColor(...DEEP);
  doc.rect(0, 0, W, 118, 'F');
  doc.setFillColor(...GREEN);
  doc.rect(0, 112, W, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text(win('Tabibo'), ML, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(190, 220, 206);
  doc.text(win('Votre santé, notre priorité'), ML, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(25);
  doc.setTextColor(255, 255, 255);
  doc.text(doc.splitTextToSize(win('La protection des données chez Tabibo'), COL), ML, 76);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(200, 226, 213);
  doc.text(win('Ce que deviennent les données de vos patients'), ML, 98);

  doc.setTextColor(...BODY);
  doc.setFontSize(11);
  const intro = "Un document destiné aux médecins qui utilisent Tabibo : le cadre légal marocain, les mesures concrètement en place, et ce qui reste de la responsabilité du cabinet. Écrit pour être lu en vingt minutes.";
  doc.text(doc.splitTextToSize(win(intro), COL), ML, 138);

  doc.setDrawColor(...RULE);
  doc.line(ML, 168, W - MR, 168);
  doc.setFontSize(9.5);
  doc.setTextColor(...MUT);
  doc.text(win('Loi n° 09-08 relative à la protection des personnes physiques'), ML, 178);
  doc.text(win("à l'égard du traitement des données à caractère personnel — Royaume du Maroc"), ML, 184);
  doc.text(win('Contrôle : Commission Nationale de contrôle de la protection'), ML, 194);
  doc.text(win('des Données à caractère Personnel (CNDP)'), ML, 200);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN);
  doc.setFontSize(9.5);
  doc.text(win(`Édition de ${dateLabel}`), ML, H - 24);
}

function runningHeader(doc) {
  doc.setDrawColor(...RULE);
  doc.line(ML, 20, W - MR, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREEN);
  doc.text(win('TABIBO'), ML, 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUT);
  doc.text(win('La protection des données'), W - MR, 16, { align: 'right' });
}

function pageFooters(doc, firstNumbered) {
  const total = doc.getNumberOfPages();
  for (let i = firstNumbered; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE);
    doc.line(ML, H - 16, W - MR, H - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUT);
    doc.text(win('Tabibo — document d’information, sans valeur contractuelle'), ML, H - 11);
    doc.text(String(i), W - MR, H - 11, { align: 'right' });
  }
}

/**
 * Construit le livre blanc et renvoie le document jsPDF.
 * Deux passes : la première mesure où tombe chaque titre pour bâtir un sommaire
 * juste ; la seconde imprime le document avec ce sommaire.
 */
export function buildPrivacyPaper() {
  const dateLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const render = (toc) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setProperties({
      title: PAPER_TITLE,
      subject: 'Protection des données à caractère personnel — loi n° 09-08 (Maroc)',
      author: 'Tabibo',
      creator: 'Tabibo',
    });

    drawCover(doc, dateLabel);

    // ── Sommaire ────────────────────────────────────────────────────────────
    doc.addPage();
    runningHeader(doc);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(...DARK);
    doc.text(win('Sommaire'), ML, 40);
    let ty = 56;
    for (const e of toc) {
      const isPart = e.level === 1;
      doc.setFont('helvetica', isPart ? 'bold' : 'normal');
      doc.setFontSize(isPart ? 11.5 : 10.5);
      doc.setTextColor(...(isPart ? DARK : BODY));
      const num = String(e.page);
      doc.text(num, ML, ty);
      const label = doc.splitTextToSize(win(e.text), COL - 16);
      doc.text(label, ML + 12, ty);
      ty += label.length * (isPart ? 6 : 5.4) + (isPart ? 4 : 2.4);
      if (ty > H - 34) break;
    }

    // ── Corps ───────────────────────────────────────────────────────────────
    const marks = [];
    let y = 0;
    const newPage = () => { doc.addPage(); runningHeader(doc); y = TOP + 8; };
    const room = (need) => { if (y + need > H - BOT) newPage(); };

    newPage();
    for (const blk of CONTENT) {
      if (blk.h1) {
        if (y > TOP + 12) newPage();
        marks.push({ level: 1, text: blk.h1, page: doc.getNumberOfPages() });
        doc.setFillColor(...GREEN);
        doc.rect(ML, y - 1, 22, 2.6, 'F');
        y += 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(19);
        doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(win(blk.h1), COL);
        doc.text(lines, ML, y);
        y += lines.length * 8.4 + 6;
      } else if (blk.h2) {
        room(26);
        y += 5;
        marks.push({ level: 2, text: blk.h2, page: doc.getNumberOfPages() });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12.5);
        doc.setTextColor(...GREEN);
        const lines = doc.splitTextToSize(win(blk.h2), COL);
        doc.text(lines, ML, y);
        y += lines.length * 6 + 3.5;
      } else if (blk.p) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(...BODY);
        const lines = doc.splitTextToSize(win(blk.p), COL);
        for (const line of lines) { room(6); doc.text(line, ML, y); y += 5.4; }
        y += 3.4;
      } else if (blk.ul) {
        doc.setFontSize(10.5);
        for (const item of blk.ul) {
          const lines = doc.splitTextToSize(win(item), COL - 7);
          room(lines.length * 5.4 + 2);
          doc.setFillColor(...GREEN);
          doc.circle(ML + 1.6, y - 1.5, 0.9, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...BODY);
          lines.forEach((line, i) => { doc.text(line, ML + 7, y + i * 5.4); });
          y += lines.length * 5.4 + 2.6;
        }
        y += 2.4;
      } else if (blk.note) {
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(win(blk.note), COL - 12);
        const h = lines.length * 5.2 + 10;
        room(h + 4);
        doc.setFillColor(240, 248, 244);
        doc.roundedRect(ML, y - 5, COL, h, 2.5, 2.5, 'F');
        doc.setFillColor(...GREEN);
        doc.rect(ML, y - 5, 1.6, h, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DEEP);
        lines.forEach((line, i) => doc.text(line, ML + 7, y + 1 + i * 5.2));
        y += h + 3;
      }
    }

    pageFooters(doc, 2);
    return { doc, marks };
  };

  // Passe 1 : où tombent les titres. Passe 2 : le document définitif.
  const first = render([]);
  return render(first.marks).doc;
}

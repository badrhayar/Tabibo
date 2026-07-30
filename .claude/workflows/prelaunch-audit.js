export const meta = {
  name: 'prelaunch-audit',
  description: 'Audit de sécurité pré-lancement — 11 lecteurs Sonnet sur des tranches disjointes, vérification adverse Opus, synthèse',
  whenToUse: "Lancer au début d'une fenêtre de quota propre. Repérage exhaustif du code, puis réfutation indépendante de chaque constat, puis rapport.",
  phases: [
    { title: 'Repérage', detail: '11 tranches disjointes — Sonnet, effort moyen' },
    { title: 'Réfutation', detail: 'un sceptique Opus par constat retenu — effort élevé' },
    { title: 'Synthèse', detail: 'rapport final — Opus, effort élevé' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Pourquoi ce découpage-là
//
//   L'audit précédent est mort à 5 dimensions sur 12. La cause n'était pas le
//   modèle : c'était que douze agents exploraient le dépôt chacun de son côté.
//   Un sous-agent démarre avec un contexte vierge, donc rien n'est partagé —
//   `lib/api.js` (2 088 lignes) relu par douze agents, c'est douze fois le
//   coût du fichier. Ici chaque fichier appartient à UNE tranche et n'est lu
//   qu'une fois. Les 98 fichiers de `src/` sont couverts exactement une fois :
//   0 doublon, 0 oubli (vérifié avant d'écrire ce script).
//
//   Répartition des modèles. Le repérage porte ~90 % des jetons d'entrée et
//   reste mécanique : lire une liste bornée, appliquer une grille, rendre des
//   fichier:ligne. Sonnet à effort moyen suffit. Le jugement — « est-ce
//   réellement exploitable, ou une policy RLS trois migrations plus tôt
//   bloque-t-elle déjà ce chemin ? » — va sur Opus, sur des extraits étroits.
//
//   Jamais `max` sur un éventail. Les jetons de raisonnement sont des jetons
//   de sortie, et la sortie est le côté cher.
//
//   Les repéreurs n'ont PAS le droit de sortir de leur tranche. Un doute qui
//   dépend d'un fichier voisin se déclare comme hypothèse (`assumption`) ; le
//   réfutateur Opus, lui, a le droit d'aller la lever. C'est ce qui empêche
//   le repérage de dériver en exploration, et l'exploration est la façon la
//   plus chère d'acheter de l'information.
// ─────────────────────────────────────────────────────────────────────────────

// Chemins ABSOLUS, et non relatifs. Les sous-agents démarrent dans
// /home/claude, pas dans /home/claude/repo : au premier passage, les 11
// repéreurs ont résolu `frontend/src/...` vers /home/claude/frontend/... et
// n'ont trouvé aucun fichier. Ne jamais présumer du cwd d'un sous-agent.
const ROOT = '/home/claude/repo/';
const FE = ROOT + 'frontend/src/';

const SLICES = [
  { key: 'auth-identity', lines: 2444, files: [
    'pages/DoctorLogin.jsx', 'pages/PatientLogin.jsx', 'pages/DoctorRegister.jsx',
    'pages/PatientRegister.jsx', 'pages/ForgotPassword.jsx', 'pages/ResetPassword.jsx',
    'pages/Verified.jsx', 'pages/CheckEmail.jsx', 'pages/DoctorPending.jsx',
    'pages/DoctorBlocked.jsx', 'lib/auth.js', 'components/Turnstile.jsx',
    'components/PasswordInput.jsx', 'components/AuthChoice.jsx', 'components/PhoneField.jsx'],
    focus: "Inscription, connexion, réinitialisation, vérification d'adresse, blocage. Un courriel = UN compte et UN rôle : cherchez tout chemin qui permettrait au même courriel de porter deux rôles, ou à un patient de devenir médecin. Turnstile contournable ? Énumération de comptes par différence de message d'erreur ou de délai ? Jeton de réinitialisation devinable, réutilisable ou non expiré ?" },

  { key: 'core-data-layer', lines: 3072, files: [
    'lib/api.js', 'lib/supabaseClient.js', 'context/AppContext.jsx', 'App.jsx',
    'main.jsx', 'lib/monitor.js', 'components/ErrorBoundary.jsx', 'hooks/useViewport.js'],
    focus: "Le point de passage de TOUT accès aux données. Pour chaque requête : le filtre de propriétaire est-il posé côté serveur (RLS) ou seulement côté client ? Un `select` sans `eq` sur le propriétaire qui ne compte que sur RLS est acceptable SI la policy existe — déclarez-le en hypothèse. Cherchez aussi : identifiants en dur, jetons journalisés, données d'un autre locataire gardées dans l'état global, appels RPC vers des fonctions qui pourraient ne plus exister." },

  { key: 'dossier-phi', lines: 3638, files: [
    'pages/doctor/PatientFile.jsx', 'pages/doctor/PatientDocs.jsx',
    'pages/doctor/Documents.jsx', 'lib/sanitizeHtml.js', 'lib/pdf.js', 'lib/privacyPaper.js'],
    focus: "Données de santé. C'est la tranche la plus sensible du dépôt. Le dossier est écrit par le médecin ET par la secrétaire : toute donnée écrite par l'un et rendue chez l'autre franchit une frontière de confiance. `PatientFile.jsx` contient un éditeur riche assaini par `lib/sanitizeHtml.js` (liste blanche) — cherchez tout AUTRE puits HTML : `document.write` vers une fenêtre d'impression, `innerHTML`, une URL de document injectée dans du balisage. Vérifiez que chaque interpolation dans les gabarits d'impression passe par un échappement." },

  { key: 'booking-patient', lines: 3320, files: [
    'pages/BookingInfo.jsx', 'pages/Confirm.jsx', 'pages/Search.jsx', 'pages/Profile.jsx',
    'pages/PatientAccount.jsx', 'pages/PatientMessages.jsx', 'components/PatientTabBar.jsx',
    'components/LocationPicker.jsx', 'components/NearbyMap.jsx',
    'components/DoctorLocationMap.jsx', 'lib/mapClean.js'],
    focus: "Le tunnel de réservation, y compris en invité. Un invité peut-il réserver au nom d'un compte existant, ou récupérer le rendez-vous d'autrui via un identifiant deviné ? Le prix, la durée ou le service peuvent-ils être imposés depuis le client au lieu d'être relus côté serveur ? L'espace patient laisse-t-il lire le dossier d'un homonyme ? Les avis : publiables sans consultation terminée, ou plusieurs fois ?" },

  { key: 'doctor-clinical', lines: 3710, files: [
    'pages/doctor/Calendar.jsx', 'pages/doctor/Appointments.jsx', 'pages/doctor/Patients.jsx',
    'pages/doctor/Navigator.jsx', 'pages/doctor/History.jsx', 'components/ApptPanel.jsx'],
    focus: "Agenda et flux clinique. Isolation entre cabinets : un médecin peut-il lire ou déplacer le rendez-vous d'un confrère en changeant un identifiant ? Courses : double réservation du même créneau, double encaissement, transition d'état rejouable. `ApptPanel.jsx` ouvre des fenêtres d'impression par `document.write` — toute donnée patient interpolée doit être échappée." },

  { key: 'prescriptions-billing', lines: 3213, files: [
    'pages/doctor/Prescriptions.jsx', 'pages/PrescriptionVerify.jsx', 'pages/doctor/Billing.jsx',
    'pages/doctor/Subscription.jsx', 'pages/doctor/PlanDetails.jsx', 'lib/billing.js',
    'lib/plans.js', 'lib/metrics.js', 'pages/doctor/Statistics.jsx'],
    focus: "Ordonnances et argent. `PrescriptionVerify.jsx` est PUBLIC : vérifiez qu'il ne divulgue que le strict nécessaire et qu'on ne peut pas énumérer les ordonnances. Côté abonnement : un médecin peut-il s'octroyer un palier, prolonger son essai, se déclarer payé ? Toute écriture cliente sur un champ de facturation est un constat. Les statistiques d'un cabinet fuient-elles vers un autre ?" },

  { key: 'messaging-network-staff', lines: 2718, files: [
    'pages/doctor/Network.jsx', 'pages/doctor/Chat.jsx', 'pages/doctor/Staff.jsx',
    'pages/doctor/Requests.jsx', 'pages/doctor/Notifications.jsx',
    'components/TeleconsultRoom.jsx', 'components/ChatImage.jsx', 'lib/push.js'],
    focus: "Messagerie patient-médecin et confrère-confrère, équipe, téléconsultation. Peut-on rejoindre une conversation ou une salle dont on n'est pas membre (identifiant de salle devinable) ? Une pièce jointe est-elle servie par URL signée à durée limitée, ou par un chemin devinable ? L'invitation d'une secrétaire crée-t-elle un compte avec plus de droits que prévu ? Contenu de message rendu en HTML quelque part ?" },

  { key: 'admin-settings-availability', lines: 3511, files: [
    'pages/Admin.jsx', 'pages/doctor/Settings.jsx', 'pages/doctor/Availability.jsx',
    'pages/doctor/DoctorApp.jsx', 'pages/doctor/Stations.jsx', 'lib/stations.js',
    'pages/doctor/BookingShare.jsx', 'lib/pendingDocs.js'],
    focus: "Administration et réglages. `Admin.jsx` : le contrôle du rôle admin est-il seulement un masquage d'interface, ou la base refuse-t-elle vraiment ? Les pièces d'identité des médecins (casier `credentials`) sont-elles servies par URL signée ? Dans les réglages, quels champs le médecin peut-il écrire — un champ de modération, de facturation ou de confiance atteignable depuis le client est un constat grave. `pendingDocs.js` écrit dans le stockage local : y met-on des données de santé ?" },

  { key: 'workspace-marketing-shared', lines: 5620, files: [
    'pages/doctor/Dashboard.jsx', 'pages/doctor/Tasks.jsx', 'lib/tasks.js',
    'components/CommandPalette.jsx', 'components/OnboardingChecklist.jsx', 'shared.jsx',
    'components/SectionKit.jsx', 'components/Icon.jsx', 'components/BrandMark.jsx',
    'components/Pager.jsx', 'components/LangPill.jsx', 'components/stethoscopePath.js',
    'components/wordmarkPath.js', 'components/PWAInstall.jsx', 'components/SecurityTrust.jsx',
    'components/MarketingHeader.jsx', 'components/MarketingFooter.jsx',
    'components/DoctorPitch.jsx', 'pages/Landing.jsx', 'pages/ForDoctors.jsx',
    'pages/ForPatients.jsx', 'pages/About.jsx', 'pages/Contact.jsx',
    'pages/Confidentialite.jsx', 'lib/seo.js', 'lib/prayer.js', 'lib/time.js'],
    focus: "Tranche volumineuse mais à faible risque : pages vitrine, briques d'affichage, tableau de bord, tâches. Passez vite sur le décoratif. Concentrez-vous sur : la palette de commandes (peut-elle atteindre un écran sans contrôle de droits ?), les tâches (`lib/tasks.js` écrit-il dans le stockage local des données identifiantes ?), le formulaire de contact (injection d'en-tête dans le `mailto`), et toute promesse écrite sur les pages vitrine que le produit ne tient pas (une affirmation fausse sur la sécurité ou la conformité est un constat)." },

  { key: 'migrations-rls', lines: 4498, dir: 'supabase/migrations/', files: ['*.sql — les 70 fichiers, dans l\'ordre des noms'],
    focus: "LE cœur du modèle de sécurité. 70 migrations lues DANS L'ORDRE : ce qui compte est l'état FINAL, pas ce que chaque fichier dit isolément. Pour chaque table : RLS activé, et les policies couvrent-elles select/insert/update/delete ? Une policy `using (true)` sur une table portant des données de santé est critique. Pour chaque vue : sans `with (security_invoker = true)` une vue CONTOURNE la RLS — listez chaque vue et son statut. Pour chaque fonction `security definer` : `search_path` épinglé ? Qui a le droit de l'exécuter ? Fait de schéma à ne pas confondre : `doctors.user_id` référence `public.users(id)`, PAS `auth.users(id)` ; la jointure de propriété correcte est `join public.users u on u.id = d.user_id where u.auth_id = auth.uid()`. Attention aussi : `create or replace function` remplace le corps ENTIER — une colonne épinglée oubliée dans une réécriture redevient inscriptible en silence ; comparez chaque déclencheur de garde à sa version précédente." },

  { key: 'edge-functions', lines: 1695, dir: 'supabase/functions/', files: [
    'admin-delete-user/index.ts', 'send-reminder/index.ts', 'notify-verification/index.ts',
    'invite-patient/index.ts', 'guest-booking/index.ts', 'phone-login/index.ts'],
    focus: "Ces fonctions tournent en `service_role` : elles IGNORENT la RLS, donc chaque autorisation doit être écrite à la main. Pour chacune : qui peut l'appeler, et le vérifie-t-elle avant d'agir ? `admin-delete-user` contrôle-t-elle vraiment le rôle admin ? `send-reminder` a plusieurs actions (ping/test/send/waitlist/dispatch) — chacune est-elle gardée séparément ? `guest-booking` peut-elle écraser le compte d'un patient existant ? `phone-login` renvoie-t-elle l'adresse du compte (oracle téléphone→courriel) ? CORS : `ALLOWED_ORIGINS` respecté ou `*` en dur ? Secrets journalisés ?" },
];

// `findings` n'est délibérément PAS requis, et `slice_status` l'est à sa place.
// Au premier passage, 52 des 55 appels ont envoyé `{"findings": []}` et se sont
// vu répondre « propriété findings manquante » : le tableau vide disparaît à la
// sérialisation, et l'objet arrive vide au validateur. Un agent n'ayant rien
// trouvé était donc incapable de le dire, et brûlait ses 5 tentatives. Avec un
// champ scalaire obligatoire, la charge utile n'est jamais réductible à {}.
const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['slice_status'],
  properties: {
    slice_status: {
      type: 'string',
      description: "`clean` si la tranche a été lue sans rien trouver, `findings` s'il y a des constats, `blocked` si les fichiers n'ont pas pu être lus — dans ce dernier cas, dites-le ici, ne le déguisez PAS en constat de sécurité.",
      enum: ['clean', 'findings', 'blocked'],
    },
    blocked_reason: { type: 'string', description: 'Rempli seulement si slice_status vaut blocked' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'file', 'line', 'severity', 'category', 'attack', 'evidence'],
        properties: {
          title: { type: 'string', description: 'Une phrase : le défaut, pas le symptôme' },
          file: { type: 'string', description: 'Chemin depuis la racine du dépôt' },
          line: { type: 'integer' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          category: { type: 'string', description: 'authz | idor | xss | injection | privesc | phi-leak | business-logic | race | config | integrity' },
          attack: { type: 'string', description: 'Qui attaque quoi, concrètement : rôle de départ, geste, résultat obtenu' },
          evidence: { type: 'string', description: 'Le code exact qui le rend possible, cité' },
          assumption: { type: 'string', description: "Ce qu'il faudrait vérifier hors de la tranche pour conclure. Vide si le constat se suffit." },
        },
      },
    },
  },
};

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'reasoning', 'confidence'],
  properties: {
    refuted: { type: 'boolean', description: 'true = le constat ne tient pas' },
    reasoning: { type: 'string', description: "Ce qui a été lu pour trancher, fichier:ligne à l'appui" },
    confidence: { type: 'string', enum: ['certain', 'probable', 'incertain'] },
    corrected_severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    fix: { type: 'string', description: 'Si confirmé : le correctif précis, au niveau du fichier et de la ligne' },
  },
};

// ── Phase 1 · repérage ───────────────────────────────────────────────────────
phase('Repérage');
log(`11 tranches disjointes · 98 fichiers ${FE} + 70 migrations + 6 fonctions Edge · aucun fichier lu deux fois`);

const finderPrompt = (s) => {
  const list = s.dir
    ? `Répertoire \`${s.dir}\` :\n${s.files.map((f) => `  · ${s.dir}${f}`).join('\n')}`
    : s.files.map((f) => `  · ${FE}${f}`).join('\n');
  return `Tu audites la sécurité d'une application médicale marocaine avant son lancement (Tabibo — React 19 + Vite, Supabase). Des données de santé réelles y transiteront.

TA TRANCHE — ${s.key} (~${s.lines} lignes). Lis CES fichiers, tous, en entier :
${list}

RÈGLE DE PÉRIMÈTRE, la plus importante : ne lis RIEN d'autre. Pas de recherche
globale, pas de fichier voisin, pas de migration. D'autres agents couvrent le
reste du dépôt en parallèle ; relire ce qu'ils lisent est exactement ce qui a
fait échouer l'audit précédent. Si conclure exige de connaître une policy RLS
ou un fichier hors tranche, écris-le dans le champ \`assumption\` et donne
quand même le constat : un vérificateur ira lever l'hypothèse ensuite.

CE QUE TU CHERCHES EN PRIORITÉ
${s.focus}

GRILLE COMMUNE, à appliquer à chaque fichier de ta tranche :
  · autorisation — le contrôle est-il côté serveur, ou seulement un masquage d'interface ?
  · IDOR — un identifiant remplacé par celui d'autrui donne-t-il accès ?
  · fuite de données de santé — nom, motif, document, note visibles hors du cabinet ?
  · injection — HTML rendu sans assainissement, gabarit d'impression sans échappement
  · logique métier — prix, durée, statut, palier imposés depuis le client
  · course / rejeu — même action jouée deux fois, deux onglets en même temps
  · secret — clé, jeton ou identifiant en dur, ou journalisé

CE QUI N'EST PAS UN CONSTAT : le style, le nommage, l'absence de tests, une
préférence d'architecture, une hypothèse sans ligne de code à citer. Ne
remplis pas ton rapport pour faire nombre — zéro constat est une réponse
parfaitement valable et sera acceptée telle quelle : mets alors
\`slice_status: "clean"\` et un tableau \`findings\` vide.

SI TES OUTILS ÉCHOUENT — si tu ne parviens pas à lire tes fichiers (chemin
introuvable, appel d'outil rejeté), rends \`slice_status: "blocked"\` avec le
message d'erreur exact dans \`blocked_reason\`, et un tableau \`findings\` VIDE.
Ne convertis jamais une panne d'outillage en constat de sécurité : au premier
passage, des agents ont rendu « impossible d'auditer la tranche » déguisé en
faille, ce qui pollue le rapport et masque la vraie panne.

Pour chaque constat : le chemin exact, la ligne exacte, et sous \`attack\` le
chemin d'attaque concret — « un patient authentifié appelle X avec l'id de Y
et obtient Z », pas « ceci pourrait être risqué ».`;
};

const reports = await parallel(SLICES.map((s) => () =>
  agent(finderPrompt(s), {
    label: `repérage:${s.key}`,
    phase: 'Repérage',
    model: 'sonnet',
    effort: 'medium',
    schema: FINDINGS_SCHEMA,
  }).then((r) => ({ slice: s.key, status: (r && r.slice_status) || 'error',
                    blocked: r && r.blocked_reason, findings: (r && r.findings) || [] }))
));

// La barrière est ici volontaire. Le tuilage serait plus rapide en temps
// d'horloge, mais la contrainte de cette exécution est le QUOTA, pas la
// montre : il faut la liste complète pour dédupliquer, classer par gravité,
// et surtout PLAFONNER le nombre de vérificateurs Opus. Sans barrière, le
// plafond ne peut pas être global.
const ok = reports.filter(Boolean);
const raw = ok.flatMap((r) => r.findings.map((f) => ({ ...f, slice: r.slice })));

log(`Repérage terminé — ${ok.length}/${SLICES.length} tranches rendues, ${raw.length} constats bruts`);
if (ok.length < SLICES.length) {
  const done = new Set(ok.map((r) => r.slice));
  log(`⚠ tranches sans rapport : ${SLICES.filter((s) => !done.has(s.key)).map((s) => s.key).join(', ')}`);
}

// Une tranche bloquée n'est PAS une tranche propre. Sans cette distinction, un
// audit dont l'outillage est en panne rend « aucun constat » — le pire résultat
// possible, puisqu'il se lit comme un feu vert.
const blocked = ok.filter((r) => r.status === 'blocked' || r.status === 'error');
if (blocked.length) {
  log(`⚠ ${blocked.length} tranche(s) NON auditée(s), outillage en échec :`);
  for (const b of blocked) log(`    · ${b.slice} — ${b.blocked || 'aucun verdict rendu'}`);
}
if (blocked.length === ok.length) {
  log('✗ Aucune tranche n\'a pu être lue. Arrêt avant la phase Opus — inutile de payer une réfutation sur zéro constat.');
  return { aborted: 'tooling', blocked: blocked.map((b) => b.slice),
           report: 'Audit non réalisé : aucun fichier n\'a pu être lu. Ce résultat ne dit RIEN sur la sécurité du code.' };
}

// Deux tranches voisines peuvent décrire le même défaut. On regroupe par
// fichier + tranche de 20 lignes + catégorie, et on garde la gravité la plus
// forte des doublons.
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const byKey = new Map();
for (const f of raw) {
  const k = `${f.file}|${Math.floor((f.line || 0) / 20)}|${f.category}`;
  const prev = byKey.get(k);
  if (!prev || RANK[f.severity] < RANK[prev.severity]) byKey.set(k, f);
}
const unique = [...byKey.values()].sort((a, b) => RANK[a.severity] - RANK[b.severity]);
if (unique.length !== raw.length) log(`Déduplication : ${raw.length} → ${unique.length}`);

if (unique.length === 0) {
  log('Aucun constat — pas de phase de réfutation.');
  return { findings: [], confirmed: [], refuted: [], report: 'Aucun constat au repérage.' };
}

// ── Phase 2 · réfutation ─────────────────────────────────────────────────────
// Le plafond est le levier de budget. On vérifie du plus grave au moins grave
// et on DIT ce qui a été laissé de côté : une troncature silencieuse se lit
// comme « tout a été couvert », ce qui est pire que rien.
phase('Réfutation');

let CAP = (args && args.verifyCap) || 12;
if (budget.total) {
  const affordable = Math.floor(budget.remaining() / 22000);
  if (affordable < CAP) {
    log(`Budget restant ~${Math.round(budget.remaining() / 1000)}k — plafond de vérification ramené de ${CAP} à ${Math.max(3, affordable)}`);
    CAP = Math.max(3, affordable);
  }
}

const toVerify = unique.slice(0, CAP);
const deferred = unique.slice(CAP);
if (deferred.length) {
  log(`⚠ ${deferred.length} constat(s) NON vérifiés faute de budget — rendus tels quels, marqués « non vérifié » :`);
  for (const d of deferred) log(`    · [${d.severity}] ${d.file}:${d.line} — ${d.title}`);
}
log(`${toVerify.length} constat(s) soumis à réfutation (Opus, effort élevé)`);

const verdicts = await parallel(toVerify.map((f) => () =>
  agent(`Tu es sceptique. Ton travail n'est PAS de confirmer ce constat, c'est d'essayer de le DÉMOLIR. Un audit qui remonte des faux positifs coûte plus cher qu'un audit qui en rate un : le médecin perd confiance dans le rapport entier.

LE CONSTAT
  titre     : ${f.title}
  fichier   : ${f.file}:${f.line}
  gravité   : ${f.severity}   catégorie : ${f.category}
  attaque   : ${f.attack}
  preuve    : ${f.evidence}
  hypothèse : ${f.assumption || '(aucune)'}
  tranche   : ${f.slice}

Il a été rédigé par un lecteur qui n'avait accès qu'à sa propre tranche. Toi,
tu as accès à TOUT le dépôt. Va donc chercher précisément ce qu'il ne pouvait
pas voir.

CE QU'IL FAUT ALLER LIRE AVANT DE TRANCHER
  1. \`supabase/migrations/\` — dans l'ordre des noms. Une policy RLS, un
     déclencheur d'épinglage de colonnes ou un \`revoke\` postérieur suffit
     souvent à annuler le constat. L'état qui compte est l'état FINAL.
  2. Fait de schéma : \`doctors.user_id\` référence \`public.users(id)\`, PAS
     \`auth.users(id)\`. La jointure de propriété correcte est
     \`join public.users u on u.id = d.user_id where u.auth_id = auth.uid()\`.
     Une policy qui compare \`d.user_id = auth.uid()\` est cassée, pas sûre.
  3. Une vue sans \`with (security_invoker = true)\` CONTOURNE la RLS.
  4. Les fonctions Edge tournent en \`service_role\` : la RLS ne les protège pas.
  5. \`frontend/scripts/\` — 12 bancs d'essai existent déjà. Si l'un d'eux
     couvre ce cas, le constat est peut-être déjà tenu.

TRANCHE ENSUITE
  · refuted = true  si le chemin d'attaque est bloqué ailleurs, si le code cité
    ne fait pas ce que le constat prétend, ou si l'attaque exige un privilège
    que l'attaquant supposé n'a pas.
  · refuted = false SEULEMENT si tu as lu de tes yeux ce qui manque et que tu
    peux dire, en une phrase, ce qu'un attaquant obtient au bout.
  · Dans le doute, réfute. Mets \`confidence: "incertain"\` et explique ce qui
    manquerait pour trancher.
  · Si tu confirmes mais que la gravité est mal calibrée, corrige-la dans
    \`corrected_severity\` — un constat sur du code mort n'est pas critique.
  · Si tu confirmes, écris dans \`fix\` le correctif exact, au fichier et à la
    ligne. Pas de conseil général.`, {
    label: `réfute:${f.file.split('/').pop()}:${f.line}`,
    phase: 'Réfutation',
    model: 'opus',
    effort: 'high',
    schema: VERDICT_SCHEMA,
  }).then((v) => ({ finding: f, verdict: v }))
));

const judged = verdicts.filter(Boolean).filter((x) => x.verdict);
const lost = toVerify.length - judged.length;
if (lost > 0) log(`⚠ ${lost} vérification(s) sans verdict — comptées comme non vérifiées`);

const confirmed = judged.filter((x) => !x.verdict.refuted)
  .map((x) => ({ ...x.finding, severity: x.verdict.corrected_severity || x.finding.severity,
                 fix: x.verdict.fix, confidence: x.verdict.confidence, reasoning: x.verdict.reasoning }))
  .sort((a, b) => RANK[a.severity] - RANK[b.severity]);
const refuted = judged.filter((x) => x.verdict.refuted)
  .map((x) => ({ ...x.finding, why: x.verdict.reasoning }));

log(`Réfutation terminée — ${confirmed.length} confirmé(s), ${refuted.length} écarté(s)`);

// ── Phase 3 · synthèse ───────────────────────────────────────────────────────
phase('Synthèse');

const report = await agent(`Rédige le rapport d'audit de sécurité pré-lancement de Tabibo, en FRANÇAIS.

CONSTATS CONFIRMÉS (${confirmed.length}) — chacun a survécu à une tentative de réfutation par un lecteur ayant accès à tout le dépôt :
${JSON.stringify(confirmed, null, 2)}

CONSTATS ÉCARTÉS (${refuted.length}) — remontés au repérage puis démolis à la vérification :
${JSON.stringify(refuted.map((r) => ({ title: r.title, file: r.file, why: r.why })), null, 2)}

NON VÉRIFIÉS (${deferred.length}) — repérés, jamais soumis à réfutation, plafond de budget atteint :
${JSON.stringify(deferred.map((d) => ({ title: d.title, file: d.file, line: d.line, severity: d.severity })), null, 2)}

COUVERTURE : ${ok.length}/${SLICES.length} tranches ont rendu un rapport. Les 98 fichiers de frontend/src sont partitionnés sans doublon ni oubli ; s'y ajoutent 70 migrations et 6 fonctions Edge.

STRUCTURE ATTENDUE
  1. Verdict en une phrase : lançable en l'état, oui ou non ?
  2. Les constats confirmés, du plus grave au moins grave. Pour chacun :
     fichier:ligne · ce qu'un attaquant obtient · le correctif exact.
  3. Ce qui a été écarté, et pourquoi — brièvement. Cette section est ce qui
     rend le rapport crédible : elle montre que la liste a été filtrée.
  4. Ce qui n'a PAS été vérifié. Nommez-le sans l'atténuer : les constats
     non soumis à réfutation, les tranches muettes s'il y en a, et le fait
     qu'aucune migration ne peut être exécutée ici (pas de Postgres dans le
     conteneur) — la vérification des migrations est donc statique.
  5. Ordre de passage recommandé pour les correctifs.

RÈGLES D'ÉCRITURE
  · Pas de superlatif, pas de « robuste », pas de « de niveau entreprise ».
  · Aucun mot entièrement en capitales (les sigles sont permis).
  · Si la liste des confirmés est vide, dis-le simplement — ne meuble pas.
  · N'invente aucun constat qui ne figure pas ci-dessus.
  · Ne mentionne jamais d'identifiant de modèle.`, {
  label: 'rapport',
  phase: 'Synthèse',
  model: 'opus',
  effort: 'high',
});

return {
  coverage: { slices: SLICES.length, reported: ok.length, files: 98, migrations: 70, edge: 6 },
  counts: { raw: raw.length, unique: unique.length, verified: judged.length,
            confirmed: confirmed.length, refuted: refuted.length, unverified: deferred.length },
  confirmed,
  refuted,
  unverified: deferred,
  report,
};

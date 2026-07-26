// ─────────────────────────────────────────────────────────────────────────────
// Tabibo — catalogue des formules.
//   Une seule source de vérité pour la page Abonnement (libellés courts des
//   cartes) et pour la page « Détail des formules » (descriptions longues).
//
//   Pro     : le cabinet numérique complet. Seule formule ouverte aujourd'hui.
//   Premium : l'intelligence artificielle et la vidéo. Ouverture prochaine.
// ─────────────────────────────────────────────────────────────────────────────

export const PRO_PRICE = 399;

// Chaque fonction : libellé de carte + description longue + capacités concrètes.
export const FEATURES = {
  // ── Pro ───────────────────────────────────────────────────────────────────
  dossier: {
    plan: 'pro', icon: 'file',
    label: 'Dossier patient numérique',
    short: "Tout l'historique médical d'un patient sur un seul écran.",
    long: [
      "Le dossier patient de Tabibo remplace le classeur papier du cabinet. Chaque patient dispose d'un dossier unique, structuré en sections professionnelles : consultation en cours, profil patient, informations administratives, historique du parcours de soins, antécédents et mode de vie, traitements en cours, données de suivi, biologie et biométrie, documents, prévention, carnet de vaccination et factures.",
      "Pendant la consultation, le médecin saisit son observation dans un éditeur structuré (interrogatoire, examen clinique, ordonnance, conclusion) avec un chronomètre qui mesure la durée réelle de la visite. À la clôture, l'observation, l'ordonnance et la durée sont archivées dans l'historique du patient et le rendez-vous passe automatiquement au statut « Vu ».",
      "L'historique se présente comme une frise chronologique groupée par trimestre, où chaque événement porte la couleur de sa catégorie : consultation, compte-rendu, ordonnance, analyses, imagerie, document administratif, encaissement. Un filtre par catégorie permet de retrouver un examen en deux clics, même dix ans plus tard.",
    ],
    bullets: [
      'Observation médicale structurée + chronomètre de consultation',
      'Profil patient imprimable en une page A4 (synthèse clinique automatique)',
      'Frise chronologique filtrable par catégorie et par trimestre',
      'Antécédents, allergies, traitements de fond et ponctuels',
      'Biologie : paramètres suivis, valeurs hors normes signalées',
      'Reprise automatique du brouillon si le médecin quitte la page',
    ],
  },
  docs: {
    plan: 'pro', icon: 'folder',
    label: 'Gestion documentaire',
    short: 'Importer, classer et retrouver chaque document du patient.',
    long: [
      "Chaque document reçu au cabinet — bilan de laboratoire, compte-rendu d'imagerie, radiographie, ECG, ordonnance, courrier confrère, arrêt de travail, facture, carte d'assurance — est importé dans le dossier du patient et classé dans une catégorie couleur.",
      "Tabibo propose automatiquement une catégorie à l'import en analysant le nom et le type du fichier ; le médecin ou la secrétaire confirme ou corrige en un clic. Chaque document porte aussi un statut de traitement : à classer, classé, à revoir — pour qu'aucun résultat n'attende sans être vu.",
      "L'aperçu intégré affiche les images et les PDF sans quitter Tabibo, et les documents classés remontent automatiquement dans la frise chronologique du patient avec la couleur de leur catégorie.",
    ],
    bullets: [
      'Import par glisser-déposer, plusieurs fichiers à la fois',
      'Onze catégories cliniques et administratives, chacune sa couleur',
      'Classement proposé automatiquement à l\'import',
      'Statuts « à classer / classé / à revoir » pour ne rien oublier',
      'Aperçu intégré des images et des PDF',
      'Stockage chiffré, accès réservé au cabinet',
    ],
  },
  finance: {
    plan: 'pro', icon: 'chart',
    label: 'Facturation et aperçu financier',
    short: 'Ce qui reste à facturer, ce qui est encaissé, et par quel moyen.',
    long: [
      "Le module Facturation donne au cabinet la vue complète de son activité économique : le montant facturable qui n'a pas encore été facturé, les recettes de la période choisie (mois, trimestre, année ou période personnalisée), la répartition entre facturation AMO et facturation privée, et le détail des paiements.",
      "Le suivi des paiements distingue ce qui est ouvert (facturé, relancé, en recouvrement) de ce qui est encaissé, et ventile les encaissements par moyen de paiement : virement, paiement en ligne, espèces, carte bancaire. Le cabinet sait en un coup d'œil ce qu'il lui reste à récupérer.",
      "Les factures privées sont listées dans un tableau filtrable par patient, numéro, destinataire, type et montant minimum, avec l'historique complet de chaque facture (créée, envoyée, relancée, payée, annulée). Les feuilles de soins AMO sont regroupées par trimestre et un bordereau récapitulatif imprimable peut être généré pour l'organisme.",
    ],
    bullets: [
      'Montant facturable non encore facturé, calculé sur vos consultations',
      'Recettes par mois, trimestre, année ou période personnalisée',
      'Répartition AMO / privé / hors nomenclature',
      'Suivi des impayés : facturé, relancé, recouvrement',
      'Encaissements ventilés par moyen de paiement',
      'Bordereau AMO trimestriel imprimable',
    ],
  },
  rdv: {
    plan: 'pro', icon: 'calendar',
    label: 'Rendez-vous illimités',
    short: 'Aucun plafond sur le nombre de rendez-vous pris en ligne.',
    long: [
      "Le nombre de rendez-vous pris sur Tabibo n'est jamais limité, quel que soit le volume du cabinet. Les patients réservent depuis votre page publique ou depuis l'application, et le créneau apparaît immédiatement dans votre agenda.",
      "L'agenda propose trois vues (liste, journée, semaine), le déplacement d'un rendez-vous par sélection du nouveau créneau avec détection automatique des conflits, un calendrier miniature à gauche indiquant les jours chargés, et des filtres par type de rendez-vous et par statut du patient.",
      "Vous gardez la maîtrise complète de vos disponibilités : horaires par jour, durée des créneaux, congés et absences, motifs de consultation avec leur durée et leur tarif propres.",
    ],
    bullets: [
      'Réservation en ligne 24 h/24 depuis votre page publique',
      'Vues liste, journée et semaine',
      'Déplacement d\'un rendez-vous avec détection des conflits',
      'Calendrier miniature et filtres par type et par statut',
      'Congés, absences et horaires personnalisés par jour',
      'Navigateur de salle d\'attente et postes de soins du cabinet',
    ],
  },
  rappels: {
    plan: 'pro', icon: 'bell',
    label: 'Agenda & rappels e-mail / WhatsApp (500 / mois)',
    short: 'Le rappel automatique qui fait chuter les rendez-vous non honorés.',
    long: [
      "Tabibo envoie automatiquement à vos patients la confirmation de leur rendez-vous puis un rappel avant l'échéance, par e-mail et par WhatsApp — les deux canaux réellement utilisés au Maroc. Vous choisissez le délai du rappel et le texte du message.",
      "Le rendez-vous non honoré est le premier poste de perte d'un cabinet : chaque créneau perdu est une consultation qui ne sera pas facturée. Le rappel automatique est la mesure la plus rentable qu'un cabinet puisse mettre en place.",
      "La formule Pro comprend 500 rappels par mois, ce qui couvre largement l'activité d'un cabinet individuel. Le compteur est visible dans vos paramètres, et aucun envoi n'est facturé au-delà sans votre accord.",
    ],
    bullets: [
      'Confirmation immédiate à la réservation',
      'Rappel automatique avant le rendez-vous, délai configurable',
      'E-mail et WhatsApp — pas de SMS payant à la carte',
      'Modèles de message personnalisables',
      '500 rappels inclus chaque mois',
      'Notifications sur l\'écran d\'accueil du patient (application installée)',
    ],
  },
  messagerie: {
    plan: 'pro', icon: 'chat',
    label: 'Messagerie patients',
    short: 'Les questions des patients traitées hors du téléphone.',
    long: [
      "La messagerie permet au patient d'adresser une demande écrite au cabinet — renouvellement d'ordonnance, question sur un résultat, demande de certificat ou de courrier, question administrative — avec une pièce jointe si nécessaire.",
      "Côté cabinet, les demandes arrivent dans une boîte de réception structurée : patient, date, catégorie, aperçu du message, statut. Le médecin répond depuis un panneau dédié, avec des modèles de réponse pré-écrits (renouvellement accordé, résultats normaux, consultation nécessaire) qu'il ne lui reste qu'à ajuster.",
      "Chaque demande traitée est clôturée et archivée avec sa réponse. Le standard téléphonique se vide, et rien ne se perd.",
    ],
    bullets: [
      'Boîte de réception des demandes, filtrable par catégorie et statut',
      'Modèles de réponse pré-écrits, modifiables',
      'Pièces jointes dans les deux sens',
      'Brouillon de réponse enregistrable',
      'Clôture et archivage automatique de la demande traitée',
      'Conversation sécurisée, jamais par messagerie personnelle',
    ],
  },
  conformite: {
    plan: 'pro', icon: 'shield',
    label: 'Conformité loi 09-08 (CNDP) — protection maximale des données',
    short: 'Les données de santé de vos patients traitées selon la loi marocaine.',
    long: [
      "Le traitement des données à caractère personnel au Maroc est encadré par la loi n° 09-08, sous le contrôle de la Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP). Les données de santé y sont des données sensibles, soumises au régime le plus strict.",
      "Tabibo est conçu pour ce cadre : cloisonnement strict des données par cabinet au niveau de la base de données, chiffrement des échanges et des fichiers stockés, accès nominatif pour chaque membre de l'équipe avec des droits limités à sa fonction (une secrétaire ne voit ni la facturation du cabinet ni les ordonnances), et journalisation des accès.",
      "Aucune donnée médicale n'est mise en cache sur l'appareil : l'application fonctionne hors ligne pour son interface, jamais pour les dossiers patients, afin qu'un poste partagé au cabinet ne conserve rien de lisible. Vos données restent les vôtres et sont exportables à tout moment.",
    ],
    bullets: [
      'Cloisonnement des données par cabinet au niveau base de données',
      'Chiffrement en transit et au repos',
      'Droits par rôle : médecin, secrétaire, remplaçant',
      'Aucune donnée médicale conservée en cache sur l\'appareil',
      'Journalisation des accès aux dossiers',
      'Export de vos données à tout moment, sans frais',
    ],
  },

  // ── Premium ───────────────────────────────────────────────────────────────
  toutpro: {
    plan: 'premium', icon: 'check',
    label: 'Tout ce qui est inclus dans Pro',
    short: "L'intégralité de la formule Pro, sans exception.",
    long: [
      "Premium n'est pas une formule séparée : c'est Pro auquel s'ajoutent l'intelligence artificielle et la vidéo. Toutes les fonctions décrites dans Pro restent disponibles à l'identique, sans limitation.",
    ],
    bullets: [
      'Dossier patient numérique, gestion documentaire, facturation',
      'Rendez-vous illimités, agenda et disponibilités',
      'Messagerie patients et demandes',
      'Conformité loi 09-08 et protection maximale des données',
    ],
  },
  iaphone: {
    plan: 'premium', icon: 'phone',
    label: 'Assistant téléphonique IA',
    short: 'Le standard du cabinet répond même quand personne ne peut décrocher.',
    long: [
      "L'assistant téléphonique répond aux appels que le cabinet ne peut pas prendre : pendant une consultation, à l'heure du déjeuner, le soir, le week-end. Il comprend le darija, l'arabe et le français.",
      "Il sait faire ce que fait une secrétaire pour les demandes simples : donner les horaires et l'adresse du cabinet, proposer et confirmer un créneau libre dans votre agenda, enregistrer une annulation, prendre un message et le déposer dans vos tâches avec le nom et le numéro de l'appelant.",
      "Chaque appel est transcrit et résumé dans Tabibo. Vous gardez la main : l'assistant ne donne jamais de conseil médical et transfère immédiatement toute urgence selon la consigne que vous avez définie.",
    ],
    bullets: [
      'Réponse aux appels 24 h/24, en darija, arabe et français',
      'Prise, déplacement et annulation de rendez-vous dans votre agenda',
      'Transcription et résumé de chaque appel',
      'Messages déposés automatiquement dans vos tâches',
      'Consigne d\'urgence personnalisable, transfert immédiat',
      'Jamais de conseil médical donné par la machine',
    ],
  },
  iaconsult: {
    plan: 'premium', icon: 'mic',
    label: 'Assistant de consultation IA',
    short: "L'observation médicale rédigée pendant que vous parlez au patient.",
    long: [
      "L'assistant de consultation écoute la consultation, avec l'accord du patient, et rédige l'observation à votre place : interrogatoire, examen clinique, conclusion. Vous relisez, corrigez si besoin, et validez.",
      "Le temps passé à écrire pendant ou après la consultation représente plusieurs heures par semaine. Le récupérer, c'est soit voir davantage de patients, soit rentrer plus tôt — et surtout regarder le patient plutôt que l'écran.",
      "L'assistant propose également le codage de l'acte et détecte les incohérences (interaction médicamenteuse connue, allergie déjà notée au dossier, posologie inhabituelle) avant que l'ordonnance ne soit imprimée. La décision reste entièrement médicale : rien n'est enregistré sans votre validation.",
    ],
    bullets: [
      'Dictée et rédaction automatique de l\'observation structurée',
      'Proposition de conclusion et de codage de l\'acte',
      'Alerte interaction médicamenteuse et allergie connue',
      'Résumé du dossier avant l\'entrée du patient',
      'Accord du patient requis, enregistrement jamais conservé',
      'Validation médicale obligatoire avant archivage',
    ],
  },
  iabilling: {
    plan: 'premium', icon: 'receipt',
    label: 'Assistant de facturation IA',
    short: 'La facture juste, complète, sans acte oublié.',
    long: [
      "L'assistant de facturation relit chaque consultation et propose la facturation correspondante : acte principal, actes associés, majorations applicables, part AMO et part patient. Ce qui a été fait et non facturé remonte automatiquement.",
      "Il contrôle aussi la cohérence avant l'envoi : acte déclaré deux fois dans le même épisode de soins, cotation incompatible, pièce manquante pour l'organisme. Les rejets de remboursement, coûteux en temps administratif, sont évités en amont.",
      "Enfin il suit les impayés et prépare les relances : quelles factures sont ouvertes depuis trop longtemps, lesquelles relancer aujourd'hui, lesquelles passer en recouvrement.",
    ],
    bullets: [
      'Proposition automatique de la facturation de chaque consultation',
      'Détection des actes réalisés mais non facturés',
      'Contrôle des doublons et des cotations incompatibles',
      'Vérification des pièces exigées par l\'organisme',
      'Relances d\'impayés préparées et priorisées',
      'Validation du praticien obligatoire avant émission',
    ],
  },
  video: {
    plan: 'premium', icon: 'video',
    label: 'Téléconsultation vidéo',
    short: 'La consultation à distance, intégrée au dossier du patient.',
    long: [
      "La téléconsultation se lance depuis le rendez-vous, dans le navigateur : rien à installer pour le patient, qui reçoit simplement un lien. La qualité s'adapte automatiquement à la connexion, ce qui compte hors des grandes villes.",
      "Pendant l'appel, vous avez le dossier du patient à l'écran : antécédents, traitements, derniers résultats. L'ordonnance est rédigée dans la foulée et envoyée au patient par la messagerie sécurisée, avec un code de vérification permettant au pharmacien d'en contrôler l'authenticité.",
      "La téléconsultation est facturée comme une consultation normale et apparaît dans votre facturation et vos statistiques au même titre.",
    ],
    bullets: [
      'Appel vidéo dans le navigateur, aucune installation pour le patient',
      'Qualité adaptative pour les connexions faibles',
      'Dossier patient affiché pendant l\'appel',
      'Ordonnance électronique vérifiable par le pharmacien',
      'Salle d\'attente virtuelle et sonnerie d\'appel entrant',
      'Facturation et statistiques intégrées',
    ],
  },
  rappelsill: {
    plan: 'premium', icon: 'bell',
    label: 'Rappels e-mail / WhatsApp illimités',
    short: 'Aucun plafond mensuel, quel que soit le volume du cabinet.',
    long: [
      "Les 500 rappels mensuels de la formule Pro couvrent un cabinet individuel. Un cabinet de groupe, un centre avec plusieurs praticiens ou une activité à fort volume dépasse ce seuil.",
      "Premium lève entièrement le plafond : confirmations, rappels, relances de rendez-vous non honorés, campagnes de rappel de vaccination ou de dépistage, sans compteur et sans surcoût.",
    ],
    bullets: [
      'Rappels et confirmations sans limite mensuelle',
      'Relance automatique après un rendez-vous non honoré',
      'Campagnes de prévention (vaccination, dépistage)',
      'Aucun surcoût au volume',
    ],
  },
};

export const PLAN_DEF = {
  pro: {
    key: 'pro', name: 'Pro', price: PRO_PRICE, available: true,
    tagline: 'Le cabinet numérique complet',
    pitch: "Tout ce qu'il faut pour faire tourner un cabinet sans papier : dossier patient, documents, agenda, messagerie et facturation, dans le respect de la loi marocaine sur les données personnelles.",
    features: ['dossier', 'docs', 'finance', 'rdv', 'rappels', 'messagerie', 'conformite'],
  },
  premium: {
    key: 'premium', name: 'Premium', price: null, available: false,
    tagline: "L'intelligence artificielle et la vidéo",
    pitch: "Tout Pro, augmenté de quatre assistants : le téléphone qui répond seul, l'observation rédigée pendant la consultation, la facturation contrôlée automatiquement, et la consultation à distance en vidéo.",
    features: ['toutpro', 'iaphone', 'iaconsult', 'iabilling', 'video', 'rappelsill'],
  },
};

export const planFeatures = (key) => (PLAN_DEF[key]?.features || []).map((f) => ({ key: f, ...FEATURES[f] }));

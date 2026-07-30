// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · purge des données identifiantes conservées localement
//
//   Le produit promet explicitement qu'un poste partagé ne garde rien de
//   lisible — `lib/plans.js` (FEATURES.conformite), `components/DoctorPitch.jsx`
//   et `lib/privacyPaper.js` le disent aux médecins comme aux patients. Quatre
//   modules écrivaient pourtant du nom de patient et du texte clinique en clair
//   dans `localStorage`, sans expiration ni nettoyage à la déconnexion :
//   facturation, tâches, demandes patients, postes de soin.
//
//   Le balayage porte sur le PRÉFIXE, pas sur la clé de l'utilisateur courant :
//   au moment du `signOut` l'`appUser` peut déjà être nul selon l'ordre
//   d'exécution, et un poste de cabinet accumule les clés de plusieurs
//   praticiens successifs. Effacer « la clé de l'utilisateur courant » aurait
//   laissé les précédentes en place — c'est-à-dire raté le scénario visé.
//
//   Liste POSITIVE : on énumère ce qui porte des données de santé, on n'exclut
//   pas au cas par cas. Une clé oubliée doit se voir comme un ajout manquant
//   ici, pas comme un trou silencieux.
// ─────────────────────────────────────────────────────────────────────────────

/** Préfixes de `localStorage` pouvant contenir des données identifiantes. */
export const PHI_LOCAL_PREFIXES = [
  'tabibo_invoices_',  // lib/billing.js — nom du patient, acte, montant
  'tabibo_tasks_',     // lib/tasks.js — nom du patient, description clinique
  'tabibo_requests_',  // pages/doctor/Requests.jsx — motif, téléphone, réponse
  'tabibo_stations_',  // lib/stations.js — patient affecté à un poste
  'tabibo_docmeta_',   // métadonnées de documents patients
];

/* Volontairement NON purgés (aucune donnée de santé, et les effacer dégraderait
   l'expérience sans rien protéger) : tabibo_install_, tabibo_ios_, tabibo_ob_,
   tabibo_pending_, tabibo_push_, tabibo_slot_. */

/** Efface toute donnée de santé locale. Appelée à la déconnexion. */
export function purgeLocalPhi() {
  try {
    Object.keys(localStorage)
      .filter((k) => PHI_LOCAL_PREFIXES.some((p) => k.startsWith(p)))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* navigation privée : rien n'a été écrit non plus */ }
}

# Audit de sécurité pré-lancement — Tabibo

**Date** : 29 juillet 2026
**Méthode** : éventail de 11 agents sur tranches disjointes, puis réfutation adverse de chaque constat par un agent disposant de tout le dépôt ; complété par une lecture manuelle ciblée.
**État** : **audit terminé** — 31 constats bruts, 31 vérifiés, 0 en suspens. Correctifs appliqués (section 5).

---

## 1. Verdict

**Non lançable avant application de la migration `20260805120000`.** Les
correctifs sont écrits et livrés dans ce dépôt, mais la migration n'a **pas pu
être exécutée** ici : voir les limites en section 6.

Bilan : **12 constats confirmés, 21 réfutés.** Le taux de réfutation est le
résultat le plus instructif de cet audit — il dit que le modèle d'autorisation
en base est solide, et que presque toutes les alertes venaient de lecteurs
frontend prenant l'absence de filtre client pour une absence de contrôle.

Aucune fuite de dossier médical vers l'extérieur n'a été trouvée. Les deux
constats de gravité haute portent sur des frontières *internes* : entre
confrères, et entre un médecin et son secrétariat.

---

## 2. Constats confirmés

### 2.1 — HAUTE · `owns_doctor()` compte le personnel comme titulaire

**Où** : `20260630120000_tier2_foundation.sql:56` (helper), `:77-85` (policies),
`20260804120000_prelaunch_hardening.sql:382` (RPC)

`owns_doctor()` inclut délibérément toute ligne `doctor_staff` active — c'est ce
qui donne à la secrétaire l'agenda et le fichier patients, et c'est voulu. Le
seul auxiliaire qui distingue le médecin de son personnel, `is_doctor_owner()`,
n'était utilisé que trois fois, toutes sur `doctor_staff` lui-même.

Conséquences réelles, établies par le vérificateur :

- **Ordonnances** — `prescriptions_rw` et `templates_rw` utilisent `owns_doctor`.
  Un compte secrétariat peut donc **émettre, modifier et supprimer une
  ordonnance** par simple requête REST, hors interface. Et
  `verify_prescription()`, exécutable par `anon`, certifie ensuite ce document
  comme un authentique document Tabibo portant le nom et la spécialité du
  médecin.
- **Équipe** — `invite_staff_by_email` est `security definer` : elle contourne
  `staff_write` (qui, lui, utilise correctement `is_doctor_owner`) et gardait
  `owns_doctor`. Une secrétaire pouvait rattacher au cabinet le compte de son
  choix, à qui `owns_doctor()` ouvre aussitôt agenda, patients et dossiers.

**Portée réduite par le vérificateur** — le constat initial visait quatre
écrans ; deux ne sont pas exposés. `dabo` est protégé (`doctor_request_activation`
et `declare_current_payment` filtrent sur l'utilisateur authentifié) ; `dbill`
n'a aucune surface serveur.

### 2.2 — HAUTE · Salon de téléconsultation confrère rejoignable par tout compte

**Où** : `frontend/src/pages/doctor/Network.jsx:71` et `:658`

Le nom du salon était déterministe — `tabibo-confreres-<idA>-<idB>`,
concaténation triée de deux `doctors.id` — et ouvert sur `meet.jit.si`, sans mot
de passe ni jeton. Or `network_directory` était accordée au rôle `authenticated`
entier, sans `security_invoker` : n'importe quel compte connecté, **y compris un
patient**, récoltait 60 identifiants par requête et recalculait le nom.

Écoute en direct d'une consultation entre confrères. L'intrus entre micro et
caméra coupés, et devient modérateur s'il arrive le premier.

### 2.3 — HAUTE · Liste noire et absences inopérantes (format de téléphone)

**Où** : `supabase/functions/guest-booking/index.ts:118-126`

Chaîne vérifiée de bout en bout : `PhoneField.jsx:20` (`joinPhone` insère une
**espace**) → `DoctorApp.jsx:856` → `api.js:1651` (stocké verbatim) →
`guest-booking` (`normPhone` supprime les espaces). La base contient
`"+212 612345678"`, la fonction comparait `"+212612345678"` : **l'égalité était
toujours fausse.**

Un médecin qui passe un patient en « Bloqué » — le seul motif étant un patient
abusif — croyait avoir fermé la réservation en ligne. Il ne l'avait pas fermée.
Le décompte `no_show >= 3` tombait par la même cause.

### 2.4 — MOYENNE · Plafond de 5 essais du code OTP contournable

**Où** : `supabase/functions/guest-booking/index.ts:215`

`attempts` était lu puis réécrit à `attempts + 1`. Des `verify` concurrents
lisaient la même valeur et franchissaient tous le test ; rien d'autre ne bornait
`verify`, les quotas ne portant que sur `start`. Un attaquant lançait une
réservation avec le numéro d'une victime, puis disposait de dix minutes de
devinettes parallèles sur 10⁶.

### 2.5 — MOYENNE · Données de santé en clair dans `localStorage`

**Où** : `lib/billing.js:52`, `lib/tasks.js:60`, `Requests.jsx:58`, `lib/stations.js`

Facturation (nom du patient, acte — « Frottis de dépistage », « Contraception »),
tâches (nom, description clinique), demandes patients (motif, téléphone, date de
naissance) : tout était écrit en JSON clair, sans expiration et **sans purge à la
déconnexion**. Le produit promet pourtant l'inverse, explicitement, dans
`lib/plans.js` (FEATURES.conformite) et `DoctorPitch.jsx` : « un ordinateur
partagé au cabinet ne conserve rien de lisible ». C'est donc autant un sujet de
loyauté de l'information que de sécurité.

### 2.6 — MOYENNE · Conversation ouvrable avec un médecin jamais consulté

**Où** : `20260615120001_rls.sql:99`

`conversations_insert` n'exigeait du patient que d'être lui-même. La restriction
« médecins déjà vus » n'existait que dans le `<select>`.

### 2.7 — MOYENNE · `invite-patient` sans limite de fréquence

**Où** : `supabase/functions/invite-patient/index.ts:331`

`accountExists` ne freinait que les contacts déjà inscrits. Vers un tiers non
inscrit, chaque appel partait en courriel Resend et en WhatsApp réels, sous la
marque Tabibo, sans plafond.

### 2.8 — BASSE · `send-reminder` action `send` sans déduplication

**Où** : `supabase/functions/send-reminder/index.ts:382`

Contrairement à `dispatch`, l'action `send` ne consultait pas `reminder_log`.
Une partie au rendez-vous pouvait déclencher en boucle des envois réels vers
l'autre partie.

### 2.9 — BASSE · Course sur le déplacement de rendez-vous

**Où** : `frontend/src/pages/doctor/Calendar.jsx:185`

`conflictAt` ne consulte que l'état React local. Deux sessions du cabinet
peuvent viser le même créneau. **Dégradé au rang « basse »** parce que l'index
unique `uniq_active_doctor_slot` rejette la seconde écriture : le résultat est un
message d'erreur, pas une double réservation.

### 2.10 — BASSE · « Chiffrement de bout en bout » annoncé à tort

**Où** : `frontend/src/components/SecurityTrust.jsx:28`

Composant rendu sur Landing, Contact, ForDoctors et ForPatients. « De bout en
bout » désigne un chiffrement dont seules les deux parties détiennent les clés ;
l'application fait du HTTPS en transit et du chiffrement au repos côté
hébergeur. Le corps du texte était exact, seul le titre promettait davantage.

---

## 3. Écartés après réfutation (21)

C'est la section qui rend la précédente crédible : chaque constat a été remonté
par un lecteur, puis attaqué par un vérificateur ayant accès à tout le dépôt.

**Un motif domine, et il explique pourquoi les audits précédents étaient peu
exploitables.** Neuf constats — dont six classés haute ou critique — disaient la
même chose sous des formes différentes : « la requête n'envoie que l'id, donc
rien ne contrôle l'appartenance ». Console d'administration, mutations de
rendez-vous, dossier médical, ordonnances, rôle fourni au `signUp`, prix accepté
du client. Dans tous les cas une policy RLS imposait le contrôle côté serveur.
Un lecteur cantonné au frontend ne peut pas voir la policy ; il doit donc
déclarer une hypothèse plutôt qu'un constat, et c'est le rôle du vérificateur de
la lever.

Quelques réfutations notables :

- **Avis sur rendez-vous non honoré** — `reviews_insert`
  (`20260729120000_final_audit_fixes.sql:124`) exige `status='completed'` et
  `patient_id = app_uid()` ; `appointment_id` est `unique`
  (`20260615120000_schema.sql:126`). Reste une verrue d'ergonomie : le bouton
  s'affiche sur un rendez-vous annulé puis échoue par un toast.
- **`durationMinutes` client** — le seul verrou est `uniq_active_doctor_slot` sur
  `(doctor_id, datetime)` ; aucune contrainte de plage dans les 71 migrations,
  donc la durée n'entre dans aucune décision serveur. *Résidu retenu* : un
  patient peut poser `duration_minutes = 240` sur son propre rendez-vous et
  griser 4 h dans la grille — nuisance bornée par le `check (15..240)`.
- **`Staff.jsx:187`** — les écritures directes sur `doctor_staff` SONT bloquées
  (`staff_write` utilise `is_doctor_owner`). Le trou était ailleurs, dans le RPC
  `security definer` : voir 2.1.
- **`push.js:36`** — `push_insert` et `push_update` portent
  `with check (user_id = public.app_uid())`. Vérifié deux fois, par l'agent et à
  la main.
- **Table `doctors` lisible par un anonyme** — **constat que j'avais moi-même
  produit, et qui est faux.** Je l'avais fondé sur `20260615120001_rls.sql:36`
  (`using (true)`) sans voir que la policy est redéfinie deux fois ensuite ;
  l'état final (`20260630120000_tier2_foundation.sql:72`) la restreint au
  titulaire, au personnel et à l'administrateur. J'ai commis exactement l'erreur
  que la consigne donnée aux agents interdit — « l'état qui compte est l'état
  FINAL ». Aucune migration n'était nécessaire.

---

## 4. Vérifié et jugé sain

- **`admin-delete-user`** — rôle admin relu en base, auto-suppression bloquée,
  comptes admin protégés, CORS sur liste blanche. *Réserve non sécuritaire* :
  `json()` renvoie toujours `ORIGINS[0]`, donc une réponse vers `www.tabibo.ma`
  serait rejetée par le navigateur là où `corsFor` la gérait bien.
- **`phone-login`** — erreur uniforme sur les deux causes d'échec, gigue
  temporelle, connexion leurre contre une adresse bidon quand le numéro est
  inconnu, limiteur par numéro qui échoue **fermé**, limiteur par IP qui échoue
  ouvert, IP prise sur le dernier bond `x-forwarded-for`.
- **`email_for_phone`** — `grant` initial bien révoqué par
  `20260629170000_phone_login_lockdown.sql:15`.
- **Couverture RLS** — les 31 tables ont `enable row level security`.
- **Puits d'injection HTML** — les dix `document.write`/`innerHTML` passent par
  `esc()` ou `sanitizeHtml()`. `esc` n'échappe pas le guillemet double, ce qui
  serait faux en contexte d'attribut : vérifié, aucune sortie n'y atterrit.

---

## 5. Correctifs appliqués

**`supabase/migrations/20260805120000_prelaunch_hardening_2.sql`** (nouveau)

| bloc | constat | correctif |
|---|---|---|
| 1 | 2.1 | `prescriptions` / `prescription_templates` : lecture au cabinet, écriture au seul titulaire (`is_doctor_owner`) |
| 2 | 2.1 | `invite_staff_by_email` et `declare_payment` passés à `is_doctor_owner` |
| 3 | 2.6 | `conversations_insert` exige un rendez-vous existant |
| 4 | 2.3 | colonnes générées `phone_e164` / `patient_phone_e164` + index |
| 5 | 2.4 | RPC atomique `otp_claim_attempt`, réservé au `service_role` |
| 6 | 2.7 | table `invite_throttle` |
| 7 | 2.2 | `network_directory` réservée aux comptes médecins |

**Frontend** — `lib/localPhi.js` (nouveau) : purge par préfixe, appelée dans
`AppContext.authSignOut`. Le balayage porte sur le préfixe et non sur la clé de
l'utilisateur courant, car au `signOut` l'`appUser` peut déjà être nul et un
poste de cabinet accumule les clés de plusieurs praticiens. `Network.jsx` : salon
tiré aléatoirement (256 bits) au lieu d'être dérivé des identifiants, et l'appel
n'est plus ouvert si le message porteur du lien n'a pas pu partir — sans lui, le
confrère ne peut plus deviner le nom. `SecurityTrust.jsx` : titre corrigé en
« Données chiffrées ».

**Fonctions Edge** — `guest-booking` compare les colonnes normalisées et réclame
son essai OTP par RPC atomique ; `send-reminder` déduplique via `reminder_log` et
plafonne à 5/heure hors cron ; `invite-patient` exige un médecin **approuvé** et
plafonne à 3/cible/jour, 60/émetteur/jour.

**Non corrigé, délibérément** : 2.9 (course sur le déplacement) — l'index unique
rejette déjà la seconde écriture ; ajouter une relecture serveur avant écriture
coûterait un aller-retour à chaque glisser-déposer pour convertir un message
d'erreur en un autre message d'erreur.

---

## 6. Limites de cette vérification

**Ce qui a été vérifié.** `npm run build` passe. Les **12 bancs d'essai du projet
passent**, `test:contract` compris — 10 RPC et 34 tables/vues, aucune divergence
entre le client et la base. Dans ce conteneur, les bancs à navigateur exigent
`PW_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, le script
cherchant Chrome ailleurs par défaut.

**Ce qui ne l'a pas été.** Aucune migration n'a été exécutée : il n'y a pas de
PostgreSQL dans l'environnement d'audit. Le fichier SQL est écrit mais **non
testé**. À passer en pré-production avant la production, en vérifiant en
priorité :

1. qu'une secrétaire **voit toujours** les ordonnances du cabinet mais ne peut
   plus en créer — c'est le point le plus susceptible de casser un usage réel ;
2. que les colonnes générées se calculent correctement sur les numéros déjà
   enregistrés, notamment ceux saisis sans indicatif ;
3. que `otp_claim_attempt` se comporte comme attendu sous appels concurrents ;
4. que la clause `exists` ajoutée à `network_directory` ne prive pas un médecin
   légitime de l'annuaire confrères.

**Sur la méthode.** L'éventail et la lecture manuelle se sont révélés
complémentaires, aucun des deux n'étant suffisant : l'éventail a trouvé 2.1 et
2.2, que la lecture manuelle avait manqués ; la lecture manuelle a trouvé 2.3 et
2.4, que l'éventail a manqués — et a aussi produit le seul faux positif de
l'audit (section 3, dernier point).

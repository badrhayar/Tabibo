# Deploying Tabibo to Vercel

Tabibo is a **Vite + React** single-page app in `frontend/`. It talks directly to
Supabase, so only the frontend is deployed (the `backend/` Express server is
optional and not used in production).

## Environment variables (set these in Vercel, never commit them)
| Name | Value | Where to find it |
|------|-------|------------------|
| `VITE_SUPABASE_URL` | `https://<your-ref>.supabase.co` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | your **publishable / anon** key | Supabase → Project Settings → API |

> Vite only exposes vars prefixed with `VITE_`. The anon/publishable key is safe
> in the browser — Row Level Security protects the data. Never use the secret /
> service_role key here.

## Vercel project settings
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build` (default)
- **Output Directory:** `dist` (default)
- SPA routing is handled by `frontend/vercel.json`.

## First-time deploy (summary)
1. Push this repo to GitHub.
2. Vercel → New Project → import the repo → set **Root Directory = frontend**.
3. Add the two env vars above → Deploy.
4. (Optional) Add a custom domain in Project → Settings → Domains.

## Contrôles avant mise en ligne

Depuis `frontend/`, un binaire Chromium doit être accessible :

```bash
export PW_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome   # ou : channel chrome
npm run build
npm run test:all
```

`test:all` enchaîne douze bancs d'essai, chacun lançable seul :

| Commande | Ce qu'elle vérifie |
|---|---|
| `npm run test:e2e` | Chaque écran s'affiche sans plantage ni débordement en 1366 / 390 / 360 px, puis déroule la démonstration médecin. |
| `npm run test:headers` | Sert `dist/` **avec les en-têtes de `vercel.json`** (dont la CSP) et signale le moindre refus. Indispensable : `vite preview` ne pose aucun en-tête, donc une page peut marcher en local et être bloquée en ligne. |
| `npm run test:files` | Les sorties fichier sous CSP réelle : ordonnance en PDF (URL blob, nouvel onglet) et feuille d'impression. |
| `npm run test:empty` | Les 40 écrans d'un cabinet **sans aucune donnée**, en français sur ordinateur et téléphone, et en arabe (droite-à-gauche). Aucun écran blanc, aucun débordement. |
| `npm run test:slow` | Réseau lent : l'annuaire répond après 1,8 s. Un lien de médecin partagé doit patienter puis s'afficher — jamais planter ni renvoyer le visiteur ailleurs. |
| `npm run test:green` | **Un seul vert d'action.** Relève tout bouton ou interrupteur dont le fond n'est pas exactement `BTN_GREEN` (le dégradé du bouton « Rechercher »). Doit rendre 0. |
| `npm run test:layout` | **Tournée de présentation.** Cartes voisines de hauteurs différentes, boutons mal alignés, texte tronqué. `W=390` pour le contrôle téléphone. Doit rendre 0. |
| `npm run test:stations` | **Postes de soins : une seule liste.** Vérifie que le patient (page de réservation) et le secrétariat (fenêtre « Nouveau rendez-vous ») affichent exactement les libellés enregistrés par le médecin. |
| `npm run test:caps` | **Plus un mot en capitales.** Ouvre chaque écran et lit le texte *tel que le navigateur l'affiche* (la capitalisation CSS comprise). Un libellé garde sa majuscule initiale, jamais davantage ; seuls les sigles (CIN, AMO, CNSS…) échappent à la règle. Doit rendre 0. |
| `npm run test:contract` | **Le client et la base parlent-ils la même langue ?** Relit les migrations *dans l'ordre*, en déduit ce que la base offre vraiment (fonctions, tables, vues, casiers, et surtout les droits d'exécution après tous les `grant`/`revoke`), puis compare avec chaque `supabase.rpc()`, `.from()` et `storage.from()` du code. C'est le banc qui aurait attrapé l'invitation de secrétaire cassée — et qui a trouvé `emailForPhone`. Ne demande aucun navigateur : il tourne en une seconde. Doit rendre 0. |
| `npm run test:sanitize` | **Le nettoyeur de texte enrichi.** Charge `lib/sanitizeHtml.js` dans un vrai navigateur, lui donne seize charges hostiles (`<img onerror>`, `<svg onload>`, `srcdoc`, `javascript:`…) et vérifie deux choses : rien ne s'exécute, **et** rien d'interdit ne survit dans la sortie. Sept cas de mise en forme légitime vérifient qu'un compte rendu n'est pas mutilé au passage. Doit rendre 0. |
| `npm run test:a11y` | **Rien de muet.** Ouvre chaque écran et relève les commandes sans intitulé (bouton à icône seule), les champs sans intitulé associé et les images sans `alt` — tout ce qu'un lecteur d'écran annonce « bouton » ou « zone d'édition », sans plus. Doit rendre 0. **Portée limitée**, et c'est écrit en tête du script : 1440 px seulement, état initial de l'écran seulement, ni contraste ni ordre de tabulation. Un 0 signifie « rien de muet à l'arrivée », pas « l'application est accessible ». |

`npm run test:crawl` (long, ~40 min) va plus loin : il clique **chaque bouton de chaque écran** dans la démonstration et signale les erreurs et les contrôles sans effet.

### Les postes de soins

La liste des postes est **unique** et vit dans `doctors.stations`. Trois écrans
la lisent, et un seul l'écrit :

| Écran | Fonction utilisée | Source |
|---|---|---|
| Paramètres › Postes de soins | `loadStations` (pré-remplissage) puis `saveDoctorStations` | écrit la base |
| Fenêtre « Nouveau rendez-vous » (secrétariat) | `activeStations` | lit la base |
| Navigateur patients | `activeStations` | lit la base |
| Page de réservation (patient) | `stationsOf(doctor)` | lit `doctor_directory.stations` |

`activeStations` ne renvoie **que ce qui est enregistré**. Tant que le médecin
n'a rien validé, aucun poste n'est proposé nulle part — plutôt que de proposer
au secrétariat des postes que le patient ne verrait jamais. L'éditeur affiche
alors une configuration type, clairement marquée « pas encore enregistrée ».

### Le vocabulaire visuel des écrans

Une section d'écran = **une couleur, un bandeau, des sous-cartes**. Ces trois
formes sont définies une seule fois, dans `frontend/src/components/SectionKit.jsx` :

| Export | Rôle |
|---|---|
| `SEC` | La palette : une couleur par section (`consult`, `admin`, `ordo`, `accueil`, `reglages`…). |
| `Hero` | Le bandeau de tête : pastille colorée, titre, sous-titre, repères chiffrés, action à droite. |
| `Panel` | La sous-carte titrée, avec sa pastille de couleur. |
| `Metric` | Une donnée chiffrée, en grand, avec sa lecture (« Surpoids », « Limite haute »). |
| `Field` | Une ligne « intitulé → valeur », cliquable quand il y a une action (téléphone, courriel). |

Un écran n'invente pas ses propres cadres : il importe ces formes. C'est ce qui
fait que le dossier patient, l'ordonnancier, les documents, l'accueil et les
paramètres se lisent de la même façon.

Ces couleurs ne colorent que des **pastilles, des fonds très clairs et des
chiffres**. Elles ne touchent jamais un bouton : le vert d'action reste
`BTN_GREEN`, et `npm run test:green` continue de le vérifier.

### La règle du vert

Toute action verte de Tabibo porte `BTN_GREEN`, défini une seule fois dans
`frontend/src/shared.jsx` :

```js
export const BTN_GREEN = 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)';
export const BTN_GREEN_SOLID = '#12875A';   // là où un dégradé est impossible (accentColor)
```

N'écrivez jamais une couleur verte en dur sur un bouton : importez le jeton.
Les verts profonds des rails, en-têtes et bandeaux sont des **surfaces**, pas
des actions — ils ne sont pas concernés. `npm run test:green` fait respecter la
règle et échoue à la première entorse.

### Les visuels de la page « pour les médecins »

La page de présentation ne montre pas des dessins : elle montre l'application.
Les images de `frontend/public/ecrans/` sont produites par

```bash
npm run shots
```

qui ouvre la démonstration, va sur chaque écran, masque le bandeau de
démonstration et photographie la zone de contenu. **À relancer après toute
refonte visuelle**, sinon la page de vente montre l'ancienne interface.

Le bandeau de repères mêle deux natures de chiffres, et le dit sous le bandeau :
« 40 % » et « 16 h » sont les effets observés **dans le secteur** pour la
réservation en ligne et les rappels automatiques — des objectifs, pas des
résultats mesurés sur nos cabinets. Les trois autres (24 h/24, 3 langues, 09-08)
sont des caractéristiques vérifiables. Si un jour vos propres chiffres existent,
remplacez les deux premiers **et retirez la note**.

### La règle des capitales

Aucun libellé de Tabibo n'est écrit tout en capitales : un mot garde sa
majuscule initiale, et rien de plus. Cela vaut pour le texte écrit dans le code
comme pour `textTransform: 'uppercase'` — les deux sont interdits. Seuls les
sigles restent des sigles : CIN, AMO, CNSS, CNOPS, IMC, PDF, CNDP…

`npm run test:caps` ouvre chaque écran, lit le rendu réel et échoue à la
première entorse.

### Fabriquer l'archive du projet

```bash
./scripts/package.sh              # → ~/tabibo-FULL-project.zip
```

Le script exclut `node_modules`, `dist`, `.git`, les sauvegardes, les artefacts
Play Store, **et tout fichier `.env` à n'importe quelle profondeur** — puis il
vérifie l'archive et échoue s'il reste quoi que ce soit. Le motif écrit à la
main, lui, ne visait que la racine : `frontend/.env` passait, et le contrôle
annonçait quand même « rien de sensible ». Ne refaites pas l'archive à la main.

### Migrations à appliquer

Quatre migrations attendent votre projet Supabase, dans cet ordre :

| Fichier | Ce qu'elle apporte |
|---|---|
| `20260801120000_care_stations.sql` | Les postes de soins (`doctors.stations`, `appointments.station_id`). Sans elle, le patient ne voit pas les postes à la réservation. |
| `20260802120000_doctor_network.sql` | Tabibo Network : liens entre cabinets, adressages de patients, messages entre confrères, et l'annuaire `network_directory`. Sans elle, l'écran **Tabibo Network** reste vide hors démonstration. |
| `20260803120000_network_messaging.sql` | La messagerie du réseau : pièces jointes et appels sur `doctor_notes`, plus le casier privé `confrere-media`. Sans elle, l'onglet **Messagerie** n'accepte ni fichier ni appel. |
| `20260804120000_prelaunch_hardening.sql` | **Les douze correctifs de l'audit d'avant-lancement.** À appliquer en dernier, et impérativement avant l'ouverture — elle referme une fuite d'images cliniques entre cabinets, répare Tabibo Network (dont la RLS était entièrement morte) et l'invitation d'une secrétaire. Le détail de chaque correctif est écrit en tête du fichier. |

Toutes les trois posent leurs propres règles d'accès : un médecin ne lit que les
lignes où son cabinet figure ; on ne peut adresser un patient — ni écrire, ni
joindre un fichier — qu'à un confrère dont le lien est **accepté**, et c'est la
base qui le vérifie, pas seulement l'écran. Une pièce jointe déposée dans
`confrere-media` n'a aucune adresse publique : elle ne s'ouvre que par un lien
signé d'une heure, et seulement pour les deux confrères de la conversation.

### Ce que l'audit d'avant-lancement a trouvé

Dix-sept défauts au total, dont deux graves. Les onze premiers, plus la régression
n°12 relevée en seconde passe, vivent dans
`20260804120000_prelaunch_hardening.sql` ; les cinq derniers sont dans le code
de l'application.

| # | Défaut | Ce qui se passait |
|---|---|---|
| 1 | `chat-media` : portée de lecture | Une seule conversation avec un médecin ouvrait **tout son dossier d'images** — donc les photos cliniques envoyées à ses autres patients. |
| 2 | `my_doctor_id()` | Comparait un `users.id` à un `auth.uid()` : la fonction renvoyait toujours NULL et **tout Tabibo Network était hors service**. |
| 3 | `confrere-media` | Même faute de portée que 1, entre cabinets. |
| 4 | `appts_delete` | Le patient pouvait **supprimer** le rendez-vous — donc le compte rendu, l'encaissement et son historique d'absences. |
| 5 | `documents_update` | Permettait de re-cibler un document vers un autre cabinet après coup. |
| 6 | `doctor_links_update` | Le destinataire d'une demande pouvait **forger un lien accepté** avec un confrère non consentant. |
| 7 | `doctor_notes_update` | Le destinataire pouvait réécrire le message reçu. |
| 8 | `doctors.user_id` | N'était épinglé par aucun garde : le cabinet pouvait être cédé sans contrôle. |
| 9 | `public.users` | Le rôle n'était protégé qu'à la mise à jour, pas à l'insertion. |
| 10 | `client_errors` | Croissance non bornée par un appelant anonyme. |
| 11 | `invite_staff_by_email` | Remplace l'appel client à `user_id_for_email`, révoquée : **« Inviter un membre » était cassé** depuis le durcissement précédent. |

Corrections hors base : mot de passe minimum porté de 6 à **8 caractères**, validation du type et de la taille sur le casier `credentials`, sonde de configuration de `send-reminder` placée derrière l'autorisation, origine CORS des six fonctions Edge restreinte à `tabibo.ma` (variable `ALLOWED_ORIGINS`), jokers `LIKE` échappés dans `invite-patient`, et mention explicite dans l'éditeur de postes que les noms saisis sont publics.

**Bancs d'essai élargis** : `dreq`, `forgotpw`, `rxverify` et sept écrans patient n'étaient visités par aucun banc. C'est précisément ce trou qui a laissé passer l'invitation de secrétaire cassée. Ils sont désormais couverts.

### Seconde passe — les sept dimensions restantes

Le premier tour d'audit s'était arrêté à cinq dimensions sur douze. Les sept
autres ont été reprises ensuite ; elles ont donné six correctifs de plus.

| # | Défaut | Ce qui se passait |
|---|---|---|
| 12 | `guard_doctor_status()` — **régression introduite par le correctif n°8** | En réécrivant la fonction pour épingler `user_id`, la ligne `current_period_end` avait disparu du corps. `create or replace` remplace tout : la colonne redevenait librement modifiable. Un médecin pouvait donc reporter sa propre échéance à 2099 et rester listé sans payer. La liste des colonnes épinglées est désormais complète, et un avertissement en tête de la fonction dit pourquoi on ne la raccourcit jamais. |
| 13 | Éditeur de texte enrichi du dossier (`innerHTML`) | Le compte rendu est stocké en HTML puis réinjecté avec `innerHTML`. Or tout le cabinet écrit dans ce champ. Une secrétaire pouvait y enregistrer `<img src=x onerror=…>` : le code s'exécutait ensuite **dans le navigateur du médecin**, avec sa session — donc avec le droit de signer une ordonnance. Le contenu passe maintenant par `lib/sanitizeHtml.js` à la lecture comme à l'écriture, et le collage est réduit au texte brut. |
| 14 | `dompurify` (via `jspdf`) | Avis de sécurité ouvert. Le code vulnérable n'était pas atteignable (Tabibo n'utilise que l'API de dessin de jsPDF, jamais `.html()`), mais un audit de dépendances propre vaut mieux au lancement. `npm audit` rend désormais 0. |
| 15 | Avis patients — consentement | L'avis est publié signé « Prénom N. ». Rien ne le disait au patient avant qu'il n'écrive. La fenêtre affiche maintenant la signature exacte qui sera publiée, et rappelle que le motif de consultation n'apparaît jamais. |
| 16 | `emailForPhone()` — seconde fonction morte, même cause que la n°11 | Elle appelait `email_for_phone`, révoquée par `phone_login_lockdown.sql` parce qu'elle était un oracle « téléphone → adresse du compte » ouvert à tous. L'appel échouait donc à chaque fois, en silence. Aucun écran ne l'utilisait — la connexion par téléphone passe par la fonction Edge `phone-login` — mais elle attendait la prochaine personne pressée. Retirée, avec la raison écrite à sa place. |
| 17 | 101 éléments muets | Boutons à icône seule (le logo, l'avatar du médecin, l'envoi d'un message) et 70 champs dont l'intitulé voisin n'était relié à rien : un lecteur d'écran annonçait « bouton » ou « zone d'édition ». Les vingt champs d'horaires de `davail` étaient les plus graves — impossible de savoir de quel jour il s'agissait. Tout est intitulé ; `npm run test:a11y` le vérifie. |

**Ce qui reste ouvert, et pourquoi.** La directive `script-src` contient encore
`'unsafe-inline'`. La refermer demande de remplacer la permission par une
empreinte pour le script de secours de `index.html` **et** un `nonce` pour
Turnstile — or ni Turnstile ni Jitsi ne peuvent être exercés depuis
l'environnement de vérification, et une erreur ici bloque l'inscription en
production sans qu'aucun banc local ne le voie. À faire sur un déploiement de
préproduction, en vérifiant que le CAPTCHA et la téléconsultation fonctionnent
toujours. Aucun point d'injection HTML ne subsiste dans l'application, donc
c'est de la défense en profondeur, pas un trou ouvert.

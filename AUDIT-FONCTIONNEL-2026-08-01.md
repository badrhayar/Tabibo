# Audit fonctionnel avant lancement — 1ᵉʳ août 2026

**Question posée :** chaque bouton des deux plateformes fait-il réellement ce
qu'il annonce, et atteint-il la bonne table Supabase ?

**Réponse courte :** oui après ce tour. Neuf défauts ont été trouvés et
corrigés, dont trois graves. Deux fonctions annonçaient un enregistrement qui
n'avait jamais lieu ; une troisième fabriquait un message médical qui
n'existait pas.

---

## 1 · Méthode

Quatre passes, du moins cher au plus cher, pour ne dépenser du jugement que là
où les machines ne suffisent pas.

| Passe | Outil | Couverture | Coût |
|---|---|---|---|
| Contrat client ↔ base | `test:contract` | 10 fonctions RPC, **35 tables/vues**, 4 casiers de fichiers, tous les droits d'exécution | nul |
| Clics réels | `test:crawl` | **402 clics** sur 43 écrans, mode démonstration actif | nul |
| Inventaire statique | script maison | **670 gestionnaires** `onClick`/`onSubmit`, classés ; 240 références nommées résolues jusqu'à `lib/api.js` | nul |
| Relecture ciblée | 25 agents, tranches disjointes | **193 commandes** examinées, 13 constats, chacun contre-expertisé | ~1,9 M jetons |

Les tranches étaient disjointes (un fichier lu une seule fois) et journalisées :
aucun agent n'est mort, et si l'un l'avait fait, seule sa tranche aurait été à
refaire.

**Sur les 13 constats, 12 ont survécu à la contre-expertise, 1 a été réfuté**
(un « enregistrement local » dans *Disponibilités* qui possédait bien son
chemin réel — le doute a joué en faveur du code, comme prévu).

---

## 2 · Ce qui était cassé, et ce qui a été fait

### GRAVE — la facturation ne quittait jamais le navigateur

`Billing.jsx` n'importait rien de `lib/api.js`. Créer une facture, l'envoyer,
l'encaisser, la supprimer : tout passait par `saveInvoices()` qui écrit dans
`localStorage`. Un médecin facturant depuis l'ordinateur du cabinet ne
retrouvait rien depuis son téléphone, et un vidage de cache effaçait sa
comptabilité. Pour une fonction financière, c'était le défaut le plus grave de
l'application.

*Correction :* nouvelle table `invoices` (migration
`20260801120000_invoices.sql`) avec RLS par cabinet via `owns_doctor()` —
titulaire **et** secrétaire, qui encaisse au comptoir. Quatre fonctions
ajoutées à `lib/api.js` (`fetchInvoices`, `createInvoice`, `updateInvoice`,
`deleteInvoice`). `Billing.jsx` écrit désormais en base ; l'affichage reste
optimiste mais **si le serveur refuse, l'écran recharge et le dit** — jamais un
écran qui affirme un enregistrement qui n'a pas eu lieu. Le `localStorage`
demeure pour la démonstration.

> Détail qui aurait tout cassé : ma première version de la migration inventait
> les valeurs autorisées (`late`, `litige`, `cash`…). Le vocabulaire réel de
> `lib/billing.js` est `draft/open/sent/reminded/recovery/paid/canceled` et
> `virement/enligne/especes/carte`. Les contraintes auraient rejeté **chaque**
> écriture. Corrigé avant livraison.

### GRAVE — le micro de la messagerie inventait un message vocal

`Chat.jsx:254` : le bouton micro n'appelait ni `getUserMedia` ni
`MediaRecorder`. Au second clic il poussait dans le fil une bulle
« message vocal · 0:12 » — jamais envoyée par `sendMessage()`, invisible pour le
correspondant, effacée au rechargement. Dans une conversation médicale, un
message qui a l'air transmis et ne l'est pas peut coûter une prise en charge.

*Correction :* bouton retiré. Le chemin pour le rétablir est écrit dans le code
(`getUserMedia` → `MediaRecorder` → téléversement → `sendMessage`).

### GRAVE — la note de comptoir s'effaçait toute seule

`Navigator.jsx` : « Transmettre au médecin » écrivait le texte dans
`appointments.notes` mais gardait la note et son drapeau d'urgence **uniquement
en mémoire**. `mapAppointment()` ne les reconstruisait jamais. Or l'écoute temps
réel recharge les rendez-vous **à chaque nouvelle réservation, de n'importe quel
patient** : la note et l'urgence disparaissaient de l'écran en quelques
secondes, sans que personne ne le sache.

*Correction :* `mapAppointment()` réhydrate `deskNote` depuis `notes`.
L'urgence, qui n'a pas de colonne, voyage en tête du texte sous un marqueur
`[URGENT] ` lisible par un humain — aucune migration requise, donc aucune
dépendance à une opération manuelle avant le lancement.

### MOYEN — deux compteurs affichaient toujours zéro

- `Appointments.jsx:396` lisait `a.status`, mais les lignes portent `statut`
  (français) et `rawStatus` (brut). Les pastilles « à confirmer » / « confirmés »
  affichaient donc **0 en permanence**. → corrigé sur `rawStatus`.
- `Documents.jsx:104` filtrait sur `direction === 'received'` et une colonne
  `from_patient` qui n'existe pas ; `listDocuments()` ne renvoie que
  `to_doctor`/`to_patient`. Compteur « reçus » toujours à **0**. → corrigé.

### MOYEN — le mode de paiement choisi n'allait nulle part

`BookingInfo.jsx:396` : le patient choisit Espèces / Carte CMI / M-Wallet, et
le choix mourait dans l'état local. La colonne `pay_method` ne peut pas le
recevoir — le durcissement serveur la force à `null` tant que le cabinet n'a pas
encaissé, ce qui est correct. → le choix accompagne désormais la demande dans
`notes` (« Paiement souhaité : … »), donc le secrétariat le voit.

### MINEUR — trois finitions

- `ForgotPassword` / `ResetPassword` affichaient le message brut de Supabase
  (souvent en anglais) au lieu de `authErrorMessage()`. → aligné sur le reste.
- `Availability` enregistrait une absence en local sans le dire quand aucun
  cabinet n'est actif. → message explicite.
- `Requests` (« Demandes patients ») annonçait « Réponse envoyée au patient ✓ »
  alors qu'il n'existe **ni table `requests`, ni écran patient pour en créer, ni
  canal d'envoi** : la réponse restait dans le `localStorage` du médecin.
  → l'accusé mensonger est remplacé, et un bandeau dit ce que l'écran est
  vraiment : un carnet de tri local, le vrai canal étant la Messagerie.

---

## 3 · Ce qui a été vérifié et fonctionne

Réservation patient de bout en bout (recherche → fiche → créneau →
`createAppointment` → `appointments`, avec confirmation WhatsApp et courriel) ;
annulation ; avis ; messagerie patient ↔ médecin (`conversations`/`messages`,
temps réel) ; documents et URL signées ; authentification complète des deux
côtés ; ordonnances et leur vérification publique ; disponibilités, congés,
postes de soins ; équipe et invitations ; abonnement et déclaration de
paiement ; statuts de rendez-vous ; dossier patient.

Les 15 boutons signalés « sans effet » par le crawl sont des onglets et filtres
déjà sélectionnés (« Tout », options arabes du sélecteur) : cliquer sur un
choix actif ne change rien, c'est le comportement attendu.

---

## 4 · Avant de déployer

1. **Exécuter les migrations en attente**, dans l'ordre :
   `20260805120000_prelaunch_hardening_2.sql` puis
   `20260801120000_invoices.sql`.
   Sans la seconde, l'écran Facturation affichera le bandeau rouge
   « Facturation non synchronisée » — il ne perdra rien, mais ne persistera rien
   en base non plus.
2. Déployer, puis recharger deux fois : le service worker passe en **v154**.
3. Contrôle de bon fonctionnement : créer une facture, la recharger depuis un
   autre navigateur — elle doit apparaître.

---

## 5 · Limite honnête de cet audit

Tout a été vérifié **par lecture du code, par les bancs d'essai et par
402 clics réels en mode démonstration**. Aucune base Supabase n'était
joignable depuis l'environnement d'audit : les écritures réelles (insertion
d'une facture, RLS appliquée à une secrétaire) sont garanties par la lecture des
politiques et par le banc `test:contract`, pas par une exécution contre votre
instance. Le contrôle n° 3 ci-dessus lève ce doute en trente secondes.

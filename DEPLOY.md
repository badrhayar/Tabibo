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

`test:all` enchaîne cinq bancs d'essai, chacun lançable seul :

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

### La règle des capitales

Aucun libellé de Tabibo n'est écrit tout en capitales : un mot garde sa
majuscule initiale, et rien de plus. Cela vaut pour le texte écrit dans le code
comme pour `textTransform: 'uppercase'` — les deux sont interdits. Seuls les
sigles restent des sigles : CIN, AMO, CNSS, CNOPS, IMC, PDF, CNDP…

`npm run test:caps` ouvre chaque écran, lit le rendu réel et échoue à la
première entorse.

### Migrations à appliquer

Trois migrations attendent votre projet Supabase, dans cet ordre :

| Fichier | Ce qu'elle apporte |
|---|---|
| `20260801120000_care_stations.sql` | Les postes de soins (`doctors.stations`, `appointments.station_id`). Sans elle, le patient ne voit pas les postes à la réservation. |
| `20260802120000_doctor_network.sql` | Tabibo Network : liens entre cabinets, adressages de patients, messages entre confrères, et l'annuaire `network_directory`. Sans elle, l'écran **Tabibo Network** reste vide hors démonstration. |
| `20260803120000_network_messaging.sql` | La messagerie du réseau : pièces jointes et appels sur `doctor_notes`, plus le casier privé `confrere-media`. Sans elle, l'onglet **Messagerie** n'accepte ni fichier ni appel. |

Toutes les trois posent leurs propres règles d'accès : un médecin ne lit que les
lignes où son cabinet figure ; on ne peut adresser un patient — ni écrire, ni
joindre un fichier — qu'à un confrère dont le lien est **accepté**, et c'est la
base qui le vérifie, pas seulement l'écran. Une pièce jointe déposée dans
`confrere-media` n'a aucune adresse publique : elle ne s'ouvre que par un lien
signé d'une heure, et seulement pour les deux confrères de la conversation.

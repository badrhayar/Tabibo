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

`npm run test:crawl` (long, ~40 min) va plus loin : il clique **chaque bouton de chaque écran** dans la démonstration et signale les erreurs et les contrôles sans effet.

> Rappel : la migration `supabase/migrations/20260801120000_care_stations.sql`
> doit être appliquée avant que les postes de soins soient visibles aux patients.

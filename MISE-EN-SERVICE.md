# Liste de contrôle de mise en service — Tabibo

**À quoi sert ce document.** L'application est *câblée* : chaque bouton appelle
la bonne fonction, qui vise la bonne table. Elle n'est pas *mise en service* :
aucune écriture réelle, aucun WhatsApp, aucun courriel n'a jamais été déclenché
depuis l'environnement d'audit. Ce document couvre exactement ce qui reste à
faire, dans l'ordre, avec le résultat attendu à chaque étape.

**Règle de conduite :** ne passez à l'étape suivante que si le contrôle de
l'étape courante est vert. Une étape sautée se paie en incident le lendemain.

Durée réaliste : **2 h 30** si vos comptes WhatsApp Business et Resend sont déjà
approuvés. **Plusieurs jours** sinon (voir l'étape 0, qui est la seule à ne pas
dépendre de vous).

---

## Étape 0 · Ce qui ne dépend pas de vous — à lancer EN PREMIER

Ces deux démarches ont un délai d'approbation externe. Si elles ne sont pas déjà
faites, **le lancement de demain se fera sans WhatsApp ni courriel** (voir le
plan de repli à la fin).

### 0.1 · Modèles WhatsApp approuvés par Meta

L'application utilise **5 modèles de message** (WhatsApp n'autorise pas de texte
libre pour un premier contact). Chacun doit être créé dans le gestionnaire
WhatsApp Business **et approuvé par Meta** — comptez de quelques heures à
plusieurs jours.

| Secret | Rôle du modèle |
|---|---|
| `WHATSAPP_TEMPLATE_BOOKED` | rendez-vous enregistré |
| `WHATSAPP_TEMPLATE_CONFIRMED` | rendez-vous confirmé par le cabinet |
| `WHATSAPP_TEMPLATE_CANCELLED` | rendez-vous annulé |
| `WHATSAPP_TEMPLATE_REMINDER` | rappel de la veille |
| `WHATSAPP_TEMPLATE_OTP` | code de connexion par téléphone |

**Contrôle :** dans le gestionnaire Meta, les 5 modèles affichent
« Approuvé » / « Active ».

### 0.2 · Domaine d'envoi vérifié chez Resend

`TABIBO_FROM` doit être une adresse d'un domaine vérifié (SPF + DKIM publiés
dans votre DNS). Sans cette vérification, les courriels partent en spam ou sont
rejetés.

**Contrôle :** tableau de bord Resend → Domains → votre domaine est **Verified**.

---

## Étape 1 · Base de données

Trois migrations sont en attente. **L'ordre compte.**

```bash
supabase db push
```

Ou, à la main dans l'éditeur SQL, dans cet ordre :

1. `20260805120000_prelaunch_hardening_2.sql` — durcissement (ordonnances,
   invitations, téléphones normalisés, OTP atomique)
2. `20260801120000_invoices.sql` — table des factures + RLS
3. `20260806120000_client_errors_context.sql` — contexte du journal d'erreurs

**Contrôle :**

```sql
select count(*) from public.invoices;                    -- doit répondre 0, pas une erreur
select routine_name from information_schema.routines
  where routine_schema='public' and routine_name='otp_claim_attempt';   -- doit renvoyer 1 ligne
select kind, context from public.client_errors limit 0;  -- doit répondre sans erreur de colonne
```

### 1.1 · Créer l'administrateur ⚠️ — sans lui, la plateforme reste vide

Le rôle `admin` ne peut PAS s'obtenir par inscription (c'est voulu : sinon
n'importe qui le demanderait au formulaire). Il se donne à la main, une fois :

1. inscrivez-vous normalement sur le site avec votre adresse ;
2. puis, dans l'éditeur SQL Supabase :

```sql
select public.promote_to_admin('votre-adresse@exemple.ma');
select email, role from public.users where role = 'admin';   -- doit vous lister
```

**Si vous sautez cette étape, personne ne peut approuver un médecin.** Les
médecins s'inscrivent, restent sur l'écran « dossier en cours de vérification »,
l'annuaire public reste vide, et aucun patient ne peut réserver — sans le
moindre message d'erreur pour vous prévenir.

**Contrôle :** connectez-vous, vous devez atterrir sur la console
d'administration.

### 1.2 · Le vrai RIB et le nettoyage des données de démonstration

La table `app_settings` est amorcée avec un RIB de remplissage au nom de
l'ancienne marque. Il s'affiche tel quel aux médecins qui souscrivent.

```sql
update public.app_settings
   set rib = '‹votre RIB›', bank = '‹votre banque› — ‹votre raison sociale›'
 where id = 1;

-- Les 20 médecins de démonstration (arrivés en 'pending', donc invisibles du
-- public, mais qui encombrent votre file de vérification) :
delete from public.doctors
 where user_id in (select id from public.users where email like '%@tikdoc.demo');
delete from public.users where email like '%@tikdoc.demo';
```

Si `invoices` n'existe pas, l'écran Facturation affichera un bandeau rouge
« Facturation non synchronisée » : il fonctionnera sans rien perdre, mais
n'écrira rien en base.

---

## Étape 2 · Secrets des fonctions Edge

**21 secrets.** Voici lesquels, et quelle fonction s'arrête sans eux.

### 2.1 · Communs à toutes les fonctions

| Secret | Valeur | Sans lui |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | rien ne démarre |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role (Settings → API) | rien ne démarre |
| `SB_SECRET_KEY` | idem service_role (clé de secours acceptée) | — |
| `ALLOWED_ORIGINS` | `https://tabibo.ma,https://www.tabibo.ma` | **toute requête du navigateur est refusée (CORS)** |
| `APP_URL` | `https://tabibo.ma` | les liens dans les courriels pointent dans le vide |

> ⚠️ `ALLOWED_ORIGINS` est le piège classique : oubliez-le et **rien** ne
> fonctionne côté navigateur, sans message d'erreur clair. Mettez le domaine de
> production **et** celui de prévisualisation si vous testez depuis Vercel.

### 2.2 · Courriel

| Secret | Valeur |
|---|---|
| `RESEND_API_KEY` | `re_…` |
| `TABIBO_FROM` | `Tabibo <rappels@tabibo.ma>` (domaine vérifié, étape 0.2) |

### 2.3 · WhatsApp

| Secret | Valeur |
|---|---|
| `WHATSAPP_TOKEN` | jeton permanent de l'app Meta |
| `WHATSAPP_PHONE_ID` | identifiant du numéro expéditeur |
| `WHATSAPP_LANG` | `fr` (ou `ar` selon vos modèles) |
| les 5 `WHATSAPP_TEMPLATE_*` | les noms exacts approuvés à l'étape 0.1 |

### 2.4 · Notifications push (écran d'accueil)

Générez la paire une seule fois :

```bash
npx web-push generate-vapid-keys
```

| Secret | Valeur |
|---|---|
| `VAPID_PUBLIC_KEY` | clé publique générée |
| `VAPID_PRIVATE_KEY` | clé privée générée |
| `VAPID_SUBJECT` | `mailto:contact@tabibo.ma` |

### 2.5 · Déclencheur des rappels

| Secret | Valeur |
|---|---|
| `CRON_SECRET` | une longue chaîne aléatoire que vous inventez (`openssl rand -hex 32`) |

Il sert au `pg_cron` de l'étape 4. Il est **volontairement distinct** de la clé
service_role, qui peut être renouvelée.

### 2.6 · Connexion par téléphone

| Secret | Valeur |
|---|---|
| `SUPABASE_ANON_KEY` | clé anon (Settings → API) |
| `SB_PUBLISHABLE_KEY` | idem anon (clé de secours acceptée) |

**Contrôle :** `supabase secrets list` affiche les 21 noms.

---

## Étape 3 · Déployer les fonctions Edge

```bash
supabase functions deploy phone-login
supabase functions deploy notify-verification
supabase functions deploy send-reminder
supabase functions deploy invite-patient
supabase functions deploy guest-booking
supabase functions deploy admin-delete-user
```

Puis, dans le tableau de bord → Edge Functions → `send-reminder` → **Verify JWT :
OFF**. Sinon l'appel du `pg_cron` sera rejeté à la porte avant même d'atteindre
le code.

**Contrôle — la fonction répond et voit son secret :**

```bash
curl -s -X POST "https://<ref>.supabase.co/functions/v1/send-reminder" \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"type":"ping"}'
```

Réponse attendue : `{"ok":true,"version":"cron-secret-v3","cronSecretSet":true}`

Si `cronSecretSet` vaut `false`, le secret n'est pas arrivé : reposez-le et
redéployez.

---

## Étape 4 · Activer les rappels automatiques ⚠️

**C'est l'étape la plus facile à oublier, et sans elle aucun rappel ne partira
jamais.** Le `pg_cron` est livré **en commentaire** dans
`20260623160000_reminders.sql`. Exécutez ce bloc dans l'éditeur SQL, en
remplaçant les deux valeurs :

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'tabibo-hourly-reminders', '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body    := jsonb_build_object('type', 'dispatch')
  );
  $$
);
```

**Contrôle :**

```sql
select jobname, schedule, active from cron.job;         -- 'tabibo-hourly-reminders', actif
-- après le passage de l'heure ronde suivante :
select status, return_message from cron.job_run_details order by start_time desc limit 3;
```

Sans cette étape : le bouton « tester un rappel » du médecin fonctionne, mais
**le rappel automatique de la veille ne part pas** — alors que c'est un argument
central de votre page « Pour les médecins ».

---

## Étape 5 · Réglages du tableau de bord Supabase

- Authentication → Providers → Email → **Confirm email : ON**
- Authentication → Attack Protection → **CAPTCHA : ON**, secret Turnstile posé
- Authentication → URL Configuration → **Site URL** = `https://tabibo.ma`,
  et **Redirect URLs** contenant `https://tabibo.ma/**`
  *(sans cela, le lien de réinitialisation de mot de passe renvoie ailleurs)*

---

## Étape 6 · Frontend

Variables d'environnement de l'hébergeur (Vercel → Settings → Environment
Variables) :

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | clé anon |
| `VITE_MAPTILER_KEY` | clé MapTiler |
| `VITE_TURNSTILE_SITE_KEY` | clé publique Turnstile |
| `VITE_APP_URL` | `https://tabibo.ma` |

```bash
cd frontend && npm run build     # puis déployez dist/
```

**Contrôle :** ouvrez le site, rechargez **deux fois** (le service worker passe
en v154). La carte s'affiche en couleurs — si elle est grise, `VITE_MAPTILER_KEY`
manque.

---

## Étape 7 · Les sept essais de bout en bout

À faire **avec vos propres numéro et adresse**, sur le site de production, avant
d'ouvrir aux patients. C'est la seule preuve qui vaut.

| # | Essai | Attendu |
|---|---|---|
| 1 | Créer un compte patient | courriel de confirmation reçu, connexion possible |
| 2 | Réserver un rendez-vous | ligne dans `appointments`, **WhatsApp de confirmation reçu** |
| 3 | Côté médecin : confirmer ce rendez-vous | statut à jour, WhatsApp « confirmé » reçu |
| 4 | Créer une facture, la rouvrir **depuis un autre navigateur** | elle apparaît → la chaîne facturation est bonne |
| 5 | Inviter une secrétaire à l'équipe | courriel d'invitation reçu |
| 6 | Écrire un message patient → médecin | reçu en temps réel des deux côtés |
| 7 | Rappel : créer un RDV pour **demain**, puis attendre l'heure ronde | WhatsApp de rappel reçu ; sinon voir `cron.job_run_details` |

Essai 7 impossible à attendre ? Forcez-le :

```bash
curl -s -X POST "https://<ref>.supabase.co/functions/v1/send-reminder" \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"type":"dispatch"}'
```

---

## Étape 8 · Après l'ouverture — la première semaine

```sql
-- Les rappels partent-ils ?
select channel, status, count(*) from public.reminder_log
  where sent_at > now() - interval '24 hours' group by 1,2;

-- Le cron tourne-t-il toujours ?
select status, count(*) from cron.job_run_details
  where start_time > now() - interval '24 hours' group by 1;

-- Qui est administrateur ? (à auditer périodiquement)
select email, role from public.users where role = 'admin';

-- Les opérations refusées : la panne la plus coûteuse et la plus discrète.
-- L'utilisateur n'a vu qu'un message d'erreur, il est reparti, et rien ne
-- vous l'a signalé. À regarder DEUX FOIS PAR JOUR la première semaine.
select context, message, user_role, app_version, count(*) as touches,
       max(created_at) as dernier
  from public.client_errors
 where kind = 'handled' and created_at > now() - interval '24 hours'
 group by 1,2,3,4 order by touches desc;
```

**Le même écran, en plus lisible :** console d'administration → onglet
**Erreurs** → filtre « Opérations refusées ». Les lignes sont regroupées et
triées par nombre de personnes touchées, c'est-à-dire par ordre de correction.
Chaque ligne porte l'opération (`createAppointment`…), le rôle concerné et la
version de build — de quoi savoir si l'erreur vient du correctif que vous venez
de publier ou d'une version encore servie depuis un cache.

Une ligne `[42501]` est un refus de la RLS. Une ligne `[23505]` est une
contrainte violée. Aucun message ne contient de donnée personnelle : courriels,
téléphones, CIN et RIB sont masqués avant l'envoi (banc `npm run test:monitor`).

---

## Plan de repli — si WhatsApp ou Resend n'est pas prêt demain

Ne repoussez pas le lancement pour autant, mais **ne promettez pas ce qui
n'existe pas encore** :

1. La réservation, l'agenda, le dossier patient, les ordonnances, la messagerie
   et la facturation fonctionnent **sans** WhatsApp ni courriel.
2. Prévenez les premiers médecins que les rappels automatiques arrivent sous
   quelques jours, et qu'ils confirment par téléphone en attendant.
3. Retirez temporairement la mention « Recevez une confirmation par WhatsApp »
   de la page d'accueil (`I18N.s3s` dans `frontend/src/shared.jsx`) tant que
   l'envoi n'est pas actif. Une promesse non tenue au premier rendez-vous coûte
   plus cher qu'une promesse faite deux jours plus tard.

---

## Récapitulatif — l'état réel

| Domaine | Vérifié par l'audit | Reste à faire par vous |
|---|---|---|
| Câblage bouton → API → table | ✅ 402 clics, 670 gestionnaires, contrat concordant | — |
| Écritures réelles, RLS à l'exécution | ❌ aucune base joignable | étapes 1 et 7 |
| WhatsApp / courriel / push | ❌ aucun envoi déclenché | étapes 0, 2, 3, 7 |
| Rappels automatiques | ❌ `pg_cron` désactivé par défaut | **étape 4** |

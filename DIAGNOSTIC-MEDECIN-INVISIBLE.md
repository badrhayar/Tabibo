# Un médecin existe mais n'apparaît pas dans la recherche

Réponse en une requête. À coller dans l'éditeur SQL Supabase.

---

## 1 · La requête qui répond

```sql
select
  u.full_name,
  u.email,
  d.verification_status,
  d.blocked,
  d.subscription_status,
  d.trial_ends_at,
  d.current_period_end,
  -- Le verdict, condition par condition :
  case
    when d.verification_status <> 'approved' then '❌ pas encore approuvé'
    when d.blocked                           then '❌ compte bloqué'
    when d.subscription_status = 'expired'   then '❌ abonnement marqué expiré'
    when d.current_period_end is not null
     and d.current_period_end < now()        then '❌ période échue le ' || d.current_period_end::date
    else                                          '✅ devrait être visible'
  end as verdict
from public.doctors d
join public.users u on u.id = d.user_id
order by u.full_name;
```

Le `join` compte : une fiche dont `user_id` est nul **disparaît de l'annuaire
sans autre symptôme**. Si un médecin manque totalement du résultat ci-dessus
alors qu'il existe, c'est là qu'il faut regarder :

```sql
select id, specialty, city, user_id from public.doctors where user_id is null;
```

## 2 · Contre-épreuve : ce que voit réellement un patient

```sql
select count(*) as visibles from public.doctor_directory;
select id, full_name, city, specialty from public.doctor_directory;
```

C'est exactement la source de l'écran de recherche. Si cette requête renvoie
des lignes et que l'application affiche « 0 médecin », le problème n'est plus
en base — voir §4.

## 3 · Les corrections, selon le verdict

**Pas encore approuvé** — le chemin normal est la console d'administration,
onglet *Vérifications*. En direct :

```sql
update public.doctors set verification_status = 'approved', reviewed_at = now()
 where id = '‹id du médecin›';
```

**Période échue** — c'est le cas le plus fréquent sur un compte créé pendant
les essais : l'essai s'est terminé sans que personne ne le remarque.

```sql
update public.doctors
   set subscription_status = 'trial',
       trial_ends_at       = now() + interval '30 days',
       current_period_end  = now() + interval '30 days'
 where id = '‹id du médecin›';
```

**Compte bloqué**

```sql
update public.doctors set blocked = false where id = '‹id du médecin›';
```

Après correction, le patient doit **recharger deux fois** (le service worker
sert d'abord la version en cache).

## 4 · Si la base dit « visible » mais l'écran dit « 0 médecin »

Depuis la version **v160**, les deux cas ne se ressemblent plus :

| Ce que vous voyez | Ce que cela signifie |
|---|---|
| « Aucun médecin disponible pour le moment » | l'annuaire a répondu, il est réellement vide |
| Bandeau rouge « Annuaire momentanément indisponible » | la requête a **échoué** — réseau, clé Supabase, RLS |

Auparavant les deux affichaient le même écran, ce qui envoyait chercher le
défaut du mauvais côté. L'échec part désormais aussi dans la console
d'administration, onglet **Erreurs**, sous le contexte `fetchDoctors`.

## 5 · Ce que le médecin voit maintenant de son côté

Un médecin invisible ne devait pas avoir à vous appeler pour l'apprendre. Son
tableau de bord affiche désormais un bandeau
**« Vous n'apparaissez pas encore dans la recherche des patients »** avec la
raison exacte — les mêmes quatre conditions que la vue.

Le banc `npm run test:data` vérifie que ce bandeau reste aligné sur la vue :
si un jour vous ajoutez une condition à `doctor_directory` sans la refléter
côté médecin, le banc échoue.

---

## Et la carte vide ?

Le rectangle crème sans relief signifie que le **fond de carte** n'a pas
chargé : `VITE_MAPTILER_KEY` absente, invalide, ou restreinte à un autre
domaine que celui du site. C'est indépendant de l'annuaire — la liste des
médecins fonctionne sans elle.

Depuis la v160, la carte l'écrit à l'écran au lieu de rester muette, et
l'incident part dans la console d'exploitation sous le contexte `carte`.

**À vérifier** : la variable `VITE_MAPTILER_KEY` est-elle bien définie dans
l'environnement de build de votre hébergeur (et non seulement en local) ? Elle
est lue **à la compilation**, pas à l'exécution : l'ajouter après coup ne suffit
pas, il faut **reconstruire et redéployer**. Et sur MapTiler, vérifiez que la
clé autorise votre domaine de production.

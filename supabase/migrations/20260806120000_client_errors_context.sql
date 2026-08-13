-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Journal d'erreurs client — contexte de triage
--
--  Le journal existant ne remonte que les erreurs NON RATTRAPÉES. Or la panne
--  qui coûte le plus cher un jour d'ouverture est rattrapée : une réservation
--  refusée par la RLS, une fonction Edge qui renvoie 500, le réseau qui lâche
--  au milieu d'un envoi. La page affiche « une erreur est survenue », le
--  patient s'en va, et la console d'administration reste vide.
--
--  Trois colonnes suffisent à rendre le journal exploitable :
--    • kind        — d'où vient le rapport (rattrapé ? plantage ? rendu ?)
--    • context     — QUELLE opération a échoué ('createAppointment'…). Toujours
--                    une chaîne littérale écrite dans le code, jamais une
--                    donnée d'utilisateur.
--    • app_version — QUELLE build. Indispensable quand on publie un correctif
--                    par heure : sans elle on ne sait pas si une erreur vient
--                    de la version corrigée ou d'une coquille encore en cache.
--    • user_role   — patient / médecin / secrétaire / anonyme.
--
--  On stocke le RÔLE, jamais l'identifiant : la table est en insertion
--  anonyme (une page publique qui plante doit pouvoir le signaler), donc un
--  user_id y serait falsifiable ET rattacherait une personne nommée à une
--  table d'exploitation. Le rôle donne le tri sans désigner personne.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.client_errors
  add column if not exists kind        text not null default 'uncaught',
  add column if not exists context     text,
  add column if not exists app_version text,
  add column if not exists user_role   text;

-- Bornes de taille : la table est ouverte en insertion, chaque champ est plafonné.
do $$ begin
  alter table public.client_errors
    add constraint client_errors_kind_chk
    check (kind in ('uncaught', 'rejection', 'boundary', 'handled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.client_errors
    add constraint client_errors_context_chk
    check (context is null or char_length(context) <= 80);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.client_errors
    add constraint client_errors_version_chk
    check (app_version is null or char_length(app_version) <= 24);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.client_errors
    add constraint client_errors_role_chk
    check (user_role is null or user_role in ('patient', 'doctor', 'staff', 'admin', 'anon'));
exception when duplicate_object then null; end $$;

-- La console lit « les erreurs rattrapées des dernières 24 h » aussi souvent
-- que la liste complète : un index composite évite le balayage.
create index if not exists idx_client_errors_kind_at
  on public.client_errors (kind, created_at desc);

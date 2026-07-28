-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Tabibo Network — le réseau des confrères
--   Le réseau professionnel qui relie les cabinets Tabibo entre eux : se
--   relier à un confrère, lui adresser un patient, lui parler.
--
--   Trois objets, et rien de plus :
--     • doctor_links      — la relation entre deux cabinets (demande → acceptée)
--     • doctor_referrals  — l'adressage d'un patient d'un cabinet à un autre
--     • doctor_notes      — les messages échangés entre deux confrères reliés
--
--   Règle d'or, appliquée par la base et pas seulement par l'écran :
--   un médecin ne voit que les lignes où IL figure, d'un côté ou de l'autre.
--   Aucune donnée médicale ne circule ici : un adressage porte le nom du
--   patient, son téléphone et le motif — jamais son dossier. Le dossier reste
--   dans le cabinet qui l'a constitué.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Le lien entre deux cabinets ──────────────────────────────────────────
create table if not exists public.doctor_links (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.doctors(id) on delete cascade,
  addressee_id uuid not null references public.doctors(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  message      text,
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  -- Un seul lien par paire, quel que soit le sens de la demande.
  constraint doctor_links_no_self check (requester_id <> addressee_id)
);
-- L'unicité doit valoir dans les DEUX sens : A→B et B→A sont le même lien.
create unique index if not exists doctor_links_pair_uniq
  on public.doctor_links (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists doctor_links_requester_idx on public.doctor_links (requester_id);
create index if not exists doctor_links_addressee_idx on public.doctor_links (addressee_id);

-- ── 2. L'adressage d'un patient ─────────────────────────────────────────────
create table if not exists public.doctor_referrals (
  id             uuid primary key default gen_random_uuid(),
  from_doctor_id uuid not null references public.doctors(id) on delete cascade,
  to_doctor_id   uuid not null references public.doctors(id) on delete cascade,
  patient_name   text not null,
  patient_phone  text,
  reason         text not null,
  note           text,
  urgency        text not null default 'normal' check (urgency in ('normal', 'urgent')),
  status         text not null default 'sent'
                 check (status in ('sent', 'accepted', 'declined', 'done')),
  created_at     timestamptz not null default now(),
  responded_at   timestamptz,
  constraint doctor_referrals_no_self check (from_doctor_id <> to_doctor_id)
);
create index if not exists doctor_referrals_to_idx   on public.doctor_referrals (to_doctor_id, created_at desc);
create index if not exists doctor_referrals_from_idx on public.doctor_referrals (from_doctor_id, created_at desc);

-- ── 3. Le mot entre confrères ───────────────────────────────────────────────
create table if not exists public.doctor_notes (
  id             uuid primary key default gen_random_uuid(),
  from_doctor_id uuid not null references public.doctors(id) on delete cascade,
  to_doctor_id   uuid not null references public.doctors(id) on delete cascade,
  referral_id    uuid references public.doctor_referrals(id) on delete cascade,
  body           text not null,
  created_at     timestamptz not null default now(),
  read_at        timestamptz,
  constraint doctor_notes_no_self check (from_doctor_id <> to_doctor_id)
);
create index if not exists doctor_notes_pair_idx on public.doctor_notes (from_doctor_id, to_doctor_id, created_at);
create index if not exists doctor_notes_to_idx   on public.doctor_notes (to_doctor_id, created_at desc);

-- ── Le cabinet de l'utilisateur connecté ────────────────────────────────────
-- Fonction stable réutilisée par toutes les règles ci-dessous : le cabinet
-- dont je suis le titulaire. Un secrétariat n'a PAS de cabinet à son nom et
-- n'accède donc à rien ici — l'adressage d'un patient est un acte médical.
create or replace function public.my_doctor_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select d.id from public.doctors d where d.user_id = auth.uid() limit 1;
$$;
revoke all on function public.my_doctor_id() from public;
grant execute on function public.my_doctor_id() to authenticated;

-- ── Règles d'accès ──────────────────────────────────────────────────────────
alter table public.doctor_links     enable row level security;
alter table public.doctor_referrals enable row level security;
alter table public.doctor_notes     enable row level security;

-- Les liens : visibles des deux côtés ; créés uniquement en son propre nom ;
-- seul le destinataire répond (accepte ou refuse) ; chacun peut rompre le lien.
drop policy if exists doctor_links_select on public.doctor_links;
create policy doctor_links_select on public.doctor_links for select to authenticated
  using (requester_id = public.my_doctor_id() or addressee_id = public.my_doctor_id());

drop policy if exists doctor_links_insert on public.doctor_links;
create policy doctor_links_insert on public.doctor_links for insert to authenticated
  with check (requester_id = public.my_doctor_id() and status = 'pending');

drop policy if exists doctor_links_update on public.doctor_links;
create policy doctor_links_update on public.doctor_links for update to authenticated
  using (addressee_id = public.my_doctor_id())
  with check (addressee_id = public.my_doctor_id());

drop policy if exists doctor_links_delete on public.doctor_links;
create policy doctor_links_delete on public.doctor_links for delete to authenticated
  using (requester_id = public.my_doctor_id() or addressee_id = public.my_doctor_id());

-- Les adressages : visibles de l'expéditeur et du destinataire. On n'adresse
-- qu'à un confrère avec qui le lien est ACCEPTÉ — la base le vérifie, pour que
-- personne ne puisse envoyer de patients à un cabinet qui ne l'a pas accepté.
drop policy if exists doctor_referrals_select on public.doctor_referrals;
create policy doctor_referrals_select on public.doctor_referrals for select to authenticated
  using (from_doctor_id = public.my_doctor_id() or to_doctor_id = public.my_doctor_id());

drop policy if exists doctor_referrals_insert on public.doctor_referrals;
create policy doctor_referrals_insert on public.doctor_referrals for insert to authenticated
  with check (
    from_doctor_id = public.my_doctor_id()
    and exists (
      select 1 from public.doctor_links l
      where l.status = 'accepted'
        and ((l.requester_id = from_doctor_id and l.addressee_id = to_doctor_id)
          or (l.addressee_id = from_doctor_id and l.requester_id = to_doctor_id))
    )
  );

-- Le destinataire fait avancer le statut (accepté / refusé / traité).
drop policy if exists doctor_referrals_update on public.doctor_referrals;
create policy doctor_referrals_update on public.doctor_referrals for update to authenticated
  using (to_doctor_id = public.my_doctor_id())
  with check (to_doctor_id = public.my_doctor_id());

-- Les mots : mêmes règles, et toujours entre confrères reliés.
drop policy if exists doctor_notes_select on public.doctor_notes;
create policy doctor_notes_select on public.doctor_notes for select to authenticated
  using (from_doctor_id = public.my_doctor_id() or to_doctor_id = public.my_doctor_id());

drop policy if exists doctor_notes_insert on public.doctor_notes;
create policy doctor_notes_insert on public.doctor_notes for insert to authenticated
  with check (
    from_doctor_id = public.my_doctor_id()
    and exists (
      select 1 from public.doctor_links l
      where l.status = 'accepted'
        and ((l.requester_id = from_doctor_id and l.addressee_id = to_doctor_id)
          or (l.addressee_id = from_doctor_id and l.requester_id = to_doctor_id))
    )
  );

-- Marquer comme lu : réservé au destinataire.
drop policy if exists doctor_notes_update on public.doctor_notes;
create policy doctor_notes_update on public.doctor_notes for update to authenticated
  using (to_doctor_id = public.my_doctor_id())
  with check (to_doctor_id = public.my_doctor_id());

-- ── L'annuaire des confrères ────────────────────────────────────────────────
-- Les mêmes cabinets que l'annuaire public, mais avec l'identifiant du médecin
-- pour pouvoir demander un lien. Aucune donnée nouvelle n'est exposée : ces
-- informations sont déjà publiques sur la page du cabinet.
create or replace view public.network_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address,
    d.languages, d.teleconsultation, d.cnss_cnopss, d.experience_years,
    u.avatar_url, d.slug, d.services
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired'
    and (d.current_period_end is null or d.current_period_end >= now());

grant select on public.network_directory to authenticated;

comment on table public.doctor_links is
  'Tabibo Network — lien professionnel entre deux cabinets Tabibo (demande puis acceptation).';
comment on table public.doctor_referrals is
  'Tabibo Network — adressage d''un patient d''un cabinet à un autre. Aucune pièce du dossier n''y transite.';
comment on table public.doctor_notes is
  'Tabibo Network — message écrit entre deux confrères reliés, éventuellement rattaché à un adressage.';

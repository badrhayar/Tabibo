-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · 20260805 · Durcissement pré-lancement, second passage
--
-- Issu de l'audit du 29/07/2026 (AUDIT-PRELANCEMENT-2026-07-29.md). Chaque bloc
-- porte le constat qu'il ferme et la raison pour laquelle le correctif prend
-- cette forme-là.
--
-- NON TESTÉ CONTRE UNE BASE RÉELLE : l'environnement d'audit n'avait pas de
-- PostgreSQL. À passer en pré-production avant la production, en vérifiant
-- particulièrement le bloc 1 (une secrétaire doit continuer à VOIR les
-- ordonnances du cabinet) et le bloc 4 (reprise des téléphones existants).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1 · HAUTE — le personnel ne signe pas d'ordonnance ──────────────────────
--
-- `owns_doctor()` (20260630120000_tier2_foundation.sql:56) compte volontairement
-- toute ligne `doctor_staff` active comme « agissant pour » le cabinet : c'est ce
-- qui donne à la secrétaire l'agenda et le fichier patients, et c'est voulu.
-- Mais `prescriptions_rw` et `templates_rw` (mêmes fichier, lignes 77-85) sont
-- écrites avec ce même helper, si bien qu'un compte secrétariat peut INSÉRER une
-- ordonnance par simple requête REST — hors interface — et que
-- `verify_prescription()`, exécutable par `anon`, la certifie ensuite comme un
-- document Tabibo authentique portant le nom du médecin.
--
-- On sépare donc lecture et écriture : le cabinet lit, le seul titulaire écrit.
-- `is_doctor_owner()` existe déjà pour cela depuis tier2_foundation.sql:43 mais
-- n'était utilisé que sur `doctor_staff`.

drop policy if exists prescriptions_rw on public.prescriptions;

create policy prescriptions_cabinet_read on public.prescriptions for select
  using (public.owns_doctor(doctor_id) or public.is_admin());

create policy prescriptions_owner_insert on public.prescriptions for insert
  with check (public.is_doctor_owner(doctor_id) or public.is_admin());

create policy prescriptions_owner_update on public.prescriptions for update
  using (public.is_doctor_owner(doctor_id) or public.is_admin())
  with check (public.is_doctor_owner(doctor_id) or public.is_admin());

create policy prescriptions_owner_delete on public.prescriptions for delete
  using (public.is_doctor_owner(doctor_id) or public.is_admin());

-- `prescriptions_patient_read` (tier2_foundation.sql:81) reste inchangée : le
-- patient continue de lire ses propres ordonnances.

drop policy if exists templates_rw on public.prescription_templates;

create policy templates_cabinet_read on public.prescription_templates for select
  using (public.owns_doctor(doctor_id) or public.is_admin());

create policy templates_owner_write on public.prescription_templates for all
  using (public.is_doctor_owner(doctor_id) or public.is_admin())
  with check (public.is_doctor_owner(doctor_id) or public.is_admin());


-- ── 2 · HAUTE — seul le titulaire rattache un compte au cabinet ─────────────
--
-- `staff_write` utilise bien `is_doctor_owner`, donc les écritures directes sur
-- `doctor_staff` sont fermées. Mais `invite_staff_by_email` est `security
-- definer` : elle contourne la policy, et son propre garde disait `owns_doctor`.
-- Une secrétaire pouvait donc s'adjoindre un complice, à qui `owns_doctor()`
-- ouvrait aussitôt l'agenda, le fichier patients et les dossiers.
-- Corps identique à 20260804120000_prelaunch_hardening.sql:378, garde corrigé.

create or replace function public.invite_staff_by_email(p_doctor_id uuid, p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not (public.is_doctor_owner(p_doctor_id) or public.is_admin()) then
    raise exception 'Seul le médecin titulaire peut gérer l''équipe.';
  end if;
  if coalesce(btrim(p_email), '') = '' then
    return 'no_user';
  end if;

  select id into v_uid
    from public.users
   where lower(email) = lower(btrim(p_email))
   limit 1;

  if v_uid is null then return 'no_user'; end if;

  if exists (select 1 from public.doctors d where d.id = p_doctor_id and d.user_id = v_uid) then
    return 'is_owner';
  end if;

  begin
    insert into public.doctor_staff (doctor_id, user_id, role, active)
    values (p_doctor_id, v_uid, 'secretary', true);
  exception when unique_violation then
    return 'dup';
  end;

  return 'ok';
end $$;

revoke all on function public.invite_staff_by_email(uuid, text) from public, anon;
grant execute on function public.invite_staff_by_email(uuid, text) to authenticated;

-- Même motif : déclarer un paiement engage le titulaire, pas son personnel.
-- (Impact faible — un administrateur confirme ensuite — mais même cause racine.)
create or replace function public.declare_payment(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.doctor_payments
     set status = 'declared', declared_at = now()
   where id = p_id and status <> 'paid' and public.is_doctor_owner(doctor_id);
$$;


-- ── 3 · MOYENNE — une conversation suppose une relation de soin ─────────────
--
-- `conversations_insert` (20260615120001_rls.sql:99) n'exigeait du patient que
-- d'être lui-même : il pouvait donc ouvrir un fil avec n'importe quel médecin de
-- l'annuaire, jamais consulté. La restriction n'existait que dans le `<select>`.
-- La qualification `conversations.doctor_id` lève l'ambiguïté avec `a.doctor_id`.

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations for insert with check (
  public.is_admin()
  or public.owns_doctor(doctor_id)
  or (
    patient_id = public.app_uid()
    and exists (
      select 1 from public.appointments a
      where a.doctor_id = conversations.doctor_id
        and a.patient_id = public.app_uid()
    )
  )
);


-- ── 4 · HAUTE — liste noire et absences : un seul format de téléphone ───────
--
-- `PhoneField.joinPhone` stocke « +212 612345678 » (avec une espace), tandis que
-- `guest-booking/normPhone` compare « +212612345678 ». L'égalité était toujours
-- fausse : le blocage d'un patient par le cabinet et le décompte des absences
-- répétées ne s'appliquaient jamais.
--
-- Normalisation à l'ÉCRITURE, par colonne générée : un futur appelant ne peut
-- pas réintroduire l'écart, contrairement à une normalisation à la lecture.

alter table public.doctor_patients
  add column if not exists phone_e164 text
  generated always as (nullif(regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g'), '')) stored;

create index if not exists doctor_patients_phone_e164_idx
  on public.doctor_patients (doctor_id, phone_e164);

alter table public.appointments
  add column if not exists patient_phone_e164 text
  generated always as (nullif(regexp_replace(coalesce(patient_phone, ''), '[^0-9+]', '', 'g'), '')) stored;

create index if not exists appointments_phone_e164_idx
  on public.appointments (doctor_id, patient_phone_e164);

-- Colonnes générées : PostgreSQL les calcule pour les lignes existantes lors du
-- ALTER. Aucune reprise de données à écrire — mais à vérifier en pré-production
-- sur un jeu réel, notamment les numéros saisis sans indicatif.


-- ── 5 · MOYENNE — le plafond d'essais OTP doit être atomique ────────────────
--
-- `guest-booking` lisait `attempts` puis réécrivait `attempts + 1`. Des `verify`
-- concurrents lisaient tous la même valeur et franchissaient tous le test des
-- 5 essais ; rien d'autre ne bornait `verify`. Dix minutes de devinettes
-- parallèles sur 10^6 suffisaient.
--
-- Un seul `update … returning` rend l'incrément et le test indissociables.
-- Renvoie NULL si le code est épuisé, introuvable ou expiré — l'appelant ne
-- distingue pas les trois cas.

create or replace function public.otp_claim_attempt(p_phone text)
returns table (id uuid, code_hash text, payload jsonb, attempts int)
language sql security definer set search_path = public as $$
  update public.booking_otps o
     set attempts = o.attempts + 1
   where o.id = (
     select o2.id from public.booking_otps o2
      where o2.phone = p_phone
        and o2.used = false
        and o2.attempts < 5
        and o2.expires_at > now()
      order by o2.created_at desc
      limit 1
      for update skip locked
   )
  returning o.id, o.code_hash, o.payload, o.attempts;
$$;

revoke all on function public.otp_claim_attempt(text) from public, anon, authenticated;
-- Appelée uniquement par la fonction Edge guest-booking, en service_role.
grant execute on function public.otp_claim_attempt(text) to service_role;


-- ── 6 · MOYENNE — plafonner les invitations de patients ─────────────────────
--
-- `invite-patient` envoyait un courriel Resend et un WhatsApp de marque à chaque
-- appel, sans limite : un compte médecin compromis pouvait harceler un tiers.

create table if not exists public.invite_throttle (
  id         bigint generated always as identity primary key,
  sender     uuid,
  target     text not null,
  created_at timestamptz not null default now()
);

create index if not exists invite_throttle_target_idx
  on public.invite_throttle (target, created_at desc);
create index if not exists invite_throttle_sender_idx
  on public.invite_throttle (sender, created_at desc);

alter table public.invite_throttle enable row level security;
-- Aucune policy : seul le service_role (fonction Edge) y accède. RLS activée
-- pour que la table ne soit pas lisible par un porteur de la clé anon.


-- ── 7 · DÉFENSE EN PROFONDEUR — l'annuaire confrères aux seuls médecins ─────
--
-- `network_directory` n'expose que des informations déjà publiques sur la fiche
-- du cabinet, mais elle distribuait `doctors.id` à tout le rôle `authenticated`,
-- patients compris — et le nom de salon Jitsi en était dérivé (corrigé côté
-- frontend dans Network.jsx). On garde la vue en `security definer` (la RLS de
-- `doctors` est réservée au titulaire, l'invoker casserait l'annuaire) et on
-- restreint par une condition explicite : l'appelant doit être un médecin.

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
    and (d.current_period_end is null or d.current_period_end >= now())
    and exists (
      select 1 from public.doctors me
      join public.users mu on mu.id = me.user_id
      where mu.auth_id = auth.uid()
    );

grant select on public.network_directory to authenticated;

comment on view public.network_directory is
  'Annuaire confrères — réservé aux comptes médecins (voir clause exists). Les colonnes sont celles déjà publiques sur la fiche du cabinet.';

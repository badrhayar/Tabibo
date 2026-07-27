-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Postes de soins du cabinet
--   Un cabinet peut compter plusieurs praticiens, un laboratoire, une salle
--   d'échographie… Le médecin déclare ses postes dans Paramètres ; le poste
--   choisi suit le rendez-vous, de la réservation jusqu'au navigateur patients.
--
--   • doctors.stations   : la liste des postes du cabinet (JSON)
--       [{ "id": "st_lab", "name": "Laboratoire", "kind": "lab" }, …]
--       `kind` ∈ desk | doctor | care | lab | imaging | other
--   • appointments.station_id : le poste retenu pour ce rendez-vous (facultatif).
--       Un rendez-vous sans poste reste parfaitement valide : le poste n'est
--       jamais obligatoire pour réserver.
--   • doctor_directory expose `stations` pour que le patient puisse choisir son
--     poste au moment de la réservation.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.doctors
  add column if not exists stations jsonb not null default '[]'::jsonb;

alter table public.appointments
  add column if not exists station_id text;

-- Vue publique : mêmes colonnes qu'avant + les postes de soins.
create or replace view public.doctor_directory as
  select
    d.id, u.full_name, d.specialty, d.city, d.clinic_address, d.fee_mad,
    d.languages, d.cnss_cnopss, d.teleconsultation, d.bio, d.rating,
    d.reviews_count, d.experience_years, d.map_x, d.map_y,
    d.max_per_day, d.prayer_block, d.prayer_ids, d.services, u.avatar_url,
    d.lat, d.lng, d.slug, d.slot_minutes,
    d.bio_ar, d.bio_en, d.stations
  from public.doctors d
  join public.users u on u.id = d.user_id
  where d.verification_status = 'approved'
    and d.blocked = false
    and d.subscription_status <> 'expired'
    and (d.current_period_end is null or d.current_period_end >= now());

grant select on public.doctor_directory to anon, authenticated;

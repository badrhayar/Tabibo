-- ════════════════════════════════════════════════════════════════════════════
--  Factures du cabinet — la veille du lancement
--
--  L'écran « Facturation » existait déjà et fonctionnait… entièrement dans le
--  localStorage du navigateur (lib/billing.js : loadInvoices/saveInvoices).
--  Autrement dit : un médecin qui facturait depuis son ordinateur du cabinet ne
--  retrouvait rien depuis son téléphone, et un simple vidage de cache effaçait
--  sa comptabilité. Pour une fonction financière, c'est inacceptable au
--  lancement. Cette table donne à la facturation le même socle que le reste.
--
--  Cloisonnement : une facture appartient à UN cabinet. Le médecin titulaire y
--  accède ; la secrétaire aussi (elle encaisse au comptoir), via owns_doctor()
--  qui couvre déjà titulaire + personnel actif. Le patient n'y accède jamais
--  par cette table — sa facture lui est remise en PDF.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.invoices (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references public.doctors(id) on delete cascade,
  -- Numéro visible par le cabinet (séquence par cabinet, tenue côté client).
  no           text not null,
  invoice_date date not null default (now() at time zone 'Africa/Casablanca')::date,
  patient_name text not null default 'Patient',
  service      text,
  sent_to      text,
  -- Vocabulaire repris À L'IDENTIQUE de lib/billing.js (KINDS / STATUS) : une
  -- contrainte inventée aurait rejeté chaque écriture du client.
  kind         text not null default 'prive'
               check (kind in ('prive', 'amo', 'hors')),
  status       text not null default 'draft'
               check (status in ('draft', 'open', 'sent', 'reminded',
                                 'recovery', 'paid', 'canceled')),
  amount       numeric(10, 2) not null default 0 check (amount >= 0),
  -- Moyen d'encaissement, renseigné au passage en 'paid'.
  -- lib/billing.js METHODS
  method       text check (method in ('virement', 'enligne', 'especes', 'carte')),
  -- Journal des étapes, tel qu'affiché dans le tableau : [{label, date}, …]
  history      jsonb not null default '[]'::jsonb,
  -- Rendez-vous facturé, quand la facture en découle.
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Deux factures d'un même cabinet ne peuvent porter le même numéro.
create unique index if not exists invoices_doctor_no_uniq
  on public.invoices (doctor_id, no);
create index if not exists invoices_doctor_date_idx
  on public.invoices (doctor_id, invoice_date desc);

alter table public.invoices enable row level security;

-- owns_doctor() = médecin titulaire OU membre actif de son équipe.
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select to authenticated using (public.owns_doctor(doctor_id));

drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices
  for insert to authenticated with check (public.owns_doctor(doctor_id));

drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices
  for update to authenticated
  using (public.owns_doctor(doctor_id)) with check (public.owns_doctor(doctor_id));

drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices
  for delete to authenticated using (public.owns_doctor(doctor_id));

grant select, insert, update, delete on public.invoices to authenticated;

-- `updated_at` tenu par la base : le client ne peut pas mentir sur la date.
create or replace function public.invoices_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists invoices_touch_trg on public.invoices;
create trigger invoices_touch_trg
  before update on public.invoices
  for each row execute function public.invoices_touch();

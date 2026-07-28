-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · Tabibo Network — la messagerie entre confrères
--   Le lien existe déjà (20260802120000_doctor_network.sql) ; il lui manquait
--   la parole. Un confrère relié peut désormais :
--     • écrire un message,
--     • joindre une image ou un document,
--     • proposer un appel audio ou vidéo — la ligne d'appel est un message
--       comme un autre, pour que le confrère absent retrouve le lien.
--
--   Ce qui ne change pas : on ne parle qu'à un confrère dont le lien est
--   ACCEPTÉ, et la base le vérifie elle-même. Une pièce jointe n'est lisible
--   que par les deux confrères de la conversation — jamais par le reste du
--   monde, jamais par un cabinet tiers.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Le message s'enrichit ────────────────────────────────────────────────
-- « kind » dit ce que la ligne est : un mot, une pièce jointe, un appel.
alter table public.doctor_notes
  add column if not exists kind        text not null default 'text',
  add column if not exists file_path   text,
  add column if not exists file_name   text,
  add column if not exists file_type   text,
  add column if not exists file_size   bigint,
  add column if not exists call_room   text;

do $$ begin
  alter table public.doctor_notes
    add constraint doctor_notes_kind_chk check (kind in ('text', 'file', 'call'));
exception when duplicate_object then null; end $$;

-- Une pièce jointe peut voyager sans légende : le corps devient facultatif,
-- mais une ligne vide de tout (ni mot, ni fichier, ni appel) reste interdite.
alter table public.doctor_notes alter column body drop not null;
do $$ begin
  alter table public.doctor_notes
    add constraint doctor_notes_not_empty check (
      coalesce(nullif(btrim(body), ''), file_path, call_room) is not null
    );
exception when duplicate_object then null; end $$;

-- ── 2. Le casier des pièces jointes ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('confrere-media', 'confrere-media', false)
on conflict (id) do update set public = false;

-- Vrai si l'utilisateur connecté est relié (lien ACCEPTÉ) au cabinet qui a
-- déposé le fichier. Le nom du dossier est l'identifiant d'authentification de
-- celui qui a déposé — la même convention que chat-media.
create or replace function public.shares_link_with_uploader(obj_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_uploader_auth uuid;
  v_me    uuid;
  v_other uuid;
begin
  begin
    v_uploader_auth := ((storage.foldername(obj_name))[1])::uuid;
  exception when others then
    return false;                      -- le dossier n'est pas un uuid : pas des nôtres
  end;
  if v_uploader_auth = auth.uid() then return true; end if;   -- son propre dépôt

  select public.my_doctor_id() into v_me;
  select d.id into v_other from public.doctors d where d.user_id = v_uploader_auth limit 1;
  if v_me is null or v_other is null then return false; end if;

  return exists (
    select 1 from public.doctor_links l
    where l.status = 'accepted'
      and ((l.requester_id = v_me and l.addressee_id = v_other)
        or (l.addressee_id = v_me and l.requester_id = v_other))
  );
end $$;
revoke all on function public.shares_link_with_uploader(text) from public;
grant execute on function public.shares_link_with_uploader(text) to authenticated;

-- Lecture : celui qui a déposé, le confrère relié, ou un administrateur.
drop policy if exists confrere_media_read on storage.objects;
create policy confrere_media_read on storage.objects for select to authenticated
  using (
    bucket_id = 'confrere-media' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.shares_link_with_uploader(name)
      or public.is_admin()
    )
  );

-- Dépôt : uniquement dans son propre dossier.
drop policy if exists confrere_media_insert_own on storage.objects;
create policy confrere_media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'confrere-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Retrait : uniquement ce qu'on a déposé soi-même.
drop policy if exists confrere_media_delete_own on storage.objects;
create policy confrere_media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'confrere-media' and (storage.foldername(name))[1] = auth.uid()::text);

comment on column public.doctor_notes.kind is
  'text = un mot · file = une pièce jointe · call = une proposition d''appel audio ou vidéo.';
comment on column public.doctor_notes.call_room is
  'Nom du salon d''appel. Aucun contenu d''appel ne transite par Tabibo : seul le nom du salon est conservé.';

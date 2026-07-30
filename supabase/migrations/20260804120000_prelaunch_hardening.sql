-- ════════════════════════════════════════════════════════════════════════════
-- Tabibo · durcissement d'avant-lancement
--
--   Dix correctifs issus de l'audit complet mené avant l'ouverture. Chacun a été
--   vérifié en relisant le code, pas seulement signalé. L'ordre suit la gravité.
--
--   1. chat-media : une conversation ouvrait TOUT le dossier de l'autre partie
--   2. my_doctor_id() : jointure fausse → tout Tabibo Network était mort
--   3. confrere-media : même faute de portée que chat-media
--   4. appointments : le patient pouvait SUPPRIMER le rendez-vous
--   5. documents : la mise à jour permettait de re-cibler un document
--   6. doctor_links : le destinataire pouvait forger un lien « accepté »
--   7. doctor_notes : le destinataire pouvait réécrire le message reçu
--   8. doctors.user_id : n'était épinglé par aucun garde
--   9. public.users : le rôle n'était protégé qu'à la mise à jour
--  10. client_errors : croissance non bornée par un appelant anonyme
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- 1. chat-media — la lecture suit le MESSAGE, plus le dossier
--
--  CE QUI N'ALLAIT PAS. shares_conversation_with_uploader() répondait « oui »
--  dès que le lecteur partageait UNE conversation avec le déposant. Or tous les
--  envois d'un médecin vivent dans un seul dossier, nommé par son identifiant
--  d'authentification. Conséquence : un patient qui a échangé une seule fois
--  avec le Dr X pouvait lire TOUTES les images que le Dr X a envoyées à TOUS
--  ses autres patients.
--
--  L'ATTAQUE, PAS À PAS. Le jeton d'une image reçue est stocké tel quel dans le
--  corps du message : « chat-media/<uid du Dr X>/1730…_a1b2.jpg ». Le patient y
--  lit donc le nom du dossier du médecin. Il appelle ensuite
--  storage.list('<uid du Dr X>') — autorisé par l'ancienne règle — obtient la
--  liste complète des fichiers, puis une adresse signée pour chacun. Photos de
--  lésions, clichés, résultats : le dossier image entier d'un cabinet.
--
--  LA CORRECTION. On ne demande plus « partagez-vous une conversation ? » mais
--  « ce fichier précis a-t-il été envoyé dans une conversation dont vous faites
--  partie ? ». La réponse se lit dans public.messages, qui porte le jeton exact.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.shares_conversation_with_uploader(obj_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_me    uuid;
  v_token text := 'chat-media/' || obj_name;
begin
  select id into v_me from public.users where auth_id = auth.uid();
  if v_me is null then return false; end if;

  -- Le fichier doit avoir été envoyé dans une conversation où je figure —
  -- comme patient, ou comme médecin propriétaire du cabinet.
  return exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    join public.doctors d       on d.id = c.doctor_id
    where m.content = v_token
      and (c.patient_id = v_me or d.user_id = v_me)
  );
end $$;

comment on function public.shares_conversation_with_uploader(text) is
  'Vrai si CE fichier a été envoyé dans une conversation dont l''appelant fait partie. '
  'Portée fichier par fichier : une conversation n''ouvre jamais le dossier entier du déposant.';


-- ════════════════════════════════════════════════════════════════════════════
-- 2. my_doctor_id() — la jointure était fausse, tout le réseau était mort
--
--  CE QUI N'ALLAIT PAS. doctors.user_id référence public.users(id), tandis que
--  auth.uid() renvoie un auth.users(id). Ce sont deux identifiants différents.
--  « where d.user_id = auth.uid() » ne pouvait donc JAMAIS trouver de ligne :
--  la fonction renvoyait NULL pour tout le monde.
--
--  CONSÉQUENCE. Toutes les règles d'accès de Tabibo Network s'évaluaient à NULL,
--  c'est-à-dire « refusé ». Le réseau échouait fermé — donc sans risque pour les
--  données — mais entièrement hors service : aucun lien, aucun adressage, aucun
--  message n'aurait fonctionné le jour de la mise en ligne.
--
--  LA CORRECTION. Passer par public.users, exactement comme owns_doctor() le
--  fait depuis la première migration.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.my_doctor_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select d.id
    from public.doctors d
    join public.users   u on u.id = d.user_id
   where u.auth_id = auth.uid()
   limit 1;
$$;

comment on function public.my_doctor_id() is
  'Le cabinet dont l''utilisateur connecté est titulaire. La jointure passe par '
  'public.users : doctors.user_id est un users.id, jamais un auth.uid().';


-- ════════════════════════════════════════════════════════════════════════════
-- 3. confrere-media — même correction de portée que chat-media
--
--  La règle reproduisait la faute : partager un lien avec un confrère ouvrait
--  tout son dossier de pièces jointes, donc les documents qu'il a envoyés à
--  d'autres confrères. On la scelle sur le message qui porte le fichier.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.shares_link_with_uploader(obj_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_me uuid;
begin
  if (storage.foldername(obj_name))[1] = auth.uid()::text then
    return true;                                   -- son propre dépôt
  end if;
  select public.my_doctor_id() into v_me;
  if v_me is null then return false; end if;

  -- Ce fichier précis doit m'avoir été envoyé, ou avoir été envoyé par moi.
  return exists (
    select 1 from public.doctor_notes n
     where n.file_path = obj_name
       and (n.to_doctor_id = v_me or n.from_doctor_id = v_me)
  );
end $$;

comment on function public.shares_link_with_uploader(text) is
  'Vrai si CE fichier a été échangé dans un message où l''appelant est partie. '
  'Le lien entre cabinets n''ouvre pas le dossier de pièces jointes du confrère.';


-- ════════════════════════════════════════════════════════════════════════════
-- 4. appointments — le patient annule, il n'efface pas
--
--  CE QUI N'ALLAIT PAS. appts_delete autorisait « patient_id = app_uid() ».
--  Un patient pouvait donc SUPPRIMER définitivement la ligne du rendez-vous.
--
--  CE QUE CELA DÉTRUISAIT. La ligne emporte avec elle l'avis laissé (cascade),
--  détache le compte rendu de consultation et l'encaissement (mis à NULL), fait
--  disparaître la recette de la journée du médecin et de ses statistiques — et
--  efface l'historique d'absences sur lequel la réservation invité s'appuie
--  pour bloquer un patient après trois rendez-vous non honorés. Le patient
--  pouvait donc effacer la preuve de ses absences et continuer à réserver.
--
--  LA CORRECTION. Le patient garde l'annulation (mise à jour du statut, déjà
--  autorisée par appts_update) ; la suppression revient au cabinet et à
--  l'administrateur, qui répondent de la tenue du dossier.
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists appts_delete on public.appointments;
create policy appts_delete on public.appointments for delete
  using (public.owns_doctor(doctor_id) or public.is_admin());

comment on table public.appointments is
  'Un patient annule (status = cancelled) ; il ne supprime pas. La suppression '
  'appartient au cabinet : la ligne porte le compte rendu, l''encaissement et '
  'l''historique d''absences.';


-- ════════════════════════════════════════════════════════════════════════════
-- 5. documents — on ne re-cible pas un document après coup
--
--  CE QUI N'ALLAIT PAS. La règle d'INSERTION a été durcie (un document ne peut
--  être déposé que vers un cabinet avec lequel une relation existe), mais la
--  règle de MISE À JOUR est restée celle de la toute première migration : le
--  propriétaire pouvait modifier n'importe quelle colonne, doctor_id compris.
--
--  L'ATTAQUE. Le patient dépose un document chez son propre médecin — la règle
--  d'insertion est satisfaite — puis, d'une simple mise à jour, le réoriente
--  vers un cabinet quelconque, et l'attribue au patient de son choix. Le
--  contrôle de relation posé à l'insertion est ainsi contourné.
--
--  LA CORRECTION. Les colonnes de rattachement sont épinglées : on peut
--  renommer ou reclasser son document, jamais le déplacer.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_document_rebind()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.owner_id       := old.owner_id;
  new.doctor_id      := old.doctor_id;
  new.patient_id     := old.patient_id;
  new.appointment_id := old.appointment_id;
  new.file_url       := old.file_url;
  return new;
end $$;

drop trigger if exists trg_guard_document_rebind on public.documents;
create trigger trg_guard_document_rebind
  before update on public.documents
  for each row execute function public.guard_document_rebind();

comment on function public.guard_document_rebind() is
  'Épingle les colonnes de rattachement d''un document. Sans cela, la règle de '
  'relation vérifiée à l''insertion se contourne par une simple mise à jour.';


-- ════════════════════════════════════════════════════════════════════════════
-- 6. doctor_links — le consentement ne se forge pas
--
--  CE QUI N'ALLAIT PAS. La règle de mise à jour n'épinglait que addressee_id.
--  B, qui reçoit une demande de A, pouvait réécrire requester_id en C puis
--  passer status à « accepted » : un lien accepté apparaissait alors entre B et
--  C, alors que C n'a jamais rien demandé ni accepté. Ce lien ouvre l'adressage
--  de patients, la messagerie, et la lecture des pièces jointes de C.
--
--  LA CORRECTION. Les deux extrémités du lien sont figées ; le destinataire ne
--  peut plus que répondre (status, responded_at).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_doctor_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.requester_id := old.requester_id;
  new.addressee_id := old.addressee_id;
  new.created_at   := old.created_at;
  return new;
end $$;

drop trigger if exists trg_guard_doctor_link on public.doctor_links;
create trigger trg_guard_doctor_link
  before update on public.doctor_links
  for each row execute function public.guard_doctor_link();


-- ════════════════════════════════════════════════════════════════════════════
-- 7. doctor_notes — marquer comme lu, pas réécrire
--
--  La règle de mise à jour existe pour poser read_at. Telle qu'elle était
--  écrite, le destinataire pouvait aussi changer le corps du message, la pièce
--  jointe et le salon d'appel — c'est-à-dire réécrire ce qu'un confrère lui a
--  envoyé, puis s'en prévaloir. Seul read_at reste modifiable.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_doctor_note()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.from_doctor_id := old.from_doctor_id;
  new.to_doctor_id   := old.to_doctor_id;
  new.referral_id    := old.referral_id;
  new.kind           := old.kind;
  new.body           := old.body;
  new.file_path      := old.file_path;
  new.file_name      := old.file_name;
  new.file_type      := old.file_type;
  new.file_size      := old.file_size;
  new.call_room      := old.call_room;
  new.created_at     := old.created_at;
  return new;
end $$;

drop trigger if exists trg_guard_doctor_note on public.doctor_notes;
create trigger trg_guard_doctor_note
  before update on public.doctor_notes
  for each row execute function public.guard_doctor_note();


-- ════════════════════════════════════════════════════════════════════════════
-- 8. doctors.user_id — le cabinet ne change pas de mains tout seul
--
--  guard_doctor_status() épinglait déjà blocked, subscription_status, la note
--  et le compteur d'avis. Il laissait user_id libre : le titulaire pouvait donc
--  transférer son cabinet — et les dossiers de tous ses patients — à un autre
--  compte, sans qu'aucun administrateur n'en soit informé. C'est aussi ce que
--  ferait un attaquant ayant volé une session de médecin, pour rendre le vol
--  définitif. La colonne rejoint les colonnes épinglées.
--
--  ATTENTION à qui modifiera cette fonction plus tard : `create or replace`
--  REMPLACE le corps entier. Toute colonne épinglée qu'on oublie de recopier
--  redevient librement modifiable par le médecin, en silence. La liste
--  ci-dessous est la liste complète — ne la raccourcissez jamais.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_doctor_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'approved' then
      raise exception 'Seul un administrateur peut approuver un médecin';
    end if;
    if not (old.verification_status = 'rejected'
            and new.verification_status = 'pending'
            and public.owns_doctor(old.id)) then
      new.verification_status := old.verification_status;
    end if;
  end if;

  -- Colonnes de modération, de facturation et de confiance : jamais écrites
  -- par le médecin. Liste complète — voir l'avertissement ci-dessus.
  new.blocked             := old.blocked;
  new.subscription_status := old.subscription_status;
  new.trial_ends_at       := old.trial_ends_at;
  new.period_start        := old.period_start;
  new.billing_cycle       := old.billing_cycle;
  new.current_period_end  := old.current_period_end;   -- l'échéance payée
  new.rating              := old.rating;
  new.reviews_count       := old.reviews_count;
  new.user_id             := old.user_id;              -- le cabinet ne se cède pas

  return new;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- 9. public.users — le rôle est aussi protégé à l'insertion
--
--  guard_user_role() interdit d'élever son rôle par une MISE À JOUR. Rien ne
--  l'interdisait à l'INSERTION. Ce n'est pas exploitable aujourd'hui — le
--  trigger d'inscription a déjà créé la ligne et auth_id est unique, donc une
--  seconde insertion échoue — mais toute la protection repose sur cette
--  coïncidence plutôt que sur une règle. On en fait une règle.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.guard_user_role_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- handle_new_user() s'exécute sur auth.users sans auth.uid() : non concerné.
  if auth.uid() is not null and new.role = 'admin' and not public.is_admin() then
    raise exception 'Vous ne pouvez pas créer un compte administrateur.';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_user_role_insert on public.users;
create trigger trg_guard_user_role_insert
  before insert on public.users
  for each row execute function public.guard_user_role_insert();


-- ════════════════════════════════════════════════════════════════════════════
-- 10. client_errors — la table de supervision est bornée
--
--  L'insertion anonyme est voulue : une page publique qui plante doit pouvoir
--  le signaler sans compte. Mais le plafond de dix rapports vit dans le
--  navigateur (lib/monitor.js), et un appel direct à l'API l'ignore. La table
--  pouvait donc grossir sans limite — saturation du plan, facture, et surtout
--  noyade de la console d'administration au moment précis où elle sert.
--
--  On borne côté serveur : 90 jours de rétention, 5 000 lignes au plus. Le
--  nettoyage est paresseux (une insertion sur cinquante) pour ne pas payer un
--  balayage à chaque rapport.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.prune_client_errors()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count bigint;
begin
  if random() < 0.02 then
    delete from public.client_errors where created_at < now() - interval '90 days';
    select count(*) into v_count from public.client_errors;
    if v_count > 5000 then
      delete from public.client_errors
       where id in (select id from public.client_errors
                     order by created_at asc limit (v_count - 5000));
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_prune_client_errors on public.client_errors;
create trigger trg_prune_client_errors
  after insert on public.client_errors
  for each row execute function public.prune_client_errors();


-- ════════════════════════════════════════════════════════════════════════════
-- 11. L'invitation d'une secrétaire, réparée
--
--  user_id_for_email() a été révoquée au rôle authenticated lors d'un audit
--  précédent (elle servait d'oracle courriel → identifiant). Mais le navigateur
--  l'appelait encore : depuis, « Inviter un membre » échoue systématiquement.
--  Un correctif de sécurité avait cassé une fonction, sans que rien ne le
--  signale — l'écran Équipe n'était couvert par aucun banc d'essai.
--
--  On remplace l'appel par une fonction qui fait TOUT le travail côté serveur
--  et ne renvoie jamais d'identifiant : le médecin donne une adresse, la base
--  vérifie qu'il est bien titulaire du cabinet, retrouve le compte, et crée le
--  rattachement. Rien ne fuit, et la fonction redevient utilisable.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.invite_staff_by_email(p_doctor_id uuid, p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not (public.owns_doctor(p_doctor_id) or public.is_admin()) then
    raise exception 'Vous ne gérez pas ce cabinet.';
  end if;
  if coalesce(btrim(p_email), '') = '' then
    return 'no_user';
  end if;

  select id into v_uid
    from public.users
   where lower(email) = lower(btrim(p_email))
   limit 1;

  if v_uid is null then return 'no_user'; end if;

  -- Le titulaire du cabinet ne se rattache pas à lui-même comme secrétaire.
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

comment on function public.invite_staff_by_email(uuid, text) is
  'Rattache un compte existant au cabinet, à partir de son adresse. Vérifie que '
  'l''appelant est titulaire, et ne renvoie jamais d''identifiant : pas d''oracle '
  'courriel → compte. Remplace l''appel client à user_id_for_email(), révoquée.';

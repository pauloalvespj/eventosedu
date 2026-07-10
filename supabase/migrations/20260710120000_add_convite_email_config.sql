-- Configuração de e-mail de convite (assunto, mensagem, banner, link, anexo)
alter table events
  add column if not exists convite_config jsonb not null default '{}'::jsonb;

-- Bucket de anexos dos convites (arquivo real enviado junto no e-mail via SMTP)
insert into storage.buckets (id, name, public)
values ('convite-anexos', 'convite-anexos', true)
on conflict (id) do nothing;

drop policy if exists "Público lê anexos de convite" on storage.objects;
create policy "Público lê anexos de convite"
  on storage.objects for select
  using (bucket_id = 'convite-anexos');

drop policy if exists "Admin envia anexos de convite" on storage.objects;
create policy "Admin envia anexos de convite"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'convite-anexos'
    and current_user_role() = 'admin'
  );

drop policy if exists "Admin atualiza anexos de convite" on storage.objects;
create policy "Admin atualiza anexos de convite"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'convite-anexos'
    and current_user_role() = 'admin'
  );

drop policy if exists "Admin deleta anexos de convite" on storage.objects;
create policy "Admin deleta anexos de convite"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'convite-anexos'
    and current_user_role() = 'admin'
  );

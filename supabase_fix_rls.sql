-- ============================================================
-- Abre este arquivo no VS Code, copie e cole no SQL Editor
-- do Supabase Dashboard (https://supabase.com/dashboard)
-- ============================================================

-- 1) Ver políticas atuais (rode primeiro para confirmar)
select policyname, cmd
from pg_policies
where tablename = 'profiles'
order by cmd, policyname;

-- ============================================================
-- 2) Política: admin pode atualizar qualquer profile
--    (rode depois de ver o resultado do passo 1)
-- ============================================================

drop policy if exists "Admin atualiza qualquer profile" on profiles;

create policy "Admin atualiza qualquer profile"
on profiles for update
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1 from profiles p2
    where p2.id = auth.uid()
      and p2.role in ('admin', 'credenciador')
  )
)
with check (
  auth.uid() = id
  or exists (
    select 1 from profiles p2
    where p2.id = auth.uid()
      and p2.role in ('admin', 'credenciador')
  )
);

-- ============================================================
-- 3) Políticas de storage para o bucket "avatares"
--    (caso ainda não tenha rodado)
-- ============================================================

drop policy if exists "Público lê avatares" on storage.objects;
drop policy if exists "Usuário envia próprio avatar" on storage.objects;
drop policy if exists "Usuário atualiza próprio avatar" on storage.objects;
drop policy if exists "Admin envia qualquer avatar" on storage.objects;

create policy "Público lê avatares"
on storage.objects for select
using ( bucket_id = 'avatares' );

create policy "Usuário envia próprio avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatares'
  and (
    name = auth.uid()::text || '.jpg'
    or name = auth.uid()::text || '.jpeg'
    or name = auth.uid()::text || '.png'
    or name = auth.uid()::text || '.webp'
    or exists (
      select 1 from profiles p2
      where p2.id = auth.uid()
        and p2.role in ('admin', 'credenciador')
    )
  )
);

create policy "Usuário atualiza próprio avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatares'
  and (
    name = auth.uid()::text || '.jpg'
    or name = auth.uid()::text || '.jpeg'
    or name = auth.uid()::text || '.png'
    or name = auth.uid()::text || '.webp'
    or exists (
      select 1 from profiles p2
      where p2.id = auth.uid()
        and p2.role in ('admin', 'credenciador')
    )
  )
);

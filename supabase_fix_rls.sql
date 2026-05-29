-- 1) Ver políticas atuais da tabela profiles
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'profiles';

-- 2) Após ver o resultado acima, rode isso para permitir admin atualizar qualquer profile:

-- Permite admin atualizar qualquer profile (incluindo foto_url de palestrantes)
create policy "Admin atualiza qualquer profile"
on profiles for update
to authenticated
using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin','credenciador')
  )
)
with check (
  exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin','credenciador')
  )
);

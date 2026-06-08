-- ============================================================
-- Simplifica o sistema de roles:
--   super_admin → admin
--   credenciador (role) → participante + is_credenciador=true
-- ============================================================

-- 1. Nova coluna
alter table profiles
  add column if not exists is_credenciador boolean not null default false;

-- 2. Migra dados
update profiles set role = 'admin'        where role = 'super_admin';
update profiles set role = 'participante', is_credenciador = true
  where role = 'credenciador';

-- 3. Atualiza constraint
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
  add constraint profiles_role_check
    check (role in ('admin', 'participante'));

-- 4. Helper RLS para credenciador
create or replace function user_is_credenciador()
returns boolean language sql stable security definer as $$
  select coalesce(is_credenciador, false) from profiles where id = auth.uid()
$$;

-- 5. Recria policy de presenças
drop policy if exists "Admin/credenciador registra presenças" on presencas;
create policy "Admin/credenciador registra presenças"
  on presencas for insert to authenticated
  with check (current_user_role() = 'admin' or user_is_credenciador());

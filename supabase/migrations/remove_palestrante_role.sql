-- Remove 'palestrante' como role primário: todos viram participante + is_palestrante=true
update profiles
set role = 'participante', is_palestrante = true
where role = 'palestrante';

-- Atualiza a constraint para não aceitar mais role='palestrante'
alter table profiles
  drop constraint profiles_role_check;

alter table profiles
  add constraint profiles_role_check
    check (role in ('super_admin','admin','credenciador','participante'));

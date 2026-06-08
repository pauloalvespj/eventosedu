-- Permite que qualquer role seja também palestrante (admin, participante, credenciador)
alter table profiles
  add column if not exists is_palestrante boolean not null default false;

-- Backfill: quem já tem role='palestrante' já é palestrante
update profiles
set is_palestrante = true
where role = 'palestrante';

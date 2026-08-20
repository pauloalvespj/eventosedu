-- Renomeia nome_cracha -> nome_publico (nome como a pessoa quer ser
-- chamada/divulgada no evento, incluindo o crachá).
alter table public.profiles
  rename column nome_cracha to nome_publico;

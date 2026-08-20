-- Nome para crachá — como a pessoa quer ser chamada na identificação
-- impressa do evento (pode diferir do nome completo/legal).
alter table public.profiles
  add column if not exists nome_cracha text;

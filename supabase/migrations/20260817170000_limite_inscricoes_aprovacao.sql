-- ── LIMITE DE INSCRIÇÕES COM APROVAÇÃO ───────────────────────
-- Quando events.limite_inscricoes está definido e o número de
-- participantes aprovados/ativos atinge o limite, novas inscrições
-- (auto-cadastro, não criadas pelo admin) nascem como "pendente" em
-- vez de "aprovado", e ficam bloqueadas até um admin aprovar/recusar
-- manualmente (via update comum em profiles — já liberado para admin
-- pelo trigger protect_profile_update existente).

alter table events add column if not exists limite_inscricoes int;

alter table profiles add column if not exists status_inscricao text not null default 'aprovado';
alter table profiles drop constraint if exists profiles_status_inscricao_check;
alter table profiles add constraint profiles_status_inscricao_check
  check (status_inscricao in ('aprovado', 'pendente', 'recusado'));

-- Estende o trigger de auto-cadastro (já existente) para também aplicar
-- o limite de inscrições, no mesmo ponto atômico onde o role é forçado
-- para "participante" — evita duplicar lógica de proteção em outro lugar.
create or replace function public.protect_profile_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role   text;
  v_limite int;
  v_atuais int;
begin
  if auth.uid() is null then
    return new;
  end if;
  select role into v_role from profiles where id = auth.uid();
  if v_role in ('admin', 'super_admin') then
    return new;
  end if;
  -- Auto-cadastro: sempre nasce como participante comum
  new.role            := 'participante';
  new.roles           := null;
  new.is_palestrante  := false;
  new.is_credenciador := false;
  new.destaque        := false;
  new.credenciado     := false;
  new.credenciado_em  := null;

  select limite_inscricoes into v_limite from events order by id limit 1;
  if v_limite is not null then
    select count(*) into v_atuais from profiles
      where role = 'participante' and coalesce(ativo, true) and status_inscricao = 'aprovado';
    if v_atuais >= v_limite then
      new.status_inscricao := 'pendente';
    else
      new.status_inscricao := 'aprovado';
    end if;
  else
    new.status_inscricao := 'aprovado';
  end if;

  return new;
end;
$$;

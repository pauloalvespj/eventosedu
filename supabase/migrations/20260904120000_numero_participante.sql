-- ── NÚMERO DO PARTICIPANTE (para sorteios) ───────────────────
-- Cada inscrito recebe um número sequencial, atribuído por ordem
-- de inscrição (created_at). O número é permanente: inscrições
-- canceladas mantêm o número e números não são reaproveitados.
-- Formato de exibição fica a cargo do front (001, 002, ...).

alter table profiles add column if not exists numero_participante int;

-- Sequência que alimenta os novos cadastros
create sequence if not exists participante_numero_seq;

-- Backfill: numera os já existentes por ordem de inscrição
with ordenados as (
  select id, row_number() over (order by created_at, id) as n
  from profiles
  where numero_participante is null
)
update profiles p
  set numero_participante = o.n
  from ordenados o
  where o.id = p.id;

-- Sequência continua a partir do maior número já usado
select setval(
  'participante_numero_seq',
  coalesce((select max(numero_participante) from profiles), 0) + 1,
  false
);

-- Não pode haver dois participantes com o mesmo número
create unique index if not exists profiles_numero_participante_key
  on profiles (numero_participante);

-- Novo cadastro recebe o próximo número automaticamente.
-- Trigger separado do protect_profile_insert de propósito: aquele
-- retorna cedo para admin e para inserts sem JWT (criação via painel
-- admin), e esses cadastros também precisam de número.
create or replace function public.set_numero_participante()
returns trigger
language plpgsql
as $$
begin
  if new.numero_participante is null then
    new.numero_participante := nextval('participante_numero_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_numero_participante on profiles;
create trigger trg_set_numero_participante
  before insert on profiles
  for each row execute function public.set_numero_participante();

-- Protege o número contra auto-edição de participante (mesma lógica
-- dos demais campos sensíveis já revertidos em protect_profile_update).
create or replace function public.protect_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_cred boolean;
begin
  -- Sem JWT (service_role, edge functions, SQL do painel): passa direto
  if auth.uid() is null then
    return new;
  end if;
  select role, coalesce(is_credenciador, false) into v_role, v_cred
    from profiles where id = auth.uid();
  if v_role in ('admin', 'super_admin') then
    return new;
  end if;
  -- Campos que só admin altera — reverte silenciosamente
  new.role                := old.role;
  new.roles               := old.roles;
  new.is_palestrante      := old.is_palestrante;
  new.is_credenciador     := old.is_credenciador;
  new.destaque            := old.destaque;
  new.numero_participante := old.numero_participante;
  -- Credenciamento: admin ou credenciador
  if not v_cred then
    new.credenciado    := old.credenciado;
    new.credenciado_em := old.credenciado_em;
  end if;
  return new;
end;
$$;

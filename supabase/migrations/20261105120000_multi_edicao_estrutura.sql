-- ── MULTI-EDIÇÃO — PARTE A: ESTRUTURA + CÓPIA DOS DADOS ──────
-- Cada linha de `events` passa a ser uma EDIÇÃO do ENAUDIN.
-- `profiles` fica sendo a conta permanente da pessoa (dados pessoais);
-- `event_enrollments` vira a INSCRIÇÃO da pessoa numa edição e recebe
-- tudo que é "daquele ano": status da inscrição, credenciamento, número
-- do participante, certificado, papéis (palestrante/credenciador/destaque).
--
-- Esta parte SÓ ACRESCENTA: o front atual continua lendo/gravando em
-- profiles normalmente. A parte B (funções de presença, limite de
-- inscrições, pontuação etc. lendo da inscrição) é aplicada junto com o
-- deploy do front novo e re-sincroniza o que mudar em profiles até lá.

-- ── 1. events = edições ──────────────────────────────────────
alter table events add column if not exists ano           int;
alter table events add column if not exists numero_edicao int;
alter table events add column if not exists status        text not null default 'rascunho';
alter table events add column if not exists atual         boolean not null default false;
alter table events add column if not exists criado_em     timestamptz not null default now();

alter table events drop constraint if exists events_status_check;
alter table events add constraint events_status_check
  check (status in ('rascunho', 'ativa', 'encerrada'));

-- No máximo uma edição "atual" (a que o site público mostra)
create unique index if not exists events_unica_atual on events (atual) where atual;

-- Edição existente = III ENAUDIN (2026), já realizada
update events
   set ano           = coalesce(ano, extract(year from data_inicio)::int, 2026),
       numero_edicao = coalesce(numero_edicao, 3),
       status        = 'encerrada',
       atual         = true
 where id = 1;

-- Id da edição atual (fallback: a mais recente), usado como default
-- em tabelas cujas linhas são gravadas sem saber a edição.
create or replace function public.evento_atual_id()
returns int
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select id from events where atual limit 1),
    (select max(id) from events)
  );
$$;

-- ── 2. event_enrollments = inscrição na edição ───────────────
alter table event_enrollments add column if not exists status_inscricao             text not null default 'aprovado';
alter table event_enrollments add column if not exists credenciado                  boolean not null default false;
alter table event_enrollments add column if not exists credenciado_em               timestamptz;
alter table event_enrollments add column if not exists numero_participante          int;
alter table event_enrollments add column if not exists certificado_url              text;
alter table event_enrollments add column if not exists certificado_email_enviado_em timestamptz;
alter table event_enrollments add column if not exists is_palestrante               boolean not null default false;
alter table event_enrollments add column if not exists is_credenciador              boolean not null default false;
alter table event_enrollments add column if not exists destaque                     boolean not null default false;

alter table event_enrollments drop constraint if exists event_enrollments_status_inscricao_check;
alter table event_enrollments add constraint event_enrollments_status_inscricao_check
  check (status_inscricao in ('aprovado', 'pendente', 'recusado'));

-- FK para profiles (além da de auth.users) — permite o embed
-- profiles → event_enrollments no PostgREST.
alter table event_enrollments drop constraint if exists event_enrollments_profile_fkey;
alter table event_enrollments add constraint event_enrollments_profile_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- Número do participante é por edição (recomeça em 1 a cada ano)
create unique index if not exists event_enrollments_numero_key
  on event_enrollments (event_id, numero_participante);
create index if not exists event_enrollments_user_idx on event_enrollments (user_id);

-- ── 3. Cópia dos dados atuais para a edição 1 ────────────────
-- Cria inscrição para quem participa/palestra/credencia e ainda não tem
-- (hoje: 7 palestrantes cadastrados direto pelo admin).
-- Já entra com o número do profile para não colidir com a numeração
-- automática (as linhas existentes ainda estão com número nulo aqui).
insert into event_enrollments (event_id, user_id, role, ativo, numero_participante)
select 1, p.id,
       case when p.is_palestrante then 'palestrante' else 'participante' end,
       coalesce(p.ativo, true),
       p.numero_participante
  from profiles p
 where (p.role = 'participante'
        or 'participante' = any(coalesce(p.roles, '{}'))
        or p.is_palestrante
        or p.is_credenciador)
on conflict (event_id, user_id) do nothing;

update event_enrollments e
   set status_inscricao             = coalesce(p.status_inscricao, 'aprovado'),
       credenciado                  = coalesce(p.credenciado, false),
       credenciado_em               = p.credenciado_em,
       numero_participante          = p.numero_participante,
       certificado_url              = p.certificado_url,
       certificado_email_enviado_em = p.certificado_email_enviado_em,
       is_palestrante               = coalesce(p.is_palestrante, false),
       is_credenciador              = coalesce(p.is_credenciador, false),
       destaque                     = coalesce(p.destaque, false),
       ativo                        = coalesce(p.ativo, true)
  from profiles p
 where p.id = e.user_id
   and e.event_id = 1;

-- ── 4. Numeração automática por edição ───────────────────────
create or replace function public.set_numero_inscricao()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.numero_participante is null then
    -- serializa a numeração dentro da mesma edição
    perform pg_advisory_xact_lock(hashtext('numero_inscricao'), new.event_id);
    select coalesce(max(numero_participante), 0) + 1
      into new.numero_participante
      from event_enrollments
     where event_id = new.event_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_numero_inscricao on event_enrollments;
create trigger trg_set_numero_inscricao
  before insert on event_enrollments
  for each row execute function public.set_numero_inscricao();

-- ── 5. Credenciador por edição ───────────────────────────────
-- security definer: consultado de dentro das policies da própria
-- event_enrollments sem cair em recursão de RLS.
-- Transição: até a parte B também aceita o flag antigo de profiles.
create or replace function public.user_is_credenciador_evento(p_event_id int)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select is_credenciador from event_enrollments
      where event_id = p_event_id and user_id = auth.uid() and ativo),
    false)
  or coalesce((select is_credenciador from profiles where id = auth.uid()), false);
$$;

-- ── 6. Proteção dos campos da inscrição ──────────────────────
-- Mesma lógica de protect_profile_insert/update: participante só cria
-- a própria inscrição como participante comum e só pode cancelá-la;
-- credenciamento só por credenciador da edição; o resto só admin.
create or replace function public.protect_enrollment()
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

  if tg_op = 'INSERT' then
    new.role                         := 'participante';
    new.is_palestrante               := false;
    new.is_credenciador              := false;
    new.destaque                     := false;
    new.credenciado                  := false;
    new.credenciado_em               := null;
    new.certificado_url              := null;
    new.certificado_email_enviado_em := null;
    new.numero_participante          := null;
    new.ativo                        := true;
    new.cancelado_em                 := null;

    select limite_inscricoes into v_limite from events where id = new.event_id;
    if v_limite is not null then
      select count(*) into v_atuais from event_enrollments
       where event_id = new.event_id
         and ativo and not is_palestrante
         and status_inscricao = 'aprovado';
      new.status_inscricao := case when v_atuais >= v_limite then 'pendente' else 'aprovado' end;
    else
      new.status_inscricao := 'aprovado';
    end if;
    return new;
  end if;

  -- UPDATE
  new.event_id                     := old.event_id;
  new.user_id                      := old.user_id;
  new.role                         := old.role;
  new.is_palestrante               := old.is_palestrante;
  new.is_credenciador              := old.is_credenciador;
  new.destaque                     := old.destaque;
  new.numero_participante          := old.numero_participante;
  new.status_inscricao             := old.status_inscricao;
  new.certificado_url              := old.certificado_url;
  new.certificado_email_enviado_em := old.certificado_email_enviado_em;

  if not public.user_is_credenciador_evento(old.event_id) then
    new.credenciado    := old.credenciado;
    new.credenciado_em := old.credenciado_em;
  end if;

  -- Participante pode cancelar a própria inscrição, mas não reativar
  -- (reativar passaria por cima do limite de vagas) — isso é com o admin.
  if old.user_id = auth.uid() and not old.ativo and new.ativo then
    new.ativo        := old.ativo;
    new.cancelado_em := old.cancelado_em;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_enrollment on event_enrollments;
create trigger trg_protect_enrollment
  before insert or update on event_enrollments
  for each row execute function public.protect_enrollment();

-- ── 7. RLS de event_enrollments ──────────────────────────────
-- Antes: o dono podia fazer QUALQUER coisa na própria linha (inclusive
-- apagar). Agora: lê, cria e atualiza (com o trigger acima filtrando);
-- credenciador da edição lê e credencia todos daquela edição.
drop policy if exists user_own_enrollment on event_enrollments;

drop policy if exists inscricao_propria_select on event_enrollments;
create policy inscricao_propria_select on event_enrollments
  for select to authenticated using (user_id = auth.uid());

drop policy if exists inscricao_propria_insert on event_enrollments;
create policy inscricao_propria_insert on event_enrollments
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists inscricao_propria_update on event_enrollments;
create policy inscricao_propria_update on event_enrollments
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists credenciador_le_inscricoes on event_enrollments;
create policy credenciador_le_inscricoes on event_enrollments
  for select to authenticated using (public.user_is_credenciador_evento(event_id));

drop policy if exists credenciador_credencia on event_enrollments;
create policy credenciador_credencia on event_enrollments
  for update to authenticated
  using (public.user_is_credenciador_evento(event_id))
  with check (public.user_is_credenciador_evento(event_id));

-- ── 8. Pontuação, gamificação e logs por edição ──────────────
alter table pontuacoes add column if not exists event_id int references events(id);
update pontuacoes set event_id = 1 where event_id is null;
alter table pontuacoes alter column event_id set default public.evento_atual_id();
alter table pontuacoes alter column event_id set not null;
create index if not exists pontuacoes_event_user_idx on pontuacoes (event_id, user_id);

alter table configuracoes_gamificacao add column if not exists event_id int references events(id);
update configuracoes_gamificacao set event_id = 1 where event_id is null;
create unique index if not exists configuracoes_gamificacao_event_key
  on configuracoes_gamificacao (event_id);

alter table logs_auditoria add column if not exists event_id int references events(id);
update logs_auditoria set event_id = 1 where event_id is null;
alter table logs_auditoria alter column event_id set default public.evento_atual_id();

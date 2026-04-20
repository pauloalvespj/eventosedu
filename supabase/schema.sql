-- ============================================================
-- ENAUDIN — Schema Supabase (PostgreSQL)
-- Execute no SQL Editor do Supabase Cloud ou via psql na VPS
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
-- Unifica participantes, palestrantes e admins.
-- PK = auth.users.id (UUID do Supabase Auth)
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('super_admin','admin','credenciador','palestrante','participante')),
  nome          text not null,
  email         text not null,
  cpf           text,
  instituicao   text,
  cargo         text,
  titulo        text,
  area          text,
  mini_bio      text,
  foto_iniciais text,
  sexo          text,
  credenciado   boolean not null default false,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── EVENTOS ──────────────────────────────────────────────────
create table if not exists events (
  id                  serial primary key,
  nome                text not null,
  nome_completo       text,
  subtitulo           text,
  data_inicio         date not null,
  data_fim            date not null,
  horario_encerramento text,
  local               text,
  endereco            text,
  descricao           text,
  realizacao          text,
  banner_cor          text default '#0f3460',
  percentual_minimo   int not null default 75,
  carga_horaria_total int not null default 16
);

-- ── ATIVIDADES ────────────────────────────────────────────────
create table if not exists atividades (
  id               serial primary key,
  event_id         int references events(id) on delete cascade,
  dia              date not null,
  horario          text not null,
  horario_fim      text,
  tipo             text not null,
  titulo           text not null,
  descricao        text,
  palestrante_id   uuid references profiles(id) on delete set null,
  palestrantes_ids uuid[] not null default '{}',
  convidados       text,
  local            text,
  carga_horaria    numeric not null default 0,
  conta_certificado boolean not null default true
);

-- ── PRESENÇAS ────────────────────────────────────────────────
create table if not exists presencas (
  id             bigserial primary key,
  participante_id uuid not null references profiles(id) on delete cascade,
  atividade_id   int not null references atividades(id) on delete cascade,
  data_hora      timestamptz not null default now(),
  unique(participante_id, atividade_id)
);

-- ── AVALIAÇÕES ───────────────────────────────────────────────
create table if not exists avaliacoes (
  id           bigserial primary key,
  user_id      uuid not null references profiles(id) on delete cascade,
  atividade_id int not null references atividades(id) on delete cascade,
  nota         int not null check (nota between 1 and 5),
  comentario   text,
  created_at   timestamptz not null default now(),
  unique(user_id, atividade_id)
);

-- ── FÓRUM CONFIG ─────────────────────────────────────────────
create table if not exists forum_config (
  id          serial primary key,
  event_id    int references events(id) on delete cascade,
  ativo       boolean not null default true,
  data_inicio timestamptz not null,
  data_fim    timestamptz not null
);

-- ── TÓPICOS DO FÓRUM ─────────────────────────────────────────
create table if not exists topicos (
  id         bigserial primary key,
  event_id   int references events(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  categoria  text not null,
  titulo     text not null,
  corpo      text not null,
  curtidas   uuid[] not null default '{}',
  fixado     boolean not null default false,
  bloqueado  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── RESPOSTAS DO FÓRUM ───────────────────────────────────────
create table if not exists respostas (
  id         bigserial primary key,
  topico_id  bigint not null references topicos(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  corpo      text not null,
  curtidas   uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ── PONTUAÇÕES (GAMIFICAÇÃO) ──────────────────────────────────
create table if not exists pontuacoes (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  tipo       text not null,
  valor      int not null,
  descricao  text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles    enable row level security;
alter table events      enable row level security;
alter table atividades  enable row level security;
alter table presencas   enable row level security;
alter table avaliacoes  enable row level security;
alter table forum_config enable row level security;
alter table topicos     enable row level security;
alter table respostas   enable row level security;
alter table pontuacoes  enable row level security;

-- ── Helper: role do usuário logado ───────────────────────────
create or replace function current_user_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- ── profiles ─────────────────────────────────────────────────
create policy "Qualquer autenticado lê profiles"
  on profiles for select to authenticated using (true);

create policy "Usuário edita próprio perfil"
  on profiles for update to authenticated
  using (id = auth.uid());

create policy "Admin gerencia profiles"
  on profiles for all to authenticated
  using (current_user_role() in ('super_admin','admin'));

-- ── events ───────────────────────────────────────────────────
create policy "Público lê eventos"
  on events for select using (true);

create policy "Admin gerencia eventos"
  on events for all to authenticated
  using (current_user_role() in ('super_admin','admin'));

-- ── atividades ───────────────────────────────────────────────
create policy "Público lê atividades"
  on atividades for select using (true);

create policy "Admin gerencia atividades"
  on atividades for all to authenticated
  using (current_user_role() in ('super_admin','admin'));

-- ── presencas ────────────────────────────────────────────────
create policy "Autenticado lê presenças"
  on presencas for select to authenticated using (true);

create policy "Participante registra própria presença"
  on presencas for insert to authenticated
  with check (participante_id = auth.uid());

create policy "Admin/credenciador registra presenças"
  on presencas for insert to authenticated
  with check (current_user_role() in ('super_admin','admin','credenciador'));

create policy "Admin remove presenças"
  on presencas for delete to authenticated
  using (current_user_role() in ('super_admin','admin'));

-- ── avaliacoes ───────────────────────────────────────────────
create policy "Autenticado lê avaliações"
  on avaliacoes for select to authenticated using (true);

create policy "Usuário salva própria avaliação"
  on avaliacoes for insert to authenticated
  with check (user_id = auth.uid());

create policy "Usuário atualiza própria avaliação"
  on avaliacoes for update to authenticated
  using (user_id = auth.uid());

-- ── forum_config ─────────────────────────────────────────────
create policy "Público lê forum_config"
  on forum_config for select using (true);

create policy "Admin gerencia forum_config"
  on forum_config for all to authenticated
  using (current_user_role() in ('super_admin','admin'));

-- ── topicos ──────────────────────────────────────────────────
create policy "Autenticado lê tópicos"
  on topicos for select to authenticated using (true);

create policy "Autenticado cria tópico"
  on topicos for insert to authenticated
  with check (user_id = auth.uid());

create policy "Autor edita próprio tópico"
  on topicos for update to authenticated
  using (user_id = auth.uid() or current_user_role() in ('super_admin','admin'));

create policy "Admin remove tópico"
  on topicos for delete to authenticated
  using (current_user_role() in ('super_admin','admin'));

-- ── respostas ────────────────────────────────────────────────
create policy "Autenticado lê respostas"
  on respostas for select to authenticated using (true);

create policy "Autenticado cria resposta"
  on respostas for insert to authenticated
  with check (user_id = auth.uid());

create policy "Autor/admin edita resposta"
  on respostas for update to authenticated
  using (user_id = auth.uid() or current_user_role() in ('super_admin','admin'));

create policy "Admin remove resposta"
  on respostas for delete to authenticated
  using (current_user_role() in ('super_admin','admin'));

-- ── pontuacoes ───────────────────────────────────────────────
create policy "Autenticado lê pontuações"
  on pontuacoes for select to authenticated using (true);

create policy "Sistema insere pontuação"
  on pontuacoes for insert to authenticated
  with check (user_id = auth.uid() or current_user_role() in ('super_admin','admin'));

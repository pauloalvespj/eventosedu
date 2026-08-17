-- ============================================================
-- ENAUDIN — Schema Supabase (PostgreSQL)
--
-- ATENÇÃO: este arquivo é um retrato INICIAL e está DESATUALIZADO
-- em relação ao banco de produção. Objetos criados depois
-- (event_enrollments, convidados_prospeccao, atividade_qr_tokens,
-- profiles_rede, verificar_cadastro, triggers de pontuação e de
-- proteção de profiles, etc.) vivem em supabase/migrations/ ou
-- foram aplicados via SQL Editor. A fonte da verdade é o banco;
-- para reconstruí-lo use `supabase db dump` / `supabase db pull`
-- (requer Docker), não este arquivo.
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ── INSTITUIÇÕES ─────────────────────────────────────────────
create table if not exists instituicoes (
  id          serial primary key,
  sigla       text not null,
  nome        text not null,
  ativo       boolean not null default true,
  realizadora boolean not null default false,
  ordem       integer,
  logo_url    text
);

-- Migração (rodar se a tabela já existir):
-- alter table instituicoes add column if not exists realizadora boolean not null default false;
-- alter table instituicoes add column if not exists ordem integer;
-- alter table instituicoes add column if not exists logo_url text;

-- ── PROFILES ─────────────────────────────────────────────────
-- Unifica participantes, palestrantes e admins.
-- PK = auth.users.id (UUID do Supabase Auth)
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('admin', 'participante')),
  nome          text not null,
  email         text not null,
  cpf           text,
  instituicao   text,
  cargo         text,
  titulo        text,
  area          text,
  mini_bio      text,
  foto_iniciais text,
  foto_url      text,
  sexo          text,
  is_palestrante   boolean not null default false,
  is_credenciador  boolean not null default false,
  credenciado   boolean not null default false,
  credenciado_em timestamptz,
  destaque      boolean not null default false,
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
  carga_horaria_total int not null default 16,
  programacao_visivel     boolean not null default true,
  palestrantes_visivel    boolean not null default true,
  forum_ativo             boolean not null default true,
  gamificacao_ativa       boolean not null default true,
  certificado_disponivel  boolean not null default false,
  rede_visivel            boolean not null default true,
  logo_url                text,
  palestrantes_subtitulo  text,
  modo_frequencia         text not null default 'palestra' check (modo_frequencia in ('palestra', 'turno'))
);

-- ── CONFIGURAÇÕES DE GAMIFICAÇÃO ─────────────────────────────
create table if not exists configuracoes_gamificacao (
  id                serial primary key,
  presenca          int not null default 10,
  avaliacao         int not null default 5,
  topico            int not null default 15,
  resposta          int not null default 8,
  curtida_recebida  int not null default 3,
  primeiro_dia      int not null default 5,
  topico_destaque   int not null default 20,
  seguir            int not null default 5
);

-- ── FOLLOWS ───────────────────────────────────────────────────
create table if not exists follows (
  id           bigserial primary key,
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  criado_em    timestamptz not null default now(),
  unique(follower_id, following_id)
);
alter table follows enable row level security;
create policy "Público lê follows" on follows for select using (true);
create policy "Usuário gerencia próprios follows" on follows for all to authenticated
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());
alter table configuracoes_gamificacao enable row level security;
create policy "Público lê gamificação" on configuracoes_gamificacao for select using (true);
create policy "Admin gerencia gamificação" on configuracoes_gamificacao for all to authenticated
  using (current_user_role() = 'admin');

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
  palestrantes_ids uuid[] not null default '{}',
  convidados       text,
  local            text,
  carga_horaria    numeric not null default 0,
  conta_certificado boolean not null default true,
  materiais        jsonb not null default '[]'::jsonb
);

-- ── STORAGE BUCKET: avatares ─────────────────────────────────
-- insert into storage.buckets (id, name, public) values ('avatares', 'avatares', true) on conflict do nothing;

create policy "Público lê avatares"
  on storage.objects for select using (bucket_id = 'avatares');

create policy "Usuário envia próprio avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatares');

create policy "Usuário atualiza próprio avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatares');

-- ── STORAGE BUCKET: materiais ─────────────────────────────────
-- Execute via Supabase Dashboard → Storage → New Bucket: "materiais" (public)
-- Ou via SQL (Supabase storage API):
-- insert into storage.buckets (id, name, public) values ('materiais', 'materiais', true) on conflict do nothing;

-- Políticas RLS do bucket materiais (rodar no SQL Editor):
create policy "Público lê materiais"
  on storage.objects for select
  using (bucket_id = 'materiais');

create policy "Admin upload materiais"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'materiais'
    and current_user_role() = 'admin'
  );

create policy "Admin deleta materiais"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'materiais'
    and current_user_role() = 'admin'
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

alter table instituicoes enable row level security;
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

create or replace function user_is_credenciador()
returns boolean language sql stable security definer as $$
  select coalesce(is_credenciador, false) from profiles where id = auth.uid()
$$;

-- ── instituicoes ─────────────────────────────────────────────
create policy "Público lê instituições"
  on instituicoes for select using (true);

create policy "Admin gerencia instituições"
  on instituicoes for all to authenticated
  using (current_user_role() = 'admin');

-- ── profiles ─────────────────────────────────────────────────
create policy "Qualquer autenticado lê profiles"
  on profiles for select to authenticated using (true);

create policy "Usuário edita próprio perfil"
  on profiles for update to authenticated
  using (id = auth.uid());

create policy "Admin gerencia profiles"
  on profiles for all to authenticated
  using (current_user_role() = 'admin');

-- ── events ───────────────────────────────────────────────────
create policy "Público lê eventos"
  on events for select using (true);

create policy "Admin gerencia eventos"
  on events for all to authenticated
  using (current_user_role() = 'admin');

-- ── atividades ───────────────────────────────────────────────
create policy "Público lê atividades"
  on atividades for select using (true);

create policy "Admin gerencia atividades"
  on atividades for all to authenticated
  using (current_user_role() = 'admin');

-- ── presencas ────────────────────────────────────────────────
create policy "Autenticado lê presenças"
  on presencas for select to authenticated using (true);

create policy "Participante registra própria presença"
  on presencas for insert to authenticated
  with check (participante_id = auth.uid());

create policy "Admin/credenciador registra presenças"
  on presencas for insert to authenticated
  with check (current_user_role() = 'admin' or user_is_credenciador());

create policy "Admin remove presenças"
  on presencas for delete to authenticated
  using (current_user_role() = 'admin');

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
  using (current_user_role() = 'admin');

-- ── topicos ──────────────────────────────────────────────────
create policy "Autenticado lê tópicos"
  on topicos for select to authenticated using (true);

create policy "Autenticado cria tópico"
  on topicos for insert to authenticated
  with check (user_id = auth.uid());

create policy "Autor edita próprio tópico"
  on topicos for update to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin');

create policy "Admin remove tópico"
  on topicos for delete to authenticated
  using (current_user_role() = 'admin');

-- ── respostas ────────────────────────────────────────────────
create policy "Autenticado lê respostas"
  on respostas for select to authenticated using (true);

create policy "Autenticado cria resposta"
  on respostas for insert to authenticated
  with check (user_id = auth.uid());

create policy "Autor/admin edita resposta"
  on respostas for update to authenticated
  using (user_id = auth.uid() or current_user_role() = 'admin');

create policy "Admin remove resposta"
  on respostas for delete to authenticated
  using (current_user_role() = 'admin');

-- ── pontuacoes ───────────────────────────────────────────────
create policy "Autenticado lê pontuações"
  on pontuacoes for select to authenticated using (true);

create policy "Sistema insere pontuação"
  on pontuacoes for insert to authenticated
  with check (user_id = auth.uid() or current_user_role() = 'admin');

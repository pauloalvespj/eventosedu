-- ── PERGUNTAS AO VIVO (estilo Wooclap) ───────────────────────
-- Pergunta de múltipla escolha que o admin abre durante o evento;
-- participantes respondem pelo app e um telão (tela do admin) mostra
-- o gráfico de barras atualizando em tempo real via Supabase Realtime.
-- Resposta é única por pergunta/participante (sem trocar depois —
-- mantém o modelo simples e evita precisar de REPLICA IDENTITY FULL
-- pra recalcular contagens em UPDATE).

create table if not exists public.live_perguntas (
  id        serial primary key,
  event_id  int references public.events(id) on delete cascade,
  texto     text not null,
  opcoes    text[] not null default '{}',
  status    text not null default 'rascunho' check (status in ('rascunho', 'aberta', 'encerrada')),
  criado_em timestamptz not null default now()
);
alter table public.live_perguntas enable row level security;

create policy "Autenticado lê perguntas ao vivo"
  on public.live_perguntas for select to authenticated using (true);

create policy "Admin gerencia perguntas ao vivo"
  on public.live_perguntas for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create table if not exists public.live_respostas (
  id              bigserial primary key,
  pergunta_id     int not null references public.live_perguntas(id) on delete cascade,
  participante_id uuid not null references public.profiles(id) on delete cascade,
  opcao           text not null,
  created_at      timestamptz not null default now(),
  unique(pergunta_id, participante_id)
);
alter table public.live_respostas enable row level security;

create policy "Admin lê todas as respostas ao vivo, participante lê a própria"
  on public.live_respostas for select to authenticated
  using (current_user_role() = 'admin' or participante_id = auth.uid());

create policy "Participante responde uma vez"
  on public.live_respostas for insert to authenticated
  with check (participante_id = auth.uid());

-- Realtime — telão e tela de resposta assinam essas tabelas
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_perguntas'
  ) then
    alter publication supabase_realtime add table public.live_perguntas;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_respostas'
  ) then
    alter publication supabase_realtime add table public.live_respostas;
  end if;
end $$;

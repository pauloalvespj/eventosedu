-- ── PESQUISA DE SATISFAÇÃO ────────────────────────────────────
-- Uma pesquisa por evento. Perguntas fechadas (lista de opções definida
-- pelo admin — cobre nota/múltipla escolha/sim-não com um único modelo)
-- ou abertas (texto livre). Respostas 1 por pergunta por participante
-- (upsert, mesmo padrão de avaliacoes).

alter table events add column if not exists pesquisa_ativa boolean not null default false;
alter table events add column if not exists pesquisa_intro text;
alter table events add column if not exists pesquisa_template jsonb not null default '{}'::jsonb;

create table if not exists public.pesquisa_perguntas (
  id          serial primary key,
  event_id    int references public.events(id) on delete cascade,
  ordem       int not null default 0,
  tipo        text not null default 'fechada' check (tipo in ('fechada', 'aberta')),
  texto       text not null,
  opcoes      text[] not null default '{}',
  obrigatoria boolean not null default true
);
alter table public.pesquisa_perguntas enable row level security;

create policy "Público lê perguntas da pesquisa"
  on public.pesquisa_perguntas for select using (true);

create policy "Admin gerencia perguntas da pesquisa"
  on public.pesquisa_perguntas for all to authenticated
  using (current_user_role() in ('admin', 'super_admin'))
  with check (current_user_role() in ('admin', 'super_admin'));

create table if not exists public.pesquisa_respostas (
  id              bigserial primary key,
  pergunta_id     int not null references public.pesquisa_perguntas(id) on delete cascade,
  participante_id uuid not null references public.profiles(id) on delete cascade,
  resposta_opcao  text,
  resposta_texto  text,
  created_at      timestamptz not null default now(),
  unique(pergunta_id, participante_id)
);
alter table public.pesquisa_respostas enable row level security;

create policy "Vê própria resposta ou admin vê todas"
  on public.pesquisa_respostas for select to authenticated
  using (participante_id = auth.uid() or current_user_role() in ('admin', 'super_admin'));

create policy "Participante insere própria resposta"
  on public.pesquisa_respostas for insert to authenticated
  with check (participante_id = auth.uid());

create policy "Participante atualiza própria resposta"
  on public.pesquisa_respostas for update to authenticated
  using (participante_id = auth.uid())
  with check (participante_id = auth.uid());

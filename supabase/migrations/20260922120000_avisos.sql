-- ── AVISOS (notificações do painel do participante) ────────────
-- Mensagens que o admin cadastra e que aparecem fixas no topo da área do
-- participante enquanto estiverem ativas e dentro do período de vigência
-- (data_inicio/data_fim, ambas opcionais — nulo = sem limite naquele lado).
-- tipo define a cor do banner: 'danger' (vermelho), 'alerta' (amarelo) ou
-- 'sucesso' (verde).

create table if not exists public.avisos (
  id         serial primary key,
  event_id   int references public.events(id) on delete cascade,
  mensagem   text not null,
  tipo       text not null default 'alerta' check (tipo in ('danger', 'alerta', 'sucesso')),
  data_inicio date,
  data_fim    date,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);
alter table public.avisos enable row level security;

create policy "Público lê avisos ativos vigentes"
  on public.avisos for select
  using (
    ativo = true
    and (data_inicio is null or data_inicio <= current_date)
    and (data_fim is null or data_fim >= current_date)
  );

create policy "Admin gerencia avisos"
  on public.avisos for all to authenticated
  using (current_user_role() in ('admin', 'super_admin'))
  with check (current_user_role() in ('admin', 'super_admin'));

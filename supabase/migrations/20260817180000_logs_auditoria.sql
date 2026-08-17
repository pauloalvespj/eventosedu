-- ── LOGS DE AUDITORIA ─────────────────────────────────────────
-- Registro de ações administrativas sensíveis: exclusões (participante,
-- atividade, turno), mudanças de configuração do evento, criação/edição
-- de admin/credenciador e liberação de certificados. O admin consulta
-- em Painel → Logs quem fez o quê.
--
-- Todo insert passa pela RPC registrar_log (security definer), que
-- carimba o autor a partir do JWT (não confia em nada vindo do cliente)
-- e silenciosamente não registra nada se quem chamou não for
-- admin/credenciador — evita poluição de log por qualquer usuário.

create table if not exists public.logs_auditoria (
  id         bigserial primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  actor_nome text,
  acao       text not null,
  alvo_tipo  text,
  alvo_id    text,
  alvo_nome  text,
  detalhes   jsonb not null default '{}'::jsonb,
  criado_em  timestamptz not null default now()
);
alter table public.logs_auditoria enable row level security;

create policy "Admin lê logs de auditoria"
  on public.logs_auditoria for select to authenticated
  using (current_user_role() in ('admin', 'super_admin'));

create or replace function public.registrar_log(
  p_acao      text,
  p_alvo_tipo text default null,
  p_alvo_id   text default null,
  p_alvo_nome text default null,
  p_detalhes  jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
  v_cred boolean;
  v_nome text;
begin
  if v_uid is null then
    return;
  end if;
  select role, coalesce(is_credenciador, false), nome into v_role, v_cred, v_nome
    from profiles where id = v_uid;
  if v_role not in ('admin', 'super_admin') and not v_cred then
    return;
  end if;
  insert into logs_auditoria (actor_id, actor_nome, acao, alvo_tipo, alvo_id, alvo_nome, detalhes)
  values (v_uid, v_nome, p_acao, p_alvo_tipo, p_alvo_id, p_alvo_nome, coalesce(p_detalhes, '{}'::jsonb));
end;
$$;

grant execute on function public.registrar_log(text, text, text, text, jsonb) to authenticated;

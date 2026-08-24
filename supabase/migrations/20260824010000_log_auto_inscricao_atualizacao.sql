-- Log automático (via trigger em profiles) de auto-inscrição e
-- auto-atualização de cadastro pelo próprio participante.
--
-- registrar_log (RPC) só aceita chamadas de admin/credenciador — não serve
-- pra logar a ação de um participante comum sobre o próprio cadastro. Por
-- isso aqui é um trigger direto na tabela, que roda com privilégio total
-- e não depende de nada vindo do cliente: só loga quando quem fez a
-- alteração é o dono da própria linha (auth.uid() = id do profile) — ações
-- de admin/credenciador sobre outro perfil já têm seu log explícito no
-- cliente (usuario.criar / usuario.editar_role) e não duplicam aqui.
create or replace function public.log_auto_cadastro()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> new.id then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into logs_auditoria (actor_id, actor_nome, acao, alvo_tipo, alvo_id, alvo_nome)
    values (new.id, new.nome, 'participante.inscrever_se', 'participante', new.id::text, new.nome);
  else
    insert into logs_auditoria (actor_id, actor_nome, acao, alvo_tipo, alvo_id, alvo_nome)
    values (new.id, new.nome, 'participante.atualizar_cadastro', 'participante', new.id::text, new.nome);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_auto_cadastro_ins on public.profiles;
create trigger trg_log_auto_cadastro_ins
  after insert on public.profiles
  for each row execute function public.log_auto_cadastro();

drop trigger if exists trg_log_auto_cadastro_upd on public.profiles;
create trigger trg_log_auto_cadastro_upd
  after update on public.profiles
  for each row execute function public.log_auto_cadastro();

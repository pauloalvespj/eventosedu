-- ============================================================
-- ENAUDIN — Segurança e integridade
--  1. Profiles: campos administrativos protegidos (role, flags)
--  2. Gamificação: pontuação concedida por triggers no servidor
--  3. Curtidas do fórum via RPC (funciona para não-autores)
--  4. Presença via QR: token por atividade validado no servidor
--     (corrige o fluxo anônimo por CPF, que era bloqueado por RLS)
--  5. Privacidade: CPF/e-mail deixam de ser visíveis a qualquer
--     autenticado; rede/ranking usam a view profiles_rede
--  6. verificar_cadastro passa a retornar is_palestrante
--  7. Bucket certificados restrito a admin
-- ============================================================

-- ── 1. PROFILES: proteção de campos administrativos ──────────

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
  new.role            := old.role;
  new.roles           := old.roles;
  new.is_palestrante  := old.is_palestrante;
  new.is_credenciador := old.is_credenciador;
  new.destaque        := old.destaque;
  -- Credenciamento: admin ou credenciador
  if not v_cred then
    new.credenciado    := old.credenciado;
    new.credenciado_em := old.credenciado_em;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_update on public.profiles;
create trigger trg_protect_profile_update
  before update on public.profiles
  for each row execute function public.protect_profile_update();

create or replace function public.protect_profile_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
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
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_insert on public.profiles;
create trigger trg_protect_profile_insert
  before insert on public.profiles
  for each row execute function public.protect_profile_insert();

-- Política de update duplicada e sem with_check — fica só a canônica
drop policy if exists "Users can update own profile" on public.profiles;

-- ── 2. GAMIFICAÇÃO: pontos concedidos pelo servidor ──────────

create or replace function public.award_points(p_user uuid, p_tipo text, p_desc text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_valor int;
begin
  select case p_tipo
    when 'presenca'         then presenca
    when 'avaliacao'        then avaliacao
    when 'topico'           then topico
    when 'resposta'         then resposta
    when 'curtida_recebida' then curtida_recebida
    when 'primeiro_dia'     then primeiro_dia
    when 'topico_destaque'  then topico_destaque
    when 'seguir'           then seguir
    else 0 end
  into v_valor
  from configuracoes_gamificacao
  limit 1;

  if coalesce(v_valor, 0) > 0 then
    insert into pontuacoes (user_id, tipo, valor, descricao)
    values (p_user, p_tipo, v_valor, p_desc);
  end if;
end;
$$;

-- Remove a pontuação mais recente do tipo (usada quando a ação é desfeita)
create or replace function public.remove_points(p_user uuid, p_tipo text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from pontuacoes
  where id = (
    select id from pontuacoes
    where user_id = p_user and tipo = p_tipo
    order by created_at desc
    limit 1
  );
end;
$$;

-- Presença
create or replace function public.trg_pontos_presenca()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform award_points(new.participante_id, 'presenca', 'Presença confirmada');
    return new;
  else
    perform remove_points(old.participante_id, 'presenca');
    return old;
  end if;
end;
$$;
drop trigger if exists trg_pontos_presenca_ins on public.presencas;
drop trigger if exists trg_pontos_presenca_del on public.presencas;
create trigger trg_pontos_presenca_ins after insert on public.presencas
  for each row execute function public.trg_pontos_presenca();
create trigger trg_pontos_presenca_del after delete on public.presencas
  for each row execute function public.trg_pontos_presenca();

-- Tópicos do fórum
create or replace function public.trg_pontos_topico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform award_points(new.user_id, 'topico', 'Tópico criado no fórum');
    return new;
  else
    perform remove_points(old.user_id, 'topico');
    return old;
  end if;
end;
$$;
drop trigger if exists trg_pontos_topico_ins on public.topicos;
drop trigger if exists trg_pontos_topico_del on public.topicos;
create trigger trg_pontos_topico_ins after insert on public.topicos
  for each row execute function public.trg_pontos_topico();
create trigger trg_pontos_topico_del after delete on public.topicos
  for each row execute function public.trg_pontos_topico();

-- Respostas do fórum
create or replace function public.trg_pontos_resposta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform award_points(new.user_id, 'resposta', 'Resposta no fórum');
    return new;
  else
    perform remove_points(old.user_id, 'resposta');
    return old;
  end if;
end;
$$;
drop trigger if exists trg_pontos_resposta_ins on public.respostas;
drop trigger if exists trg_pontos_resposta_del on public.respostas;
create trigger trg_pontos_resposta_ins after insert on public.respostas
  for each row execute function public.trg_pontos_resposta();
create trigger trg_pontos_resposta_del after delete on public.respostas
  for each row execute function public.trg_pontos_resposta();

-- Seguir (com estorno no unfollow — evita farm de pontos)
create or replace function public.trg_pontos_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform award_points(new.follower_id, 'seguir', 'Seguiu um participante');
    return new;
  else
    perform remove_points(old.follower_id, 'seguir');
    return old;
  end if;
end;
$$;
drop trigger if exists trg_pontos_follow_ins on public.follows;
drop trigger if exists trg_pontos_follow_del on public.follows;
create trigger trg_pontos_follow_ins after insert on public.follows
  for each row execute function public.trg_pontos_follow();
create trigger trg_pontos_follow_del after delete on public.follows
  for each row execute function public.trg_pontos_follow();

-- Avaliação (só na primeira avaliação — update não repontua)
create or replace function public.trg_pontos_avaliacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform award_points(new.user_id, 'avaliacao', 'Avaliação de palestra');
  return new;
end;
$$;
drop trigger if exists trg_pontos_avaliacao_ins on public.avaliacoes;
create trigger trg_pontos_avaliacao_ins after insert on public.avaliacoes
  for each row execute function public.trg_pontos_avaliacao();

-- Cliente não insere mais pontos; admin mantém gestão manual
drop policy if exists "Sistema insere pontuação" on public.pontuacoes;
drop policy if exists "Admin gerencia pontuações" on public.pontuacoes;
create policy "Admin gerencia pontuações"
  on public.pontuacoes for all to authenticated
  using (current_user_role() in ('admin', 'super_admin'))
  with check (current_user_role() in ('admin', 'super_admin'));

-- ── 3. CURTIDAS VIA RPC ───────────────────────────────────────

create or replace function public.curtir_topico(p_topico_id bigint)
returns uuid[]
language plpgsql security definer set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_curtidas uuid[];
  v_autor    uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  select curtidas, user_id into v_curtidas, v_autor
    from topicos where id = p_topico_id for update;
  if not found then
    raise exception 'Tópico não encontrado';
  end if;
  if v_uid = any(v_curtidas) then
    v_curtidas := array_remove(v_curtidas, v_uid);
    if v_autor <> v_uid then perform remove_points(v_autor, 'curtida_recebida'); end if;
  else
    v_curtidas := v_curtidas || v_uid;
    if v_autor <> v_uid then perform award_points(v_autor, 'curtida_recebida', 'Curtida recebida'); end if;
  end if;
  update topicos set curtidas = v_curtidas where id = p_topico_id;
  return v_curtidas;
end;
$$;

create or replace function public.curtir_resposta(p_resposta_id bigint)
returns uuid[]
language plpgsql security definer set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_curtidas uuid[];
  v_autor    uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  select curtidas, user_id into v_curtidas, v_autor
    from respostas where id = p_resposta_id for update;
  if not found then
    raise exception 'Resposta não encontrada';
  end if;
  if v_uid = any(v_curtidas) then
    v_curtidas := array_remove(v_curtidas, v_uid);
    if v_autor <> v_uid then perform remove_points(v_autor, 'curtida_recebida'); end if;
  else
    v_curtidas := v_curtidas || v_uid;
    if v_autor <> v_uid then perform award_points(v_autor, 'curtida_recebida', 'Curtida recebida'); end if;
  end if;
  update respostas set curtidas = v_curtidas where id = p_resposta_id;
  return v_curtidas;
end;
$$;

revoke execute on function public.curtir_topico(bigint) from public, anon;
revoke execute on function public.curtir_resposta(bigint) from public, anon;
grant execute on function public.curtir_topico(bigint) to authenticated;
grant execute on function public.curtir_resposta(bigint) to authenticated;

-- ── 4. PRESENÇA VIA QR COM TOKEN NO SERVIDOR ─────────────────

create table if not exists public.atividade_qr_tokens (
  atividade_id int primary key references public.atividades(id) on delete cascade,
  token        text not null default replace(gen_random_uuid()::text, '-', '')
);
alter table public.atividade_qr_tokens enable row level security;

-- Quem exibe o QR: admin, credenciador e palestrantes da atividade
drop policy if exists "Equipe lê tokens de QR" on public.atividade_qr_tokens;
create policy "Equipe lê tokens de QR"
  on public.atividade_qr_tokens for select to authenticated
  using (
    current_user_role() in ('admin', 'super_admin')
    or user_is_credenciador()
    or exists (
      select 1 from atividades a
      where a.id = atividade_id and auth.uid() = any(a.palestrantes_ids)
    )
  );

-- Token para atividades existentes e futuras
insert into public.atividade_qr_tokens (atividade_id)
select id from public.atividades
on conflict (atividade_id) do nothing;

create or replace function public.trg_criar_qr_token()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into atividade_qr_tokens (atividade_id) values (new.id)
  on conflict (atividade_id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_criar_qr_token on public.atividades;
create trigger trg_criar_qr_token after insert on public.atividades
  for each row execute function public.trg_criar_qr_token();

-- Registro de presença: valida token no servidor; aceita usuário
-- logado (auth.uid) ou CPF (fluxo anônimo do QR, antes quebrado)
create or replace function public.registrar_presenca_qr(
  p_atividade_id int,
  p_token        text,
  p_cpf          text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_token    text;
  v_cpf_norm text;
  v_id       uuid;
  v_nome     text;
begin
  select token into v_token from atividade_qr_tokens where atividade_id = p_atividade_id;
  if v_token is null or v_token <> coalesce(p_token, '') then
    return jsonb_build_object('status', 'token_invalido');
  end if;

  if p_cpf is not null and trim(p_cpf) <> '' then
    v_cpf_norm := regexp_replace(p_cpf, '\D', '', 'g');
    if length(v_cpf_norm) <> 11 then
      return jsonb_build_object('status', 'nao_encontrado');
    end if;
    select id, nome into v_id, v_nome
      from profiles
      where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = v_cpf_norm
        and ativo
      limit 1;
  elsif v_uid is not null then
    select id, nome into v_id, v_nome from profiles where id = v_uid;
  end if;

  if v_id is null then
    return jsonb_build_object('status', 'nao_encontrado');
  end if;

  begin
    insert into presencas (participante_id, atividade_id) values (v_id, p_atividade_id);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicado', 'nome', v_nome, 'participante_id', v_id);
  end;

  return jsonb_build_object('status', 'sucesso', 'nome', v_nome, 'participante_id', v_id);
end;
$$;

grant execute on function public.registrar_presenca_qr(int, text, text) to anon, authenticated;

-- Todo check-in de participante passa a exigir o token do QR (via RPC)
drop policy if exists "Participante registra própria presença" on public.presencas;

-- ── 5. PRIVACIDADE: CPF/e-mail restritos ─────────────────────

-- View sem dados pessoais para rede, ranking e fórum
create or replace view public.profiles_rede as
  select id, nome, instituicao, cargo, mini_bio, foto_iniciais, foto_url,
         role, is_palestrante, destaque, ativo, created_at
  from public.profiles;

revoke all on public.profiles_rede from public, anon;
grant select on public.profiles_rede to authenticated;

-- Tabela completa: apenas admin/credenciador, o próprio usuário
-- e o recorte público de palestrantes (políticas que permanecem)
drop policy if exists "Qualquer autenticado lê profiles" on public.profiles;
drop policy if exists "Admin/credenciador lê todos os profiles" on public.profiles;
create policy "Admin/credenciador lê todos os profiles"
  on public.profiles for select to authenticated
  using (current_user_role() in ('admin', 'super_admin') or user_is_credenciador());

-- ── 6. verificar_cadastro com is_palestrante ─────────────────

create or replace function public.verificar_cadastro(p_email text, p_cpf text default '')
returns json
language sql security definer set search_path = public
as $$
  select row_to_json(t)
  from (
    select nome, role, cpf, instituicao, cargo, email, is_palestrante,
      case when lower(email) = lower(p_email) then 'email' else 'cpf' end as match_type
    from profiles
    where lower(email) = lower(p_email)
       or (p_cpf <> '' and cpf = p_cpf)
    limit 1
  ) t;
$$;

-- ── 7. BUCKET certificados: upload restrito a admin ──────────

drop policy if exists "certificados_admin_upload" on storage.objects;
create policy "certificados_admin_upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'certificados'
    and current_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "certificados_admin_update" on storage.objects;
create policy "certificados_admin_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'certificados'
    and current_user_role() in ('admin', 'super_admin')
  );

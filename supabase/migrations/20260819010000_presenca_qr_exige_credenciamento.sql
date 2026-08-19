-- Confirmação de presença via QR (atividade e turno) passa a exigir que o
-- participante já esteja credenciado no evento — evita presença de quem
-- ainda não passou pelo credenciamento presencial.

create or replace function public.registrar_presenca_qr(
  p_atividade_id int,
  p_token        text,
  p_cpf          text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_token       text;
  v_valor       text;
  v_cpf_norm    text;
  v_id          uuid;
  v_nome        text;
  v_credenciado boolean;
begin
  select token into v_token from atividade_qr_tokens where atividade_id = p_atividade_id;
  if v_token is null or v_token <> coalesce(p_token, '') then
    return jsonb_build_object('status', 'token_invalido');
  end if;

  v_valor := trim(coalesce(p_cpf, ''));
  if v_valor <> '' then
    if position('@' in v_valor) > 0 then
      select id, nome, credenciado into v_id, v_nome, v_credenciado
        from profiles
        where lower(email) = lower(v_valor)
          and ativo
        limit 1;
    else
      v_cpf_norm := regexp_replace(v_valor, '\D', '', 'g');
      if length(v_cpf_norm) <> 11 then
        return jsonb_build_object('status', 'nao_encontrado');
      end if;
      select id, nome, credenciado into v_id, v_nome, v_credenciado
        from profiles
        where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = v_cpf_norm
          and ativo
        limit 1;
    end if;
  elsif v_uid is not null then
    select id, nome, credenciado into v_id, v_nome, v_credenciado from profiles where id = v_uid;
  end if;

  if v_id is null then
    return jsonb_build_object('status', 'nao_encontrado');
  end if;

  if not coalesce(v_credenciado, false) then
    return jsonb_build_object('status', 'nao_credenciado', 'nome', v_nome);
  end if;

  begin
    insert into presencas (participante_id, atividade_id) values (v_id, p_atividade_id);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicado', 'nome', v_nome, 'participante_id', v_id);
  end;

  return jsonb_build_object('status', 'sucesso', 'nome', v_nome, 'participante_id', v_id);
end;
$$;

create or replace function public.registrar_presenca_turno_qr(
  p_turno_id int,
  p_token    text,
  p_cpf      text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_token       text;
  v_valor       text;
  v_cpf_norm    text;
  v_id          uuid;
  v_nome        text;
  v_credenciado boolean;
begin
  select token into v_token from turno_qr_tokens where turno_id = p_turno_id;
  if v_token is null or v_token <> coalesce(p_token, '') then
    return jsonb_build_object('status', 'token_invalido');
  end if;

  v_valor := trim(coalesce(p_cpf, ''));
  if v_valor <> '' then
    if position('@' in v_valor) > 0 then
      select id, nome, credenciado into v_id, v_nome, v_credenciado
        from profiles
        where lower(email) = lower(v_valor)
          and ativo
        limit 1;
    else
      v_cpf_norm := regexp_replace(v_valor, '\D', '', 'g');
      if length(v_cpf_norm) <> 11 then
        return jsonb_build_object('status', 'nao_encontrado');
      end if;
      select id, nome, credenciado into v_id, v_nome, v_credenciado
        from profiles
        where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = v_cpf_norm
          and ativo
        limit 1;
    end if;
  elsif v_uid is not null then
    select id, nome, credenciado into v_id, v_nome, v_credenciado from profiles where id = v_uid;
  end if;

  if v_id is null then
    return jsonb_build_object('status', 'nao_encontrado');
  end if;

  if not coalesce(v_credenciado, false) then
    return jsonb_build_object('status', 'nao_credenciado', 'nome', v_nome);
  end if;

  begin
    insert into presencas_turno (participante_id, turno_id) values (v_id, p_turno_id);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicado', 'nome', v_nome, 'participante_id', v_id);
  end;

  return jsonb_build_object('status', 'sucesso', 'nome', v_nome, 'participante_id', v_id);
end;
$$;

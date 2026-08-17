-- ── FREQUÊNCIA POR TURNO OU POR PALESTRA ─────────────────────
-- Permite configurar, por evento, se a frequência/certificado é
-- calculada por atividade individual (padrão, comportamento atual,
-- via presencas/atividades) ou por turno — um turno é uma entidade
-- independente das atividades (nome, dia, carga horária própria),
-- com seu próprio QR Code e sua própria tabela de presenças
-- (presencas_turno). Não há vínculo entre atividades e turnos: o
-- cálculo de frequência (calcPresenca no frontend) passa a somar
-- carga horária de turnos em vez de atividades quando o evento
-- estiver no modo "turno".

alter table events add column if not exists modo_frequencia text not null default 'palestra';
alter table events drop constraint if exists events_modo_frequencia_check;
alter table events add constraint events_modo_frequencia_check
  check (modo_frequencia in ('palestra', 'turno'));

-- ── TURNOS ────────────────────────────────────────────────────
create table if not exists public.turnos (
  id                 serial primary key,
  event_id           int references public.events(id) on delete cascade,
  dia                date not null,
  nome               text not null,
  horario_inicio     text,
  horario_fim        text,
  carga_horaria      numeric not null default 0,
  conta_certificado  boolean not null default true
);
alter table public.turnos enable row level security;

create policy "Público lê turnos"
  on public.turnos for select using (true);

create policy "Admin gerencia turnos"
  on public.turnos for all to authenticated
  using (current_user_role() in ('admin', 'super_admin'))
  with check (current_user_role() in ('admin', 'super_admin'));

-- ── PRESENÇAS DE TURNO ────────────────────────────────────────
create table if not exists public.presencas_turno (
  id               bigserial primary key,
  participante_id  uuid not null references public.profiles(id) on delete cascade,
  turno_id         int not null references public.turnos(id) on delete cascade,
  data_hora        timestamptz not null default now(),
  unique(participante_id, turno_id)
);
alter table public.presencas_turno enable row level security;

create policy "Autenticado lê presenças de turno"
  on public.presencas_turno for select to authenticated using (true);

create policy "Admin/credenciador registra presença de turno"
  on public.presencas_turno for insert to authenticated
  with check (current_user_role() in ('admin', 'super_admin') or user_is_credenciador());

create policy "Admin remove presença de turno"
  on public.presencas_turno for delete to authenticated
  using (current_user_role() in ('admin', 'super_admin'));

-- Mesmo gatilho de pontuação de presenças (só usa participante_id,
-- então serve para as duas tabelas sem precisar de função nova).
drop trigger if exists trg_pontos_presenca_turno_ins on public.presencas_turno;
drop trigger if exists trg_pontos_presenca_turno_del on public.presencas_turno;
create trigger trg_pontos_presenca_turno_ins after insert on public.presencas_turno
  for each row execute function public.trg_pontos_presenca();
create trigger trg_pontos_presenca_turno_del after delete on public.presencas_turno
  for each row execute function public.trg_pontos_presenca();

-- ── QR CODE DE TURNO (mesmo padrão de atividade_qr_tokens) ───
create table if not exists public.turno_qr_tokens (
  turno_id int primary key references public.turnos(id) on delete cascade,
  token    text not null default replace(gen_random_uuid()::text, '-', '')
);
alter table public.turno_qr_tokens enable row level security;

create policy "Equipe lê tokens de QR de turno"
  on public.turno_qr_tokens for select to authenticated
  using (current_user_role() in ('admin', 'super_admin') or user_is_credenciador());

insert into public.turno_qr_tokens (turno_id)
select id from public.turnos
on conflict (turno_id) do nothing;

create or replace function public.trg_criar_qr_token_turno()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into turno_qr_tokens (turno_id) values (new.id)
  on conflict (turno_id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_criar_qr_token_turno on public.turnos;
create trigger trg_criar_qr_token_turno after insert on public.turnos
  for each row execute function public.trg_criar_qr_token_turno();

-- Registro de presença via QR do turno: mesma validação de token e
-- resolução de participante (logado ou CPF) de registrar_presenca_qr,
-- só que grava em presencas_turno em vez de presencas.
create or replace function public.registrar_presenca_turno_qr(
  p_turno_id int,
  p_token    text,
  p_cpf      text default null
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
  select token into v_token from turno_qr_tokens where turno_id = p_turno_id;
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
    insert into presencas_turno (participante_id, turno_id) values (v_id, p_turno_id);
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicado', 'nome', v_nome, 'participante_id', v_id);
  end;

  return jsonb_build_object('status', 'sucesso', 'nome', v_nome, 'participante_id', v_id);
end;
$$;

grant execute on function public.registrar_presenca_turno_qr(int, text, text) to anon, authenticated;

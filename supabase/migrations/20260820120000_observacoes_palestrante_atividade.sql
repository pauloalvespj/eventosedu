-- ============================================================
-- ENAUDIN — Observações privadas do palestrante por atividade
--  1. Nova coluna atividades.observacoes_palestrantes (jsonb, mapa
--     palestrante_id -> texto) — cada palestrante só edita a própria chave.
--  2. RLS: palestrante da atividade passa a poder dar UPDATE nela
--     (hoje só admin conseguia — o upload de materiais pelo palestrante
--     também dependia disso e estava sendo barrado pelo RLS).
--  3. Trigger protege todas as colunas exceto materiais/observacoes
--     quando quem edita não é admin, no mesmo padrão já usado em profiles.
-- ============================================================

alter table public.atividades
  add column if not exists observacoes_palestrantes jsonb not null default '{}'::jsonb;

drop policy if exists "Palestrante atualiza sua atividade" on public.atividades;
create policy "Palestrante atualiza sua atividade"
  on public.atividades for update to authenticated
  using (auth.uid() = ANY(palestrantes_ids))
  with check (auth.uid() = ANY(palestrantes_ids));

create or replace function public.protect_atividade_update()
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
  -- Palestrante (via a policy de update acima): só pode mexer em
  -- materiais e observações — tudo o mais volta ao valor antigo.
  new.event_id           := old.event_id;
  new.dia                := old.dia;
  new.horario             := old.horario;
  new.horario_fim         := old.horario_fim;
  new.tipo                := old.tipo;
  new.titulo              := old.titulo;
  new.descricao           := old.descricao;
  new.palestrantes_ids    := old.palestrantes_ids;
  new.convidados          := old.convidados;
  new.local               := old.local;
  new.carga_horaria       := old.carga_horaria;
  new.conta_certificado   := old.conta_certificado;
  return new;
end;
$$;

drop trigger if exists trg_protect_atividade_update on public.atividades;
create trigger trg_protect_atividade_update
  before update on public.atividades
  for each row execute function public.protect_atividade_update();

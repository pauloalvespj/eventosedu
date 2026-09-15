-- ============================================================
-- ENAUDIN — Status da atividade (Agendada / Realizada)
--  1. Nova coluna atividades.status, default 'agendada'.
--  2. Quando 'realizada', a área do participante libera o download
--     dos materiais (PDF da apresentação etc.) daquela atividade.
--  3. Só admin pode alterar o status — adicionado à lista de colunas
--     protegidas em protect_atividade_update() (mesmo padrão da
--     migration de observacoes_palestrantes).
-- ============================================================

alter table public.atividades
  add column if not exists status text not null default 'agendada';

alter table public.atividades
  drop constraint if exists atividades_status_check;
alter table public.atividades
  add constraint atividades_status_check check (status in ('agendada', 'realizada'));

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
  new.status              := old.status;
  return new;
end;
$$;

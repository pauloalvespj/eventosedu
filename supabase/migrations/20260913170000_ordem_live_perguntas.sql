-- Permite reordenar as perguntas de um quiz no admin (antes só dava pra
-- ver na ordem de criação). Backfill: ordem sequencial por quiz seguindo a
-- data de criação; a partir daqui, perguntas novas entram automaticamente
-- no fim da lista do próprio quiz via trigger.
alter table public.live_perguntas add column if not exists ordem integer;

with numeradas as (
  select id, row_number() over (partition by quiz_id order by criado_em asc, id asc) as rn
  from public.live_perguntas
)
update public.live_perguntas p
set ordem = n.rn
from numeradas n
where p.id = n.id and p.ordem is null;

create or replace function public.trg_ordem_live_pergunta()
returns trigger language plpgsql as $$
begin
  if new.ordem is null then
    select coalesce(max(ordem), 0) + 1 into new.ordem
    from public.live_perguntas
    where quiz_id = new.quiz_id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_ordem_live_pergunta on public.live_perguntas;
create trigger trg_ordem_live_pergunta before insert on public.live_perguntas
  for each row execute function public.trg_ordem_live_pergunta();

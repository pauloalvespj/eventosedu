-- Correção de modelo: "Quiz" vira uma entidade própria — agrupa perguntas,
-- tem código de acesso, título e uma janela de validade (data_inicio/fim).
-- Antes o código e o "event_id" viviam em cada pergunta; agora pertencem ao
-- quiz, e cada pergunta referencia o quiz a que pertence.

create table if not exists public.live_quiz (
  id          serial primary key,
  event_id    int references public.events(id) on delete cascade,
  titulo      text not null default 'Quiz',
  codigo      text not null unique,
  data_inicio date,
  data_fim    date,
  criado_em   timestamptz not null default now()
);
alter table public.live_quiz enable row level security;

create policy "Público lê quizzes"
  on public.live_quiz for select using (true);

create policy "Admin gerencia quizzes"
  on public.live_quiz for all to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- Migra as perguntas já existentes pra dentro de um quiz "default" por evento
insert into public.live_quiz (event_id, titulo, codigo, data_inicio, data_fim)
select distinct event_id, 'Palestras AUDINS', lpad((floor(random() * 9000) + 1000)::text, 4, '0'), date '2026-09-17', date '2026-09-17'
from public.live_perguntas
where event_id is not null;

alter table public.live_perguntas add column if not exists quiz_id int references public.live_quiz(id) on delete cascade;

update public.live_perguntas p
set quiz_id = q.id
from public.live_quiz q
where p.event_id = q.event_id and p.quiz_id is null;

alter table public.live_perguntas alter column quiz_id set not null;

drop index if exists live_perguntas_uma_aberta_por_evento;
drop index if exists live_perguntas_event_codigo_key;
alter table public.live_perguntas drop column if exists event_id;
alter table public.live_perguntas drop column if exists codigo;

-- Só uma pergunta aberta por quiz (antes era por evento)
create unique index if not exists live_perguntas_uma_aberta_por_quiz
  on public.live_perguntas (quiz_id)
  where status = 'aberta';

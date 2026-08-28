-- Página pública /quiz — responder não exige login. Quem responde sem conta
-- usa um "anon_id" (UUID aleatório gerado no navegador e guardado no
-- localStorage) em vez de participante_id, só pra evitar voto duplicado
-- óbvio no mesmo aparelho/navegador. Sem PII nenhuma vinculada.

alter table public.live_respostas alter column participante_id drop not null;
alter table public.live_respostas add column if not exists anon_id text;
alter table public.live_respostas
  add constraint live_respostas_participante_ou_anon
  check (participante_id is not null or anon_id is not null);

create unique index if not exists live_respostas_pergunta_anon_key
  on public.live_respostas (pergunta_id, anon_id)
  where anon_id is not null;

-- Pergunta e opções passam a ser públicas (a página /quiz não tem sessão)
drop policy if exists "Autenticado lê perguntas ao vivo" on public.live_perguntas;
create policy "Público lê perguntas ao vivo"
  on public.live_perguntas for select using (true);

-- Resposta anônima: só grava com anon_id e sem participante_id
create policy "Anônimo lê respostas anônimas"
  on public.live_respostas for select to anon
  using (anon_id is not null);

create policy "Anônimo responde com anon_id"
  on public.live_respostas for insert to anon
  with check (participante_id is null and anon_id is not null);

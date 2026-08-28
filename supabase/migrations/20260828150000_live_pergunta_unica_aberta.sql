-- Garante no banco que só existe uma pergunta "aberta" por evento — o app já
-- fecha as outras antes de abrir uma nova, isso aqui é o cinto de segurança
-- contra corrida (duas abas de admin, etc).
create unique index if not exists live_perguntas_uma_aberta_por_evento
  on public.live_perguntas (event_id)
  where status = 'aberta';

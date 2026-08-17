insert into public.pesquisa_perguntas (event_id, ordem, tipo, texto, opcoes, obrigatoria)
select (select id from public.events order by id limit 1),
  coalesce((select max(ordem) + 1 from public.pesquisa_perguntas), 0),
  'aberta', 'Sugestão de tema para o próximo evento', array[]::text[], false
where not exists (
  select 1 from public.pesquisa_perguntas where texto = 'Sugestão de tema para o próximo evento'
);

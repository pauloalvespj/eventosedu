-- Perguntas iniciais da pesquisa de satisfação (o admin pode editar,
-- reordenar ou excluir depois normalmente pela tela).
insert into public.pesquisa_perguntas (event_id, ordem, tipo, texto, opcoes, obrigatoria)
select (select id from public.events order by id limit 1), v.ordem, v.tipo, v.texto, v.opcoes, v.obrigatoria
from (values
  (0, 'fechada', 'Como você avalia o evento no geral?', array['Excelente','Bom','Regular','Ruim'], true),
  (1, 'fechada', 'A organização do evento atendeu suas expectativas?', array['Sim, totalmente','Parcialmente','Não'], true),
  (2, 'fechada', 'Como você avalia a qualidade das palestras?', array['Excelente','Bom','Regular','Ruim'], true),
  (3, 'fechada', 'Como você avalia a infraestrutura do local (espaço, equipamentos, alimentação)?', array['Excelente','Bom','Regular','Ruim'], true),
  (4, 'fechada', 'Você recomendaria este evento a um colega?', array['Sim','Talvez','Não'], true),
  (5, 'aberta',  'O que você mais gostou no evento?', array[]::text[], false),
  (6, 'aberta',  'O que podemos melhorar para as próximas edições?', array[]::text[], false)
) as v(ordem, tipo, texto, opcoes, obrigatoria)
where not exists (select 1 from public.pesquisa_perguntas);

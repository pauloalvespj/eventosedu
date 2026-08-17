-- Zera o ranking de gamificação: o evento ainda não começou, então
-- qualquer pontuação acumulada até aqui (testes, dados de exemplo etc.)
-- é apagada. Não afeta presenças/avaliações/tópicos em si, só o extrato
-- de pontos (pontuacoes) que alimenta o ranking.
delete from pontuacoes;

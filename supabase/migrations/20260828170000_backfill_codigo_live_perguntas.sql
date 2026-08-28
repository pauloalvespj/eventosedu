-- Perguntas criadas antes da coluna `codigo` existir ficaram com ela nula —
-- preenche essas com um código de 4 dígitos, igual o que já acontece na
-- criação de perguntas novas.
update public.live_perguntas
set codigo = lpad((floor(random() * 9000) + 1000)::text, 4, '0')
where codigo is null;

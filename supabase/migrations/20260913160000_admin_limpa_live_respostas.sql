-- Permite ao admin apagar respostas de uma pergunta ao vivo (botão "Limpar
-- respostas" no admin do quiz — útil pra zerar depois de um teste/ensaio
-- sem precisar excluir a pergunta inteira). Não existia nenhuma policy de
-- delete em live_respostas, então isso era impossível via client antes.
create policy "Admin limpa respostas ao vivo"
  on public.live_respostas for delete to authenticated
  using (current_user_role() = 'admin');

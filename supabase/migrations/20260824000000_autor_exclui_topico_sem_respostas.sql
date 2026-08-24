-- Permite que o autor de um tópico o exclua, desde que ninguém tenha
-- respondido ainda. Antes só admin podia excluir tópico.
drop policy if exists "Admin remove tópico" on topicos;

create policy "Admin ou autor sem respostas remove tópico"
  on topicos for delete to authenticated
  using (
    current_user_role() = 'admin'
    or (
      user_id = auth.uid()
      and not exists (select 1 from respostas r where r.topico_id = topicos.id)
    )
  );

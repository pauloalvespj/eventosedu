-- A migration 20260711100000 trocou a leitura de profiles de "qualquer
-- autenticado lê tudo" para "só admin/super_admin/credenciador lê a
-- tabela inteira" (policy "Admin/credenciador lê todos os profiles"),
-- mas nunca recriou uma política pro usuário ler o PRÓPRIO profile.
--
-- Resultado: um participante comum (sem is_credenciador, sem admin) não
-- consegue ler nem a própria linha completa — só enxerga profiles_rede,
-- que não tem nome_publico/cpf/email/is_credenciador. Por isso o
-- cadastro aparece como incompleto pra sempre no front, mesmo já
-- preenchido no banco.
create policy "Usuário lê próprio profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

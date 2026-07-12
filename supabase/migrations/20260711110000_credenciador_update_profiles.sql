-- Credenciador é flag (is_credenciador), não role. A política antiga
-- "Admin atualiza qualquer profile" checava role = 'credenciador', que
-- não existe mais — credenciadores não conseguiam registrar credenciamento.
-- O trigger trg_protect_profile_update limita o que não-admin pode alterar.
drop policy if exists "Credenciador atualiza profiles" on public.profiles;
create policy "Credenciador atualiza profiles"
  on public.profiles for update to authenticated
  using (user_is_credenciador())
  with check (user_is_credenciador());

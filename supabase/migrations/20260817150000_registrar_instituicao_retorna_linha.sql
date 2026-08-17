-- registrar_instituicao_livre agora retorna a linha criada (ou a existente,
-- em caso de dedup) para o frontend poder atualizar a lista de instituições
-- em memória sem precisar recarregar a página.

drop function if exists public.registrar_instituicao_livre(text, text);

create or replace function public.registrar_instituicao_livre(p_sigla text, p_nome text)
returns instituicoes
language plpgsql security definer set search_path = public
as $$
declare
  v_sigla text := trim(coalesce(p_sigla, ''));
  v_nome  text := trim(coalesce(p_nome, ''));
  v_row   instituicoes;
begin
  if v_sigla = '' or v_nome = '' then
    return null;
  end if;

  select * into v_row from instituicoes where lower(sigla) = lower(v_sigla) limit 1;
  if found then
    return v_row;
  end if;

  insert into instituicoes (sigla, nome, ativo, realizadora, ordem)
  values (v_sigla, v_nome, true, false, null)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.registrar_instituicao_livre(text, text) to anon, authenticated;

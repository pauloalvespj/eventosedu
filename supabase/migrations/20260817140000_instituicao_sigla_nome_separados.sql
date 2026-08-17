-- ── AJUSTE: "Outra" instituição pede sigla e nome separados ──
-- A versão anterior de registrar_instituicao_livre(text) recebia só um
-- texto e usava ele como sigla e nome ao mesmo tempo. Agora o formulário
-- pede os dois campos, então a função passa a receber sigla e nome
-- explicitamente e faz a deduplicação pela sigla (mais confiável que
-- comparar o texto livre inteiro).

drop function if exists public.registrar_instituicao_livre(text);

create or replace function public.registrar_instituicao_livre(p_sigla text, p_nome text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sigla text := trim(coalesce(p_sigla, ''));
  v_nome  text := trim(coalesce(p_nome, ''));
begin
  if v_sigla = '' or v_nome = '' then
    return;
  end if;

  if exists (select 1 from instituicoes where lower(sigla) = lower(v_sigla)) then
    return;
  end if;

  insert into instituicoes (sigla, nome, ativo, realizadora, ordem)
  values (v_sigla, v_nome, true, false, null);
end;
$$;

grant execute on function public.registrar_instituicao_livre(text, text) to anon, authenticated;

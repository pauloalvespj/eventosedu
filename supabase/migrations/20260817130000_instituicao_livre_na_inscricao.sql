-- ── AUTO-CADASTRO DE INSTITUIÇÃO "OUTRA" NA INSCRIÇÃO ────────
-- Quando o inscrito digita uma instituição que não está na lista
-- (opção "Outra"), o nome digitado passa a ser também registrado na
-- tabela instituicoes — hoje só ficava salvo como texto livre no
-- profile, sem aparecer na lista/gestão de instituições do admin.
--
-- RLS de instituicoes só permite insert para admin; participantes
-- não-admin (e o fluxo anônimo do signUp) precisam de uma função
-- security definer, no mesmo padrão de verificar_cadastro /
-- registrar_presenca_qr.

create or replace function public.registrar_instituicao_livre(p_nome text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_nome text := trim(coalesce(p_nome, ''));
begin
  if v_nome = '' then
    return;
  end if;

  if exists (
    select 1 from instituicoes
    where lower(sigla) = lower(v_nome) or lower(nome) = lower(v_nome)
  ) then
    return;
  end if;

  insert into instituicoes (sigla, nome, ativo, realizadora, ordem)
  values (v_nome, v_nome, true, false, null);
end;
$$;

grant execute on function public.registrar_instituicao_livre(text) to anon, authenticated;

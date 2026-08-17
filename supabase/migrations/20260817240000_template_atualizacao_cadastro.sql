-- Adiciona um modelo de e-mail pronto ("Atualização de Cadastro") ao array
-- convite_templates do evento, pra usar no envio de "complete seu cadastro"
-- pra quem está com CPF/instituição/cargo em branco. Só roda se o evento
-- ainda não tiver um modelo com esse nome (evita duplicar em reruns).
update events
set convite_templates = coalesce(convite_templates, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
  'id', 'tpl-atualizacao-cadastro',
  'nome', 'Atualização de Cadastro',
  'assunto', 'Complete seu cadastro — ' || nome,
  'mensagem', 'Notamos que seu cadastro está incompleto (CPF, instituição ou cargo). Por favor, acesse a plataforma e atualize seus dados — isso é importante para o credenciamento e a emissão do certificado.' || chr(10) || chr(10) || 'Se você ainda não tem senha, use a opção "Link por e-mail" ou "Esqueci minha senha" na tela de entrada — não precisa se inscrever de novo, você já está cadastrado(a).',
  'ctaTexto', 'Entrar e atualizar meus dados →',
  'bannerUrl', '',
  'inscricaoUrl', '',
  'anexoUrl', '',
  'anexoNome', '',
  'corCabecalho', '#0a1f40',
  'corRodape', '#0a1f40',
  'corBotao', '#0a1f40'
))
where not exists (
  select 1 from jsonb_array_elements(coalesce(convite_templates, '[]'::jsonb)) t
  where t->>'id' = 'tpl-atualizacao-cadastro'
);

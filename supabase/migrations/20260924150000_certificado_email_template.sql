-- Guarda o modelo de e-mail "certificado disponível" (assunto, mensagem,
-- banner, cores), no mesmo padrão de pesquisa_template / convite_templates.
alter table events
  add column if not exists certificado_email_template jsonb;

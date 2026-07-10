-- Suporte a múltiplos modelos de e-mail (convite, lembrete, etc.)
alter table events
  add column if not exists convite_templates jsonb not null default '[]'::jsonb;

-- Migra a configuração única já existente (convite_config) para o primeiro modelo,
-- preservando o que já foi configurado.
update events
set convite_templates = jsonb_build_array(
  jsonb_build_object(
    'id', 'default',
    'nome', 'Convite',
    'assunto', coalesce(convite_config->>'assunto', ''),
    'mensagem', coalesce(convite_config->>'mensagem', ''),
    'bannerUrl', coalesce(convite_config->>'bannerUrl', ''),
    'inscricaoUrl', coalesce(convite_config->>'inscricaoUrl', ''),
    'anexoUrl', coalesce(convite_config->>'anexoUrl', ''),
    'anexoNome', coalesce(convite_config->>'anexoNome', '')
  )
)
where convite_config is not null
  and convite_config != '{}'::jsonb
  and (convite_templates is null or convite_templates = '[]'::jsonb);

-- Contato do evento (exibido na landing page, seção de dúvidas)
alter table events add column if not exists email_contato text;
alter table events add column if not exists telefone_contato text;

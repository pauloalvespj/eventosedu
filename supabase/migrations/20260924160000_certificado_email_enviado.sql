-- Controle de quem já recebeu o e-mail avisando que o certificado está
-- disponível (aba "Enviar e-mail" em Certificados.jsx) — guarda quando foi
-- a última vez, não só um boolean, pra permitir reenvio e auditoria.
alter table profiles
  add column if not exists certificado_email_enviado_em timestamptz;

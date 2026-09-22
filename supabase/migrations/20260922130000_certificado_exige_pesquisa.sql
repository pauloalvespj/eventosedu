-- ── Certificado condicionado à pesquisa de satisfação ───────────
-- Quando ligado (e a pesquisa estiver ativa), o participante só vê/baixa o
-- certificado depois de responder a pesquisa de satisfação — vale tanto
-- pro certificado gerado pela plataforma quanto pro externo (upload).

alter table public.events
  add column if not exists certificado_exige_pesquisa boolean not null default false;

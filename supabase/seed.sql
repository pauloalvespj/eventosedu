-- ============================================================
-- ENAUDIN — Seed (dados estáticos, sem usuários)
-- Usuários são criados via scripts/setup-users.js
-- Execute APÓS o schema.sql
-- ============================================================

-- ── EVENTO ───────────────────────────────────────────────────
insert into events (
  id, nome, nome_completo, subtitulo,
  data_inicio, data_fim, horario_encerramento,
  local, endereco, descricao, realizacao,
  banner_cor, percentual_minimo, carga_horaria_total
) values (
  1,
  'III ENAUDIN',
  'III Encontro das Auditorias Internas das Instituições Federais de Educação no Ceará',
  'Auditoria Interna em Transformação: Governança, Tecnologia e Valor Público',
  '2026-09-15', '2026-09-17', '13:00',
  'Auditório da Reitoria – UFC',
  'Av. da Universidade, 2853 – Benfica, Fortaleza – CE',
  'Reunir as Unidades de Auditoria Interna Governamental das instituições federais de educação e órgãos de controle para promover o intercâmbio de experiências, fortalecer práticas alinhadas às normas globais e discutir inovação, tecnologia e geração de valor na auditoria pública.',
  'Universidade Federal do Ceará (UFC), Instituto Federal do Ceará (IFCE), Universidade Federal do Cariri (UFCA), Universidade da Integração Internacional da Lusofonia Afro-Brasileira (Unilab)',
  '#0f3460', 75, 16
) on conflict (id) do nothing;

-- Reinicia sequência após insert com id explícito
select setval('events_id_seq', 1);

-- ── ATIVIDADES ────────────────────────────────────────────────
-- palestrante_id será atualizado pelo setup-users.js após criar os profiles
insert into atividades (
  id, event_id, dia, horario, horario_fim, tipo, titulo, descricao,
  convidados, local, carga_horaria, conta_certificado
) values
(1,  1,'2026-09-15','09:00','09:45','solenidade','Solenidade de Abertura',
 'Abertura oficial do III ENAUDIN com autoridades das instituições realizadoras e órgãos de controle.',
 'Reitores da UFC, IFCE, UFCA e Unilab\nSuperintendente da CGU no Ceará\nSecretário do TCU no Ceará\nControladora e Ouvidora Geral do Município de Fortaleza',
 'Auditório da Reitoria – UFC', 0.75, false),

(2,  1,'2026-09-15','09:45','10:00','intervalo','Intervalo','',
 '', 'Foyer', 0, false),

(3,  1,'2026-09-15','10:00','12:00','palestra',
 'Palestra Magna: O novo papel da Auditoria Interna na geração de valor público',
 'Conferência de abertura abordando as transformações do papel da auditoria interna no contexto de geração de valor público e alinhamento às normas globais.',
 '', 'Auditório da Reitoria – UFC', 2, true),

(4,  1,'2026-09-15','14:00','15:15','palestra',
 'Planejamento baseado em riscos: evolução do PAINT na prática',
 'Apresentação de experiências práticas na evolução do Plano Anual de Auditoria Interna com abordagem baseada em riscos.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(5,  1,'2026-09-15','15:15','16:30','palestra',
 'Integração entre Auditoria, Governança e Gestão de Riscos',
 'Discussão sobre a sinergia entre as três linhas de defesa e o papel da auditoria interna no fortalecimento da governança institucional.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(6,  1,'2026-09-16','08:30','09:45','palestra',
 'Uso de dados e BI na auditoria interna: da análise à decisão',
 'Como ferramentas de Business Intelligence e análise de dados estão transformando a capacidade analítica das auditorias internas.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(7,  1,'2026-09-16','09:45','10:00','intervalo','Intervalo','',
 '', 'Foyer', 0, false),

(8,  1,'2026-09-16','10:00','11:15','palestra',
 'Auditoria em ambientes digitais: sistemas, logs e rastreabilidade',
 'Técnicas e práticas para auditoria em sistemas informatizados, análise de logs e garantia de rastreabilidade em ambientes digitais.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(9,  1,'2026-09-16','11:15','12:30','palestra',
 'IA aplicada à auditoria: oportunidades e limites',
 'Panorama das aplicações de inteligência artificial na auditoria governamental, com análise crítica das oportunidades e limitações éticas e técnicas.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(10, 1,'2026-09-16','14:00','15:15','palestra',
 'Monitoramento de recomendações: boas práticas e automação',
 'Estratégias e ferramentas para o monitoramento sistemático das recomendações emitidas pela auditoria interna.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(11, 1,'2026-09-16','15:15','16:30','palestra',
 'Comunicação estratégica da auditoria com a alta gestão',
 'Como estruturar a comunicação da auditoria interna para maximizar impacto junto à alta gestão e ao conselho.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(12, 1,'2026-09-17','08:30','09:45','palestra',
 'Maturidade da Auditoria Interna: IA-CM na prática',
 'Aplicação prática do Internal Audit Capability Model (IA-CM) para diagnóstico e desenvolvimento da maturidade das UAIGs.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(13, 1,'2026-09-17','09:45','10:00','intervalo','Intervalo','',
 '', 'Foyer', 0, false),

(14, 1,'2026-09-17','10:00','11:15','mesa_redonda',
 'Mesa Redonda: Desafios atuais das UAIGs nas Instituições Federais de Ensino',
 'Debate entre os coordenadores de auditoria das IFEs do Ceará sobre os principais desafios operacionais, normativos e estratégicos das UAIGs.',
 'Coordenadores de Auditoria: UFC, IFCE, UFCA e Unilab',
 'Auditório da Reitoria – UFC', 1.25, true),

(15, 1,'2026-09-17','11:15','12:30','palestra',
 'Auditoria e accountability: relação com órgãos de controle externo',
 'Análise da relação entre auditoria interna e controle externo (TCU, CGU) e o papel da accountability na administração pública federal.',
 '', 'Auditório da Reitoria – UFC', 1.25, true),

(16, 1,'2026-09-17','14:00','15:30','painel',
 'Painel Final: O futuro da Auditoria Interna Governamental',
 'Painel de encerramento com representantes dos principais órgãos de controle e coordenadores das UAIGs para debater o futuro da profissão.',
 'CGU\nTCU\nCGE/CE\nRepresentantes das UAIGs',
 'Auditório da Reitoria – UFC', 1.5, true),

(17, 1,'2026-09-17','15:30','16:00','encerramento','Encerramento Oficial',
 'Cerimônia de encerramento do III ENAUDIN com agradecimentos e entrega de certificados.',
 '', 'Auditório da Reitoria – UFC', 0.5, false)
on conflict (id) do nothing;

select setval('atividades_id_seq', 17);

-- ── FÓRUM CONFIG ─────────────────────────────────────────────
insert into forum_config (id, event_id, ativo, data_inicio, data_fim) values (
  1, 1, true,
  '2026-09-14T08:00:00-03:00',
  '2026-09-19T23:59:00-03:00'
) on conflict (id) do nothing;

select setval('forum_config_id_seq', 1);

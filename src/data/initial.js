// ============================================================
// DADOS INICIAIS / MOCK DATABASE — III ENAUDIN
// ============================================================

export const INITIAL_EVENT = {
  id: 1,
  nome: "III ENAUDIN",
  nome_completo: "III Encontro das Auditorias Internas das Instituições Federais de Educação no Ceará",
  subtitulo: "Auditoria Interna em Transformação: Governança, Tecnologia e Valor Público",
  data_inicio: "2026-09-15",
  data_fim: "2026-09-17",
  horario_encerramento: "13:00",
  local: "Auditório da Reitoria – UFC",
  endereco: "Av. da Universidade, 2853 – Benfica, Fortaleza – CE",
  descricao: "Reunir as Unidades de Auditoria Interna Governamental das instituições federais de educação e órgãos de controle para promover o intercâmbio de experiências, fortalecer práticas alinhadas às normas globais e discutir inovação, tecnologia e geração de valor na auditoria pública.",
  realizacao: "Universidade Federal do Ceará (UFC), Instituto Federal do Ceará (IFCE), Universidade Federal do Cariri (UFCA), Universidade da Integração Internacional da Lusofonia Afro-Brasileira (Unilab)",
  banner_cor: "#0f3460",
  percentual_minimo: 75,
  carga_horaria_total: 16,
  inscricao_inicio: "2026-07-01",
  inscricao_fim: "2026-09-14",
  certificado_disponivel: false,
  palestrantes_visivel: true,
  palestrantes_subtitulo: "A grade de atividades, palestrantes e horários será divulgada em breve. Fique atento às atualizações!",
  gamificacao_ativa: true,
  forum_ativo: true,
};

export const INITIAL_INSTITUICOES = [
  { id: 1, sigla: "UFC",    nome: "Universidade Federal do Ceará",                                             ativo: true, realizadora: true,  ordem: 1 },
  { id: 2, sigla: "IFCE",   nome: "Instituto Federal de Educação, Ciência e Tecnologia do Ceará",             ativo: true, realizadora: true,  ordem: 2 },
  { id: 3, sigla: "UFCA",   nome: "Universidade Federal do Cariri",                                           ativo: true, realizadora: true,  ordem: 3 },
  { id: 4, sigla: "Unilab", nome: "Universidade da Integração Internacional da Lusofonia Afro-Brasileira",   ativo: true, realizadora: true,  ordem: 4 },
  { id: 5, sigla: "CGU",    nome: "Controladoria-Geral da União",                                             ativo: true, realizadora: false, ordem: null },
  { id: 6, sigla: "TCU",    nome: "Tribunal de Contas da União",                                             ativo: true, realizadora: false, ordem: null },
  { id: 7, sigla: "TRE",    nome: "Tribunal Regional Eleitoral",                                              ativo: true, realizadora: false, ordem: null },
  { id: 8, sigla: "CGE-CE", nome: "Controladoria e Ouvidoria Geral do Estado do Ceará",                      ativo: true, realizadora: false, ordem: null },
];

export const INITIAL_PALESTRANTES = [
  { id: 1,  nome: "Dr. Eduardo Vasconcelos",  titulo: "Auditor Federal de Finanças e Controle",  foto_iniciais: "EV", area: "Auditoria Governamental", email: "eduardo@exemplo.com", senha: "123456", instituicao: "CGU – Brasília", mini_bio: "Especialista em controle interno governamental e geração de valor público pela CGU." },
  { id: 2,  nome: "Marina Albuquerque",        titulo: "Auditora-Chefe",                          foto_iniciais: "MA", area: "Planejamento e Riscos",   email: "marina@exemplo.com",  senha: "123456", instituicao: "UFPE", mini_bio: "Referência nacional em PAINT e planejamento baseado em riscos nas IFEs." },
  { id: 3,  nome: "Carlos Henrique Tavares",   titulo: "Auditor Federal de Controle Externo",     foto_iniciais: "CH", area: "Governança e Riscos",     email: "carlos@exemplo.com",  senha: "123456", instituicao: "TCU – Secretaria de Controle Externo", mini_bio: "Especialista em integração entre auditoria, governança e gestão de riscos." },
  { id: 4,  nome: "Fernanda Lopes",            titulo: "Especialista em Analytics",               foto_iniciais: "FL", area: "BI e Dados",              email: "fernanda@exemplo.com", senha: "123456", instituicao: "CGE/SP", mini_bio: "Referência em uso de Business Intelligence e análise de dados para auditoria." },
  { id: 5,  nome: "Rafael Duarte",             titulo: "Auditor de TI",                           foto_iniciais: "RD", area: "Auditoria Digital/TI",    email: "rafael@exemplo.com",  senha: "123456", instituicao: "SERPRO", mini_bio: "Especialista em auditoria de ambientes digitais, logs e rastreabilidade de sistemas." },
  { id: 6,  nome: "Prof. Lucas Menezes",       titulo: "Professor Doutor",                        foto_iniciais: "LM", area: "Inteligência Artificial", email: "lucas@exemplo.com",   senha: "123456", instituicao: "Universidade de Brasília – UnB", mini_bio: "Pesquisador de IA aplicada ao setor público e auditoria governamental." },
  { id: 7,  nome: "Juliana Freitas",           titulo: "Auditora Interna",                        foto_iniciais: "JF", area: "Monitoramento e Automação",email: "juliana@exemplo.com", senha: "123456", instituicao: "IFBA", mini_bio: "Especialista em monitoramento de recomendações e automação de processos de auditoria." },
  { id: 8,  nome: "Patrícia Gondim",           titulo: "Consultora em Governança Pública",        foto_iniciais: "PG", area: "Comunicação Estratégica", email: "patricia@exemplo.com", senha: "123456", instituicao: "Consultora Independente", mini_bio: "Especialista em comunicação estratégica da auditoria e relacionamento com alta gestão." },
  { id: 9,  nome: "Roberto Andrade",           titulo: "Especialista em Auditoria Governamental", foto_iniciais: "RA", area: "Maturidade e IA-CM",      email: "roberto@exemplo.com", senha: "123456", instituicao: "Consultor Independente", mini_bio: "Referência em avaliação de maturidade de auditorias internas (IA-CM) no Brasil." },
  { id: 10, nome: "Cláudia Bezerra",           titulo: "Auditora Federal de Controle Externo",    foto_iniciais: "CB", area: "Accountability e Controle",email: "claudia@exemplo.com", senha: "123456", instituicao: "TCU – Ceará", mini_bio: "Especialista em accountability e relações entre auditoria interna e órgãos de controle externo." },
];

// Tipos: palestra | mesa_redonda | solenidade | intervalo | painel | encerramento
export const INITIAL_ATIVIDADES = [
  // ── DIA 15/09 ──
  { id: 1,  dia: "2026-09-15", horario: "09:00", horario_fim: "09:45", tipo: "solenidade",    titulo: "Solenidade de Abertura",
    descricao: "Abertura oficial do III ENAUDIN com autoridades das instituições realizadoras e órgãos de controle.",
    palestrantes_ids: [],
    convidados: "Reitores da UFC, IFCE, UFCA e Unilab\nSuperintendente da CGU no Ceará\nSecretário do TCU no Ceará\nControladora e Ouvidora Geral do Município de Fortaleza",
    local: "Auditório da Reitoria – UFC", carga_horaria: 0.75, conta_certificado: false },

  { id: 2,  dia: "2026-09-15", horario: "09:45", horario_fim: "10:00", tipo: "intervalo",     titulo: "Intervalo",
    descricao: "", palestrantes_ids: [], convidados: "",
    local: "Foyer", carga_horaria: 0, conta_certificado: false },

  { id: 3,  dia: "2026-09-15", horario: "10:00", horario_fim: "12:00", tipo: "palestra",      titulo: "Palestra Magna: O novo papel da Auditoria Interna na geração de valor público",
    descricao: "Conferência de abertura abordando as transformações do papel da auditoria interna no contexto de geração de valor público e alinhamento às normas globais.",
    palestrantes_ids: [1], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 2, conta_certificado: true },

  { id: 4,  dia: "2026-09-15", horario: "14:00", horario_fim: "15:15", tipo: "palestra",      titulo: "Planejamento baseado em riscos: evolução do PAINT na prática",
    descricao: "Apresentação de experiências práticas na evolução do Plano Anual de Auditoria Interna com abordagem baseada em riscos.",
    palestrantes_ids: [2], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  { id: 5,  dia: "2026-09-15", horario: "15:15", horario_fim: "16:30", tipo: "palestra",      titulo: "Integração entre Auditoria, Governança e Gestão de Riscos",
    descricao: "Discussão sobre a sinergia entre as três linhas de defesa e o papel da auditoria interna no fortalecimento da governança institucional.",
    palestrantes_ids: [3], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  // ── DIA 16/09 ──
  { id: 6,  dia: "2026-09-16", horario: "08:30", horario_fim: "09:45", tipo: "palestra",      titulo: "Uso de dados e BI na auditoria interna: da análise à decisão",
    descricao: "Como ferramentas de Business Intelligence e análise de dados estão transformando a capacidade analítica das auditorias internas.",
    palestrantes_ids: [4], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  { id: 7,  dia: "2026-09-16", horario: "09:45", horario_fim: "10:00", tipo: "intervalo",     titulo: "Intervalo",
    descricao: "", palestrantes_ids: [], convidados: "",
    local: "Foyer", carga_horaria: 0, conta_certificado: false },

  { id: 8,  dia: "2026-09-16", horario: "10:00", horario_fim: "11:15", tipo: "palestra",      titulo: "Auditoria em ambientes digitais: sistemas, logs e rastreabilidade",
    descricao: "Técnicas e práticas para auditoria em sistemas informatizados, análise de logs e garantia de rastreabilidade em ambientes digitais.",
    palestrantes_ids: [5], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  { id: 9,  dia: "2026-09-16", horario: "11:15", horario_fim: "12:30", tipo: "palestra",      titulo: "IA aplicada à auditoria: oportunidades e limites",
    descricao: "Panorama das aplicações de inteligência artificial na auditoria governamental, com análise crítica das oportunidades e limitações éticas e técnicas.",
    palestrantes_ids: [6], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  { id: 10, dia: "2026-09-16", horario: "14:00", horario_fim: "15:15", tipo: "palestra",      titulo: "Monitoramento de recomendações: boas práticas e automação",
    descricao: "Estratégias e ferramentas para o monitoramento sistemático das recomendações emitidas pela auditoria interna.",
    palestrantes_ids: [7], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  { id: 11, dia: "2026-09-16", horario: "15:15", horario_fim: "16:30", tipo: "palestra",      titulo: "Comunicação estratégica da auditoria com a alta gestão",
    descricao: "Como estruturar a comunicação da auditoria interna para maximizar impacto junto à alta gestão e ao conselho.",
    palestrantes_ids: [8], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  // ── DIA 17/09 ──
  { id: 12, dia: "2026-09-17", horario: "08:30", horario_fim: "09:45", tipo: "palestra",      titulo: "Maturidade da Auditoria Interna: IA-CM na prática",
    descricao: "Aplicação prática do Internal Audit Capability Model (IA-CM) para diagnóstico e desenvolvimento da maturidade das UAIGs.",
    palestrantes_ids: [9], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  { id: 13, dia: "2026-09-17", horario: "09:45", horario_fim: "10:00", tipo: "intervalo",     titulo: "Intervalo",
    descricao: "", palestrantes_ids: [], convidados: "",
    local: "Foyer", carga_horaria: 0, conta_certificado: false },

  { id: 14, dia: "2026-09-17", horario: "10:00", horario_fim: "11:15", tipo: "mesa_redonda",  titulo: "Mesa Redonda: Desafios atuais das UAIGs nas Instituições Federais de Ensino",
    descricao: "Debate entre os coordenadores de auditoria das IFEs do Ceará sobre os principais desafios operacionais, normativos e estratégicos das UAIGs.",
    palestrantes_ids: [],
    convidados: "Coordenadores de Auditoria: UFC, IFCE, UFCA e Unilab",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  { id: 15, dia: "2026-09-17", horario: "11:15", horario_fim: "12:30", tipo: "palestra",      titulo: "Auditoria e accountability: relação com órgãos de controle externo",
    descricao: "Análise da relação entre auditoria interna e controle externo (TCU, CGU) e o papel da accountability na administração pública federal.",
    palestrantes_ids: [10], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.25, conta_certificado: true },

  { id: 16, dia: "2026-09-17", horario: "14:00", horario_fim: "15:30", tipo: "painel",        titulo: "Painel Final: O futuro da Auditoria Interna Governamental",
    descricao: "Painel de encerramento com representantes dos principais órgãos de controle e coordenadores das UAIGs para debater o futuro da profissão.",
    palestrantes_ids: [],
    convidados: "CGU\nTCU\nCGE/CE\nRepresentantes das UAIGs",
    local: "Auditório da Reitoria – UFC", carga_horaria: 1.5, conta_certificado: true },

  { id: 17, dia: "2026-09-17", horario: "15:30", horario_fim: "16:00", tipo: "encerramento",  titulo: "Encerramento Oficial",
    descricao: "Cerimônia de encerramento do III ENAUDIN com agradecimentos e entrega de certificados.",
    palestrantes_ids: [], convidados: "",
    local: "Auditório da Reitoria – UFC", carga_horaria: 0.5, conta_certificado: false },
];

export const INITIAL_PARTICIPANTES = [
  { id: 1, cpf: "123.456.789-00", nome: "Ana Clara Pinheiro",   instituicao: "UFC",    cargo: "Auditora Interna",         sexo: "F", email: "ana.clara@exemplo.com", senha: "123456", credenciado: true,  role: "participante" },
  { id: 2, cpf: "987.654.321-00", nome: "Bruno Matos Correia",  instituicao: "IFCE",   cargo: "Técnico em Contabilidade", sexo: "M", email: "bruno@exemplo.com",     senha: "123456", credenciado: false, role: "participante" },
  { id: 3, cpf: "111.222.333-44", nome: "Carla Bezerra Lima",   instituicao: "UFCA",   cargo: "Coordenadora de Auditoria",sexo: "F", email: "carla@exemplo.com",     senha: "123456", credenciado: true,  role: "participante" },
  { id: 4, cpf: "222.333.444-55", nome: "Davi Almeida Sousa",   instituicao: "Unilab", cargo: "Contador",                 sexo: "M", email: "davi@exemplo.com",      senha: "123456", credenciado: true,  role: "participante" },
  { id: 5, cpf: "333.444.555-66", nome: "Elisa Furtado Nobre",  instituicao: "CGU",    cargo: "Auditora Federal",         sexo: "F", email: "elisa@exemplo.com",     senha: "123456", credenciado: false, role: "participante" },
];

// Perfis: admin | credenciador
export const INITIAL_ADMINS = [
  { id: 1, nome: "Comissão Organizadora", email: "admin@enaudin.gov.br",      senha: "admin123", role: "admin",  instituicao: "UFC",    ativo: true,  foto_iniciais: "CO" },
  { id: 2, nome: "Secretaria do Evento",  email: "secretaria@enaudin.gov.br", senha: "sec2026",  role: "admin",        instituicao: "IFCE",   ativo: true,  foto_iniciais: "SE" },
  { id: 3, nome: "Recepção UFC",          email: "recepcao@enaudin.gov.br",   senha: "rec2026",  role: "credenciador", instituicao: "UFC",    ativo: true,  foto_iniciais: "RU" },
  { id: 4, nome: "Suporte Técnico",       email: "ti@enaudin.gov.br",         senha: "ti2026",   role: "admin",        instituicao: "Unilab", ativo: false, foto_iniciais: "ST" },
];

export const INITIAL_PRESENCAS = [
  { id: 1,  participante_id: 1, atividade_id: 1,  data_hora: "2026-09-15 09:05" },
  { id: 2,  participante_id: 1, atividade_id: 3,  data_hora: "2026-09-15 10:02" },
  { id: 3,  participante_id: 1, atividade_id: 4,  data_hora: "2026-09-15 14:01" },
  { id: 4,  participante_id: 1, atividade_id: 5,  data_hora: "2026-09-15 15:17" },
  { id: 5,  participante_id: 1, atividade_id: 6,  data_hora: "2026-09-16 08:32" },
  { id: 6,  participante_id: 3, atividade_id: 1,  data_hora: "2026-09-15 09:08" },
  { id: 7,  participante_id: 3, atividade_id: 3,  data_hora: "2026-09-15 10:04" },
  { id: 8,  participante_id: 3, atividade_id: 4,  data_hora: "2026-09-15 14:03" },
  { id: 9,  participante_id: 3, atividade_id: 5,  data_hora: "2026-09-15 15:16" },
  { id: 10, participante_id: 3, atividade_id: 6,  data_hora: "2026-09-16 08:35" },
  { id: 11, participante_id: 3, atividade_id: 8,  data_hora: "2026-09-16 10:01" },
  { id: 12, participante_id: 3, atividade_id: 9,  data_hora: "2026-09-16 11:16" },
  { id: 13, participante_id: 3, atividade_id: 10, data_hora: "2026-09-16 14:02" },
  { id: 14, participante_id: 3, atividade_id: 11, data_hora: "2026-09-16 15:17" },
  { id: 15, participante_id: 3, atividade_id: 12, data_hora: "2026-09-17 08:31" },
  { id: 16, participante_id: 3, atividade_id: 14, data_hora: "2026-09-17 10:03" },
  { id: 17, participante_id: 3, atividade_id: 15, data_hora: "2026-09-17 11:16" },
  { id: 18, participante_id: 4, atividade_id: 1,  data_hora: "2026-09-15 09:10" },
  { id: 19, participante_id: 4, atividade_id: 3,  data_hora: "2026-09-15 10:05" },
];

export const INITIAL_GAMIFICACAO_CONFIG = {
  id: 1,
  presenca:         10,
  avaliacao:         5,
  topico:           15,
  resposta:          8,
  curtida_recebida:  3,
  primeiro_dia:      5,
  topico_destaque:  20,
  seguir:            5,
};

export const INITIAL_FOLLOWS = [];

export const INITIAL_CONVIDADOS = [];

export const INITIAL_FORUM_CONFIG = {
  ativo: true,
  data_inicio: "2026-09-14T08:00",
  data_fim:    "2026-09-19T23:59",
  permite_anonimo: false,
};

export const INITIAL_AVALIACOES = [
  { id: 1, participante_id: 1, atividade_id: 3,  estrelas: 5, comentario: "Excelente palestra! Conteúdo muito relevante e apresentação impecável.", created_at: "2026-09-15T12:30" },
  { id: 2, participante_id: 1, atividade_id: 4,  estrelas: 4, comentario: "Muito boa! Poderia ter explorado mais exemplos práticos do PAINT.", created_at: "2026-09-15T16:00" },
  { id: 3, participante_id: 3, atividade_id: 3,  estrelas: 5, comentario: "Incrível! O palestrante domina muito bem o tema.", created_at: "2026-09-15T12:45" },
  { id: 4, participante_id: 3, atividade_id: 6,  estrelas: 4, comentario: "Ótimo conteúdo sobre BI aplicado à auditoria.", created_at: "2026-09-16T10:30" },
  { id: 5, participante_id: 4, atividade_id: 3,  estrelas: 5, comentario: "Uma das melhores palestras que já assisti sobre o tema.", created_at: "2026-09-15T13:00" },
];

export const INITIAL_TOPICOS = [
  {
    id: 1, categoria: "geral", titulo: "Bem-vindos ao III ENAUDIN!",
    corpo: "Bem-vindos ao Encontro das Auditorias Internas! Aproveitem as palestras, interajam e façam boas conexões. Qualquer dúvida, a comissão organizadora está à disposição.",
    autor_id: "admin:1", autor_nome: "Comissão Organizadora", autor_role: "admin",
    created_at: "2026-09-14T09:00", curtidas: [2, 3, 4], fixado: true, destaque: true, removido: false,
    respostas: [
      { id: 101, corpo: "Muito animada para esta edição! O tema está incrível.", autor_id: "participante:1", autor_nome: "Ana Clara Pinheiro", autor_role: "participante", created_at: "2026-09-14T10:15", curtidas: [2] },
      { id: 102, corpo: "Representando a UFCA com muito orgulho! Vamos em frente.", autor_id: "participante:3", autor_nome: "Carla Bezerra Lima", autor_role: "participante", created_at: "2026-09-14T11:30", curtidas: [] },
    ],
  },
  {
    id: 2, categoria: "conteudo", titulo: "Material complementar sobre IA-CM",
    corpo: "Para quem se interessou pela palestra sobre Maturidade da Auditoria, recomendo o guia do IIA sobre IA-CM disponível no site do IIA Brasil. Vale muito a leitura antes da sessão do dia 17.",
    autor_id: "palestrante:9", autor_nome: "Roberto Andrade", autor_role: "palestrante",
    created_at: "2026-09-15T07:30", curtidas: [1, 3, 4, 5], fixado: false, destaque: true, removido: false,
    respostas: [
      { id: 201, corpo: "Obrigada pela dica! Já baixei o material. Tenho algumas dúvidas sobre o nível 3 que gostaria de discutir na palestra.", autor_id: "participante:1", autor_nome: "Ana Clara Pinheiro", autor_role: "participante", created_at: "2026-09-15T08:10", curtidas: [9] },
      { id: 202, corpo: "Ótimo conteúdo. Na UFCA estamos tentando avançar do nível 2 para o 3. Seria interessante abordar casos práticos.", autor_id: "participante:3", autor_nome: "Carla Bezerra Lima", autor_role: "participante", created_at: "2026-09-15T08:45", curtidas: [1] },
      { id: 203, corpo: "Abordarei exatamente isso na palestra. Tragam casos das suas instituições para debatermos!", autor_id: "palestrante:9", autor_nome: "Roberto Andrade", autor_role: "palestrante", created_at: "2026-09-15T09:00", curtidas: [1, 3] },
    ],
  },
  {
    id: 3, categoria: "duvidas", titulo: "Como funciona o certificado?",
    corpo: "Alguém pode explicar como é calculado o percentual de presença? Preciso saber quantas palestras devo assistir para ter direito ao certificado.",
    autor_id: "participante:2", autor_nome: "Bruno Matos Correia", autor_role: "participante",
    created_at: "2026-09-15T12:00", curtidas: [3], fixado: false, destaque: false, removido: false,
    respostas: [
      { id: 301, corpo: "O certificado exige 75% de presença nas atividades marcadas como 'conta para certificado'. O sistema calcula automaticamente pela soma das cargas horárias.", autor_id: "admin:2", autor_nome: "Secretaria do Evento", autor_role: "admin", created_at: "2026-09-15T12:30", curtidas: [2, 4] },
    ],
  },
  {
    id: 4, categoria: "networking", titulo: "Grupo de WhatsApp das UAIGs cearenses",
    corpo: "Criamos um grupo para manter contato após o evento! Quem quiser entrar, mande mensagem para o e-mail da comissão ou converse comigo pessoalmente durante o evento.",
    autor_id: "participante:3", autor_nome: "Carla Bezerra Lima", autor_role: "participante",
    created_at: "2026-09-15T18:00", curtidas: [1, 4, 5], fixado: false, destaque: false, removido: false,
    respostas: [],
  },
];

export const INITIAL_PONTUACOES = [
  { id: 1,  user_id: "participante:1", tipo: "presenca",         valor: 10, desc: "Presença: Solenidade de Abertura",        created_at: "2026-09-15T09:05" },
  { id: 2,  user_id: "participante:1", tipo: "presenca",         valor: 10, desc: "Presença: Palestra Magna",                created_at: "2026-09-15T10:02" },
  { id: 3,  user_id: "participante:1", tipo: "presenca",         valor: 10, desc: "Presença: Planejamento baseado em riscos", created_at: "2026-09-15T14:01" },
  { id: 4,  user_id: "participante:1", tipo: "resposta",         valor: 8,  desc: "Resposta no fórum",                       created_at: "2026-09-14T10:15" },
  { id: 5,  user_id: "participante:1", tipo: "curtida_recebida", valor: 3,  desc: "Curtida recebida",                        created_at: "2026-09-15T08:10" },
  { id: 6,  user_id: "participante:3", tipo: "presenca",         valor: 10, desc: "Presença: Solenidade de Abertura",        created_at: "2026-09-15T09:08" },
  { id: 7,  user_id: "participante:3", tipo: "presenca",         valor: 10, desc: "Presença: Palestra Magna",                created_at: "2026-09-15T10:04" },
  { id: 8,  user_id: "participante:3", tipo: "presenca",         valor: 10, desc: "Presença: Planejamento",                  created_at: "2026-09-15T14:03" },
  { id: 9,  user_id: "participante:3", tipo: "presenca",         valor: 10, desc: "Presença: Integração Auditoria",          created_at: "2026-09-15T15:16" },
  { id: 10, user_id: "participante:3", tipo: "presenca",         valor: 10, desc: "Presença: Uso de dados e BI",             created_at: "2026-09-16T08:35" },
  { id: 11, user_id: "participante:3", tipo: "topico",           valor: 15, desc: "Tópico criado: Grupo de WhatsApp",        created_at: "2026-09-15T18:00" },
  { id: 12, user_id: "participante:3", tipo: "resposta",         valor: 8,  desc: "Resposta no fórum",                      created_at: "2026-09-14T11:30" },
  { id: 13, user_id: "participante:3", tipo: "curtida_recebida", valor: 3,  desc: "Curtida recebida",                        created_at: "2026-09-15T08:45" },
  { id: 14, user_id: "participante:4", tipo: "presenca",         valor: 10, desc: "Presença: Solenidade de Abertura",        created_at: "2026-09-15T09:10" },
  { id: 15, user_id: "participante:4", tipo: "presenca",         valor: 10, desc: "Presença: Palestra Magna",                created_at: "2026-09-15T10:05" },
  { id: 16, user_id: "palestrante:9",  tipo: "topico",           valor: 15, desc: "Tópico criado: Material IA-CM",           created_at: "2026-09-15T07:30" },
  { id: 17, user_id: "palestrante:9",  tipo: "curtida_recebida", valor: 12, desc: "4 curtidas no tópico",                   created_at: "2026-09-15T12:00" },
  { id: 18, user_id: "palestrante:9",  tipo: "topico_destaque",  valor: 20, desc: "Tópico marcado como destaque",            created_at: "2026-09-15T10:00" },
];

export const FAQ_ITEMS = [
  { q: "O que é o III ENAUDIN?", r: "O III Encontro das Auditorias Internas das Instituições Federais de Educação no Ceará é um evento que reúne as UAIGs (Unidades de Auditoria Interna Governamental) das IFEs cearenses e órgãos de controle para intercâmbio de experiências e fortalecimento de práticas." },
  { q: "Como me inscrever?", r: "Clique em 'Inscrever-se', preencha o formulário com seus dados (CPF, nome, instituição, cargo, e-mail) e crie uma senha de acesso. A inscrição é gratuita." },
  { q: "Como confirmar presença nas atividades?", r: "Cada atividade terá um QR Code exibido no local. Aponte a câmera do celular, acesse a página e informe seu CPF para confirmar presença." },
  { q: "Como obter o certificado de participação?", r: "O certificado é gerado automaticamente quando você atinge o percentual mínimo de presença definido pela comissão organizadora." },
  { q: "Quem pode participar?", r: "O evento é voltado para servidores das IFEs do Ceará, membros de UAIGs, servidores de órgãos de controle (CGU, TCU, CGE) e demais interessados em auditoria interna governamental." },
  { q: "O evento tem transmissão online?", r: "Informações sobre transmissão serão divulgadas pela comissão organizadora próximo à data do evento." },
];

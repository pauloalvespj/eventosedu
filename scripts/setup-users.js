#!/usr/bin/env node
/**
 * ENAUDIN — Setup inicial de usuários no Supabase
 *
 * Cria auth.users + profiles para admins, palestrantes e participantes.
 * Requer a service_role key (nunca use a anon key aqui).
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/setup-users.js
 *
 * Para VPS self-hosted, use a URL do seu servidor.
 * Execute UMA VEZ após rodar schema.sql + seed.sql.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Dados dos usuários ─────────────────────────────────────
const ADMINS = [
  { nome: "Comissão Organizadora", email: "admin@enaudin.gov.br",      senha: "admin123", role: "super_admin",  instituicao: "UFC",    foto_iniciais: "CO" },
  { nome: "Secretaria do Evento",  email: "secretaria@enaudin.gov.br", senha: "sec2026",  role: "admin",        instituicao: "IFCE",   foto_iniciais: "SE" },
  { nome: "Recepção UFC",          email: "recepcao@enaudin.gov.br",   senha: "rec2026",  role: "credenciador", instituicao: "UFC",    foto_iniciais: "RU" },
  { nome: "Suporte Técnico",       email: "ti@enaudin.gov.br",         senha: "ti2026",   role: "admin",        instituicao: "Unilab", foto_iniciais: "ST", ativo: false },
];

// Palestrantes: index 0 = palestrante_id 1 nas atividades do seed
const PALESTRANTES = [
  { nome: "Dr. Eduardo Vasconcelos",  email: "eduardo@exemplo.com",  senha: "123456", titulo: "Auditor Federal de Finanças e Controle",    area: "Auditoria Governamental",  foto_iniciais: "EV", instituicao: "CGU – Brasília", mini_bio: "Especialista em controle interno governamental e geração de valor público pela CGU." },
  { nome: "Marina Albuquerque",       email: "marina@exemplo.com",   senha: "123456", titulo: "Auditora-Chefe",                             area: "Planejamento e Riscos",    foto_iniciais: "MA", instituicao: "UFPE", mini_bio: "Referência nacional em PAINT e planejamento baseado em riscos nas IFEs." },
  { nome: "Carlos Henrique Tavares",  email: "carlos@exemplo.com",   senha: "123456", titulo: "Auditor Federal de Controle Externo",        area: "Governança e Riscos",      foto_iniciais: "CH", instituicao: "TCU – Secretaria de Controle Externo", mini_bio: "Especialista em integração entre auditoria, governança e gestão de riscos." },
  { nome: "Fernanda Lopes",           email: "fernanda@exemplo.com", senha: "123456", titulo: "Especialista em Analytics",                  area: "BI e Dados",               foto_iniciais: "FL", instituicao: "CGE/SP", mini_bio: "Referência em uso de Business Intelligence e análise de dados para auditoria." },
  { nome: "Rafael Duarte",            email: "rafael@exemplo.com",   senha: "123456", titulo: "Auditor de TI",                              area: "Auditoria Digital/TI",     foto_iniciais: "RD", instituicao: "SERPRO", mini_bio: "Especialista em auditoria de ambientes digitais, logs e rastreabilidade de sistemas." },
  { nome: "Prof. Lucas Menezes",      email: "lucas@exemplo.com",    senha: "123456", titulo: "Professor Doutor",                           area: "Inteligência Artificial",  foto_iniciais: "LM", instituicao: "Universidade de Brasília – UnB", mini_bio: "Pesquisador de IA aplicada ao setor público e auditoria governamental." },
  { nome: "Juliana Freitas",          email: "juliana@exemplo.com",  senha: "123456", titulo: "Auditora Interna",                           area: "Monitoramento e Automação",foto_iniciais: "JF", instituicao: "IFBA", mini_bio: "Especialista em monitoramento de recomendações e automação de processos de auditoria." },
  { nome: "Patrícia Gondim",          email: "patricia@exemplo.com", senha: "123456", titulo: "Consultora em Governança Pública",           area: "Comunicação Estratégica",  foto_iniciais: "PG", instituicao: "Consultora Independente", mini_bio: "Especialista em comunicação estratégica da auditoria e relacionamento com alta gestão." },
  { nome: "Roberto Andrade",          email: "roberto@exemplo.com",  senha: "123456", titulo: "Especialista em Auditoria Governamental",    area: "Maturidade e IA-CM",       foto_iniciais: "RA", instituicao: "Consultor Independente", mini_bio: "Referência em avaliação de maturidade de auditorias internas (IA-CM) no Brasil." },
  { nome: "Cláudia Bezerra",          email: "claudia@exemplo.com",  senha: "123456", titulo: "Auditora Federal de Controle Externo",       area: "Accountability e Controle",foto_iniciais: "CB", instituicao: "TCU – Ceará", mini_bio: "Especialista em accountability e relações entre auditoria interna e órgãos de controle externo." },
];

// palestrante_id nas atividades (índice 0-based → atividade_id)
// atividade 3→palestrante 0, 4→1, 5→2, 6→3, 8→4, 9→5, 10→6, 11→7, 12→8, 15→9
const PALESTRANTE_ATIVIDADES = {
  0: [3],   // Eduardo → atividade 3
  1: [4],   // Marina  → atividade 4
  2: [5],   // Carlos  → atividade 5
  3: [6],   // Fernanda→ atividade 6
  4: [8],   // Rafael  → atividade 8
  5: [9],   // Lucas   → atividade 9
  6: [10],  // Juliana → atividade 10
  7: [11],  // Patrícia→ atividade 11
  8: [12],  // Roberto → atividade 12
  9: [15],  // Cláudia → atividade 15
};

const PARTICIPANTES = [
  { nome: "Ana Clara Pinheiro",   cpf: "123.456.789-00", email: "ana.clara@exemplo.com", senha: "123456", instituicao: "UFC",    cargo: "Auditora Interna",         sexo: "F", credenciado: true },
  { nome: "Bruno Matos Correia",  cpf: "987.654.321-00", email: "bruno@exemplo.com",     senha: "123456", instituicao: "IFCE",   cargo: "Técnico em Contabilidade", sexo: "M", credenciado: false },
  { nome: "Carla Bezerra Lima",   cpf: "111.222.333-44", email: "carla@exemplo.com",     senha: "123456", instituicao: "UFCA",   cargo: "Coordenadora de Auditoria",sexo: "F", credenciado: true },
  { nome: "Davi Almeida Sousa",   cpf: "222.333.444-55", email: "davi@exemplo.com",      senha: "123456", instituicao: "Unilab", cargo: "Contador",                 sexo: "M", credenciado: true },
  { nome: "Elisa Furtado Nobre",  cpf: "333.444.555-66", email: "elisa@exemplo.com",     senha: "123456", instituicao: "CGU",    cargo: "Auditora Federal",         sexo: "F", credenciado: false },
];

// ── Helper ─────────────────────────────────────────────────
async function criarUsuario(email, senha, metadata = {}) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // confirma automaticamente (sem e-mail de verificação)
    user_metadata: metadata,
  });
  if (error) {
    if (error.message?.includes("already been registered")) {
      console.log(`  ⚠️  ${email} já existe — buscando UUID...`);
      const { data: list } = await supabase.auth.admin.listUsers();
      const found = list?.users?.find(u => u.email === email);
      return found?.id ?? null;
    }
    console.error(`  ✗ Erro ao criar ${email}:`, error.message);
    return null;
  }
  return data.user.id;
}

async function upsertProfile(id, profile) {
  const { error } = await supabase.from("profiles").upsert({ id, ...profile });
  if (error) console.error(`  ✗ Erro ao salvar profile ${profile.email}:`, error.message);
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log("\n=== ENAUDIN — Setup de usuários ===\n");

  // Admins
  console.log("── Admins ──");
  for (const a of ADMINS) {
    process.stdout.write(`  ${a.email}... `);
    const uid = await criarUsuario(a.email, a.senha);
    if (!uid) continue;
    await upsertProfile(uid, {
      role: a.role, nome: a.nome, email: a.email,
      instituicao: a.instituicao, foto_iniciais: a.foto_iniciais,
      ativo: a.ativo ?? true,
    });
    console.log(`✓ ${uid}`);
  }

  // Palestrantes
  console.log("\n── Palestrantes ──");
  const palUids = [];
  for (const p of PALESTRANTES) {
    process.stdout.write(`  ${p.email}... `);
    const uid = await criarUsuario(p.email, p.senha);
    if (!uid) { palUids.push(null); continue; }
    await upsertProfile(uid, {
      role: "palestrante", nome: p.nome, email: p.email,
      titulo: p.titulo, area: p.area, mini_bio: p.mini_bio,
      foto_iniciais: p.foto_iniciais, instituicao: p.instituicao,
    });
    palUids.push(uid);
    console.log(`✓ ${uid}`);
  }

  // Vincula palestrantes às atividades
  console.log("\n── Vinculando palestrantes às atividades ──");
  for (const [idx, atvIds] of Object.entries(PALESTRANTE_ATIVIDADES)) {
    const uid = palUids[Number(idx)];
    if (!uid) continue;
    for (const atvId of atvIds) {
      const { error } = await supabase
        .from("atividades")
        .update({ palestrante_id: uid })
        .eq("id", atvId);
      if (error) console.error(`  ✗ Erro ao vincular palestrante ${uid} → atividade ${atvId}:`, error.message);
      else console.log(`  Palestrante ${PALESTRANTES[Number(idx)].nome} → atividade ${atvId} ✓`);
    }
  }

  // Participantes
  console.log("\n── Participantes ──");
  for (const p of PARTICIPANTES) {
    process.stdout.write(`  ${p.email}... `);
    const uid = await criarUsuario(p.email, p.senha);
    if (!uid) continue;
    await upsertProfile(uid, {
      role: "participante", nome: p.nome, email: p.email,
      cpf: p.cpf, instituicao: p.instituicao, cargo: p.cargo,
      sexo: p.sexo, credenciado: p.credenciado,
    });
    console.log(`✓ ${uid}`);
  }

  console.log("\n=== Concluído! ===\n");
  console.log("Próximos passos:");
  console.log("  1. Execute scripts/seed-forum.js para criar tópicos iniciais do fórum");
  console.log("  2. Configure .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY");
  console.log("  3. npm run dev\n");
}

main().catch(console.error);

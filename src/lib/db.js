/**
 * ENAUDIN — Operações de banco de dados (Supabase)
 *
 * Todas as funções retornam { data, error } no padrão do supabase-js.
 * O App.jsx e os componentes podem fazer updates otimistas localmente
 * e chamar estas funções em background para persistir.
 */

import { supabase } from "./supabase";

// ── LEITURA INICIAL ───────────────────────────────────────────

export async function fetchInstituicoes() {
  const { data, error } = await supabase
    .from("instituicoes")
    .select("*")
    .order("sigla");
  return { data: data ?? [], error };
}

export async function inserirInstituicao({ sigla, nome, ativo = true }) {
  const { data, error } = await supabase
    .from("instituicoes")
    .insert({ sigla, nome, ativo })
    .select()
    .single();
  return { data, error };
}

export async function atualizarInstituicao(id, updates) {
  const { error } = await supabase
    .from("instituicoes")
    .update(updates)
    .eq("id", id);
  return { error };
}

export async function deletarInstituicao(id) {
  const { error } = await supabase
    .from("instituicoes")
    .delete()
    .eq("id", id);
  return { error };
}

export async function fetchEvent() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("id")
    .limit(1)
    .single();
  return { data, error };
}

export async function fetchAtividades() {
  const { data, error } = await supabase
    .from("atividades")
    .select("*")
    .order("dia")
    .order("horario");
  return { data: data ?? [], error };
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("nome");
  return { data: data ?? [], error };
}

export async function fetchPresencas() {
  const { data, error } = await supabase
    .from("presencas")
    .select("*");
  return { data: data ?? [], error };
}

export async function fetchAvaliacoes() {
  const { data, error } = await supabase
    .from("avaliacoes")
    .select("*");
  return { data: data ?? [], error };
}

export async function fetchForumConfig() {
  const { data, error } = await supabase
    .from("forum_config")
    .select("*")
    .limit(1)
    .single();
  return { data, error };
}

function normalizeTopico(t) {
  return {
    ...t,
    autor_id:   t.user_id,
    autor_nome: t.autor?.nome  ?? "?",
    autor_role: t.autor?.role  ?? "participante",
    removido:   false,
    destaque:   false,
    respostas: (t.respostas ?? []).map(r => ({
      ...r,
      autor_id:   r.user_id,
      autor_nome: r.autor?.nome  ?? "?",
      autor_role: r.autor?.role  ?? "participante",
    })),
  };
}

export async function fetchTopicos() {
  const { data, error } = await supabase
    .from("topicos")
    .select(`
      *,
      autor:profiles!user_id(id,nome,role,foto_iniciais),
      respostas(
        *,
        autor:profiles!user_id(id,nome,role,foto_iniciais)
      )
    `)
    .order("fixado", { ascending: false })
    .order("created_at", { ascending: false });
  return { data: (data ?? []).map(normalizeTopico), error };
}

export function normalizeTopicoSingle(t) { return normalizeTopico(t); }

export async function fetchPontuacoes() {
  const { data, error } = await supabase
    .from("pontuacoes")
    .select("*");
  return { data: data ?? [], error };
}

// ── PRESENÇAS ─────────────────────────────────────────────────

export async function inserirPresenca(participante_id, atividade_id) {
  const { data, error } = await supabase
    .from("presencas")
    .insert({ participante_id, atividade_id })
    .select()
    .single();
  return { data, error };
}

export async function deletarPresenca(id) {
  const { error } = await supabase
    .from("presencas")
    .delete()
    .eq("id", id);
  return { error };
}

// ── AVALIAÇÕES ────────────────────────────────────────────────

export async function salvarAvaliacao({ user_id, atividade_id, nota, comentario }) {
  const { data, error } = await supabase
    .from("avaliacoes")
    .upsert({ user_id, atividade_id, nota, comentario }, { onConflict: "user_id,atividade_id" })
    .select()
    .single();
  return { data, error };
}

// ── PONTUAÇÕES ────────────────────────────────────────────────

export async function inserirPontuacao({ user_id, tipo, valor, desc }) {
  const { data, error } = await supabase
    .from("pontuacoes")
    .insert({ user_id, tipo, valor, descricao: desc })
    .select()
    .single();
  return { data, error };
}

// ── FÓRUM — TÓPICOS ───────────────────────────────────────────

export async function criarTopico({ event_id = 1, user_id, categoria, titulo, corpo }) {
  const { data, error } = await supabase
    .from("topicos")
    .insert({ event_id, user_id, categoria, titulo, corpo })
    .select(`*, autor:profiles!user_id(id,nome,role,foto_iniciais)`)
    .single();
  return { data, error };
}

export async function curtirTopico(topicoId, uid, curtidas) {
  // curtidas é o array local já atualizado (adiciona ou remove uid)
  const { data, error } = await supabase
    .from("topicos")
    .update({ curtidas })
    .eq("id", topicoId)
    .select("curtidas")
    .single();
  return { data, error };
}

export async function fixarTopico(topicoId, fixado) {
  const { error } = await supabase
    .from("topicos")
    .update({ fixado })
    .eq("id", topicoId);
  return { error };
}

export async function bloquearTopico(topicoId, bloqueado) {
  const { error } = await supabase
    .from("topicos")
    .update({ bloqueado })
    .eq("id", topicoId);
  return { error };
}

export async function deletarTopico(topicoId) {
  const { error } = await supabase
    .from("topicos")
    .delete()
    .eq("id", topicoId);
  return { error };
}

// ── FÓRUM — RESPOSTAS ─────────────────────────────────────────

export async function criarResposta({ topico_id, user_id, corpo }) {
  const { data, error } = await supabase
    .from("respostas")
    .insert({ topico_id, user_id, corpo })
    .select(`*, autor:profiles!user_id(id,nome,role,foto_iniciais)`)
    .single();
  return { data, error };
}

export async function curtirResposta(respostaId, curtidas) {
  const { data, error } = await supabase
    .from("respostas")
    .update({ curtidas })
    .eq("id", respostaId)
    .select("curtidas")
    .single();
  return { data, error };
}

export async function deletarResposta(respostaId) {
  const { error } = await supabase
    .from("respostas")
    .delete()
    .eq("id", respostaId);
  return { error };
}

// ── FÓRUM CONFIG ─────────────────────────────────────────────

export async function atualizarForumConfig(id, updates) {
  const { error } = await supabase
    .from("forum_config")
    .update(updates)
    .eq("id", id);
  return { error };
}

// ── EVENTO ───────────────────────────────────────────────────

export async function atualizarEvento(id, updates) {
  const { error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id);
  return { error };
}

// ── ATIVIDADES ────────────────────────────────────────────────

export async function inserirAtividade(atv) {
  const { data, error } = await supabase
    .from("atividades")
    .insert(atv)
    .select()
    .single();
  return { data, error };
}

export async function atualizarAtividade(id, updates) {
  const { error } = await supabase
    .from("atividades")
    .update(updates)
    .eq("id", id);
  return { error };
}

// ── MATERIAIS (Storage) ──────────────────────────────────────

export async function uploadMaterial(atvId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `atividade-${atvId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("materiais").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("materiais").getPublicUrl(path);
  return {
    id: Date.now(),
    nome: file.name,
    url: publicUrl,
    tamanho: file.size,
    tipo: file.type,
    path,
    criado_em: new Date().toISOString(),
  };
}

export async function deletarMaterial(path) {
  const { error } = await supabase.storage.from("materiais").remove([path]);
  if (error) throw error;
}

export async function deletarAtividade(id) {
  const { error } = await supabase
    .from("atividades")
    .delete()
    .eq("id", id);
  return { error };
}

// ── PROFILES (admin) ─────────────────────────────────────────

export async function atualizarProfile(id, updates) {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id);
  return { error };
}

export async function atualizarCredenciamento(participante_id, credenciado) {
  const { error } = await supabase
    .from("profiles")
    .update({ credenciado })
    .eq("id", participante_id);
  return { error };
}

/**
 * ENAUDIN — Operações de banco de dados (Supabase)
 *
 * Todas as funções retornam { data, error } no padrão do supabase-js.
 * O App.jsx e os componentes podem fazer updates otimistas localmente
 * e chamar estas funções em background para persistir.
 */

import { supabase } from "./supabase";

// ── AVATARES ─────────────────────────────────────────────────

export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop();
  const path = `${userId}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatares").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from("avatares").getPublicUrl(path);
  const { error: updateError } = await supabase.from("profiles").update({ foto_url: publicUrl }).eq("id", userId);
  if (updateError) throw new Error("Storage ok, mas falhou ao salvar URL no perfil: " + updateError.message);
  return publicUrl;
}

// ── CONVIDADOS PROSPECÇÃO ────────────────────────────────────

export async function fetchConvidados() {
  const { data, error } = await supabase
    .from("convidados_prospeccao")
    .select("*")
    .order("nome");
  return { data: data ?? [], error };
}

export async function inserirConvidado({ nome, email, instituicao, event_id = 1 }) {
  const { data, error } = await supabase
    .from("convidados_prospeccao")
    .insert({ nome, email: email.toLowerCase().trim(), instituicao, event_id, status: "pendente" })
    .select()
    .single();
  return { data, error };
}

export async function inserirConvidadosLote(rows) {
  const normalized = rows.map(r => ({
    nome: r.nome,
    email: r.email.toLowerCase().trim(),
    instituicao: r.instituicao || null,
    event_id: r.event_id ?? 1,
    status: "pendente",
  }));
  const { data, error } = await supabase
    .from("convidados_prospeccao")
    .upsert(normalized, { onConflict: "email,event_id", ignoreDuplicates: true })
    .select();
  return { data, error };
}

export async function atualizarConvidado(id, updates) {
  const { error } = await supabase
    .from("convidados_prospeccao")
    .update(updates)
    .eq("id", id);
  return { error };
}

export async function deletarConvidado(id) {
  const { error } = await supabase
    .from("convidados_prospeccao")
    .delete()
    .eq("id", id);
  return { error };
}

export async function marcarEmailEnviado(ids) {
  const { error } = await supabase
    .from("convidados_prospeccao")
    .update({ email_enviado: true })
    .in("id", ids);
  return { error };
}

// ── FOLLOWS ───────────────────────────────────────────────────

export async function fetchFollows() {
  const { data, error } = await supabase.from("follows").select("*");
  return { data, error };
}

export async function seguirUsuario(follower_id, following_id) {
  const { error } = await supabase.from("follows").insert({ follower_id, following_id });
  return { error };
}

export async function desseguirUsuario(follower_id, following_id) {
  const { error } = await supabase.from("follows")
    .delete().eq("follower_id", follower_id).eq("following_id", following_id);
  return { error };
}

// ── GAMIFICAÇÃO CONFIG ────────────────────────────────────────

export async function fetchGamificacaoConfig() {
  const { data, error } = await supabase
    .from("configuracoes_gamificacao")
    .select("*")
    .limit(1)
    .single();
  return { data, error };
}

export async function salvarGamificacaoConfig(id, updates) {
  const { error } = await supabase
    .from("configuracoes_gamificacao")
    .update(updates)
    .eq("id", id);
  return { error };
}

// ── LEITURA INICIAL ───────────────────────────────────────────

export async function fetchInstituicoes() {
  const { data, error } = await supabase
    .from("instituicoes")
    .select("*")
    .order("sigla");
  return { data: data ?? [], error };
}

// Cadastra a instituição digitada em "Outra" na inscrição (RPC pois RLS de
// instituicoes só permite insert direto para admin — participante/anon não pode).
// Retorna a linha criada (ou a existente, se já havia uma com a mesma sigla).
export async function registrarInstituicaoLivre(sigla, nome) {
  const { data, error } = await supabase.rpc("registrar_instituicao_livre", { p_sigla: sigla, p_nome: nome });
  return { data, error };
}

export async function inserirInstituicao({ sigla, nome, ativo = true, realizadora = false, ordem = null }) {
  const { data, error } = await supabase
    .from("instituicoes")
    .insert({ sigla, nome, ativo, realizadora, ordem })
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

export async function uploadLogoInstituicao(instId, file) {
  const ext = file.name.split(".").pop();
  const path = `instituicao-${instId}/logo.${ext}`;
  const { error } = await supabase.storage.from("cert-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("cert-assets").getPublicUrl(path);
  await supabase.from("instituicoes").update({ logo_url: publicUrl }).eq("id", instId);
  return publicUrl;
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
  // A tabela completa (com CPF/e-mail) só é visível para admin/credenciador,
  // além da própria linha e dos palestrantes públicos. Os demais perfis vêm
  // da view profiles_rede (sem dados pessoais) e são mesclados por id.
  const [{ data: completos, error }, { data: rede }] = await Promise.all([
    supabase.from("profiles").select("*").order("nome"),
    supabase.from("profiles_rede").select("*").order("nome"),
  ]);
  if ((completos?.length ?? 0) >= (rede?.length ?? 0)) {
    return { data: completos ?? [], error };
  }
  const porId = new Map(rede.map(p => [p.id, p]));
  for (const p of completos ?? []) porId.set(p.id, { ...porId.get(p.id), ...p });
  const merged = [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  return { data: merged, error: null };
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
  // A UI usa estrelas/participante_id; o banco usa nota/user_id
  const normalizadas = (data ?? []).map(a => ({ ...a, estrelas: a.nota, participante_id: a.user_id }));
  return { data: normalizadas, error };
}

// ── LOGS DE AUDITORIA ────────────────────────────────────────

export async function fetchLogs() {
  const { data, error } = await supabase
    .from("logs_auditoria")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(500);
  return { data: data ?? [], error };
}

// Best-effort: falha ao registrar log nunca deve travar a ação real.
// A RPC (security definer) carimba o autor pelo JWT e ignora chamadas
// de quem não for admin/credenciador — não confia em nada do cliente.
export function registrarLog(acao, alvoTipo = null, alvoId = null, alvoNome = null, detalhes = {}) {
  supabase.rpc("registrar_log", {
    p_acao: acao,
    p_alvo_tipo: alvoTipo,
    p_alvo_id: alvoId != null ? String(alvoId) : null,
    p_alvo_nome: alvoNome,
    p_detalhes: detalhes,
  }).then(({ error }) => { if (error) console.error("Erro ao registrar log:", error.message); });
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
      autor:profiles_rede!user_id(id,nome,role,foto_iniciais),
      respostas(
        *,
        autor:profiles_rede!user_id(id,nome,role,foto_iniciais)
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

// Check-in via QR Code: o servidor valida o token e resolve o participante
// (usuário logado ou CPF no fluxo anônimo). Pontos vêm do trigger.
export async function registrarPresencaQR(atividadeId, token, cpf = null) {
  const { data, error } = await supabase.rpc("registrar_presenca_qr", {
    p_atividade_id: Number(atividadeId),
    p_token: token ?? "",
    ...(cpf ? { p_cpf: cpf } : {}),
  });
  return { data, error };
}

// Token do QR de uma atividade — visível para admin, credenciador e
// palestrantes da atividade (RLS em atividade_qr_tokens)
export async function fetchQrToken(atividadeId) {
  const { data } = await supabase
    .from("atividade_qr_tokens")
    .select("token")
    .eq("atividade_id", atividadeId)
    .maybeSingle();
  return data?.token ?? null;
}

// Registro direto (admin/credenciador via painel)
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

// ── PESQUISA DE SATISFAÇÃO ───────────────────────────────────

export async function fetchPerguntasPesquisa() {
  const { data, error } = await supabase
    .from("pesquisa_perguntas")
    .select("*")
    .order("ordem");
  return { data: data ?? [], error };
}

export async function inserirPerguntaPesquisa(pergunta) {
  const { data, error } = await supabase
    .from("pesquisa_perguntas")
    .insert(pergunta)
    .select()
    .single();
  return { data, error };
}

export async function atualizarPerguntaPesquisa(id, updates) {
  const { error } = await supabase
    .from("pesquisa_perguntas")
    .update(updates)
    .eq("id", id);
  return { error };
}

export async function deletarPerguntaPesquisa(id) {
  const { error } = await supabase
    .from("pesquisa_perguntas")
    .delete()
    .eq("id", id);
  return { error };
}

export async function fetchMinhasRespostasPesquisa(participanteId) {
  const { data, error } = await supabase
    .from("pesquisa_respostas")
    .select("*")
    .eq("participante_id", participanteId);
  return { data: data ?? [], error };
}

// Admin: todas as respostas, para a tela de resultados
export async function fetchRespostasPesquisa() {
  const { data, error } = await supabase
    .from("pesquisa_respostas")
    .select("*");
  return { data: data ?? [], error };
}

export async function salvarRespostaPesquisa({ pergunta_id, participante_id, resposta_opcao, resposta_texto }) {
  const { data, error } = await supabase
    .from("pesquisa_respostas")
    .upsert({ pergunta_id, participante_id, resposta_opcao, resposta_texto }, { onConflict: "pergunta_id,participante_id" })
    .select()
    .single();
  return { data, error };
}

// ── PERGUNTAS AO VIVO ─────────────────────────────────────────

export async function fetchLivePerguntas(eventId) {
  const { data, error } = await supabase
    .from("live_perguntas")
    .select("*")
    .eq("event_id", eventId)
    .order("criado_em", { ascending: false });
  return { data: data ?? [], error };
}

function gerarCodigoLive() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Código de 4 dígitos é único por evento — em caso raro de colisão, gera
// outro e tenta de novo (até 5x).
export async function criarLivePergunta({ event_id, texto, opcoes }) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data, error } = await supabase
      .from("live_perguntas")
      .insert({ event_id, texto, opcoes, codigo: gerarCodigoLive() })
      .select()
      .single();
    if (!error) return { data, error: null };
    if (error.code !== "23505") return { data: null, error };
  }
  return { data: null, error: { message: "Não foi possível gerar um código único. Tente novamente." } };
}

export async function fetchLivePerguntaPorCodigo(eventId, codigo) {
  const { data, error } = await supabase
    .from("live_perguntas")
    .select("*")
    .eq("event_id", eventId)
    .eq("codigo", codigo)
    .eq("status", "aberta")
    .maybeSingle();
  return { data, error };
}

export async function atualizarLivePergunta(id, { texto, opcoes }) {
  const { error } = await supabase
    .from("live_perguntas")
    .update({ texto, opcoes })
    .eq("id", id);
  return { error };
}

export async function atualizarStatusLivePergunta(id, status) {
  const { error } = await supabase
    .from("live_perguntas")
    .update({ status })
    .eq("id", id);
  return { error };
}

export async function deletarLivePergunta(id) {
  const { error } = await supabase
    .from("live_perguntas")
    .delete()
    .eq("id", id);
  return { error };
}

export async function fetchLiveRespostas(perguntaId) {
  const { data, error } = await supabase
    .from("live_respostas")
    .select("*")
    .eq("pergunta_id", perguntaId);
  return { data: data ?? [], error };
}

export async function fetchMinhaLiveResposta(perguntaId, participanteId) {
  const { data, error } = await supabase
    .from("live_respostas")
    .select("*")
    .eq("pergunta_id", perguntaId)
    .eq("participante_id", participanteId)
    .maybeSingle();
  return { data, error };
}

export async function responderLivePergunta({ pergunta_id, participante_id, opcao }) {
  const { data, error } = await supabase
    .from("live_respostas")
    .insert({ pergunta_id, participante_id, opcao })
    .select()
    .single();
  return { data, error };
}

// ── PONTUAÇÕES ────────────────────────────────────────────────
// Pontos são concedidos por triggers no banco (presença, tópico,
// resposta, curtida, avaliação, seguir) — o cliente não insere mais.

// ── FÓRUM — TÓPICOS ───────────────────────────────────────────

export async function criarTopico({ event_id = 1, user_id, categoria, titulo, corpo }) {
  const { data, error } = await supabase
    .from("topicos")
    .insert({ event_id, user_id, categoria, titulo, corpo })
    .select(`*, autor:profiles_rede!user_id(id,nome,role,foto_iniciais)`)
    .single();
  return { data, error };
}

export async function curtirTopico(topicoId) {
  // RPC no servidor: alterna a curtida do usuário logado e concede/estorna
  // os pontos do autor (update direto era bloqueado pelo RLS para não-autores)
  const { data, error } = await supabase.rpc("curtir_topico", { p_topico_id: topicoId });
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
    .select(`*, autor:profiles_rede!user_id(id,nome,role,foto_iniciais)`)
    .single();
  return { data, error };
}

export async function curtirResposta(respostaId) {
  const { data, error } = await supabase.rpc("curtir_resposta", { p_resposta_id: respostaId });
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

export async function uploadEventLogo(eventId, file) {
  const ext = file.name.split(".").pop();
  const path = `evento-${eventId}/logo.${ext}`;
  const { error } = await supabase.storage.from("cert-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("cert-assets").getPublicUrl(path);
  await supabase.from("events").update({ logo_url: publicUrl }).eq("id", eventId);
  return publicUrl;
}

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

// ── CONVITE (Storage) ─────────────────────────────────────────

export async function uploadConviteAnexo(eventId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${eventId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("convite-anexos").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("convite-anexos").getPublicUrl(path);
  return publicUrl;
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

// ── TURNOS (modo de frequência "por turno") ──────────────────
// Entidade independente das atividades: nome, dia e carga horária
// próprios. Presença é registrada em presencas_turno, com QR e
// RPC próprios (registrar_presenca_turno_qr), espelhando o fluxo
// de atividades sem misturar as duas tabelas.

export async function fetchTurnos() {
  const { data, error } = await supabase
    .from("turnos")
    .select("*")
    .order("dia")
    .order("horario_inicio");
  return { data: data ?? [], error };
}

export async function inserirTurno(turno) {
  const { data, error } = await supabase
    .from("turnos")
    .insert(turno)
    .select()
    .single();
  return { data, error };
}

export async function atualizarTurno(id, updates) {
  const { error } = await supabase
    .from("turnos")
    .update(updates)
    .eq("id", id);
  return { error };
}

export async function deletarTurno(id) {
  const { error } = await supabase
    .from("turnos")
    .delete()
    .eq("id", id);
  return { error };
}

export async function fetchPresencasTurno() {
  const { data, error } = await supabase
    .from("presencas_turno")
    .select("*");
  return { data: data ?? [], error };
}

// Registro direto (admin/credenciador via painel)
export async function inserirPresencaTurno(participante_id, turno_id) {
  const { data, error } = await supabase
    .from("presencas_turno")
    .insert({ participante_id, turno_id })
    .select()
    .single();
  return { data, error };
}

export async function deletarPresencaTurno(id) {
  const { error } = await supabase
    .from("presencas_turno")
    .delete()
    .eq("id", id);
  return { error };
}

// Token do QR de um turno — visível para admin e credenciador (RLS em turno_qr_tokens)
export async function fetchQrTokenTurno(turnoId) {
  const { data } = await supabase
    .from("turno_qr_tokens")
    .select("token")
    .eq("turno_id", turnoId)
    .maybeSingle();
  return data?.token ?? null;
}

// Check-in via QR Code de turno: o servidor valida o token e resolve o
// participante (usuário logado ou CPF), creditando presença no turno inteiro.
export async function registrarPresencaTurnoQR(turnoId, token, cpf = null) {
  const { data, error } = await supabase.rpc("registrar_presenca_turno_qr", {
    p_turno_id: Number(turnoId),
    p_token: token ?? "",
    ...(cpf ? { p_cpf: cpf } : {}),
  });
  return { data, error };
}

// ── PROFILES (admin) ─────────────────────────────────────────

// ── Inscrições por evento ─────────────────────────────────────
export async function inserirEnrollment(userId, role = "participante", eventId = 1) {
  const { error } = await supabase
    .from("event_enrollments")
    .upsert({ event_id: eventId, user_id: userId, role, ativo: true, cancelado_em: null }, { onConflict: "event_id,user_id" });
  return { error };
}

export async function cancelarInscricao(userId, motivo = "", eventId = 1) {
  const { error: e1 } = await supabase
    .from("event_enrollments")
    .upsert({ event_id: eventId, user_id: userId, ativo: false, cancelado_em: new Date().toISOString(), motivo_cancelamento: motivo || null }, { onConflict: "event_id,user_id" });
  const { error: e2 } = await supabase
    .from("profiles")
    .update({ ativo: false })
    .eq("id", userId);
  return { error: e1 || e2 };
}

export async function reativarInscricao(userId, eventId = 1) {
  const { error: e1 } = await supabase
    .from("event_enrollments")
    .upsert({ event_id: eventId, user_id: userId, ativo: true, cancelado_em: null }, { onConflict: "event_id,user_id" });
  const { error: e2 } = await supabase
    .from("profiles")
    .update({ ativo: true })
    .eq("id", userId);
  return { error: e1 || e2 };
}

export async function adicionarComoParticipante(userId, primaryRole, currentRoles, eventId = 1) {
  const base = currentRoles?.length ? currentRoles : [primaryRole];
  const roles = [...new Set([...base, "participante"])];
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    inserirEnrollment(userId, "participante", eventId),
    supabase.from("profiles").update({ roles }).eq("id", userId),
  ]);
  return { roles, error: e1 || e2 };
}

export async function removerComoParticipante(userId, primaryRole, currentRoles, eventId = 1) {
  const filtrado = (currentRoles?.length ? currentRoles : [primaryRole]).filter(r => r !== "participante");
  const roles = filtrado.length > 1 ? filtrado : null;
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("event_enrollments").delete().match({ event_id: eventId, user_id: userId }),
    supabase.from("profiles").update({ roles }).eq("id", userId),
  ]);
  return { roles, error: e1 || e2 };
}

export async function atualizarProfile(id, updates) {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id);
  return { error };
}

export async function deletarParticipante(id) {
  // 1. Remove enrollment primeiro para evitar violação de FK (caso o CASCADE não esteja configurado)
  await supabase.from("event_enrollments").delete().eq("user_id", id);
  // 2. Remove o registro de autenticação (requer função RPC com SECURITY DEFINER)
  const { error: authError } = await supabase.rpc("admin_delete_auth_user", { user_id: id });
  if (authError) return { error: authError };
  // 3. Remove o profile
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  return { error };
}

// Cria um usuário de auth + profile via Edge Function com service role.
// Requer a Edge Function "admin-create-user" deployada no Supabase.
export async function adminCriarUsuario({ nome, email, cpf, cargo, instituicao, role, senha, titulo, area, mini_bio, destaque }) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { nome, email, cpf, cargo, instituicao, role, senha, titulo, area, mini_bio, destaque },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) {
    // Tenta extrair a mensagem real do corpo da resposta
    try {
      const body = await error.context?.json?.();
      if (body?.error) return { data: null, error: { message: body.error } };
    } catch { /* corpo não é JSON — mantém o erro original */ }
  }
  return { data, error };
}

// Atualiza o e-mail de login via Admin API (sem e-mail de confirmação).
// Requer a Edge Function "update-auth-email" deployada no Supabase.
export async function atualizarEmailAuth(userId, email) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("update-auth-email", {
    body: { user_id: userId, email },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  return { data, error };
}

// Admin redefine a senha de outro usuário (Admin API — requer a Edge
// Function "update-auth-password" deployada no Supabase).
export async function atualizarSenhaAuth(userId, senha) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("update-auth-password", {
    body: { user_id: userId, password: senha },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  return { data, error };
}


export async function uploadCertificado(participanteId, file) {
  const ext = file.name.split(".").pop();
  const path = `${participanteId}.${ext}`;
  const { error } = await supabase.storage.from("certificados").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("certificados").getPublicUrl(path);
  await supabase.from("profiles").update({ certificado_url: publicUrl }).eq("id", participanteId);
  return publicUrl;
}

// Upload de assets do certificado (logos, assinaturas) — bucket: cert-assets
export async function uploadCertAsset(eventId, campo, file) {
  const ext = file.name.split(".").pop();
  const path = `evento-${eventId}/${campo}.${ext}`;
  const { error } = await supabase.storage.from("cert-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("cert-assets").getPublicUrl(path);
  return publicUrl;
}

export async function atualizarCredenciamento(participante_id, credenciado) {
  const credenciado_em = credenciado ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("profiles")
    .update({ credenciado, credenciado_em })
    .eq("id", participante_id);
  return { error };
}

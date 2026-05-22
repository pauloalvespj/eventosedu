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
  const { error } = await supabase.storage.from("avatares").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("avatares").getPublicUrl(path);
  await supabase.from("profiles").update({ foto_url: publicUrl }).eq("id", userId);
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

// ── Inscrições por evento ─────────────────────────────────────
export async function inserirEnrollment(userId, role = "participante", eventId = 1) {
  const { error } = await supabase
    .from("event_enrollments")
    .upsert({ event_id: eventId, user_id: userId, role, ativo: true, cancelado_em: null }, { onConflict: "event_id,user_id" });
  return { error };
}

export async function cancelarInscricao(userId, eventId = 1) {
  const { error: e1 } = await supabase
    .from("event_enrollments")
    .upsert({ event_id: eventId, user_id: userId, ativo: false, cancelado_em: new Date().toISOString() }, { onConflict: "event_id,user_id" });
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
    } catch {}
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

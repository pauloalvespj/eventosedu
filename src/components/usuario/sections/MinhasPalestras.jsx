import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faUpload, faTrash } from "@fortawesome/free-solid-svg-icons";
import { formatData, diaSemana, qrPresencaValue } from "../../../utils/helpers";
import { TipoBadge, QRCodeCanvas, StarRating } from "../../base/index";
import { uploadMaterial, deletarMaterial, atualizarAtividade } from "../../../lib/db";
import { useUsuario } from "../UsuarioContext";

export function MinhasPalestras() {
  const { atividades, setAtividades, presencas, avaliacoes, minhasPalestras, qrTokens } = useUsuario();
  const [uploadingId, setUploadingId] = useState(null);
  const fileRefs = useRef({});

  async function handleUploadMaterial(atividadeId, file) {
    setUploadingId(atividadeId);
    try {
      const mat = await uploadMaterial(atividadeId, file);
      const atvAtualizada = atividades.find(a => a.id === atividadeId);
      const novosMats = [...(atvAtualizada?.materiais || []), mat];
      await atualizarAtividade(atividadeId, { materiais: novosMats });
      if (setAtividades) setAtividades(prev => prev.map(a => a.id === atividadeId ? { ...a, materiais: novosMats } : a));
    } catch (e) {
      console.error("Erro ao fazer upload:", e.message);
    } finally {
      setUploadingId(null);
    }
  }

  async function handleRemoverMaterial(atividadeId, mat) {
    if (!confirm(`Remover "${mat.nome}"?`)) return;
    const atvAtualizada = atividades.find(a => a.id === atividadeId);
    const novosMats = (atvAtualizada?.materiais || []).filter(m => m.id !== mat.id);
    await deletarMaterial(mat.path);
    await atualizarAtividade(atividadeId, { materiais: novosMats });
    if (setAtividades) setAtividades(prev => prev.map(a => a.id === atividadeId ? { ...a, materiais: novosMats } : a));
  }

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"1.5rem" }}>🎙 Minhas Palestras & QR Codes</h2>
      {minhasPalestras.length === 0 ? (
        <div style={{ textAlign:"center", padding:"3rem", color:"var(--text2)" }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>🎙</div>
          <p>Nenhuma palestra associada ao seu perfil.</p>
        </div>
      ) : minhasPalestras.map(a => {
        const nPres = presencas.filter(p => p.atividade_id === a.id).length;
        const avsAtv = avaliacoes.filter(av => av.atividade_id === a.id);
        const mediaAvs = avsAtv.length ? avsAtv.reduce((s,av)=>s+av.estrelas,0)/avsAtv.length : 0;
        return (
          <div key={a.id} className="presenca-card" style={{ borderLeft:"4px solid var(--teal)", marginBottom:"1.25rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem" }}>
              <div>
                <div style={{ marginBottom:4 }}><TipoBadge tipo={a.tipo}/></div>
                <h3 style={{ fontWeight:700, color:"var(--navy)", fontSize:"1rem", marginBottom:"0.25rem" }}>{a.titulo}</h3>
                <div style={{ fontSize:"0.82rem", color:"var(--text2)" }}>📅 {diaSemana(a.dia)}, {formatData(a.dia)} · ⏱ {a.horario}{a.horario_fim?`–${a.horario_fim}`:""} · 📍 {a.local}</div>
                <div style={{ marginTop:6, display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                  <span className="prog-ch">{a.carga_horaria}h</span>
                  <span className={`badge badge-${a.conta_certificado?"success":"warn"}`}>{a.conta_certificado?"✓ Cert.":"Não conta"}</span>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:700, color:"var(--teal)" }}>{nPres}</div>
                <div style={{ fontSize:"0.75rem", color:"var(--text3)" }}>presentes</div>
              </div>
            </div>
            {a.descricao && <p style={{ fontSize:"0.85rem", color:"var(--text2)", marginBottom:"1rem", lineHeight:1.6 }}>{a.descricao}</p>}

            {/* Avaliações recebidas */}
            {avsAtv.length > 0 && (
              <div style={{ background:"var(--gold-pale)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:"var(--radius-sm)", padding:"1rem", marginBottom:"1rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem", flexWrap:"wrap", gap:"0.5rem" }}>
                  <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.88rem" }}>⭐ Avaliações dos participantes</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <StarRating value={Math.round(mediaAvs)} readonly size={18}/>
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", fontWeight:700, color:"var(--gold)" }}>{mediaAvs.toFixed(1)}</span>
                    <span style={{ fontSize:"0.75rem", color:"var(--text3)" }}>({avsAtv.length})</span>
                  </div>
                </div>
                {/* Distribuição */}
                <div style={{ marginBottom:"0.75rem" }}>
                  {[5,4,3,2,1].map(n => {
                    const cnt = avsAtv.filter(av=>av.estrelas===n).length;
                    return (
                      <div key={n} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:"0.72rem", color:"var(--text2)", width:10, fontWeight:600 }}>{n}</span>
                        <span style={{ color:"#c9a84c", fontSize:12 }}>★</span>
                        <div style={{ flex:1, height:6, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${avsAtv.length?(cnt/avsAtv.length)*100:0}%`, background:"var(--gold)", borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:"0.72rem", color:"var(--text3)", width:14 }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Comentários */}
                {avsAtv.filter(av=>av.comentario).map(av => (
                  <div key={av.id} style={{ padding:"0.5rem 0.75rem", background:"#fff", borderRadius:6, marginBottom:4, borderLeft:"2px solid var(--gold)" }}>
                    <StarRating value={av.estrelas} readonly size={13}/>
                    <p style={{ fontSize:"0.82rem", color:"var(--text2)", marginTop:3, fontStyle:"italic" }}>"{av.comentario}"</p>
                  </div>
                ))}
              </div>
            )}
            {avsAtv.length === 0 && (
              <div style={{ fontSize:"0.82rem", color:"var(--text3)", marginBottom:"0.75rem", fontStyle:"italic" }}>Nenhuma avaliação recebida ainda.</div>
            )}

            {/* QR Code */}
            <div style={{ background:"var(--surface2)", borderRadius:"var(--radius)", padding:"1.25rem", display:"flex", gap:"1.5rem", alignItems:"center", flexWrap:"wrap", marginBottom:"1rem" }}>
              <div style={{ textAlign:"center", flexShrink:0 }}>
                {qrTokens[a.id]
                  ? <QRCodeCanvas ref={el => { fileRefs.current[`qr-${a.id}`] = el; }} value={qrPresencaValue(a.id, qrTokens[a.id])} size={140}/>
                  : <div style={{ width:140, height:140, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--surface)", borderRadius:8, color:"var(--text3)", fontSize:"0.8rem" }}>Carregando QR…</div>}
                <button className="btn btn-sm btn-outline" style={{ marginTop:"0.6rem", width:"100%" }}
                  onClick={() => {
                    const canvas = fileRefs.current[`qr-${a.id}`];
                    if (!canvas) return;
                    const link = document.createElement("a");
                    link.href = canvas.toDataURL("image/png");
                    link.download = `qrcode-${a.titulo.replace(/\s+/g,"-").toLowerCase()}.png`;
                    link.click();
                  }}>
                  <FontAwesomeIcon icon={faDownload} style={{ marginRight:4 }} />Baixar QR Code
                </button>
              </div>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"0.5rem", fontSize:"0.9rem" }}>Como usar este QR Code</div>
                <ol style={{ fontSize:"0.85rem", color:"var(--text2)", lineHeight:1.8, paddingLeft:"1.2rem" }}>
                  <li>Exiba no projetor durante a atividade</li>
                  <li>Participantes apontam a câmera</li>
                  <li>Se logados, confirmam com 1 clique</li>
                  <li>Presença registrada automaticamente</li>
                </ol>
              </div>
            </div>

            {/* Materiais */}
            <div style={{ border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"1rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
                <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.88rem" }}>📎 Materiais da Apresentação</div>
                <label className="btn btn-sm btn-outline" style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                  <FontAwesomeIcon icon={faUpload} />
                  {uploadingId === a.id ? "Enviando…" : "Enviar arquivo"}
                  <input type="file" style={{ display:"none" }} disabled={uploadingId === a.id}
                    onChange={e => { if (e.target.files[0]) { handleUploadMaterial(a.id, e.target.files[0]); e.target.value=""; } }} />
                </label>
              </div>
              {(a.materiais || []).length === 0 ? (
                <p style={{ fontSize:"0.82rem", color:"var(--text3)", fontStyle:"italic" }}>Nenhum material enviado ainda.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {(a.materiais || []).map(m => (
                    <div key={m.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"0.4rem 0.6rem", background:"var(--surface2)", borderRadius:6 }}>
                      <a href={m.url} target="_blank" rel="noreferrer"
                        style={{ flex:1, fontSize:"0.83rem", color:"var(--teal)", fontWeight:600, textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        <FontAwesomeIcon icon={faDownload} style={{ marginRight:5 }} />{m.nome}
                      </a>
                      <button className="btn btn-sm btn-danger" style={{ padding:"0.15rem 0.4rem", fontSize:"0.75rem" }}
                        onClick={() => handleRemoverMaterial(a.id, m)}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

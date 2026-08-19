import { formatData, imprimirCertificado } from "../../../utils/helpers";
import { ProgressBar } from "../../base/index";
import { useUsuario } from "../UsuarioContext";

export function Certificado() {
  const { user, event, isPalestrante, minhasPalestras, totalCH_pal, presencaCalc, minasPresencas, atividades } = useUsuario();

  function imprimirCertificadoParticipante() {
    imprimirCertificado(user, event, presencaCalc, minasPresencas, atividades, "participante");
  }

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"1.5rem" }}>
        {isPalestrante ? "🏆 Certificado de Palestrante" : "🏆 Certificado de Participação"}
      </h2>

      {/* Palestrante */}
      {isPalestrante && (
        <div>
          {minhasPalestras.length===0 ? (
            <div style={{ textAlign:"center",padding:"3rem",background:"var(--danger-bg)",borderRadius:"var(--radius)",color:"var(--danger)" }}>
              <div style={{ fontSize:"2rem",marginBottom:"0.75rem" }}>🔒</div>
              <p>Nenhuma palestra associada. O certificado ficará disponível após o cadastro das atividades.</p>
            </div>
          ) : (
            <div>
              <div style={{ background:"var(--success-bg)",border:"1px solid var(--success)",borderRadius:"var(--radius)",padding:"1rem 1.25rem",marginBottom:"1.5rem",fontSize:"0.9rem",color:"var(--success)" }}>
                ✅ Você ministrou {minhasPalestras.length} atividade(s), totalizando <strong>{totalCH_pal}h</strong>.
              </div>
              <div className="cert-preview" style={{ marginBottom:"1.5rem" }}>
                <div style={{ fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",opacity:0.65,marginBottom:"0.5rem" }}>Certificado de Palestrante</div>
                <div style={{ width:48,height:2,background:"var(--gold)",margin:"0 auto 1.5rem" }}/>
                <h2 style={{ marginBottom:"0.25rem",fontSize:"1rem" }}>Certificamos que</h2>
                <h3 style={{ fontSize:"1.75rem",marginBottom:"0.25rem" }}>{user.nome}</h3>
                <div style={{ fontSize:"0.85rem",color:"rgba(255,255,255,0.6)",marginBottom:"1.25rem" }}>{user.titulo}{user.instituicao?` · ${user.instituicao}`:""}</div>
                <p style={{ lineHeight:1.85,fontSize:"0.9rem",color:"var(--white-hi)" }}>
                  atuou como <strong style={{ color:"var(--gold-light)" }}>palestrante convidado(a)</strong> no <strong style={{ color:"var(--gold-light)" }}>{event.nome}</strong>,<br/>
                  realizado de {formatData(event.data_inicio)} a {formatData(event.data_fim)} em {event.local}.
                </p>
                <div style={{ marginTop:"1.25rem",borderTop:"1px solid rgba(201,168,76,0.3)",paddingTop:"1rem" }}>
                  {minhasPalestras.map(a=><div key={a.id} style={{ fontSize:"0.85rem",color:"rgba(255,255,255,0.8)",marginBottom:"0.35rem" }}>• {a.titulo} <span style={{ color:"var(--gold-light)" }}>({a.carga_horaria}h)</span></div>)}
                </div>
                <div style={{ marginTop:"1rem",fontSize:"0.9rem",color:"var(--gold-light)",fontWeight:700 }}>Total: {totalCH_pal}h</div>
              </div>
              <button className="btn btn-gold btn-block" onClick={() => imprimirCertificado(user, event, null, null, null, "palestrante", minhasPalestras, totalCH_pal)}>
                🖨 Imprimir / Salvar PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* Participante */}
      {!isPalestrante && (
        <div>
          <div className="presenca-card" style={{ marginBottom:"1.5rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
              <h3 style={{ fontWeight:700,color:"var(--navy)" }}>Progresso</h3>
              <span className={`badge badge-${presencaCalc.apto?"success":"warn"}`}>{presencaCalc.apto?"APTO":`Faltam ${(presencaCalc.chTotal-presencaCalc.chCumprida).toFixed(1)}h`}</span>
            </div>
            <ProgressBar pct={presencaCalc.pct} minimo={event.percentual_minimo} />
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem",marginTop:"1.25rem" }}>
              {[["CH Cumprida",`${presencaCalc.chCumprida}h`],["CH Total",`${presencaCalc.chTotal}h`],["Percentual",`${presencaCalc.pct}%`]].map(([k,v])=>(
                <div key={k} style={{ textAlign:"center",background:"var(--surface2)",borderRadius:"var(--radius-sm)",padding:"0.75rem" }}>
                  <div style={{ fontSize:"0.72rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.05em" }}>{k}</div>
                  <div style={{ fontSize:"1.25rem",fontWeight:700,color:"var(--navy)",marginTop:"0.2rem" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {presencaCalc.apto ? (
            <div>
              <div className="cert-preview" style={{ marginBottom:"1.5rem" }}>
                <div style={{ fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(255,255,255,0.5)",marginBottom:"0.75rem" }}>Certificado de Participação</div>
                <div style={{ width:48,height:2,background:"var(--gold)",margin:"0 auto 1.5rem" }}/>
                <h2 style={{ marginBottom:"0.25rem",fontSize:"1rem" }}>Certificamos que</h2>
                <h3 style={{ fontSize:"1.75rem",marginBottom:"0.25rem" }}>{user.nome}</h3>
                <div style={{ fontSize:"0.85rem",color:"rgba(255,255,255,0.6)",marginBottom:"1.25rem" }}>{user.cargo} · {user.instituicao}<br/>CPF: {user.cpf}</div>
                <p style={{ lineHeight:1.85,fontSize:"0.9rem",color:"var(--white-hi)" }}>
                  participou do <strong style={{ color:"var(--gold-light)" }}>{event.nome_completo||event.nome}</strong>,<br/>
                  realizado de {formatData(event.data_inicio)} a {formatData(event.data_fim)}, em {event.local}.
                </p>
                <div style={{ marginTop:"1.25rem",display:"inline-block",background:"rgba(201,168,76,0.2)",border:"1px solid rgba(201,168,76,0.5)",borderRadius:"50px",padding:"0.35rem 1.25rem",fontSize:"0.9rem",color:"var(--gold-light)",fontWeight:700 }}>
                  {presencaCalc.chCumprida}h · {presencaCalc.pct}%
                </div>
              </div>
              <button className="btn btn-gold btn-block" onClick={imprimirCertificadoParticipante}>🖨 Imprimir / Salvar PDF</button>
              <p style={{ fontSize:"0.75rem",color:"var(--text3)",textAlign:"center",marginTop:"0.75rem" }}>Escolha "Salvar como PDF" na janela de impressão.</p>
            </div>
          ) : (
            <div style={{ textAlign:"center",padding:"2.5rem",background:"var(--surface)",borderRadius:"var(--radius)",border:"1px dashed var(--danger)" }}>
              <div style={{ fontSize:"2.5rem",marginBottom:"0.75rem" }}>🔒</div>
              <p style={{ fontWeight:700,color:"var(--danger)",marginBottom:"0.5rem" }}>Certificado indisponível</p>
              <p style={{ fontSize:"0.85rem",color:"var(--text2)" }}>Mínimo: <strong>{event.percentual_minimo}%</strong> · Seu atual: <strong>{presencaCalc.pct}%</strong></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

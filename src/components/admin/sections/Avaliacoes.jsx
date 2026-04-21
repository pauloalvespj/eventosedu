import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faStar, faChartBar, faComments } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { formatData } from "../../../utils/helpers";
import { TipoBadge, StarRating } from "../../base/index";

export function Avaliacoes() {
  const { atividades, palestrantes, participantes, avaliacoes, showToast } = useAdmin();

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Avaliações das Palestras</h1><p>Feedback dos participantes por atividade</p></div>
        <button className="btn btn-sm btn-outline" onClick={() => {
          const header = "Atividade,Dia,Palestrante,Avaliações,Média,Comentários\n";
          const rows = atividades.filter(a => a.tipo !== "intervalo" && a.tipo !== "encerramento").map(a => {
            const avs = avaliacoes.filter(av => av.atividade_id === a.id);
            const media = avs.length ? (avs.reduce((s,av)=>s+av.estrelas,0)/avs.length).toFixed(1) : "–";
            const pal = palestrantes.find(p=>(a.palestrantes_ids||[]).includes(p.id));
            const comentarios = avs.filter(av=>av.comentario).map(av=>`"${av.comentario}"`).join(" | ");
            return `"${a.titulo}","${formatData(a.dia)}","${pal?.nome||"–"}",${avs.length},${media},"${comentarios}"`;
          }).join("\n");
          const blob=new Blob([header+rows],{type:"text/csv"});
          const el=document.createElement("a");el.href=URL.createObjectURL(blob);el.download="avaliacoes_palestras.csv";el.click();
          showToast("Exportado!","success");
        }}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Exportar CSV</button>
      </div>

      {/* Resumo */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
        {(() => {
          const total = avaliacoes.length;
          const media = total ? (avaliacoes.reduce((s,a)=>s+a.estrelas,0)/total).toFixed(1) : "–";
          return [
            { n:total, l:"Total de avaliações", ic:faStar, c:"gold" },
            { n:media, l:"Média geral (estrelas)", ic:faChartBar, c:"navy" },
            { n:avaliacoes.filter(a=>a.comentario).length, l:"Com comentário", ic:faComments, c:"teal" },
            { n:avaliacoes.filter(a=>a.estrelas===5).length, l:"Avaliações 5 estrelas", ic:faStar, c:"success" },
          ].map((c,i) => (
            <div key={i} className="dash-card">
              <div className={`dash-card-icon ${c.c}`}><FontAwesomeIcon icon={c.ic} /></div>
              <div className="dash-card-num" style={{ fontSize:"1.5rem" }}>{c.n}</div>
              <div className="dash-card-lbl">{c.l}</div>
            </div>
          ));
        })()}
      </div>

      {/* Por atividade */}
      {atividades.filter(a => a.tipo !== "intervalo" && a.tipo !== "encerramento" && a.tipo !== "solenidade").map(a => {
        const avs = avaliacoes.filter(av => av.atividade_id === a.id);
        if (avs.length === 0) return null;
        const media = avs.reduce((s,av)=>s+av.estrelas,0)/avs.length;
        const dist = [5,4,3,2,1].map(n => ({ n, cnt: avs.filter(av=>av.estrelas===n).length }));
        return (
          <div key={a.id} className="table-wrap" style={{ padding:"1.25rem", marginBottom:"1.25rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem", flexWrap:"wrap", gap:"0.75rem" }}>
              <div>
                <div style={{ marginBottom:4 }}><TipoBadge tipo={a.tipo}/></div>
                <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.95rem" }}>{a.titulo}</div>
                <div style={{ fontSize:"0.82rem", color:"var(--text2)", marginTop:2 }}>{formatData(a.dia)} · {a.horario}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                  <StarRating value={Math.round(media)} readonly size={20}/>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", fontWeight:700, color:"var(--gold)" }}>{media.toFixed(1)}</span>
                </div>
                <div style={{ fontSize:"0.78rem", color:"var(--text3)" }}>{avs.length} avaliação{avs.length!==1?"ões":""}</div>
              </div>
            </div>
            <div style={{ marginBottom:"1rem" }}>
              {dist.map(({ n, cnt }) => (
                <div key={n} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:"0.78rem", color:"var(--text2)", width:12, textAlign:"right", fontWeight:600 }}>{n}</span>
                  <span style={{ color:"#c9a84c", fontSize:14 }}>★</span>
                  <div style={{ flex:1, height:8, background:"var(--border)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${avs.length ? (cnt/avs.length)*100 : 0}%`, background:"var(--gold)", borderRadius:4 }}/>
                  </div>
                  <span style={{ fontSize:"0.75rem", color:"var(--text3)", width:20 }}>{cnt}</span>
                </div>
              ))}
            </div>
            {avs.filter(av=>av.comentario).length > 0 && (
              <div>
                <div style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.5rem" }}>Comentários</div>
                {avs.filter(av=>av.comentario).map(av => {
                  const part = participantes.find(p=>p.id===av.participante_id);
                  return (
                    <div key={av.id} style={{ padding:"0.6rem 0.85rem", background:"var(--surface2)", borderRadius:"var(--radius-sm)", marginBottom:"0.4rem", borderLeft:"3px solid var(--gold)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                        <StarRating value={av.estrelas} readonly size={14}/>
                        <span style={{ fontSize:"0.8rem", fontWeight:600 }}>{part?.nome||"Participante"}</span>
                        {part?.instituicao && <span style={{ fontSize:"0.72rem", color:"var(--text3)" }}>· {part.instituicao}</span>}
                      </div>
                      <p style={{ fontSize:"0.85rem", color:"var(--text2)", fontStyle:"italic", lineHeight:1.5 }}>"{av.comentario}"</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

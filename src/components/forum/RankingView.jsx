import { useState } from "react";
import { getRanking, getNivel, getUserId } from "../../utils/helpers";
import { RoleBadge } from "../base/index";

export function RankingView({ participantes, palestrantes, admins, pontuacoes, user }) {
  const [filtro, setFiltro] = useState("todos");
  const uid = getUserId(user);
  const ranking = getRanking(participantes, palestrantes, admins, pontuacoes);
  const filtrado = filtro==="participantes" ? ranking.filter(r=>r.role==="participante")
    : filtro==="palestrantes" ? ranking.filter(r=>r.role==="palestrante") : ranking;
  const eu = ranking.find(r=>r.uid===uid);
  const minhaPos = ranking.findIndex(r=>r.uid===uid);

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"0.25rem" }}>🏆 Ranking de Engajamento</h2>
      <p style={{ color:"var(--text2)", fontSize:"0.88rem", marginBottom:"1.5rem" }}>Pontos por presença, fórum e interações.</p>

      {eu && (
        <div style={{ background:"linear-gradient(135deg,var(--hero-dark),var(--hero))", borderRadius:"var(--radius)", padding:"1.25rem 1.5rem", marginBottom:"1.5rem", color:"#fff", display:"flex", alignItems:"center", gap:"1.25rem", flexWrap:"wrap" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:800, color:"var(--gold-light)", width:44, textAlign:"center" }}>{minhaPos+1}º</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, marginBottom:"0.2rem" }}>{eu.nome}</div>
            <div style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.6)" }}>{getNivel(eu.pts).icon} {getNivel(eu.pts).label}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:800, color:"var(--gold-light)" }}>{eu.pts}</div>
            <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.5)" }}>pontos</div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.25rem", flexWrap:"wrap" }}>
        {[["todos","Todos"],["participantes","Participantes"],["palestrantes","Palestrantes"]].map(([k,l])=>(
          <button key={k} className={`prog-dia-btn${filtro===k?" active":""}`} onClick={()=>setFiltro(k)}>{l}</button>
        ))}
      </div>

      {/* Pódio */}
      {filtrado.length>=3 && (
        <div style={{ display:"flex", gap:"0.75rem", justifyContent:"center", alignItems:"flex-end", marginBottom:"2rem" }}>
          {[filtrado[1],filtrado[0],filtrado[2]].map((u,i)=>{
            const pos = i===0?2:i===1?1:3;
            const h = pos===1?130:pos===2?100:80;
            const gold = pos===1?"var(--gold)":pos===2?"#c0c0d0":"#cd8040";
            return (
              <div key={u.uid} style={{ textAlign:"center", flex:1, maxWidth:160 }}>
                <div style={{ width:48,height:48,borderRadius:"50%",background:"var(--navy)",border:`3px solid ${gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:"1rem",fontWeight:700,color:"#fff",margin:"0 auto 0.4rem" }}>{u.iniciais}</div>
                <div style={{ fontSize:"0.8rem",fontWeight:700,color:"var(--text)",marginBottom:"0.15rem" }}>{u.nome.split(" ").slice(0,2).join(" ")}</div>
                <div style={{ fontSize:"0.72rem",color:"var(--text3)",marginBottom:"0.4rem" }}>{u.pts} pts</div>
                <div style={{ height:h,background:`linear-gradient(180deg,${gold}55,${gold}22)`,border:`1.5px solid ${gold}`,borderRadius:"8px 8px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"0.5rem" }}>
                  <span style={{ fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",fontWeight:800,color:gold }}>{pos}º</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtrado.map((u,i)=>{
        const isEu = u.uid===uid;
        const nivel = getNivel(u.pts);
        return (
          <div key={u.uid} className={`ranking-row${i===0?" top1":i===1?" top2":i===2?" top3":""}`}
            style={{ borderColor:isEu?"var(--navy)":undefined, background:isEu?"var(--surface2)":undefined }}>
            <div className="rank-pos" style={{ color:i<3?"var(--gold)":"var(--text3)" }}>
              {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}º`}
            </div>
            <div style={{ width:36,height:36,borderRadius:"50%",background:"var(--navy)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.78rem",fontWeight:700,flexShrink:0 }}>{u.iniciais}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700,fontSize:"0.9rem",color:"var(--text)",display:"flex",alignItems:"center",gap:"0.5rem" }}>
                {u.nome.split(" ").slice(0,3).join(" ")}
                {isEu&&<span style={{ fontSize:"0.7rem",color:"var(--teal)",fontWeight:600 }}>você</span>}
              </div>
              <div style={{ fontSize:"0.75rem",color:"var(--text3)" }}>{u.inst}</div>
            </div>
            <span style={{ fontSize:"0.72rem",fontWeight:700,color:nivel.cor,flexShrink:0 }}>{nivel.icon} {nivel.label}</span>
            <RoleBadge role={u.role}/>
            <div className="rank-pts">{u.pts}</div>
          </div>
        );
      })}
      {filtrado.length===0&&<div style={{ textAlign:"center",padding:"3rem",color:"var(--text3)" }}><div style={{ fontSize:"2.5rem",marginBottom:"0.75rem" }}>🏆</div><p>Nenhum participante com pontos.</p></div>}
    </div>
  );
}

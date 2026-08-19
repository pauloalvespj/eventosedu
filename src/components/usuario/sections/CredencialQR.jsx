import { useNavigate } from "react-router-dom";
import { formatData } from "../../../utils/helpers";
import { QRCodeCanvas } from "../../base/index";
import { useUsuario } from "../UsuarioContext";

export function CredencialQR() {
  const { user, event, isPalestrante } = useUsuario();
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1.5rem" }}>
        <button className="btn btn-sm btn-outline" onClick={()=>navigate("/painel")}>← Voltar</button>
        <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",color:"var(--navy)" }}>🪪 Minha Credencial</h2>
      </div>
      <div style={{ background:"var(--hero-gradient)",borderRadius:"var(--radius-lg)",padding:"2rem",color:"#fff",maxWidth:420,marginBottom:"1.5rem",border:"2px solid var(--gold-border)" }}>
        <div style={{ fontSize:"0.7rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--white-low)",marginBottom:"1.25rem" }}>{event.nome} · {isPalestrante?"Palestrante":"Participante"}</div>
        <div style={{ display:"flex",gap:"1rem",alignItems:"flex-start",marginBottom:"1.5rem" }}>
          <div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(201,168,76,0.2)",border:"2px solid var(--gold)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontWeight:700,color:"var(--gold-light)",flexShrink:0 }}>
            {user.foto_iniciais||user.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
          </div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",marginBottom:"0.2rem" }}>{user.nome}</div>
            <div style={{ fontSize:"0.82rem",color:"var(--white-mid)" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
            {user.cpf&&<div style={{ fontSize:"0.78rem",color:"var(--white-low)",marginTop:"0.25rem",fontFamily:"monospace" }}>{user.cpf}</div>}
          </div>
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          {!isPalestrante&&<span className={`badge badge-${user.credenciado?"success":"warn"}`}>{user.credenciado?"✓ Credenciado":"Aguardando"}</span>}
          {isPalestrante&&<span className="badge badge-gold">🎤 Palestrante</span>}
          <div style={{ fontSize:"0.7rem",color:"var(--white-low)",textAlign:"right" }}>
            <div>{formatData(event.data_inicio)}</div><div>a {formatData(event.data_fim)}</div>
          </div>
        </div>
      </div>
      <div className="presenca-card">
        <h3 style={{ fontWeight:700,color:"var(--navy)",marginBottom:"0.5rem" }}>QR Code de Identificação</h3>
        <p style={{ fontSize:"0.85rem",color:"var(--text2)",marginBottom:"1.25rem" }}>Apresente ao credenciador na entrada do evento.</p>
        <div style={{ display:"flex",gap:"2rem",alignItems:"center",flexWrap:"wrap" }}>
          <QRCodeCanvas value={`ENAUDIN:${isPalestrante?"PALESTRANTE":"PARTICIPANTE"}:${(user.cpf||user.email||user.id).toString().replace(/\D/g,"")}`} size={180}/>
          <div>
            <div style={{ fontSize:"0.78rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.25rem" }}>Identificação</div>
            <div style={{ fontFamily:"monospace",fontSize:"1rem",fontWeight:700,color:"var(--navy)",marginBottom:"0.75rem" }}>{user.cpf||user.email}</div>
            <div style={{ fontWeight:600,color:"var(--text)" }}>{user.nome}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

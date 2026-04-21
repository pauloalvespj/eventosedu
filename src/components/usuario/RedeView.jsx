import { useState } from "react";

export function RedeView({ user, participantes, follows, pontosConfig, onSeguir, onDesseguir }) {
  const [busca, setBusca] = useState("");

  const meusSeguindo   = (follows || []).filter(f => f.follower_id  === user.id).map(f => f.following_id);
  const meusSeguidores = (follows || []).filter(f => f.following_id === user.id).map(f => f.follower_id);

  const todos = participantes.filter(p => p.id !== user.id && p.ativo !== false);
  const filtrados = todos.filter(p => {
    const q = busca.toLowerCase();
    return !q || p.nome?.toLowerCase().includes(q) || p.instituicao?.toLowerCase().includes(q);
  });

  const seguindo   = todos.filter(p => meusSeguindo.includes(p.id));
  const seguidores = todos.filter(p => meusSeguidores.includes(p.id));

  function Avatar({ p, size = 36 }) {
    return p.foto_url
      ? <img src={p.foto_url} alt={p.nome} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--gold)", flexShrink:0 }} />
      : <div style={{ width:size, height:size, borderRadius:"50%", background:"var(--navy)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.3, fontWeight:700, flexShrink:0 }}>
          {p.foto_iniciais || p.nome?.split(" ").map(n=>n[0]).slice(0,2).join("")}
        </div>;
  }

  function CardPessoa({ p }) {
    const jaSigo = meusSeguindo.includes(p.id);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0.65rem 0.85rem", background:"var(--surface2)", borderRadius:"var(--radius-sm)", marginBottom:"0.4rem" }}>
        <Avatar p={p} />
        <div style={{ flex:1, overflow:"hidden" }}>
          <div style={{ fontWeight:600, fontSize:"0.88rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nome}</div>
          <div style={{ fontSize:"0.75rem", color:"var(--text3)" }}>{p.instituicao || p.cargo || ""}</div>
        </div>
        <button
          className={`btn btn-sm ${jaSigo ? "btn-outline" : "btn-primary"}`}
          style={{ flexShrink:0 }}
          onClick={() => jaSigo ? onDesseguir(p.id) : onSeguir(p.id)}
        >
          {jaSigo ? "Seguindo" : "+ Seguir"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:"1.5rem" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem", color:"var(--navy)", marginBottom:"0.25rem" }}>Rede de Conexões</div>
        <div style={{ fontSize:"0.85rem", color:"var(--text2)" }}>
          <strong>{meusSeguindo.length}</strong> seguindo · <strong>{meusSeguidores.length}</strong> seguidores
          {(pontosConfig?.seguir ?? 5) > 0 && (
            <span style={{ marginLeft:8, color:"var(--gold)", fontWeight:600 }}>+{pontosConfig?.seguir ?? 5} pts ao seguir</span>
          )}
        </div>
      </div>

      {seguindo.length > 0 && (
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.85rem", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.6rem" }}>
            Seguindo ({seguindo.length})
          </div>
          {seguindo.map(p => <CardPessoa key={p.id} p={p} />)}
        </div>
      )}

      {seguidores.length > 0 && (
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.85rem", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.6rem" }}>
            Seguidores ({seguidores.length})
          </div>
          {seguidores.map(p => <CardPessoa key={p.id} p={p} />)}
        </div>
      )}

      <div>
        <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.85rem", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.6rem" }}>
          Descobrir Participantes
        </div>
        <input className="form-input" placeholder="Buscar por nome ou instituição..." value={busca} onChange={e => setBusca(e.target.value)} style={{ marginBottom:"0.75rem" }} />
        {filtrados.map(p => <CardPessoa key={p.id} p={p} />)}
        {filtrados.length === 0 && (
          <div style={{ color:"var(--text3)", fontSize:"0.85rem", textAlign:"center", padding:"1rem" }}>Nenhum participante encontrado.</div>
        )}
      </div>
    </div>
  );
}

import { formatData } from "../../../utils/helpers";
import { useUsuario } from "../UsuarioContext";

export function PresentesPal() {
  const { presencas, participantes, minhasPalestras } = useUsuario();

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"1.5rem" }}>👥 Participantes nas Minhas Atividades</h2>
      {minhasPalestras.map(a => {
        const lista = presencas.filter(p => p.atividade_id === a.id)
          .map(p => ({ ...p, part: participantes.find(x => x.id === p.participante_id) }))
          .filter(p => p.part);
        return (
          <div key={a.id} style={{ marginBottom:"2rem" }}>
            <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"0.75rem", display:"flex", alignItems:"center", gap:"0.75rem", flexWrap:"wrap" }}>
              <span style={{ background:"var(--navy)", color:"#fff", borderRadius:50, padding:"0.2rem 0.75rem", fontSize:"0.78rem" }}>{formatData(a.dia)}</span>
              {a.titulo}
              <span style={{ color:"var(--text3)", fontSize:"0.82rem", fontWeight:400 }}>({lista.length} presentes)</span>
            </div>
            {lista.length === 0 ? (
              <p style={{ color:"var(--text3)", fontSize:"0.85rem", paddingLeft:"1rem" }}>Sem presenças ainda.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Nome</th><th>Instituição</th><th>Cargo</th><th>Confirmado em</th></tr></thead>
                  <tbody>
                    {lista.map(({ part, data_hora }, i) => (
                      <tr key={i}>
                        <td style={{ color:"var(--text3)", fontSize:"0.82rem" }}>{i+1}</td>
                        <td style={{ fontWeight:500 }}>{part.nome}</td>
                        <td>{part.instituicao}</td>
                        <td>{part.cargo}</td>
                        <td style={{ fontSize:"0.82rem", color:"var(--text3)" }}>{data_hora}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

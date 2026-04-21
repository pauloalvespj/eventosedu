// Select de instituição reutilizável: value = sigla ou texto livre (Outra)
export function InstSelect({ value, onChange, instituicoes = [], className = "form-input" }) {
  const isOutra = value && !(instituicoes).find(i => i.sigla === value);
  const selectVal = isOutra ? "Outra" : (value || "");
  return (
    <>
      <select className={className} value={selectVal} onChange={e => {
        if (e.target.value === "Outra") onChange("");
        else onChange(e.target.value);
      }}>
        <option value="">Selecione</option>
        {instituicoes.filter(i => i.ativo).map(i => (
          <option key={i.id} value={i.sigla}>{i.sigla} – {i.nome}</option>
        ))}
        <option value="Outra">Outra</option>
      </select>
      {selectVal === "Outra" && (
        <input className={className} style={{ marginTop: "0.4rem" }} placeholder="Digite o nome da instituição"
          value={value || ""} onChange={e => onChange(e.target.value)} />
      )}
    </>
  );
}

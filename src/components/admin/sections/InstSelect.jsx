import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { registrarInstituicaoLivre } from "../../../lib/db";

// Select de instituição: fechado parece um campo normal; ao clicar, abre uma
// lista com busca (filtra ao digitar) e "Outra instituição" como último item
// da própria lista. Escolher "Outra" pede sigla e nome (os dois obrigatórios)
// e cadastra a instituição de verdade na tabela instituicoes antes de confirmar.
//
// O painel é renderizado via portal em document.body (não como filho do
// campo) porque este componente costuma estar dentro de um modal com scroll
// próprio — um dropdown posicionado normalmente ali dentro fica cortado. O
// "clicar fora pra fechar" usa um backdrop transparente dentro do MESMO
// portal (em vez de um listener em document) para não depender de como o
// React propaga eventos entre a árvore do portal e a árvore real do DOM.
export function InstSelect({ value, onChange, instituicoes = [], className = "form-input", onCriada }) {
  const ativas = instituicoes.filter(i => i.ativo);
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState("lista"); // "lista" | "outra"
  const [busca, setBusca] = useState("");
  const [outraSigla, setOutraSigla] = useState("");
  const [outraNome, setOutraNome] = useState("");
  const [salvandoOutra, setSalvandoOutra] = useState(false);
  const [rotuloExtra, setRotuloExtra] = useState(null); // label da instituição recém-criada (ainda não está no prop instituicoes)
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const painelRef = useRef(null);
  const buscaRef = useRef(null);

  const selecionada = ativas.find(i => i.sigla === value);
  const rotulo = selecionada ? `${selecionada.sigla} – ${selecionada.nome}` : (rotuloExtra && rotuloExtra.sigla === value ? rotuloExtra.texto : value || "");

  useEffect(() => {
    if (open && modo === "lista") setTimeout(() => buscaRef.current?.focus(), 0);
  }, [open, modo]);

  // Fecha se a página/modal por trás rolar (evita o painel "flutuar"
  // desalinhado) — mas ignora o scroll da própria lista de instituições.
  useEffect(() => {
    if (!open) return;
    function aoRolar(e) {
      if (painelRef.current?.contains(e.target)) return;
      setOpen(false);
      setModo("lista");
    }
    window.addEventListener("scroll", aoRolar, true);
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar, true);
      window.removeEventListener("resize", aoRolar);
    };
  }, [open]);

  function abrir() {
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
    setBusca("");
    setModo("lista");
    setOpen(true);
  }

  function fechar() {
    setOpen(false);
    setModo("lista");
  }

  function selecionar(i) {
    onChange(i.sigla);
    fechar();
  }

  function irParaOutra() {
    setOutraSigla("");
    setOutraNome("");
    setModo("outra");
  }

  async function confirmarOutra() {
    const sigla = outraSigla.trim();
    const nome = outraNome.trim();
    if (!sigla || !nome) return;
    setSalvandoOutra(true);
    const { data } = await registrarInstituicaoLivre(sigla, nome).catch(() => ({ data: null }));
    setSalvandoOutra(false);
    setRotuloExtra({ sigla, texto: `${sigla} – ${nome}` });
    if (data) onCriada?.(data);
    onChange(sigla);
    fechar();
  }

  const termo = busca.trim().toLowerCase();
  const sugestoes = termo
    ? ativas.filter(i => i.sigla.toLowerCase().includes(termo) || i.nome.toLowerCase().includes(termo))
    : ativas;

  const itemStyle = { padding: "0.5rem 0.85rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text)" };
  const hoverIn  = e => e.currentTarget.style.background = "var(--surface2)";
  const hoverOut = e => e.currentTarget.style.background = "transparent";

  return (
    <>
      <button ref={btnRef} type="button" className={className} onClick={abrir}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left", background: "var(--surface)" }}>
        <span style={{ color: rotulo ? "var(--text)" : "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {rotulo || "Selecione a instituição"}
        </span>
        <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "0.75rem", color: "var(--text3)", flexShrink: 0, marginLeft: 8 }} />
      </button>

      {open && coords && createPortal(
        <>
          {/* Backdrop transparente: clicar fora do painel fecha (mesmo portal, sem depender de listener em document) */}
          <div onClick={fechar} style={{ position: "fixed", inset: 0, zIndex: 2999 }} />

          <div ref={painelRef} style={{
            position: "fixed", zIndex: 3000, top: coords.top, left: coords.left, width: coords.width,
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-lg)", padding: modo === "outra" ? "0.85rem" : 0,
          }}>
            {modo === "lista" ? (
              <>
                <input
                  ref={buscaRef}
                  className="form-input"
                  placeholder="Buscar instituição…"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  style={{ margin: "0.5rem", width: "calc(100% - 1rem)" }}
                />
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {sugestoes.map(i => (
                    <div key={i.id} onClick={() => selecionar(i)} style={itemStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                      {i.sigla} – {i.nome}
                    </div>
                  ))}
                  <div onClick={irParaOutra} style={itemStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                    Outra instituição
                  </div>
                </div>
              </>
            ) : (
              <div>
                <button type="button" onClick={() => setModo("lista")}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text3)", fontSize: "0.78rem", cursor: "pointer", padding: 0, marginBottom: "0.6rem" }}>
                  <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: "0.7rem" }} />Voltar à lista
                </button>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input className="form-input" placeholder="Sigla *" value={outraSigla}
                    onChange={e => setOutraSigla(e.target.value)} style={{ width: "40%" }} autoFocus />
                  <input className="form-input" placeholder="Nome completo *" value={outraNome}
                    onChange={e => setOutraNome(e.target.value)} style={{ flex: 1 }} />
                </div>
                <button type="button" className="btn btn-sm btn-primary" style={{ marginTop: "0.6rem", width: "100%" }}
                  disabled={!outraSigla.trim() || !outraNome.trim() || salvandoOutra}
                  onClick={confirmarOutra}>
                  {salvandoOutra ? "Salvando…" : "Usar esta instituição"}
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

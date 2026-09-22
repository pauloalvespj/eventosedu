// Gera um PDF com os resultados da pesquisa de satisfação: por pergunta,
// distribuição de respostas (fechada) ou lista de respostas (aberta).
// jsPDF/jspdf-autotable são sempre import()-ados sob demanda (ver CLAUDE.md).
export async function gerarResultadosPesquisaPDF(event, perguntas, respostas, participantes) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const MARGIN = 14;
  const MARGIN_BOTTOM = 16;
  const TOPO_PAGINA = 18;

  const totalRespondentes = new Set(respostas.map(r => r.participante_id)).size;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(event?.nome || "Evento", pageW / 2, 16, { align: "center" });
  doc.setFontSize(12);
  doc.text("Resultados da Pesquisa de Satisfação", pageW / 2, 23, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `${totalRespondentes} participante${totalRespondentes !== 1 ? "s" : ""} respondeu${totalRespondentes !== 1 ? "ram" : ""} · gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    pageW / 2, 29, { align: "center" }
  );
  doc.setTextColor(0, 0, 0);

  let cursorY = 36;

  function garantirEspaco(alturaNecessaria) {
    if (cursorY + alturaNecessaria > pageH - MARGIN_BOTTOM) {
      doc.addPage();
      cursorY = TOPO_PAGINA;
    }
  }

  const ordenadas = [...perguntas].sort((a, b) => a.ordem - b.ordem);

  if (ordenadas.length === 0) {
    doc.setFontSize(10);
    doc.text("Nenhuma pergunta cadastrada.", MARGIN, cursorY);
  }

  ordenadas.forEach((p, idx) => {
    const respsPergunta = respostas.filter(r => r.pergunta_id === p.id);

    garantirEspaco(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 52, 96);
    const linhasPergunta = doc.splitTextToSize(`${idx + 1}. ${p.texto}`, pageW - MARGIN * 2);
    doc.text(linhasPergunta, MARGIN, cursorY);
    cursorY += linhasPergunta.length * 5 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`${respsPergunta.length} resposta${respsPergunta.length !== 1 ? "s" : ""}`, MARGIN, cursorY);
    doc.setTextColor(0, 0, 0);
    cursorY += 4;

    if (p.tipo === "fechada") {
      const body = (p.opcoes || []).map(op => {
        const cnt = respsPergunta.filter(r => r.resposta_opcao === op).length;
        const pct = respsPergunta.length ? Math.round((cnt / respsPergunta.length) * 100) : 0;
        return [op, String(cnt), `${pct}%`];
      });
      autoTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN, bottom: MARGIN_BOTTOM },
        head: [["Opção", "Respostas", "%"]],
        body,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [210, 210, 210], lineWidth: 0.1 },
        headStyles: { fillColor: [15, 52, 96], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: { 1: { cellWidth: 30, halign: "center" }, 2: { cellWidth: 22, halign: "center" } },
      });
    } else {
      const body = respsPergunta.length
        ? respsPergunta.map(r => {
            const part = participantes.find(x => x.id === r.participante_id);
            return [part?.nome || "—", r.resposta_texto || ""];
          })
        : [["—", "Nenhuma resposta ainda."]];
      autoTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN, bottom: MARGIN_BOTTOM },
        head: [["Participante", "Resposta"]],
        body,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [210, 210, 210], lineWidth: 0.1, valign: "top" },
        headStyles: { fillColor: [15, 52, 96], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 45 } },
      });
    }
    cursorY = doc.lastAutoTable.finalY + 9;
  });

  const nomeArquivo = `${event?.nome || "Evento"}-Resultados-Pesquisa`.replace(/[\\/:*?"<>|]/g, "");
  doc.save(`${nomeArquivo}.pdf`);
}

import { formatData } from "./helpers";

// Gera um PDF com a lista de todos os participantes em ordem alfabética
// para colher assinatura no papel — Nome completo | Órgão | Assinatura.
// Quando o evento controla frequência por turno, gera uma lista por turno
// (uma seção/página por turno); caso contrário, uma lista única.
export async function gerarListaAssinaturasPDF(event, participantes, turnos) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  const todos = [...participantes]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  function desenharCabecalho(subtitulo) {
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(event.nome || "Evento", pageW / 2, 13, { align: "center" });
    doc.setFontSize(11);
    doc.text("Lista de Presença", pageW / 2, 19.5, { align: "center" });
    if (subtitulo) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(subtitulo, pageW / 2, 25, { align: "center" });
    }
  }

  const LINHA_H = 10; // deve bater com o minCellHeight da coluna Assinatura
  const MARGIN_BOTTOM = 14;
  const MAX_LINHAS_BRANCO = 5;

  const colunas = {
    0: { cellWidth: 90 },
    1: { cellWidth: 35 },
    2: { cellWidth: "auto", minCellHeight: LINHA_H },
  };

  function desenharTabela(subtitulo) {
    autoTable(doc, {
      startY: 30,
      margin: { top: 30, left: 14, right: 14, bottom: MARGIN_BOTTOM },
      head: [["Nome completo", "Órgão", "Assinatura"]],
      body: todos.map(p => [p.nome, p.instituicao || "", ""]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.4, valign: "middle", lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.2 },
      columnStyles: colunas,
      didDrawPage: () => desenharCabecalho(subtitulo),
    });

    // Linhas em branco para quem chegar depois — só a quantidade que ainda
    // cabe na página atual, pra não empurrar a tabela pra uma página extra.
    const pageH = doc.internal.pageSize.getHeight();
    const espacoDisponivel = pageH - MARGIN_BOTTOM - doc.lastAutoTable.finalY;
    const linhas = Math.max(0, Math.min(MAX_LINHAS_BRANCO, Math.floor(espacoDisponivel / LINHA_H)));

    if (linhas > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY,
        margin: { left: 14, right: 14, bottom: MARGIN_BOTTOM },
        body: Array.from({ length: linhas }, () => ["", "", ""]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2.4, valign: "middle", lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
        columnStyles: colunas,
        rowPageBreak: "avoid",
        pageBreak: "avoid",
      });
    }
  }

  const turnosOrdenados = (turnos || [])
    .slice()
    .sort((a, b) => (a.dia + (a.horario_inicio || "")).localeCompare(b.dia + (b.horario_inicio || "")));

  if (turnosOrdenados.length) {
    turnosOrdenados.forEach((t, idx) => {
      if (idx > 0) doc.addPage();
      desenharTabela(`${t.nome} · ${formatData(t.dia)}`);
    });
  } else {
    desenharTabela();
  }

  const nomeArquivo = `${event.nome || "Evento"}-Lista-Presenca`.replace(/[\\/:*?"<>|]/g, "");
  doc.save(`${nomeArquivo}.pdf`);
}

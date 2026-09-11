import { formatData, formatPeriodo, diaSemana, TIPO_LABEL } from "./helpers";

// Gera o PDF da programação completa do evento — usado tanto no painel
// admin quanto no botão de download público do site.
export async function gerarProgramacaoPDF(event, atividades, palestrantes) {
  // Carregadas sob demanda — jspdf/autotable ficam fora do bundle inicial
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const NAVY    = [15, 52, 96];
  const WHITE   = [255, 255, 255];
  const GOLD    = [201, 168, 76];
  const INT_BG  = [242, 244, 248];
  const INT_TEXT = [130, 140, 160];
  const HEADER_BG   = [246, 248, 252];
  const HEADER_TEXT = NAVY;
  const HEADER_SUB  = [90, 105, 130];

  function getPalestrantes(atv) {
    return (atv.palestrantes_ids || []).map(id => palestrantes.find(p => p.id === id)).filter(Boolean);
  }

  // Logo para assinatura no rodapé
  let logoDataUrl = null;
  if (event.logo_url) {
    try {
      logoDataUrl = await new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
        img.src = event.logo_url;
      });
    } catch { logoDataUrl = null; }
  }

  // Logo do evento — calculada antes para reservar espaço e o texto não
  // ficar por cima dela.
  let logoW = 0;
  const logoH = 18;
  if (logoDataUrl) {
    try {
      const { width: pxW, height: pxH } = doc.getImageProperties(logoDataUrl);
      logoW = Math.min(logoH * (pxW / pxH), 50);
    } catch { logoW = 0; }
  }
  const maxTextW = pageW - 14 - (logoW ? 14 + logoW + 8 : 14);

  doc.setFontSize(8.5);
  const nomeCompletoLines = event.nome_completo ? doc.splitTextToSize(event.nome_completo, maxTextW) : [];

  const ano = event.data_inicio ? event.data_inicio.split("-")[0] : "";
  const periodo = event.data_inicio
    ? `${formatPeriodo(event.data_inicio, event.data_fim)}${ano ? ` de ${ano}` : ""}`
    : "";
  doc.setFontSize(11);
  const periodoLines = periodo ? doc.splitTextToSize(periodo, maxTextW) : [];

  doc.setFontSize(7.5);
  const localLines = event.local ? doc.splitTextToSize(event.local, maxTextW) : [];
  const siteLines = doc.splitTextToSize("www.enaudin.com.br", maxTextW);

  const LINE_H_MAIN = 4.2;
  const LINE_H_SUB = 3.4;
  const contentH = 13
    + nomeCompletoLines.length * LINE_H_SUB
    + (periodoLines.length ? 1.5 + periodoLines.length * LINE_H_MAIN : 0)
    + (localLines.length ? 1.5 + localLines.length * LINE_H_SUB : 0)
    + siteLines.length * LINE_H_SUB;

  // Cabeçalho
  const HEADER_H = Math.max(33, contentH + 6);
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pageW, HEADER_H, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, HEADER_H - 3, pageW, 3, "F");

  if (logoDataUrl && logoW) {
    try {
      doc.addImage(logoDataUrl, "PNG", 14, (HEADER_H - logoH) / 2, logoW, logoH, undefined, "FAST");
    } catch { /* segue sem logo no cabeçalho */ }
  }

  let headerY = 12;
  doc.setTextColor(...HEADER_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  nomeCompletoLines.forEach(line => {
    doc.text(line, pageW - 14, headerY, { align: "right" });
    headerY += LINE_H_SUB;
  });

  if (periodoLines.length) {
    if (nomeCompletoLines.length) headerY += 1.5;
    doc.setFontSize(11);
    periodoLines.forEach(line => {
      doc.text(line, pageW - 14, headerY, { align: "right" });
      headerY += LINE_H_MAIN;
    });
  }

  if (localLines.length) {
    if (nomeCompletoLines.length || periodoLines.length) headerY += 1.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...HEADER_SUB);
    localLines.forEach(line => {
      doc.text(line, pageW - 14, headerY, { align: "right" });
      headerY += LINE_H_SUB;
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...HEADER_SUB);
  siteLines.forEach(line => {
    doc.text(line, pageW - 14, headerY, { align: "right" });
    headerY += LINE_H_SUB;
  });

  // Dias — uma única tabela contínua (sem espaço entre os blocos de cada dia);
  // a barra de cada dia é só mais uma linha do corpo, não um "head" repetido.
  const dias = [...new Set(atividades.map(a => a.dia))].sort();
  const curY = HEADER_H + 6;

  const COL0_W = 16, COL1_W = 28;
  const CELL_PAD_V = 2.5;
  const CELL_LINE_H = 3.2;
  const TEXT_MAX_W = pageW - 14 - 14 - COL0_W - COL1_W - 6; // menos padding esq/dir da coluna 2

  function pessoasDe(a) {
    const pals = getPalestrantes(a);
    const palNomes = pals.map(p => p.nome + (p.instituicao ? ` – ${p.instituicao}` : "")).join("\n");
    const convs = (a.convidados || "").split("\n").filter(Boolean).join("\n");
    return [palNomes, convs].filter(Boolean).join("\n");
  }

  const bodyRows = [];
  const rowMeta = [];
  dias.forEach(dia => {
    bodyRows.push([{
      content: `${diaSemana(dia)}, ${formatData(dia)}`,
      colSpan: 3,
      styles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 9, halign: "left", cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
    }]);
    rowMeta.push(null);

    const atvsNoDia = atividades
      .filter(a => a.dia === dia)
      .sort((a, b) => a.horario.localeCompare(b.horario));

    atvsNoDia.forEach(a => {
      const pessoas = pessoasDe(a);
      const conteudo = a.titulo + (pessoas ? "\n" + pessoas : "");
      bodyRows.push([a.horario, TIPO_LABEL[a.tipo] || a.tipo || "", conteudo]);
      rowMeta.push(a);
    });
  });

  autoTable(doc, {
    startY: curY,
    body: bodyRows,
    theme: "grid",
    rowPageBreak: "avoid",
    styles: { fontSize: 7.5, cellPadding: { top: CELL_PAD_V, bottom: CELL_PAD_V, left: 3, right: 3 }, overflow: "linebreak", minCellHeight: 7 },
    columnStyles: {
      0: { cellWidth: COL0_W, halign: "center", fontStyle: "bold" },
      1: { cellWidth: COL1_W },
      2: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const a = rowMeta[data.row.index];
      if (!a) return;
      if (a.tipo === "intervalo") {
        data.cell.styles.fillColor = INT_BG;
        data.cell.styles.textColor = INT_TEXT;
      }
      if (data.column.index === 2) {
        // Recalcula a altura necessária usando negrito no título (mais largo
        // que o normal), para a linha não ficar baixa e sobrepor o texto.
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        const titleLines = doc.splitTextToSize(a.titulo, TEXT_MAX_W);
        doc.setFont("helvetica", "normal");
        const pessoas = pessoasDe(a);
        const pessoasLines = pessoas ? doc.splitTextToSize(pessoas, TEXT_MAX_W) : [];
        const totalLines = titleLines.length + pessoasLines.length;
        const neededH = totalLines * CELL_LINE_H + CELL_PAD_V * 2;
        data.cell.styles.minCellHeight = Math.max(data.cell.styles.minCellHeight || 0, neededH);
      }
    },
    // Coluna do tema/título (2): suprime o texto padrão e redesenha à mão,
    // com o título em negrito seguido dos palestrantes em fonte normal.
    willDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 2 && rowMeta[data.row.index]) data.cell.text = [];
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 2) return;
      const a = rowMeta[data.row.index];
      if (!a) return;

      const pessoas = pessoasDe(a);
      const { x, y, width } = data.cell;
      const pad = data.cell.styles.cellPadding;
      const padLeft = typeof pad === "object" ? (pad.left ?? 3) : pad;
      const padTop = typeof pad === "object" ? (pad.top ?? CELL_PAD_V) : pad;
      const padRight = typeof pad === "object" ? (pad.right ?? 3) : pad;
      const maxWidth = width - padLeft - padRight;
      const color = data.cell.styles.textColor;

      doc.setFontSize(7.5);
      doc.setTextColor(...(Array.isArray(color) ? color : [color, color, color]));
      let lineY = y + padTop + 2.6;

      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(a.titulo, maxWidth);
      doc.text(titleLines, x + padLeft, lineY);
      lineY += titleLines.length * CELL_LINE_H;

      if (pessoas) {
        doc.setFont("helvetica", "normal");
        const pessoasLines = doc.splitTextToSize(pessoas, maxWidth);
        doc.text(pessoasLines, x + padLeft, lineY);
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Rodapé
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 224, 230);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setFontSize(6.5);
    doc.setTextColor(170, 175, 185);
    doc.text(`${event.nome || "Evento"} — Programação Completa`, 14, pageH - 10);
    doc.text(`${i} / ${total}`, pageW - 14, pageH - 10, { align: "right" });
  }

  const nomeArquivo = `${event.nome || "Evento"}${ano ? ` ${ano}` : ""}-Programação`.replace(/[\\/:*?"<>|]/g, "");
  doc.save(`${nomeArquivo}.pdf`);
}

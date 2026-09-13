import { formatData, qrPresencaTurnoValue } from "./helpers";
import { fetchQrTokenTurno } from "../lib/db";

// Biblioteca de QR (qrcode-generator via CDN) — mesma usada pelo QRCodeCanvas
// em src/components/base/index.jsx, carregada sob demanda aqui também pois
// este PDF pode ser gerado sem nenhum modal de QR ter sido aberto antes.
function carregarQrcodeLib() {
  return new Promise((resolve, reject) => {
    if (window.qrcode) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar a biblioteca de QR Code"));
    document.head.appendChild(script);
  });
}

// QR 100% preto — impresso em impressora P&B, sem depender de nenhuma cor.
function gerarQRDataUrl(value, size = 500) {
  const qr = window.qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const moduleCount = qr.getModuleCount();
  const cellSize = Math.floor(size / moduleCount);
  const offset = Math.floor((size - cellSize * moduleCount) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
    }
  }
  return canvas.toDataURL("image/png");
}

// Gera um PDF com um QR Code de presença por turno, um dia do evento por
// página, pronto para imprimir em P&B e colar na parede.
export async function gerarQRCodesTurnosPDF(event, turnos) {
  if (!turnos.length) return;

  await carregarQrcodeLib();
  const tokens = await Promise.all(turnos.map(t => fetchQrTokenTurno(t.id)));

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const itens = turnos
    .map((t, i) => ({ turno: t, token: tokens[i] }))
    .filter(item => item.token)
    .sort((a, b) => (a.turno.dia + (a.turno.horario_inicio || "")).localeCompare(b.turno.dia + (b.turno.horario_inicio || "")));
  if (!itens.length) return;

  const headerH = 26, marginBottom = 16;
  const marginTop = headerH;
  const cx = pageW / 2;
  const cy = marginTop + (pageH - marginTop - marginBottom) / 2;
  const qrSize = Math.min(pageW * 0.6, (pageH - marginTop - marginBottom) * 0.5, 150);

  const registreSize = 26;
  const nomeSize      = 34;
  const dataSize       = 17;

  itens.forEach((item, idx) => {
    if (idx > 0) doc.addPage();
    doc.setTextColor(0, 0, 0);

    // Topo da página: nome do evento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(event.nome || "Evento", cx, 16, { align: "center" });

    // Topo: só "Registre sua presença"
    doc.setFont("helvetica", "bold");
    doc.setFontSize(registreSize);
    doc.text("Registre sua presença", cx, cy - qrSize / 2 - 10, { align: "center" });

    // QR Code
    const dataUrl = gerarQRDataUrl(qrPresencaTurnoValue(item.turno.id, item.token), 500);
    doc.addImage(dataUrl, "PNG", cx - qrSize / 2, cy - qrSize / 2, qrSize, qrSize);

    // Embaixo: nome do turno + data (sem dia da semana)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(nomeSize);
    const nomeY = cy + qrSize / 2 + nomeSize * 0.4 + 4;
    doc.text(item.turno.nome, cx, nomeY, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(dataSize);
    doc.text(formatData(item.turno.dia), cx, nomeY + dataSize * 0.55 + 3, { align: "center" });
  });

  const ano = event.data_inicio ? event.data_inicio.split("-")[0] : "";
  const nomeArquivo = `${event.nome || "Evento"}${ano ? ` ${ano}` : ""}-QRCodes-Turnos`.replace(/[\\/:*?"<>|]/g, "");
  doc.save(`${nomeArquivo}.pdf`);
}

// Teste de carga do check-in de presença por QR Code (turno).
//
// Bate direto na RPC do Supabase (registrar_presenca_turno_qr), o mesmo
// endpoint que o front chama em registrarPresencaTurnoQR (src/lib/db.js) —
// é o gargalo real do fluxo de presença, não o site estático.
//
// COMO USAR COM SEGURANÇA (não suja dados reais do evento):
//   1. No admin > Presenças, crie um turno descartável, ex: "Turno de Teste".
//   2. Clique no ícone de QR Code desse turno e copie a URL exibida
//      (algo como https://.../presenca-turno/123?t=abcdef...).
//      O número depois de /presenca-turno/ é o TURNO_ID, o valor de "t=" é o QR_TOKEN.
//   3. Rode o teste (instale k6 antes: https://k6.io/docs/get-started/installation/):
//
//        k6 run -e SUPABASE_URL=https://SEUPROJETO.supabase.co \
//               -e SUPABASE_ANON_KEY=SUA_ANON_KEY \
//               -e TURNO_ID=123 \
//               -e QR_TOKEN=abcdef... \
//               scripts/k6-presenca-turno.js
//
//   4. Depois, exclua o "Turno de Teste" no admin — a exclusão cascade
//      apaga também as presenças e o token gerados durante o teste.
//
// O que o teste mede: cada VU (usuário virtual) envia um CPF aleatório e
// inválido, que sempre cai no caminho "não encontrado" — ou seja, o teste
// exercita a validação do token + busca do participante no banco (que é o
// grosso do custo da requisição) sem inserir presenças de verdade. Para
// medir também o caminho de inserção (INSERT + trigger de pontos), rode uma
// segunda leva pequena (ex: 5-10 VUs) com p_cpf de participantes reais de
// teste cadastrados nesse evento.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const TURNO_ID = __ENV.TURNO_ID;
const QR_TOKEN = __ENV.QR_TOKEN;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TURNO_ID || !QR_TOKEN) {
  throw new Error("Defina SUPABASE_URL, SUPABASE_ANON_KEY, TURNO_ID e QR_TOKEN via -e.");
}

const statusCounter = new Counter("presenca_status");

export const options = {
  scenarios: {
    // Simula o pico: todo mundo escaneando o QR nos primeiros ~10s da
    // abertura do turno, sustentando por mais 20s.
    pico_abertura_turno: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 }, // sobe pra 100 usuários simultâneos
        { duration: "20s", target: 100 }, // mantém o pico
        { duration: "5s", target: 0 },    // esvazia
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"], // 95% das respostas abaixo de 1.5s
    http_req_failed: ["rate<0.01"],    // menos de 1% de erro de rede/HTTP
  },
};

function cpfFalsoAleatorio() {
  let n = "";
  for (let i = 0; i < 11; i++) n += Math.floor(Math.random() * 10);
  return n;
}

export default function () {
  const url = `${SUPABASE_URL}/rest/v1/rpc/registrar_presenca_turno_qr`;
  const payload = JSON.stringify({
    p_turno_id: Number(TURNO_ID),
    p_token: QR_TOKEN,
    p_cpf: cpfFalsoAleatorio(),
  });
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const res = http.post(url, payload, { headers });

  check(res, {
    "status HTTP 200": (r) => r.status === 200,
  });

  try {
    const body = JSON.parse(res.body);
    statusCounter.add(1, { status: body.status || "erro" });
  } catch {
    statusCounter.add(1, { status: "erro_parse" });
  }

  sleep(Math.random() * 0.5); // pequeno jitter, evita todo VU bater no mesmo milissegundo
}

// Teste de carga do fluxo de "Perguntas ao Vivo" (/quiz) — reproduz os 3
// passos que a página faz de verdade (ver src/components/quiz/QuizPage.jsx):
//   1) resolver o código do quiz  -> GET live_quiz
//   2) buscar a pergunta aberta   -> GET live_perguntas
//   3) enviar a resposta          -> POST live_respostas
//
// Cada iteração simula um visitante novo e anônimo (anon_id aleatório)
// respondendo uma vez, igual ao app faria.
//
// COMO USAR:
//   1. No admin > Quiz, crie um quiz descartável (ex: "Quiz de Teste") e
//      anote o código de 4 dígitos.
//   2. Crie uma pergunta nesse quiz e clique em "Abrir" pra deixá-la
//      "aberta" (senão o teste só mede os passos 1 e 2, sem inserir nada).
//   3. Rode:
//
//        k6 run -e SUPABASE_URL=https://SEUPROJETO.supabase.co \
//               -e SUPABASE_ANON_KEY=SUA_ANON_KEY \
//               -e CODIGO=1234 \
//               scripts/k6-quiz-resposta.js
//
//      (EVENT_ID é opcional, default 1 — só tem um evento no projeto.)
//
//   4. Depois, exclua o "Quiz de Teste" no admin — cascade limpa a
//      pergunta e as respostas geradas no teste.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const CODIGO = __ENV.CODIGO;
const EVENT_ID = __ENV.EVENT_ID || "1";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !CODIGO) {
  throw new Error("Defina SUPABASE_URL, SUPABASE_ANON_KEY e CODIGO via -e.");
}

const resultado = new Counter("quiz_resultado");

export const options = {
  scenarios: {
    // Simula todo mundo respondendo assim que a pergunta abre no telão.
    pico_pergunta_aberta: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 },
        { duration: "20s", target: 100 },
        { duration: "5s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

function anonIdAleatorio() {
  return `k6-${Date.now()}-${__VU}-${__ITER}-${Math.random().toString(36).slice(2)}`;
}

export default function () {
  // 1) resolver código do quiz
  const quizRes = http.get(
    `${SUPABASE_URL}/rest/v1/live_quiz?event_id=eq.${EVENT_ID}&codigo=eq.${CODIGO}&ativo=eq.true&select=*`,
    { headers }
  );
  const quizOk = check(quizRes, { "quiz: status 200": (r) => r.status === 200 });
  if (!quizOk) { resultado.add(1, { etapa: "quiz_erro" }); return; }

  let quiz;
  try { quiz = JSON.parse(quizRes.body)[0]; } catch { quiz = null; }
  if (!quiz) { resultado.add(1, { etapa: "codigo_invalido" }); return; }

  // 2) buscar pergunta aberta desse quiz
  const perguntaRes = http.get(
    `${SUPABASE_URL}/rest/v1/live_perguntas?quiz_id=eq.${quiz.id}&status=eq.aberta&select=*`,
    { headers }
  );
  const perguntaOk = check(perguntaRes, { "pergunta: status 200": (r) => r.status === 200 });
  if (!perguntaOk) { resultado.add(1, { etapa: "pergunta_erro" }); return; }

  let pergunta;
  try { pergunta = JSON.parse(perguntaRes.body)[0]; } catch { pergunta = null; }
  if (!pergunta) { resultado.add(1, { etapa: "sem_pergunta_aberta" }); return; }

  const opcao = (pergunta.opcoes && pergunta.opcoes[0]) || "A";

  // 3) enviar resposta anônima
  const respostaRes = http.post(
    `${SUPABASE_URL}/rest/v1/live_respostas`,
    JSON.stringify({ pergunta_id: pergunta.id, anon_id: anonIdAleatorio(), opcao }),
    { headers: { ...headers, Prefer: "return=minimal" } }
  );
  const respostaOk = check(respostaRes, { "resposta: status 201": (r) => r.status === 201 });
  resultado.add(1, { etapa: respostaOk ? "sucesso" : "resposta_erro" });

  sleep(Math.random() * 0.5);
}

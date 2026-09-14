# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ENAUDIN — event management system for the "Encontro das Auditorias Internas das Instituições Federais de Educação no Ceará." React 19 + Vite SPA backed entirely by Supabase (Postgres + Auth + Storage + Realtime + Edge Functions). **Single-tenant**: the app always operates on one row in `events` (id `1` is hardcoded in several places, e.g. `inserirAtividade({ ..., event_id: 1 })`).

## Commands

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to /dist
npm run preview  # preview the production build
npm run lint     # ESLint (flat config, eslint.config.js)
```

No test suite/framework is configured in this repo.

### Supabase

The Supabase CLI is linked to the cloud project (no local Postgres — `supabase db query`/`db push` always hit the real cloud DB directly, there's no separate local/staging instance):

```bash
supabase db push                                   # apply new files in supabase/migrations/
supabase db query --linked "select ..."             # run arbitrary SQL against the linked project
supabase functions deploy <name>                    # deploy an edge function after editing supabase/functions/<name>/index.ts
```

Migration files are timestamped SQL (`YYYYMMDDHHMMSS_description.sql`) in `supabase/migrations/`, applied in order. `supabase/schema.sql` is a snapshot, not authoritative — migrations are the source of truth.

## Architecture

### Global state flows one way: App.jsx → PainelAdmin → AdminContext

`App.jsx` is the single owner of all top-level data — it fetches everything (`fetchEvent`, `fetchProfiles`, `fetchAtividades`, `fetchTurnos`, `fetchPresencas`, etc., all from `src/lib/db.js`) into `useState`s and passes the whole bundle as props into the admin shell. `PainelAdmin.jsx` re-exposes those exact props as `<AdminContext.Provider value={props}>`, so every section under `src/components/admin/sections/**` reads/writes shared state via `useAdmin()` instead of prop drilling. **Adding a new piece of global admin state means threading it through App.jsx's fetch/state block, not just adding a local `useState` in a section component.**

`src/lib/db.js` is the only place that talks to Supabase tables directly — every read/write goes through a named export there (`fetchX`/`inserirX`/`atualizarX`/`deletarX`), even for one-off calls. Keep that convention when adding new queries.

### Two attendance ("frequência") models, picked by `event.modo_frequencia`

- `"turno"` — attendance is tracked per shift/turno (table `turnos` + `presencas_turno`). Admin UI: the "Presenças" section shows turno cards/select, each with its own QR check-in.
- anything else (per-activity) — attendance is tracked per `atividades` row (table `presencas`), one QR per activity.

This fork touches `Presencas.jsx`, `Programacao.jsx`, `calcPresenca()` in `utils/helpers.js`, and the public check-in pages (`PaginaPresenca.jsx` vs `PaginaPresencaTurno.jsx`, routed at `/presenca/:atividadeId` vs `/presenca-turno/:turnoId`). New attendance-related features generally need a decision (or explicit branch) for both modes.

### QR codes are generated twice, two different ways

- **In-app** (`QRCodeCanvas` in `src/components/base/index.jsx`): draws to a `<canvas>` using the global `window.qrcode` object, lazy-loaded from `cdnjs.cloudflare.com/.../qrcode-generator` — not an npm dependency.
- **In PDFs** (`utils/gerarQRCodesTurnosPDF.js`, `gerarListaAssinaturasPDF.js`): reuses the same CDN script + the same manual pixel-matrix draw (to an offscreen canvas), then embeds the PNG via `jsPDF.addImage`. `jspdf`/`jspdf-autotable` are always dynamically `import()`-ed at call time to keep them out of the main bundle.

### Live Quiz ("Perguntas ao Vivo")

Tables: `live_quiz` (has the public 4-digit `codigo`) → `live_perguntas` (belongs to a quiz, one `status='aberta'` at a time, has an `ordem` for admin-controlled ordering) → `live_respostas` (anonymous votes, keyed by a client-generated `anon_id` in `localStorage`, not by user id).

Two independent public entry points, both standalone (not under `/painel`):
- `/quiz` and `/quiz/:codigo` (`QuizPage.jsx`) — participants answer.
- `/quiz-telao/:codigo` (`ApresentacaoQuizPage.jsx`) — presenter screen, meant to be opened in its **own browser window** (`window.open`, not an in-app modal) so it can be dragged to a projector on an extended display without mirroring the admin tab. It resolves the quiz by its public `codigo` and auto-follows whichever `live_perguntas` row is currently `aberta` via a Realtime subscription — it does not take a pergunta id in the URL, so the same link stays valid for the whole event.

### Email sending goes through Brevo SMTP via Edge Functions — must be batched 1-at-a-time

Bulk email (convites, comunicados, pesquisa de satisfação) is sent through Deno edge functions in `supabase/functions/` (`enviar-convite`, `enviar-pesquisa`) using `denomailer` over **Brevo's SMTP relay** (secrets `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`, set via `supabase secrets set`). The edge function itself loops over whatever `leads`/`destinatarios` array it's given.

**Known limit:** even a batch of 5 emails in one invocation can hit Supabase's per-invocation resource cap (`HTTP 546`, "WORKER_LIMIT"). All client-side bulk-send call sites (`AbaInscritos.jsx` ×2, `AbaPreConvidados.jsx`, `PesquisaSatisfacao.jsx`) therefore invoke the function **one recipient per call**, in a loop with a small delay between calls, accumulating `sent`/`failed` client-side. If you add a new bulk-email flow, copy that pattern — don't pass the whole recipient list in a single `functions.invoke` call.

### Admin theme override

`src/styles/global.css` defines the public-site palette (`--gold`, `--gold-on-dark`, etc.) on `:root`, but `.admin-layout`/`.part-layout` **redefine those same variable names** to a navy-blue admin palette. Anything reusing a "public" gold/hero-themed inline style inside an admin screen can end up invisible (e.g. white-on-white) — check what `.admin-layout` overrides before reusing a color token from a public-facing component inside `admin/` or `usuario/`.

### Load testing

`scripts/k6-presenca-turno.js` and `scripts/k6-quiz-resposta.js` are k6 scripts that hit the relevant Supabase RPC/REST endpoints directly (not through the app) to load-test check-in and quiz-answer concurrency. Each script's header comment explains how to create disposable test data (a throwaway turno/quiz) and clean it up afterward — run against real data only with that in mind, since it inserts real rows.

## Deploy

Static SPA build (`npm run build` → `/dist`). `public/_redirects` (`/* /index.html 200`) handles client-side routing fallback — required by whatever static host serves it.

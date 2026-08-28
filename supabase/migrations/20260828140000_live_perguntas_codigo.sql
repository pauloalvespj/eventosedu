-- Código curto (4 dígitos) exibido junto ao QR code no telão — alternativa
-- pra quem prefere digitar em vez de escanear, no mesmo espírito do Wooclap.
-- Único por evento (não precisa ser único globalmente).

alter table public.live_perguntas add column if not exists codigo text;

create unique index if not exists live_perguntas_event_codigo_key
  on public.live_perguntas (event_id, codigo);

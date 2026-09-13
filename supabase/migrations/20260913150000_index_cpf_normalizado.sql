-- Índice funcional em profiles.cpf normalizado (só dígitos) — casa
-- exatamente com a expressão usada na busca por CPF ao confirmar presença
-- (registrar_presenca_qr / registrar_presenca_turno_qr / login por CPF).
--
-- Sem esse índice, cada confirmação de presença faz sequential scan na
-- tabela profiles inteira. Sob carga (teste com 100 usuários simultâneos
-- confirmando presença via QR), isso gerou fila e picos de latência:
-- p95 de 3s e pior caso de 9s. Com o índice, a busca vira um index scan.
create index concurrently if not exists idx_profiles_cpf_normalizado
  on public.profiles (regexp_replace(coalesce(cpf, ''), '\D', '', 'g'));

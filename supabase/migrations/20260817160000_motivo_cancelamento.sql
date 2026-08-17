-- Motivo de cancelamento: capturado no formulário de cancelamento de
-- inscrição do participante, visível para o admin na lista de cancelados.
alter table event_enrollments add column if not exists motivo_cancelamento text;

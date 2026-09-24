-- Substitui o boolean certificado_externo por um modo de 3 estados, pra
-- suportar o novo modo "link" (certificado emitido por um sistema externo,
-- ex.: SIGProj/PREX da UFC — o participante só recebe um link + mensagem,
-- sem geração nem upload por aqui).
alter table events
  add column if not exists certificado_modo text not null default 'sistema'
    check (certificado_modo in ('sistema', 'upload', 'link'));

update events
  set certificado_modo = case when certificado_externo then 'upload' else 'sistema' end
  where certificado_modo = 'sistema';

alter table events
  add column if not exists certificado_link_url text,
  add column if not exists certificado_link_mensagem text;

alter table events
  drop column if exists certificado_externo;

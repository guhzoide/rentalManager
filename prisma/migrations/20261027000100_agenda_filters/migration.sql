BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

CREATE INDEX IF NOT EXISTS "agendas_concluida_data_id_idx" ON "agendas"("concluida", "data", "id");
CREATE INDEX IF NOT EXISTS "agendas_clienteId_concluida_data_id_idx" ON "agendas"("clienteId", "concluida", "data", "id");
CREATE INDEX IF NOT EXISTS "agenda_itens_itemId_agendaId_idx" ON "agenda_itens"("itemId", "agendaId");
CREATE INDEX IF NOT EXISTS "agenda_itens_agendaId_idx" ON "agenda_itens"("agendaId");
CREATE INDEX IF NOT EXISTS "clientes_nome_id_idx" ON "clientes"("nome", "id");
CREATE INDEX IF NOT EXISTS "estoques_nome_id_idx" ON "estoques"("nome", "id");

COMMIT;

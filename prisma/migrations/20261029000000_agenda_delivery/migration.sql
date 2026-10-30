BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

ALTER TABLE "agendas" ADD COLUMN "entregue" BOOLEAN NOT NULL DEFAULT false;
-- A antiga confirmação de conclusão representa a coleta. Preserva o histórico
-- financeiro e o estoque das locações que já haviam sido concluídas.
UPDATE "agendas" SET "entregue" = true WHERE "concluida" = true;
CREATE INDEX "agendas_entregue_data_id_idx" ON "agendas"("entregue", "data", "id");

COMMIT;

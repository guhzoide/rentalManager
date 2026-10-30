BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

-- Preserva a visibilidade dos produtos existentes.
ALTER TABLE "estoques" ADD COLUMN "exibirCatalogo" BOOLEAN NOT NULL DEFAULT true;

COMMIT;

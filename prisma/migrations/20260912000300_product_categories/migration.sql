CREATE TABLE "categorias" (
    "id" CITEXT NOT NULL,
    "nome" CITEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categorias_nome_key" ON "categorias"("nome");

INSERT INTO "categorias" ("id", "nome", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Sem categoria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "estoques" ADD COLUMN "categoriaId" CITEXT;

UPDATE "estoques"
SET "categoriaId" = '00000000-0000-0000-0000-000000000001'
WHERE "categoriaId" IS NULL;

ALTER TABLE "estoques" ALTER COLUMN "categoriaId" SET NOT NULL;

CREATE INDEX "estoques_categoriaId_idx" ON "estoques"("categoriaId");

ALTER TABLE "estoques"
ADD CONSTRAINT "estoques_categoriaId_fkey"
FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

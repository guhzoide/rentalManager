/*
  Warnings:

  - The primary key for the `agendas` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `clientes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cep` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `numero` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `rua` on the `clientes` table. All the data in the column will be lost.
  - The primary key for the `enderecos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `estoques` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `usuarios` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "agendas" DROP CONSTRAINT "agendas_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "agendas" DROP CONSTRAINT "agendas_enderecoId_fkey";

-- DropForeignKey
ALTER TABLE "agendas" DROP CONSTRAINT "agendas_itemId_fkey";

-- DropForeignKey
ALTER TABLE "enderecos" DROP CONSTRAINT "enderecos_clienteId_fkey";

-- AlterTable
ALTER TABLE "agendas" DROP CONSTRAINT "agendas_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "itemId" SET DATA TYPE TEXT,
ALTER COLUMN "clienteId" SET DATA TYPE TEXT,
ALTER COLUMN "enderecoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "agendas_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "agendas_id_seq";

-- AlterTable
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_pkey",
DROP COLUMN "cep",
DROP COLUMN "numero",
DROP COLUMN "rua",
ADD COLUMN     "cpf" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "clientes_id_seq";

-- AlterTable
ALTER TABLE "enderecos" DROP CONSTRAINT "enderecos_pkey",
ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "principal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "clienteId" SET DATA TYPE TEXT,
ADD CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "enderecos_id_seq";

-- AlterTable
ALTER TABLE "estoques" DROP CONSTRAINT "estoques_pkey",
ADD COLUMN     "disponivel" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "estoques_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "estoques_id_seq";

-- AlterTable
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "usuarios_id_seq";

-- AddForeignKey
ALTER TABLE "agendas" ADD CONSTRAINT "agendas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendas" ADD CONSTRAINT "agendas_enderecoId_fkey" FOREIGN KEY ("enderecoId") REFERENCES "enderecos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendas" ADD CONSTRAINT "agendas_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "estoques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

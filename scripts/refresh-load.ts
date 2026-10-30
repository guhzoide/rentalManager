import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { COUNTS, testId } from './dataset-identity.js';
import { CATEGORY_NAME, GROUP_NAME, personName, clientPresentation, addressPresentation, productName, rentalObservation, generateExpenses } from './natural-data.js';

async function updateRows(tx: Prisma.TransactionClient, table: string, fields: string[], rows: Record<string, string>[]) {
    let updated = 0;
    for (let start = 0; start < rows.length; start += 1000) {
        const records = JSON.stringify(rows.slice(start, start + 1000));
        const assignments = Prisma.join(fields.map((field) => Prisma.raw(`"${field}" = source."${field}"`)));
        const definitions = Prisma.raw(['id text', ...fields.map((field) => `"${field}" text`)].join(', '));
        updated += await tx.$executeRaw(Prisma.sql`
            UPDATE ${Prisma.raw(`"${table}"`)} AS target SET ${assignments}
            FROM jsonb_to_recordset(${records}::jsonb) AS source(${definitions})
            WHERE target.id = source.id::citext`);
    }
    return updated;
}

async function main() {
    if (process.argv.includes('--dry-run')) {
        console.log(JSON.stringify({ clientes: clientPresentation(0), produto: productName(0), observacao: rentalObservation(0), saidas: generateExpenses().length, writes: false }));
        return;
    }
    const prisma = new PrismaClient();
    try {
        const result = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(724631903)`;
            if (!await tx.categorias.findUnique({ where: { id: testId('categoria') } })) {
                throw new Error('Execute seed:load antes de atualizar a apresentação.');
            }
            const clientes = await updateRows(tx, 'clientes', ['nome', 'contato', 'email'], Array.from({ length: COUNTS.clientes }, (_, i) => ({ id: testId('cliente', i), ...clientPresentation(i) })));
            const enderecos = await updateRows(tx, 'enderecos', ['rua', 'bairro', 'numero'], Array.from({ length: COUNTS.clientes }, (_, i) => ({ id: testId('endereco', i), ...addressPresentation(i) })));
            const produtos = await updateRows(tx, 'estoques', ['nome'], Array.from({ length: COUNTS.produtos }, (_, i) => ({ id: testId('produto', i), nome: productName(i) })));
            const usuarios = await updateRows(tx, 'user', ['name'], Array.from({ length: COUNTS.usuarios }, (_, i) => ({ id: testId('usuario', i), name: personName(i + 100) })));
            const agendas = await updateRows(tx, 'agendas', ['observacao'], Array.from({ length: COUNTS.agendas }, (_, i) => ({ id: testId('agenda', i), observacao: rentalObservation(i) })));
            await tx.categorias.update({ where: { id: testId('categoria') }, data: { nome: CATEGORY_NAME } });
            await tx.grupos.update({ where: { id: testId('grupo') }, data: { nome: GROUP_NAME, descricao: 'Equipe responsável por clientes, reservas e operação.' } });
            const saidas = await tx.transacoes.createMany({ data: generateExpenses(), skipDuplicates: true });
            return { clientes, enderecos, produtos, usuarios, agendas, saidasAdicionadas: saidas.count };
        }, { maxWait: 10000, timeout: 300000 });
        console.log(JSON.stringify(result));
    } finally {
        await prisma.$disconnect();
    }
}
main().catch(() => {
    console.error('Atualização não concluída. A transação foi revertida; confira conexão e carga inicial.');
    process.exitCode = 1;
});

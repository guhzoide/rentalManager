import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { CATEGORY_NAME, GROUP_NAME, personName, generateExpenses, EXPENSE_COUNT } from './natural-data.js';
import { hashPassword } from 'better-auth/crypto';
import { COUNTS, DATASET, generateTestData, testId } from './test-data.js';

async function main() {
    if (process.argv.includes('--dry-run')) {
        console.log(JSON.stringify({ dataset: DATASET, ...COUNTS, itens: COUNTS.agendas * 2, saidas: EXPENSE_COUNT, writes: false }));
        return;
    }
    if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL.');
    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        const exists = await prisma.categorias.findUnique({ where: { id: testId('categoria') } });
        if (exists) {
            console.log('Carga já inserida. Nenhum registro alterado ou duplicado.');
            return;
        }
        const data = generateTestData();
        const passwordHash = await hashPassword(process.env.SEED_TEST_PASSWORD || 'TesteCarga@2026');
        const modules = await prisma.modulos.findMany({ where: { ativo: true }, select: { id: true } });
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(724631903)`;
            if (await tx.categorias.findUnique({ where: { id: testId('categoria') } })) {
                console.log('Carga inserida por outra execução. Nenhuma duplicação.');
                return;
            }
            await tx.categorias.create({ data: { id: testId('categoria'), nome: CATEGORY_NAME } });
            const group = await tx.grupos.create({ data: {
                id: testId('grupo'), nome: GROUP_NAME,
                descricao: 'Equipe responsável por clientes, reservas e operação.', moduloIds: modules.map((module) => module.id),
            } });
            await tx.transacoes.createMany({ data: generateExpenses(), skipDuplicates: true });
            const batchSize = 500;
            for (let start = 0; start < data.clientes.length; start += batchSize) {
                await tx.clientes.createMany({ data: data.clientes.slice(start, start + batchSize) });
                await tx.enderecos.createMany({ data: data.enderecos.slice(start, start + batchSize) });
            }
            for (let start = 0; start < data.produtos.length; start += batchSize) {
                await tx.estoques.createMany({ data: data.produtos.slice(start, start + batchSize) });
            }
            const users = Array.from({ length: COUNTS.usuarios }, (_, i) => ({
                id: testId('usuario', i), name: personName(i + 100),
                email: `carga${i + 1}@example.invalid`, emailVerified: true, master: false,
                atendente: false, grupoCodigo: group.codigo, updatedAt: data.updatedAt,
            }));
            await tx.user.createMany({ data: users });
            await tx.account.createMany({ data: users.map((user, i) => ({
                id: testId('conta', i), userId: user.id, accountId: user.id,
                providerId: 'credential', password: passwordHash, updatedAt: data.updatedAt,
            })) });
            for (let start = 0; start < data.agendas.length; start += batchSize) {
                const batch = data.agendas.slice(start, start + batchSize);
                await tx.agendas.createMany({ data: batch });
                await tx.agenda_itens.createMany({ data: data.itens.slice(start * 2, (start + batch.length) * 2) });
                if (start % 5000 === 0) console.log(`Locações preparadas: ${start + batch.length}/${COUNTS.agendas}`);
            }
        }, { maxWait: 10000, timeout: 300000 });
        console.log(JSON.stringify({ dataset: DATASET, ...COUNTS, itens: data.itens.length, saidas: EXPENSE_COUNT, status: 'inserido' }));
    } finally {
        await prisma.$disconnect();
    }
}
main().catch((error: unknown) => {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'SEED_FAILED';
    console.error(`Carga não concluída (${code}). A transação foi revertida; confira conexão e migrations.`);
    process.exitCode = 1;
});

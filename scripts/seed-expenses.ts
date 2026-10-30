import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { generateExpenses } from './natural-data.js';

async function main() {
    const expenses = generateExpenses();
    const october = expenses.filter((row) => row.data.getUTCFullYear() === 2026 && row.data.getUTCMonth() === 9);
    if (process.argv.includes('--dry-run')) {
        console.log(JSON.stringify({ despesas: expenses.length, outubro: october.length,
            valorOutubro: Math.round(october.reduce((sum, row) => sum + row.valor, 0) * 100) / 100, writes: false }));
        return;
    }
    const prisma = new PrismaClient();
    try {
        const inserted = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(724631903)`;
            let total = 0;
            for (let start = 0; start < expenses.length; start += 500) {
                total += (await tx.transacoes.createMany({ data: expenses.slice(start, start + 500), skipDuplicates: true })).count;
            }
            return total;
        }, { maxWait: 10000, timeout: 120000 });
        const total = await prisma.transacoes.aggregate({
            where: { id: { in: expenses.map((row) => row.id) } }, _count: true, _sum: { valor: true },
        });
        const current = await prisma.transacoes.aggregate({
            where: { id: { in: october.map((row) => row.id) } }, _count: true, _sum: { valor: true },
        });
        console.log(JSON.stringify({ inseridas: inserted, total: total._count, valorTotal: total._sum.valor,
            outubro: { quantidade: current._count, valor: current._sum.valor } }));
        if (total._count !== expenses.length || current._count !== october.length) process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}
main().catch(() => {
    console.error('Não foi possível concluir a carga de despesas; confira conexão e migrations.');
    process.exitCode = 1;
});

import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { financeAnalyticsSchema, getFinanceAnalytics } from './financeAnalytics.js';

const closeTo = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);

test('analytics rejects invalid periods', () => {
    assert.equal(financeAnalyticsSchema.safeParse({ mes: 12, ano: 2026 }).success, false);
    assert.equal(financeAnalyticsSchema.safeParse({ mes: -1, ano: 2026 }).success, false);
    assert.equal(financeAnalyticsSchema.safeParse({ mes: 1.5, ano: 2026 }).success, false);
    assert.equal(financeAnalyticsSchema.safeParse({ mes: 9, ano: 2026 }).success, true);
});

// Temporary tables isolate fixtures from application data and are dropped at commit.
test('database analytics covers full periods, timezone boundaries, legacy revenue and expense percentages', {
    skip: !process.env.RUN_FINANCE_DB_TESTS,
    timeout: 30000,
}, async () => {
    const prisma = new PrismaClient();
    try {
        await prisma.$transaction(async (tx) => {
            for (const statement of [
                'CREATE TEMP TABLE clientes(id text, nome text) ON COMMIT DROP',
                'CREATE TEMP TABLE estoques(id text, nome text, "valorDiaria" double precision) ON COMMIT DROP',
                'CREATE TEMP TABLE agendas(id text, data timestamp, "dataColeta" timestamp, "clienteId" text, "valorTotal" double precision, desconto double precision, frete double precision, concluida boolean, entregue boolean) ON COMMIT DROP',
                'CREATE TEMP TABLE agenda_itens("agendaId" text, "itemId" text, quantidade int) ON COMMIT DROP',
                'CREATE TEMP TABLE transacoes(descricao text, valor double precision, tipo text, data timestamp) ON COMMIT DROP',
            ]) await tx.$executeRawUnsafe(statement);
            await tx.$executeRaw`INSERT INTO clientes VALUES ('c1', 'Ana'), ('c2', 'Bruno')`;
            await tx.$executeRaw`INSERT INTO estoques VALUES ('e1', 'Cama elástica', 10)`;
            await tx.$executeRaw`INSERT INTO agendas VALUES
                ('r1', '2026-10-01 03:00', '2026-10-02 03:00', 'c1', 100, 0, 0, true, true),
                ('r2', '2026-10-02 03:00', '2026-10-03 03:59', 'c1', 0, 10, 5, true, true),
                ('r3', '2026-10-03 03:00', '2026-10-04 03:00', 'c1', 10000, 0, 0, false, false),
                ('r4', '2026-11-01 03:00', '2026-11-02 03:00', 'c1', 100000, 0, 0, true, true),
                ('r5', '2026-10-01 02:59', '2026-10-02 02:59', 'c1', 200000, 0, 0, true, true),
                ('r6', '2026-11-01 02:59', '2026-11-02 02:59', 'c2', 77, 0, 0, true, true),
                ('r7', '2026-10-04 03:00', '2026-10-05 03:00', 'c1', 30000, 0, 0, true, false),
                ('r8', '2026-10-05 03:00', '2026-10-06 03:00', 'c1', 40000, 0, 0, false, true)`;
            await tx.$executeRaw`INSERT INTO agenda_itens VALUES
                ('r1', 'e1', 1), ('r2', 'e1', 2), ('r3', 'e1', 100), ('r4', 'e1', 100), ('r5', 'e1', 100), ('r6', 'e1', 3), ('r7', 'e1', 100), ('r8', 'e1', 100)`;
            await tx.$executeRaw`INSERT INTO transacoes VALUES ('Recebimento', 5, 'LUCRO', '2026-10-01 03:00')`;
            for (let i = 1; i <= 7; i++) {
                await tx.$executeRaw`INSERT INTO transacoes VALUES (${`Despesa ${i} — operação`}, ${i * 10}, 'GASTO', '2026-10-10 15:00')`;
            }
            const result = await getFinanceAnalytics(tx, { mes: 9, ano: 2026 });
            closeTo(result.totals.lucros, 205);
            closeTo(result.totals.gastos, 280);
            closeTo(result.totals.saldo, -75);
            assert.equal(result.rentalCount, 3);
            closeTo(result.ticketMedio, 200 / 3);
            assert.equal(result.dailyTrendData.length, 31);
            closeTo(result.dailyTrendData[0].Entradas, 105);
            closeTo(result.dailyTrendData[30].Entradas, 77);
            assert.equal(result.mostRentedToys[0].count, 6);
            assert.equal(result.topSpendingClients[0].total, 123);
            assert.equal(result.expensesBreakdown.list.length, 6);
            assert.equal(result.expensesBreakdown.list[result.expensesBreakdown.list.length - 1]?.category, 'Outros');
            closeTo(result.expensesBreakdown.list.reduce((sum, row) => sum + row.value, 0), 280);
            closeTo(result.expensesBreakdown.list.reduce((sum, row) => sum + row.pct, 0), 100);
            const empty = await getFinanceAnalytics(tx, { mes: 1, ano: 2200 });
            assert.equal(empty.dailyTrendData.length, 28);
            assert.equal(empty.rentalCount, 0);
            assert.equal(empty.ticketMedio, 0);
            assert.deepEqual(empty.totals, { lucros: 0, gastos: 0, saldo: 0 });
            assert.deepEqual(empty.expensesBreakdown.list, []);
        }, { timeout: 30000 });
    } finally {
        await prisma.$disconnect();
    }
});

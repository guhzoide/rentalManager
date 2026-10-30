import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { EXPENSE_COUNT } from './natural-data.js';
import { verifyPassword } from 'better-auth/crypto';
import { testId, COUNTS } from './test-data.js';

const prisma = new PrismaClient();
try {
    const clientIds = Array.from({ length: COUNTS.clientes }, (_, i) => testId('cliente', i));
    const agendaWhere = { clienteId: { in: clientIds } };
    const [clientes, produtos, usuarios, agendas, pendentes, concluidas, itens, saidas] = await Promise.all([
        prisma.clientes.count({ where: { id: { in: clientIds } } }),
        prisma.estoques.count({ where: { categoriaId: testId('categoria') } }),
        prisma.user.count({ where: { id: { in: Array.from({ length: COUNTS.usuarios }, (_, i) => testId('usuario', i)) } } }),
        prisma.agendas.count({ where: agendaWhere }),
        prisma.agendas.count({ where: { ...agendaWhere, concluida: false } }),
        prisma.agendas.count({ where: { ...agendaWhere, concluida: true } }),
        prisma.agenda_itens.count({ where: { estoques: { categoriaId: testId('categoria') } } }),
        prisma.transacoes.count({ where: { id: { in: Array.from({ length: EXPENSE_COUNT }, (_, i) => testId('saida', i)) }, tipo: 'GASTO' } }),
    ]);
    const inconsistent = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) FROM estoques e
        LEFT JOIN (
            SELECT ai."itemId", sum(ai.quantidade) AS reservada
            FROM agenda_itens ai
            JOIN agendas a ON a.id = ai."agendaId"
            JOIN estoques produto ON produto.id = ai."itemId"
            WHERE NOT a.concluida AND produto."categoriaId" = ${testId('categoria')}
            GROUP BY ai."itemId"
        ) reservas ON reservas."itemId" = e.id
        WHERE e."categoriaId" = ${testId('categoria')}
        AND e.disponivel <> e.quantidade - COALESCE(reservas.reservada, 0)`;
    const account = await prisma.account.findUnique({ where: { id: testId('conta') } });
    const loginValid = account?.password
        ? await verifyPassword({ hash: account.password, password: process.env.SEED_TEST_PASSWORD || 'TesteCarga@2026' })
        : false;
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
        AND indexname IN ('agendas_concluida_data_id_idx', 'agendas_clienteId_concluida_data_id_idx', 'agenda_itens_itemId_agendaId_idx')`;
    console.log(JSON.stringify({ clientes, produtos, usuarios, agendas, pendentes, concluidas, itens, saidas,
        estoqueInconsistente: Number(inconsistent[0].count), senhaTesteValida: loginValid, indicesPrincipais: indexes.map((row) => row.indexname) }));
    if (!loginValid || Number(inconsistent[0].count) || agendas !== 50000 || saidas !== EXPENSE_COUNT) process.exitCode = 1;
} catch {
    console.error('Não foi possível validar a carga; verifique conexão e migrations.');
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}

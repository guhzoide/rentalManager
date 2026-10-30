import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient, type Prisma } from '@prisma/client';
import { agendaRouter } from './agendas.js';
import type { Context } from '../trpc.js';
import { agendaUpdateSchema } from '../../lib/schemas.js';

test('partial status updates preserve omitted confirmation and financial fields', () => {
    assert.deepEqual(agendaUpdateSchema.parse({ entregue: true }), { entregue: true });
    assert.deepEqual(agendaUpdateSchema.parse({ concluida: true }), { concluida: true });
});

test('delivery and collection reconcile stock once, preserve totals, and allow reversal', {
    skip: !process.env.RUN_AGENDA_DB_TESTS,
    timeout: 30000,
}, async () => {
    const prisma = new PrismaClient();
    const rollback = new Error('rollback isolated agenda fixtures');
    try {
        await assert.rejects(prisma.$transaction(async (tx) => {
            const caller = agendaRouter.createCaller({
                session: { user: { id: 'isolated-test', allowedPages: ['agenda'] } },
                prisma: { agendas: tx.agendas, $transaction: (run: (client: Prisma.TransactionClient) => Promise<unknown>) => run(tx) },
            } as unknown as Context);
            const cliente = await tx.clientes.create({ data: { nome: 'Teste isolado', contato: 'Teste' } });
            const endereco = await tx.enderecos.create({ data: {
                clienteId: cliente.id, cep: '00000000', rua: 'Rua teste', numero: '1',
            } });
            const categoria = await tx.categorias.create({ data: { nome: `Teste isolado ${crypto.randomUUID()}` } });
            const item = await tx.estoques.create({ data: {
                nome: 'Brinquedo isolado', categoriaId: categoria.id, peso: 1, largura: 1,
                altura: 1, valorDiaria: 125, quantidade: 5, disponivel: 5,
            } });
            const rental = await caller.create({
                clienteId: cliente.id, enderecoId: endereco.id,
                data: new Date('2026-10-29T12:00:00Z'), dataColeta: new Date('2026-10-30T12:00:00Z'),
                itens: [{ itemId: item.id, quantidade: 2 }], valorTotal: 250,
            });
            const stock = async () => (await tx.estoques.findUniqueOrThrow({ where: { id: item.id } })).disponivel;
            const update = (data: { entregue?: boolean; concluida?: boolean }) => caller.update({ id: rental.id, data });
            assert.equal(await stock(), 3);
            const delivered = await update({ entregue: true });
            assert.equal(delivered.entregue, true);
            assert.equal(delivered.concluida, false);
            assert.equal(delivered.valorTotal, 250);
            assert.equal(await stock(), 3);
            await update({ concluida: true });
            assert.equal(await stock(), 5);
            await update({ concluida: true });
            assert.equal(await stock(), 5);
            const unconfirmed = await update({ entregue: false });
            assert.equal(unconfirmed.concluida, true);
            assert.equal(unconfirmed.valorTotal, 250);
            assert.equal(await stock(), 5);
            await update({ concluida: false });
            assert.equal(await stock(), 3);
            await caller.delete({ id: rental.id });
            assert.equal(await stock(), 5);
            const completed = await caller.create({
                clienteId: cliente.id, enderecoId: endereco.id,
                data: rental.data, dataColeta: rental.dataColeta, entregue: true, concluida: true,
                itens: [{ itemId: item.id, quantidade: 2 }], valorTotal: 250,
            });
            await caller.delete({ id: completed.id });
            assert.equal(await stock(), 5);
            // Combina os filtros de coluna, cores do servidor e paginação real.
            const now = Date.now();
            const hour = 3600000;
            const scenarios = [
                { status: 'danger', data: now - hour, coleta: now + hour, entregue: false, concluida: false, valor: 300 },
                { status: 'warning', data: now - hour, coleta: now + hour / 2, entregue: true, concluida: false, valor: 100 },
                { status: 'pending', data: now + 2 * hour, coleta: now + 4 * hour, entregue: false, concluida: false, valor: 200 },
                { status: 'success', data: now - 2 * hour, coleta: now - hour, entregue: true, concluida: true, valor: 400 },
            ] as const;
            for (const scenario of scenarios) {
                const created = await caller.create({
                    clienteId: cliente.id, enderecoId: endereco.id,
                    data: new Date(scenario.data), dataColeta: new Date(scenario.coleta),
                    entregue: scenario.entregue, concluida: scenario.concluida, valorTotal: scenario.valor,
                    itens: [{ itemId: item.id, quantidade: 1 }],
                });
                const filtered = await caller.search({
                    clienteId: cliente.id, concluida: scenario.status === 'success',
                    colunas: { status: scenario.status, endereco: 'Rua teste', itens: 'Brinquedo isolado', cliente: 'Teste isolado' },
                    pagina: 1, limit: 25,
                });
                assert.equal(filtered.total, 1);
                assert.equal(filtered.data[0].id, created.id);
                assert.equal(filtered.data[0].status.cor, scenario.status);
                assert.equal(filtered.data[0].enderecos.numero, '1');
                assert.ok('complemento' in filtered.data[0].enderecos);
            }
            const first = await caller.search({ clienteId: cliente.id, pagina: 1, limit: 1, sort: { key: 'valorTotal', direction: 'asc' } });
            const second = await caller.search({ clienteId: cliente.id, pagina: 2, limit: 1, sort: { key: 'valorTotal', direction: 'asc' } });
            assert.equal(first.total, 3);
            assert.equal(first.data[0].valorTotal, 100);
            assert.equal(second.data[0].valorTotal, 200);
            throw rollback;
        }, { timeout: 30000 }), (error) => error === rollback);
    } finally {
        await prisma.$disconnect();
    }
});

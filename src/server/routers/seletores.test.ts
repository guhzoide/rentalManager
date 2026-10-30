import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { seletoresRouter, selectorSchema } from './seletores.js';
import { clienteRouter } from './clientes.js';
import { usuarioRouter } from './usuarios.js';
import { prisma, type Context } from '../trpc.js';
import { gridPrismaQuery } from '../../lib/gridColumns.js';

const caller = (db: unknown, allowedPages = ['agenda']) => seletoresRouter.createCaller({
    prisma: db, session: { user: { id: 'search-test', allowedPages } },
} as unknown as Context);

test('selectors bound requests and validate cursor and selected ids', () => {
    assert.equal(selectorSchema.parse({ busca: ' Hugo ' }).busca, 'Hugo');
    for (const input of [{ limit: 51 }, { limit: 0 }, { busca: 'x'.repeat(101) }, { cursor: '' }, { ids: Array(201).fill('id') }]) {
        assert.equal(selectorSchema.safeParse(input).success, false);
    }
});

test('client options query the database case-insensitively with a keyset and lightweight projection', async () => {
    let args: Record<string, unknown> = {};
    const api = caller({ clientes: { findMany: async (input: Record<string, unknown>) => {
        args = input;
        return [{ id: 'a', nome: 'Hugo' }, { id: 'b', nome: 'Hugo Silva' }, { id: 'c', nome: 'Hugo Souza' }];
    } } });
    const result = await api.clientes({ busca: 'hUgO', limit: 2, cursor: 'previous' });
    assert.deepEqual(result, { data: [{ id: 'a', nome: 'Hugo' }, { id: 'b', nome: 'Hugo Silva' }], nextCursor: 'b' });
    assert.deepEqual(args.cursor, { id: 'previous' });
    assert.equal(args.skip, 1);
    assert.equal(args.take, 3);
    assert.deepEqual(args.select, { id: true, nome: true });
    assert.deepEqual(args.where, { OR: ['nome', 'cpf', 'email', 'contato'].map((field) => ({ [field]: { contains: 'hUgO', mode: 'insensitive' } })) });
});

test('selected records resolve by id without loading preceding pages, and addresses are client-scoped', async () => {
    let where: unknown;
    const api = caller({ clientes: { findMany: async (args: { where: unknown }) => { where = args.where; return []; } },
        enderecos: { findMany: async (args: { where: unknown }) => { where = args.where; return []; } } });
    await api.clientes({ ids: ['outside-first-page'], limit: 1 });
    assert.deepEqual(where, { id: { in: ['outside-first-page'] } });
    assert.deepEqual(await api.enderecos({}), { data: [], nextCursor: undefined });
    await api.enderecos({ clienteId: 'client', ids: ['address'] });
    assert.deepEqual(where, { clienteId: 'client', id: { in: ['address'] } });
});

test('selectors and canvas record hydration enforce module access', async () => {
    await assert.rejects(caller({}, []).clientes({}), { code: 'FORBIDDEN' });
    await assert.rejects(caller({}).grupos({}), { code: 'FORBIDDEN' });
    await assert.rejects(caller({}).records({ table: 'clientes', ids: ['id'] }), { code: 'FORBIDDEN' });
});

test('real database search finds Hugo outside initial batches and paginates without duplicates', {
    skip: !process.env.RUN_SEARCH_DB_TESTS,
}, async () => {
    try {
        const api = caller(prisma, ['agenda', 'clientes', 'usuarios', 'estoque', 'grupos', 'canvas']);
        const existing = await prisma.clientes.findFirst({ where: { nome: { equals: 'Hugo', mode: 'insensitive' } } });
        assert.ok(existing, 'Expected the existing Hugo client');
        const found = await api.clientes({ busca: 'hugo' });
        assert.ok(found.data.some((row) => row.id === existing.id));
        assert.ok((await api.clientes({ ids: [existing.id], limit: 1 })).data.some((row) => row.id === existing.id));
        const first = await api.clientes({ limit: 2 });
        const second = await api.clientes({ limit: 2, cursor: first.nextCursor });
        assert.ok(first.nextCursor);
        assert.equal(new Set([...first.data, ...second.data].map((row) => row.id)).size, 4);
        const context = { prisma, session: { user: { id: 'search-test', allowedPages: ['clientes', 'usuarios'] } } } as unknown as Context;
        const clients = await clienteRouter.createCaller(context).list({ ...gridPrismaQuery([{ key: 'nome' }, { key: 'email' }], {}, null, 'hugo'), limit: 25 });
        assert.ok(clients.data.some((row) => row.id === existing.id));
        assert.ok(clients.total >= 1);
        const users = await usuarioRouter.createCaller(context).list({ ...gridPrismaQuery([{ key: 'nome', field: 'name' }, { key: 'email' }], {}, null, 'hugo'), limit: 25 });
        assert.ok(users.total > 0);
        for (const row of users.data) assert.ok(row.nome.toLowerCase().includes('hugo') || row.email.toLowerCase().includes('hugo'));
        for (const tipo of ['itens', 'categorias', 'grupos', 'agendas', 'transacoes', 'empresas'] as const) {
            const page = await api[tipo]({ limit: 2 });
            assert.ok(page.data.length <= 2);
            if (page.nextCursor) {
                const next = await api[tipo]({ limit: 2, cursor: page.nextCursor });
                assert.equal(new Set([...page.data, ...next.data].map((row) => row.id)).size, page.data.length + next.data.length);
            }
        }
        const [hydrated] = await api.records({ table: 'clientes', ids: [existing.id] });
        assert.equal(hydrated.nome, existing.nome);
        assert.ok('rua' in hydrated);
    } finally { await prisma.$disconnect(); }
});

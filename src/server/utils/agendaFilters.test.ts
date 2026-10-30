import assert from 'node:assert/strict';
import test from 'node:test';
import { agendaFiltersSchema, agendaSearchSchema, agendaWhere, agendaOrderBy, agendaStatusWhere } from './agendaFilters.js';

test('defaults to pending without restricting month', () => {
    assert.deepEqual(agendaWhere(agendaFiltersSchema.parse({})), { OR: [{ concluida: false }, { entregue: false }] });
});

test('combines client, item existence, status and delivery range before pagination', () => {
    const inicio = new Date('2026-09-01T03:00:00Z');
    const fim = new Date('2026-11-01T02:59:59Z');
    assert.deepEqual(agendaWhere(agendaFiltersSchema.parse({
        concluida: true, clienteId: 'cliente', itemId: 'item', inicio, fim,
    })), {
        concluida: true,
        entregue: true,
        clienteId: 'cliente',
        itens: { some: { itemId: 'item' } },
        data: { gte: inicio, lte: fim },
    });
});

test('rejects invalid dates and empty relation filters', () => {
    assert.equal(agendaFiltersSchema.safeParse({ inicio: 'invalid' }).success, false);
    assert.equal(agendaFiltersSchema.safeParse({ clienteId: '' }).success, false);
    assert.equal(agendaFiltersSchema.safeParse({ itemId: '' }).success, false);
});

test('bounds database page size and rejects fractional or negative pagination', () => {
    assert.deepEqual(agendaSearchSchema.parse({}), { concluida: false, pagina: 1, limit: 20 });
    for (const input of [{ limit: 101 }, { limit: 0 }, { pagina: 0 }, { pagina: 1.5 }]) {
        assert.equal(agendaSearchSchema.safeParse(input).success, false);
    }
});

test('column filters combine with relation selections and completion instead of overriding them', () => {
    const where = agendaWhere(agendaFiltersSchema.parse({
        clienteId: 'selected-client', itemId: 'selected-item',
        colunas: { cliente: 'Ana', endereco: 'Jardim', itens: 'Cama', observacao: 'portaria', valorTotal: '0', entregue: 'true', concluida: 'false' },
    }));
    assert.equal(where.clienteId, 'selected-client');
    assert.deepEqual(where.itens, { some: { itemId: 'selected-item' } });
    assert.deepEqual(where.OR, [{ concluida: false }, { entregue: false }]);
    const conditions = where.AND as unknown[];
    assert.equal(conditions.length, 7);
    assert.ok(conditions.some((condition) => JSON.stringify(condition).includes('Jardim')));
    assert.ok(conditions.some((condition) => JSON.stringify(condition) === '{"valorTotal":0}'));
    assert.ok(conditions.some((condition) => JSON.stringify(condition) === '{"concluida":false}'));
});

test('rejects unsupported sorting, arbitrary columns, invalid booleans, values and dates', () => {
    for (const value of [
        { sort: { key: 'itens', direction: 'asc' } }, { sort: { key: 'cliente', direction: 'random' } },
        { colunas: { unknown: 'value' } }, { colunas: { entregue: 'yes' } },
        { colunas: { valorTotal: 'NaN' } }, { colunas: { valorTotal: '' } }, { colunas: { data: '2026-02-30' } },
    ]) assert.equal(agendaSearchSchema.safeParse(value).success, false);
});


test('relation and scalar ordering always have a stable ID tiebreaker', () => {
    assert.deepEqual(agendaOrderBy({ key: 'cliente', direction: 'desc' }), [{ clientes: { nome: 'desc' } }, { id: 'asc' }]);
    assert.deepEqual(agendaOrderBy({ key: 'valorTotal', direction: 'asc' }), [{ valorTotal: 'asc' }, { id: 'asc' }]);
    assert.equal(agendaOrderBy({ key: 'endereco', direction: 'asc' }).length, 3);
});

test('status filtering uses the same server clock and one hour window as row colors', () => {
    const now = new Date('2026-10-29T15:00:00Z');
    assert.deepEqual(agendaStatusWhere('success', now), { entregue: true, concluida: true });
    assert.deepEqual(agendaStatusWhere('danger', now), { OR: [
        { entregue: false, data: { lt: now } }, { concluida: false, dataColeta: { lt: now } },
    ] });
    const warning = JSON.stringify(agendaStatusWhere('warning', now));
    assert.ok(warning.includes('2026-10-29T16:00:00.000Z'));
    assert.ok(warning.includes('NOT'));
});

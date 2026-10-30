import assert from 'node:assert/strict';
import test from 'node:test';
import { applyGridColumns, gridPrismaQuery, type GridColumnConfig } from './gridColumns';

const rows = [
    { id: '1', nome: 'Árvore', valor: 100, ativo: true, tipo: 'LUCRO', data: '2026-10-29T12:00:00Z' },
    { id: '2', nome: 'Bola', valor: 9, ativo: false, tipo: 'GASTO', data: '2026-10-28T12:00:00Z' },
    { id: '3', nome: 'arvore pequena', valor: 20, ativo: true, tipo: 'GASTO', data: '2026-10-29T18:00:00Z' },
];
const columns: GridColumnConfig<typeof rows[number]>[] = [
    { key: 'nome' }, { key: 'valor', filterType: 'number' }, { key: 'ativo', filterType: 'boolean' },
    { key: 'data', filterType: 'date' }, { key: 'tipo', filterType: 'select' },
];

test('column filters combine and sort numerically before pagination without mutating source', () => {
    const result = applyGridColumns(rows, columns, { nome: 'arvore', ativo: 'true', data: '2026-10-29' }, { key: 'valor', direction: 'asc' });
    assert.deepEqual(result.map((row) => row.id), ['3', '1']);
    assert.equal(result.slice(0, 1)[0].valor, 20);
    assert.deepEqual(rows.map((row) => row.id), ['1', '2', '3']);
    assert.deepEqual(applyGridColumns(rows, columns, { valor: '9', tipo: 'GASTO' }, null).map((row) => row.id), ['2']);
});

test('numeric descending order and clearing restore the supplied order', () => {
    assert.deepEqual(applyGridColumns(rows, columns, {}, { key: 'valor', direction: 'desc' }).map((row) => row.valor), [100, 20, 9]);
    assert.deepEqual(applyGridColumns(rows, columns, {}, null), rows);
});

test('Prisma column queries map relation and renamed fields and keep zero/false filters', () => {
    const result = gridPrismaQuery([
        { key: 'nome', field: 'name' }, { key: 'categoria', field: 'categoria.nome' },
        { key: 'valor', filterType: 'number' }, { key: 'ativo', filterType: 'boolean' },
        { key: 'acoes', filterable: false, sortable: false },
    ], { nome: 'Ana', categoria: 'Festa', valor: '0', ativo: 'false', acoes: 'ignorado' }, { key: 'categoria', direction: 'desc' });
    assert.deepEqual(result, {
        filtros: { AND: [
            { name: { contains: 'Ana', mode: 'insensitive' } },
            { categoria: { nome: { contains: 'Festa', mode: 'insensitive' } } },
            { valor: 0 }, { ativo: false },
        ] },
        orderBy: { categoria: { nome: 'desc' } },
    });
    assert.deepEqual(gridPrismaQuery([], { unknown: 'ignored' }, { key: 'unknown', direction: 'asc' }), { filtros: undefined, orderBy: undefined });
});

test('general search runs across declared fields and combines with column filters', () => {
    assert.deepEqual(gridPrismaQuery([
        { key: 'nome', field: 'name' }, { key: 'email' }, { key: 'grupoCodigo', filterType: 'number' },
        { key: 'master', filterType: 'boolean' }, { key: 'acoes', filterable: false },
    ], { email: 'proton' }, null, '  HuGo  ').filtros, {
        AND: [{ email: { contains: 'proton', mode: 'insensitive' } }, { OR: [
            { name: { contains: 'HuGo', mode: 'insensitive' } }, { email: { contains: 'HuGo', mode: 'insensitive' } },
        ] }],
    });
    assert.deepEqual(gridPrismaQuery([{ key: 'ativo', filterType: 'boolean' }, { key: 'valor', filterType: 'number' }], {}, null, 'não').filtros,
        { AND: [{ OR: [{ ativo: false }] }] });
    assert.deepEqual(gridPrismaQuery([{ key: 'valor', filterType: 'number' }], {}, null, '0').filtros,
        { AND: [{ OR: [{ valor: 0 }] }] });
});

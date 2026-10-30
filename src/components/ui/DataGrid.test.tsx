import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataGrid } from './DataGrid';

const data = Array.from({ length: 120 }, (_, i) => ({ id: String(i + 1), nome: `Registro ${i + 1}` }));
const columns = [{ key: 'nome', label: 'Nome' }];

for (const size of [25, 50, 100]) {
    test(`local grid renders only ${size} rows per page`, () => {
        const html = renderToStaticMarkup(<DataGrid columns={columns} data={data} pageSize={size} />);
        assert.equal((html.match(/<td>/g) ?? []).length, size);
        assert.ok(html.includes(`<td>Registro ${size}</td>`));
        assert.ok(!html.includes(`<td>Registro ${size + 1}</td>`));
        assert.ok(html.includes('Por página'));
    });
}

test('server pagination preserves the whole page received from the API', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={data.slice(25, 50)}
        page={2} pageSize={25} total={1000} onPageChange={() => {}} onPageSizeChange={() => {}} />);
    assert.equal((html.match(/<td>/g) ?? []).length, 25);
    assert.ok(html.includes('<td>Registro 26</td>'));
    assert.ok(html.includes('<td>Registro 50</td>'));
    assert.ok(html.includes('2 / 40'));
});

test('empty grid keeps the page size selector available', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={[]} />);
    assert.ok(html.includes('Nenhum registro encontrado.'));
    for (const size of [25, 50, 100]) assert.ok(html.includes(`value="${size}"`));
});

test('row status styling is applied to both desktop and mobile records', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={data.slice(0, 1)} rowClassName={() => 'agenda-row--danger'} />);
    assert.match(html, /<tr[^>]*class="agenda-row--danger"/);
    assert.match(html, /<article[^>]*class="datagrid-mobile-card agenda-row--danger"/);
});


test('local column ordering is applied to the full dataset before page slicing', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={data} pageSize={25} sort={{ key: 'nome', direction: 'desc' }} />);
    assert.ok(html.includes('<td>Registro 120</td>'));
    assert.ok(html.includes('<td>Registro 96</td>'));
    assert.ok(!html.includes('<td>Registro 95</td>'));
    assert.ok(html.includes('aria-sort="descending"'));
});

test('local column filtering updates total and keeps controls visible when no rows match', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={data} columnFilters={{ nome: 'absent' }} />);
    assert.ok(html.includes('0 registro(s)'));
    assert.ok(html.includes('Nenhum registro encontrado para os filtros selecionados.'));
    assert.ok(html.includes('Filtrar e ordenar colunas'));
});

test('controlled server grids never filter or reorder the current page locally', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={data.slice(25, 50)} page={2} total={1000}
        onPageChange={() => {}} sort={{ key: 'nome', direction: 'desc' }} columnFilters={{ nome: 'absent' }}
        onSortChange={() => {}} onColumnFiltersChange={() => {}} />);
    assert.equal((html.match(/<td>/g) ?? []).length, 25);
    assert.ok(html.indexOf('<td>Registro 26</td>') < html.indexOf('<td>Registro 50</td>'));
    assert.ok(html.includes('1000 registro(s)'));
});

test('cards view keeps server pagination, status and current records', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={data.slice(25, 50)} page={2} pageSize={25}
        total={1000} onPageChange={() => {}} defaultView="cards" />);
    assert.ok(html.includes('datagrid-view--cards'));
    assert.equal((html.match(/<article/g) ?? []).length, 25);
    assert.ok(html.includes('Registro 26'));
    assert.ok(html.includes('Registro 50'));
    assert.ok(!html.includes('Registro 51'));
    assert.ok(html.includes('2 / 40'));
    assert.equal((html.match(/class="btn btn-ghost datagrid-view-switch"/g) ?? []).length, 1);
    assert.ok(html.includes('Visualização em cards. Alterar para tabela'));
    assert.ok(html.includes('data-testid="GridViewIcon"'));
});

test('cards and table modes share local filters, sorting and page size', () => {
    for (const view of ['cards', 'table'] as const) {
        const html = renderToStaticMarkup(<DataGrid columns={columns} data={data} view={view}
            columnFilters={{ nome: 'Registro 1' }} sort={{ key: 'nome', direction: 'desc' }} pageSize={25} />);
        assert.equal((html.match(/<article/g) ?? []).length, 25);
        assert.ok(html.includes('Registro 120'));
        assert.ok(html.includes('Registro 111'));
        assert.ok(!html.includes('Registro 99'));
        assert.ok(html.includes('32 registro(s)'));
    }
});

test('controlled view takes priority and the switch can be disabled for embedded grids', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={data.slice(0, 1)}
        defaultView="cards" view="table" allowViewSwitch={false} />);
    assert.ok(html.includes('datagrid-view--table'));
    assert.ok(!html.includes('datagrid-view-switch'));
});


test('cards are the initial mode and the single toggle represents the current view', () => {
    const cards = renderToStaticMarkup(<DataGrid columns={columns} data={[]} />);
    assert.ok(cards.includes('datagrid-view--cards'));
    assert.ok(cards.includes('data-view="cards"'));
    assert.ok(cards.includes('data-testid="GridViewIcon"'));
    const table = renderToStaticMarkup(<DataGrid columns={columns} data={[]} view="table" />);
    assert.ok(table.includes('Visualização em tabela. Alterar para cards'));
    assert.ok(table.includes('data-view="table"'));
    assert.ok(table.includes('data-testid="TableRowsIcon"'));
});

test('server search does not filter the returned page a second time', () => {
    const html = renderToStaticMarkup(<DataGrid columns={columns} data={data.slice(0, 1)} page={1} total={1}
        search="Hugo" onSearchChange={() => {}} onPageChange={() => {}} />);
    assert.ok(html.includes('Registro 1'));
    assert.ok(html.includes('value="Hugo"'));
    assert.ok(html.includes('1 registro(s)'));
});

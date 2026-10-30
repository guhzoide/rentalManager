import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardGrid } from './CardGrid';
import type { Column } from './DataGrid';

const row = { id: 'a', nome: 'Cama elástica', valor: 120, observacao: 'Entregar pelo portão lateral, ao lado do jardim.' };
const columns: Column<typeof row>[] = [
    { key: 'nome', label: 'Item', mobileLayout: 'stacked' },
    { key: 'valor', label: 'Diária', mobileLayout: 'half', render: (value) => `R$ ${value}` },
    { key: 'observacao', label: 'Observações', mobileLayout: 'stacked' },
];

test('standalone cards preserve every field, custom rendering and shared layout metadata', () => {
    const html = renderToStaticMarkup(<CardGrid columns={columns} data={[row]} rowClassName={() => 'rental-status'} />);
    assert.equal((html.match(/<article/g) ?? []).length, 1);
    for (const value of ['Cama elástica', 'R$ 120', row.observacao, 'Observações']) assert.ok(html.includes(value));
    assert.ok(html.includes('datagrid-mobile-field--stacked'));
    assert.ok(html.includes('datagrid-mobile-field--half'));
    assert.ok(html.includes('rental-status'));
    assert.ok(!html.includes('role="button"'));
});

test('clickable cards are keyboard accessible and missing fields remain explicit', () => {
    const html = renderToStaticMarkup(<CardGrid columns={[...columns, { key: 'missing', label: 'Campo vazio' }]} data={[row]} onRowClick={() => {}} />);
    assert.ok(html.includes('role="button"'));
    assert.ok(html.includes('tabindex="0"'));
    assert.ok(html.includes('—'));
});

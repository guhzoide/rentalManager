import assert from 'node:assert/strict';
import test from 'node:test';
import { generateTestData, testId } from './test-data.js';

const counts = { clientes: 10, produtos: 5, agendas: 100, usuarios: 2 };
test('fixtures are reproducible with unique IDs and valid relationships', () => {
    const a = generateTestData(counts);
    assert.deepEqual(a, generateTestData(counts));
    assert.equal(new Set(a.agendas.map((agenda) => agenda.id)).size, 100);
    assert.equal(a.itens.length, 200);
    for (const agenda of a.agendas) {
        const address = a.enderecos.find((row) => row.id === agenda.enderecoId);
        assert.equal(address?.clienteId, agenda.clienteId);
        assert.ok(agenda.dataColeta > agenda.data);
    }
    assert.match(testId('categoria'), /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/);
});
test('availability reserves pending rentals only and totals match the items', () => {
    const data = generateTestData(counts);
    assert.ok(data.agendas.some((row) => row.concluida));
    assert.ok(data.agendas.some((row) => !row.concluida));
    for (const product of data.produtos) {
        const reserved = data.itens.filter((item) => item.itemId === product.id
            && !data.agendas.find((agenda) => agenda.id === item.agendaId)?.concluida)
            .reduce((sum, item) => sum + item.quantidade, 0);
        assert.equal(product.disponivel, product.quantidade - reserved);
        assert.ok(product.disponivel >= 0);
        assert.equal(product.exibirCatalogo, false);
    }
    for (const agenda of data.agendas) {
        const daily = data.itens.filter((item) => item.agendaId === agenda.id)
            .reduce((sum, item) => sum + item.quantidade * data.produtos.find((product) => product.id === item.itemId)!.valorDiaria, 0);
        const days = (+agenda.dataColeta - +agenda.data) / 86400000;
        assert.equal(agenda.valorTotal, daily * days);
    }
});

test('natural labels retain unique names and avoid visible load markers', async () => {
    const { clientPresentation, productName, rentalObservation, personName } = await import('./natural-data.js');
    const names = Array.from({ length: 5000 }, (_, i) => clientPresentation(i).nome);
    const products = Array.from({ length: 1000 }, (_, i) => productName(i));
    assert.equal(new Set(names).size, 5000);
    assert.equal(new Set(products).size, 1000);
    assert.ok([...names, ...products, rentalObservation(0), personName(0)].every((value) => !/TESTE|CARGA|rental-manager-load/.test(value)));
});

test('expenses are reproducible, positive and cover every month including the current period', async () => {
    const { generateExpenses } = await import('./natural-data.js');
    const expenses = generateExpenses();
    assert.deepEqual(expenses, generateExpenses());
    assert.equal(expenses.length, 12000);
    assert.equal(new Set(expenses.map((expense) => expense.id)).size, 12000);
    assert.ok(expenses.every((expense) => expense.tipo === 'GASTO' && expense.valor > 0));
    const october = expenses.filter((expense) => expense.data.getUTCFullYear() === 2026 && expense.data.getUTCMonth() === 9);
    assert.equal(october.length, 480);
});

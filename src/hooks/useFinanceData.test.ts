import assert from 'node:assert/strict';
import test from 'node:test';
import { rentalToFinanceMovement } from './useFinanceData';

const rental = { id: 'rental', data: '2026-10-29T15:00:00Z', valorTotal: 250 };

test('automatic rental revenue requires delivery and collection, including legacy missing flags', () => {
    for (const status of [{}, { entregue: true }, { concluida: true }, { entregue: true, concluida: false }, { entregue: false, concluida: true }]) {
        assert.equal(rentalToFinanceMovement({ ...rental, ...status }), null);
    }
    const movement = rentalToFinanceMovement({ ...rental, entregue: true, concluida: true });
    assert.equal(movement?.valor, 250);
    assert.equal(movement?.isAgenda, true);
});

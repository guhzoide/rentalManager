import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogWhatsAppLink } from './catalog.js';

test('normalizes Brazilian contact numbers with and without country code', () => {
    const local = catalogWhatsAppLink('(41) 99999-1234', 'Cama elástica');
    assert.equal(local, catalogWhatsAppLink('+55 41 99999-1234', 'Cama elástica'));
    assert.ok(local?.startsWith('https://wa.me/5541999991234?text='));
    assert.ok(new URL(local!).searchParams.get('text')?.includes('"Cama elástica"'));
    assert.ok(catalogWhatsAppLink('(41) 3333-4444'));
});

test('does not build links for blank, missing or incomplete numbers', () => {
    for (const number of [null, undefined, '', '   ', 'abc', '+55', '12345']) {
        assert.equal(catalogWhatsAppLink(number), null);
    }
});

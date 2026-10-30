import assert from 'node:assert/strict';
import test from 'node:test';
import { agendaStatus, AGENDA_WARNING_MS } from './agendaStatus.js';

const now = new Date('2026-10-29T15:00:00Z').getTime();
const rental = {
    data: new Date(now + 2 * AGENDA_WARNING_MS),
    dataColeta: new Date(now + 3 * AGENDA_WARNING_MS),
    entregue: false, concluida: false,
};

test('only both confirmations make a rental green, even after its deadlines', () => {
    const past = { ...rental, data: new Date(now - 7200000), dataColeta: new Date(now - 3600000) };
    assert.equal(agendaStatus({ ...past, entregue: true, concluida: true }, now).cor, 'success');
    assert.equal(agendaStatus({ ...past, concluida: true }, now).texto, 'Entrega em atraso');
    assert.equal(agendaStatus({ ...past, entregue: true }, now).texto, 'Coleta em atraso');
    assert.equal(agendaStatus(past, now).texto, 'Entrega e Coleta em atraso');
});

test('pending deadlines turn yellow within one hour and red only after the deadline', () => {
    assert.equal(agendaStatus(rental, now).cor, 'pending');
    const due = { ...rental, data: new Date(now + AGENDA_WARNING_MS) };
    assert.equal(agendaStatus(due, now).cor, 'warning');
    assert.equal(agendaStatus({ ...due, data: new Date(now) }, now).cor, 'warning');
    assert.equal(agendaStatus({ ...due, data: new Date(now - 1) }, now).cor, 'danger');
});

test('delivery confirmation moves alerts to collection and equivalent timezones give identical results', () => {
    const due = { ...rental, entregue: true, data: new Date(now - 7200000), dataColeta: new Date(now + 1800000) };
    assert.deepEqual(agendaStatus(due, now), { cor: 'warning', texto: 'Coleta em até 1 hora' });
    assert.deepEqual(agendaStatus({ ...due, dataColeta: new Date('2026-10-29T12:30:00-03:00') }, now), agendaStatus(due, now));
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '../../lib/trpc';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgendaForm } from './AgendaForm';
import { mergeAgendaOptions } from '../../lib/agendaOptions';

const item = { id: 'item-vinculado', nome: 'Brinquedo fora do lote', valorDiaria: 125, disponivel: 5 };
const cliente = { id: 'cliente-vinculado', nome: 'Cliente fora do lote' };
const endereco = { id: 'endereco-vinculado', clienteId: cliente.id, rua: 'Rua vinculada', numero: '20', cep: '80000000' };
const noop = () => {};

function form(options: Partial<ComponentProps<typeof AgendaForm>>) {
    const client = new QueryClient();
    return renderToStaticMarkup(<QueryClientProvider client={client}><trpc.Provider client={trpcClient} queryClient={client}><AgendaForm
        selectedItens={[{ itemId: item.id, quantidade: 2 }]}
        setSelectedItens={noop} clienteId={cliente.id} setClienteId={noop}
        enderecoId={endereco.id} setEnderecoId={noop} observacao="Festa"
        setObservacao={noop} data="2026-10-29T08:00" setData={noop}
        dataColeta="2026-10-29T18:00" setDataColeta={noop}
        desconto={0} setDesconto={noop} frete={0} setFrete={noop}
        valorTotalCalculado={250} itens={[]} clientes={[]} filteredEnderecos={[]}
        {...options}
    /></trpc.Provider></QueryClientProvider>);
}

for (const size of [0, 200]) {
    test(`editing fills linked items, client and address even with ${size} unrelated options`, () => {
        const unrelated = Array.from({ length: size }, (_, index) => ({ id: `outro-${index}`, nome: `Outro ${index}` }));
        const itens = mergeAgendaOptions<ComponentProps<typeof AgendaForm>['itens'][number]>(unrelated, [item]);
        const html = form({
            itens,
            clientes: mergeAgendaOptions(unrelated, [cliente]),
            filteredEnderecos: mergeAgendaOptions([], [endereco]),
        });
        assert.match(html, /value="Brinquedo fora do lote/);
        assert.match(html, /value="Cliente fora do lote"/);
        assert.match(html, /value="Rua vinculada, 20/);
        assert.equal(itens.find((option) => option.id === item.id)?.valorDiaria, 125);
    });
}

test('a refreshed option replaces the seeded record without duplicating it', () => {
    const refreshed = { ...item, disponivel: 8, valorDiaria: 150 };
    assert.deepEqual(mergeAgendaOptions([refreshed], [item]), [refreshed]);
});

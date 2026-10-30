import { COUNTS, testId } from './dataset-identity.js';
export { DATASET, COUNTS, testId } from './dataset-identity.js';
import { clientPresentation, addressPresentation, productName, rentalObservation } from './natural-data.js';

export function generateTestData(counts = COUNTS) {
    let state = 20261027;
    const random = (max: number) => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return Math.floor(state / 4294967296 * max);
    };
    const updatedAt = new Date('2026-10-27T12:00:00Z');
    const clientes = Array.from({ length: counts.clientes }, (_, i) => ({
        id: testId('cliente', i), ...clientPresentation(i), updatedAt,
    }));
    const enderecos = clientes.map((cliente, i) => ({
        id: testId('endereco', i), clienteId: cliente.id, cep: '00000000',
        ...addressPresentation(i), principal: true, updatedAt,
    }));
    const produtos = Array.from({ length: counts.produtos }, (_, i) => ({
        id: testId('produto', i), nome: productName(i),
        categoriaId: testId('categoria'), peso: 1 + i % 30, largura: 1 + i % 5, altura: 1 + i % 4,
        valorDiaria: 25 + i % 100 * 5, quantidade: 1000, disponivel: 1000,
        ativo: i % 10 !== 0, exibirCatalogo: false, imageUrls: [], updatedAt,
    }));
    const reserved = new Array<number>(counts.produtos).fill(0);
    const itens: { id: string; agendaId: string; itemId: string; quantidade: number }[] = [];
    const agendas = Array.from({ length: counts.agendas }, (_, i) => {
        const clienteIndex = random(counts.clientes);
        const concluida = random(3) === 0;
        const data = new Date(updatedAt.getTime() + (random(731) - 365) * 86400000);
        data.setUTCHours(11 + random(8), 0, 0, 0);
        const dataColeta = new Date(data.getTime() + (1 + random(3)) * 86400000);
        const days = (dataColeta.getTime() - data.getTime()) / 86400000;
        const id = testId('agenda', i);
        let valorTotal = 0;
        const first = random(counts.produtos);
        for (let j = 0; j < Math.min(2, counts.produtos); j++) {
            const productIndex = (first + j) % counts.produtos;
            const quantidade = 1 + random(3);
            itens.push({ id: testId('agenda-item', i * 2 + j), agendaId: id, itemId: produtos[productIndex].id, quantidade });
            if (!concluida) reserved[productIndex] += quantidade;
            valorTotal += produtos[productIndex].valorDiaria * quantidade * days;
        }
        return {
            id, clienteId: clientes[clienteIndex].id, enderecoId: enderecos[clienteIndex].id,
            data, dataColeta, entregue: concluida || i % 2 === 0, concluida, valorTotal, desconto: 0, frete: 0,
            observacao: rentalObservation(i), updatedAt,
        };
    });
    produtos.forEach((produto, i) => {
        produto.quantidade = Math.max(1000, reserved[i] + 100);
        produto.disponivel = produto.quantidade - reserved[i];
    });
    return { clientes, enderecos, produtos, agendas, itens, updatedAt };
}

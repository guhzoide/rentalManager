import { testId } from './dataset-identity.js';

const firstNames = ['Ana', 'Bruno', 'Camila', 'Daniel', 'Elisa', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olívia', 'Pedro', 'Renata', 'Samuel', 'Tatiana', 'Vinícius'];
const surnames = ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Ferreira', 'Gomes', 'Henriques', 'Inácio', 'Jardim', 'Lima', 'Martins', 'Nascimento', 'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira', 'Andrade', 'Castro', 'Duarte', 'Freitas', 'Mendes'];
const lastNames = ['Silva', 'Costa', 'Souza', 'Rocha', 'Correia', 'Moreira', 'Azevedo', 'Batista', 'Monteiro', 'Campos'];
const streets = ['Rua das Acácias', 'Rua dos Ipês', 'Avenida das Palmeiras', 'Rua das Flores', 'Rua dos Jasmins', 'Avenida Primavera', 'Rua dos Pinheiros', 'Rua das Hortênsias', 'Alameda dos Cedros', 'Rua das Orquídeas'];
const districts = ['Centro', 'Jardim América', 'Vila Nova', 'Boa Vista', 'Santa Clara', 'Jardim das Flores', 'São Pedro', 'Bela Vista', 'Parque das Araucárias', 'Jardim Europa'];
const products = ['Cama elástica', 'Piscina de bolinhas', 'Castelo inflável', 'Tobogã inflável', 'Pula-pula', 'Futebol de sabão', 'Circuito de obstáculos', 'Escorregador infantil', 'Mesa de pebolim', 'Mesa de air hockey', 'Gangorra infantil', 'Carrossel infantil', 'Kit de recreação', 'Barraca de festa', 'Tenda para eventos', 'Conjunto de mesas', 'Conjunto de cadeiras', 'Balcão para doces', 'Painel de festa', 'Tapete de atividades'];
const models = ['Clássico', 'Aventura', 'Safari', 'Arco-íris', 'Jardim', 'Estrela', 'Oceano', 'Bosque', 'Encanto', 'Alegria'];
const observations = ['Montar no espaço coberto ao lado do salão.', 'Combinar a entrega com a portaria.', 'Acesso pelo portão lateral.', 'Ligar antes da chegada para liberar a entrada.', 'Montagem no jardim, próximo à área de convivência.', 'Coleta após o encerramento da festa.', 'Confirmar o ponto de energia com o responsável.', 'Entrega pela manhã; responsável estará no local.', 'Festa de aniversário no salão de eventos.', 'Reservar espaço para circulação durante a montagem.', 'Evento da escola no pátio principal.', 'Confraternização com montagem na área externa.'];

export const CATEGORY_NAME = 'Acervo de eventos';
export const GROUP_NAME = 'Equipe de operações';
export function personName(i: number) {
    return `${firstNames[i % 20]} ${surnames[Math.floor(i / 20) % 25]} ${lastNames[Math.floor(i / 500) % 10]}`;
}
export function clientPresentation(i: number) {
    const slug = personName(i).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ /g, '.');
    return { nome: personName(i), contato: firstNames[(i + 7) % 20], email: `${slug}@example.invalid` };
}
export function addressPresentation(i: number) {
    return { rua: streets[i % streets.length], bairro: districts[Math.floor(i / 10) % districts.length], numero: String(10 + i % 980) };
}
export function productName(i: number) {
    return `${products[i % 20]} ${models[Math.floor(i / 20) % 10]} — Modelo ${['Compacto', 'Infantil', 'Família', 'Amplo', 'Premium'][Math.floor(i / 200) % 5]}`;
}
export function rentalObservation(i: number) { return observations[i % observations.length]; }

export const EXPENSE_COUNT = 12000;

export function generateExpenses() {
    const templates = [
        { descricao: 'Aluguel do galpão', valor: 3800 },
        { descricao: 'Energia elétrica do depósito', valor: 420 },
        { descricao: 'Abastecimento do veículo de entregas', valor: 280 },
        { descricao: 'Manutenção de brinquedos infláveis', valor: 650 },
        { descricao: 'Limpeza e higienização dos equipamentos', valor: 310 },
        { descricao: 'Diárias da equipe de montagem', valor: 1200 },
        { descricao: 'Reposição de peças e acessórios', valor: 185 },
        { descricao: 'Materiais de escritório', valor: 95 },
        { descricao: 'Internet e telefone', valor: 159 },
        { descricao: 'Divulgação e anúncios', valor: 750 },
        { descricao: 'Seguro dos equipamentos', valor: 480 },
        { descricao: 'Serviços de contabilidade', valor: 590 },
    ];
    const existing = Array.from({ length: 600 }, (_, i) => {
        const template = templates[i % templates.length];
        const monthIndex = Math.floor(i / 24);
        const data = new Date(Date.UTC(2025, 9 + monthIndex, 1 + i % 24, 15));
        return {
            id: testId('saida', i), tipo: 'GASTO', data,
            descricao: `${template.descricao} — ${String(data.getUTCMonth() + 1).padStart(2, '0')}/${data.getUTCFullYear()}`,
            valor: Math.round(template.valor * (0.9 + i % 17 / 100) * 100) / 100,
            updatedAt: new Date('2026-10-27T12:00:00Z'),
        };
    });
    // Mantém os primeiros 600 lançamentos para preservar a carga já inserida.
    const additional = Array.from({ length: EXPENSE_COUNT - 600 }, (_, index) => {
        const i = index + 600;
        const template = templates[(index * 7 + Math.floor(index / 12)) % templates.length];
        const monthIndex = Math.floor(index / 456);
        const data = new Date(Date.UTC(2025, 9 + monthIndex, 1 + index % 28, 8 + index % 10, index % 60));
        return {
            id: testId('saida', i), tipo: 'GASTO', data,
            descricao: `${template.descricao} — ${['Unidade central', 'Operação de eventos', 'Atendimento externo', 'Depósito e logística', 'Equipe de apoio'][index % 5]} — ${String(data.getUTCMonth() + 1).padStart(2, '0')}/${data.getUTCFullYear()}`,
            valor: Math.round(template.valor * (0.75 + (index * 37 % 166) / 100) * 100) / 100,
            updatedAt: new Date('2026-10-27T12:00:00Z'),
        };
    });
    return [...existing, ...additional];
}


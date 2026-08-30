export const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const YEARS = ['2024', '2025', '2026', '2027', '2028'];

export interface FinanceMovement {
    id: string;
    descricao: string;
    valor: number;
    tipo: 'LUCRO' | 'GASTO';
    data: string;
    isAgenda?: boolean;
}

export const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

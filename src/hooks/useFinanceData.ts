import { useMemo } from 'react';
import dayjs from 'dayjs';
import { trpc } from '@/lib/trpc';
import { FinanceMovement } from '@/utils/financeUtils';

interface RentalRevenue {
    id: string;
    data: string;
    dataColeta?: string;
    valorTotal: number;
    entregue?: boolean;
    concluida?: boolean;
    desconto?: number;
    frete?: number;
    clientes?: { nome?: string | null } | null;
    itens?: Array<{
        quantidade?: number;
        estoques?: { valorDiaria?: number | null } | null;
    }>;
}

export function rentalToFinanceMovement(rental: RentalRevenue): FinanceMovement | null {
    if (!rental.entregue || !rental.concluida) return null;

    let value = rental.valorTotal;

    // Compatibilidade com locações antigas cujo total foi zerado ao concluir.
    if (value <= 0 && rental.dataColeta && rental.itens?.length) {
        const rentalHours = dayjs(rental.dataColeta).diff(dayjs(rental.data), 'hour');
        const rentalDays = Math.max(1, Math.ceil(rentalHours / 24));
        const itemsTotal = rental.itens.reduce(
            (total, item) => total + (item.estoques?.valorDiaria ?? 0) * (item.quantidade ?? 1),
            0,
        );
        value = itemsTotal * rentalDays * ((100 - (rental.desconto ?? 0)) / 100) + (rental.frete ?? 0);
    }

    if (value <= 0) return null;

    return {
        id: rental.id,
        descricao: `Locação — ${rental.clientes?.nome || 'Cliente'}`,
        valor: value,
        tipo: 'LUCRO',
        data: rental.data,
        isAgenda: true,
    };
}

export function useFinanceData(selectedMonth: number, selectedYear: string, enabled = true) {
    const startOfMonth = useMemo(() => {
        return dayjs(`${selectedYear}-${selectedMonth + 1}-01`).startOf('month');
    }, [selectedMonth, selectedYear]);

    const endOfMonth = useMemo(() => {
        return startOfMonth.endOf('month');
    }, [startOfMonth]);

    // Queries
    const { data: transacoesRes, isLoading: loadingTrans } = trpc.transacoes.list.useQuery({
        pagina: 1,
        limit: 1000,
        filtros: {
            data: {
                gte: startOfMonth.toISOString(),
                lte: endOfMonth.toISOString(),
            }
        }
    }, { enabled });

    const { data: agendasRes, isLoading: loadingAgendas } = trpc.agendas.list.useQuery({
        pagina: 1,
        limit: 1000,
        filtros: {
            data: {
                gte: startOfMonth.toISOString(),
                lte: endOfMonth.toISOString(),
            },
            entregue: true,
            concluida: true,
        }
    }, { enabled });

    const analytics = trpc.transacoes.analytics.useQuery({
        mes: selectedMonth,
        ano: Number(selectedYear),
    }, { enabled, staleTime: 30_000 });

    // Combined Movements List
    const movements = useMemo(() => {
        const list: FinanceMovement[] = [];

        if (transacoesRes?.data) {
            transacoesRes.data.forEach((t) => {
                list.push({
                    id: t.id,
                    descricao: t.descricao,
                    valor: t.valor,
                    tipo: t.tipo as 'LUCRO' | 'GASTO',
                    data: t.data,
                    isAgenda: false,
                });
            });
        }

        if (agendasRes?.data) {
            agendasRes.data.forEach((a) => {
                const movement = rentalToFinanceMovement(a);
                if (movement) list.push(movement);
            });
        }

        return list.sort((a, b) => dayjs(b.data).diff(dayjs(a.data)));
    }, [transacoesRes, agendasRes]);

    return {
        loadingTrans: loadingTrans || analytics.isLoading,
        loadingAgendas,
        movements,
        totals: analytics.data?.totals ?? { lucros: 0, gastos: 0, saldo: 0 },
    };
}

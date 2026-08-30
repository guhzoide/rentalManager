import { useMemo } from 'react';
import dayjs from 'dayjs';
import { trpc } from '@/lib/trpc';
import { FinanceMovement } from '@/utils/financeUtils';

interface RentalRevenue {
    id: string;
    data: string;
    dataColeta?: string;
    valorTotal: number;
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
    if (!rental.concluida) return null;

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

export function useFinanceData(selectedMonth: number, selectedYear: string) {
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
    });

    const { data: agendasRes, isLoading: loadingAgendas } = trpc.agendas.list.useQuery({
        pagina: 1,
        limit: 1000,
        filtros: {
            data: {
                gte: startOfMonth.toISOString(),
                lte: endOfMonth.toISOString(),
            }
        }
    });

    // All-time queries for global metrics
    const { data: allAgendasRes } = trpc.agendas.list.useQuery({ pagina: 1, limit: 1000 });
    const { data: allClientesRes } = trpc.clientes.list.useQuery({ pagina: 1, limit: 1000 });
    const { data: allTransacoesRes } = trpc.transacoes.list.useQuery({ pagina: 1, limit: 1000 });

    // 1. Most rented toys
    const mostRentedToys = useMemo(() => {
        if (!allAgendasRes?.data) return [];
        const counts: Record<string, { nome: string; count: number }> = {};

        allAgendasRes.data.forEach((agenda: any) => {
            agenda.itens?.forEach((item: any) => {
                const id = item.itemId;
                const nome = item.estoques?.nome || 'Item Desconhecido';
                const qty = item.quantidade || 1;
                if (!counts[id]) {
                    counts[id] = { nome, count: 0 };
                }
                counts[id].count += qty;
            });
        });

        const list = Object.values(counts);
        const maxVal = Math.max(...list.map(x => x.count), 1);

        return list
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(x => ({ ...x, pct: (x.count / maxVal) * 100 }));
    }, [allAgendasRes]);

    // 2. Oldest clients
    const oldestClients = useMemo(() => {
        if (!allClientesRes?.data) return [];
        return [...allClientesRes.data]
            .sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)))
            .slice(0, 5);
    }, [allClientesRes]);

    // 3. Clients that spend the most
    const topSpendingClients = useMemo(() => {
        if (!allAgendasRes?.data) return [];
        const spends: Record<string, { nome: string; total: number }> = {};

        allAgendasRes.data.forEach((agenda: any) => {
            const movement = rentalToFinanceMovement(agenda);
            if (!movement) return;

            const cId = agenda.clienteId;
            const nome = agenda.clientes?.nome || 'Cliente Desconhecido';
            if (!spends[cId]) {
                spends[cId] = { nome, total: 0 };
            }
            spends[cId].total += movement.valor;
        });

        const list = Object.values(spends);
        const maxVal = Math.max(...list.map(x => x.total), 1);

        return list
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map(x => ({ ...x, pct: (x.total / maxVal) * 100 }));
    }, [allAgendasRes]);

    // 4. Company expenses breakdown
    const expensesBreakdown = useMemo(() => {
        if (!allTransacoesRes?.data) return { list: [], total: 0 };
        const spends: Record<string, number> = {};
        let total = 0;

        allTransacoesRes.data
            .filter((t: any) => t.tipo === 'GASTO')
            .forEach((t: any) => {
                const desc = t.descricao.trim().split(' ')[0] || 'Geral';
                const val = t.valor || 0;
                spends[desc] = (spends[desc] || 0) + val;
                total += val;
            });

        const list = Object.entries(spends).map(([category, value]) => ({
            category,
            value,
            pct: total > 0 ? (value / total) * 100 : 0
        }));

        return {
            list: list.sort((a, b) => b.value - a.value).slice(0, 5),
            total
        };
    }, [allTransacoesRes]);

    // Combined Movements List
    const movements = useMemo(() => {
        const list: FinanceMovement[] = [];

        if (transacoesRes?.data) {
            transacoesRes.data.forEach((t: any) => {
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
            agendasRes.data.forEach((a: any) => {
                const movement = rentalToFinanceMovement(a);
                if (movement) list.push(movement);
            });
        }

        return list.sort((a, b) => dayjs(b.data).diff(dayjs(a.data)));
    }, [transacoesRes, agendasRes]);

    // Totals Calculations
    const totals = useMemo(() => {
        let lucros = 0;
        let gastos = 0;

        movements.forEach((m) => {
            if (m.tipo === 'LUCRO') {
                lucros += m.valor;
            } else {
                gastos += m.valor;
            }
        });

        return {
            lucros,
            gastos,
            saldo: lucros - gastos,
        };
    }, [movements]);

    // Chronological cash-flow trend
    const dailyTrendData = useMemo(() => {
        const daysInMonth = startOfMonth.daysInMonth();
        const data: { dia: string; Entradas: number; Saídas: number }[] = [];
        
        for (let i = 1; i <= daysInMonth; i++) {
            data.push({
                dia: String(i),
                Entradas: 0,
                Saídas: 0
            });
        }

        movements.forEach((m) => {
            const dayIdx = dayjs(m.data).date() - 1;
            if (dayIdx >= 0 && dayIdx < data.length) {
                if (m.tipo === 'LUCRO') {
                    data[dayIdx].Entradas += m.valor;
                } else {
                    data[dayIdx].Saídas += m.valor;
                }
            }
        });

        return data;
    }, [movements, startOfMonth]);

    return {
        loadingTrans,
        loadingAgendas,
        mostRentedToys,
        oldestClients,
        topSpendingClients,
        expensesBreakdown,
        movements,
        totals,
        dailyTrendData
    };
}

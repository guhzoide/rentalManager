import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';

export const financeAnalyticsSchema = z.object({
    mes: z.number().int().min(0).max(11),
    ano: z.number().int().min(1900).max(2200),
});

export interface FinanceAnalytics {
    totals: { lucros: number; gastos: number; saldo: number };
    dailyTrendData: { dia: string; Entradas: number; Saídas: number }[];
    mostRentedToys: { id: string; nome: string; count: number; pct: number }[];
    topSpendingClients: { id: string; nome: string; total: number; pct: number }[];
    expensesBreakdown: { list: { category: string; value: number; pct: number }[]; total: number };
    rentalCount: number;
    ticketMedio: number;
}

export function financeAnalyticsQuery(input: z.infer<typeof financeAnalyticsSchema>) {
    return Prisma.sql`
WITH period AS (
    SELECT make_date(${input.ano}::int, ${input.mes + 1}::int, 1) AS local_start
), bounds AS (
    SELECT local_start,
        ((local_start::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC') AS inicio,
        (((local_start + interval '1 month')::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC') AS fim
    FROM period
), rentals AS MATERIALIZED (
    SELECT a.id, a.data, a."clienteId",
        GREATEST(0, CASE WHEN a."valorTotal" > 0 THEN a."valorTotal" ELSE
            GREATEST(1, CEIL(TRUNC(EXTRACT(EPOCH FROM (a."dataColeta" - a.data)) / 3600) / 24))
            * COALESCE((SELECT SUM(ai.quantidade * e."valorDiaria")
                FROM agenda_itens ai JOIN estoques e ON e.id = ai."itemId"
                WHERE ai."agendaId" = a.id), 0)
            * ((100 - a.desconto) / 100.0) + a.frete
        END) AS amount
    FROM agendas a CROSS JOIN bounds b
    WHERE a.entregue AND a.concluida AND a.data >= b.inicio AND a.data < b.fim
), transactions AS MATERIALIZED (
    SELECT t.descricao, t.valor, t.tipo, t.data
    FROM transacoes t CROSS JOIN bounds b
    WHERE t.data >= b.inicio AND t.data < b.fim
), movements AS (
    SELECT data, amount AS entrada, 0::double precision AS saida FROM rentals WHERE amount > 0
    UNION ALL
    SELECT data, CASE WHEN tipo = 'LUCRO' THEN valor ELSE 0 END,
        CASE WHEN tipo = 'GASTO' THEN valor ELSE 0 END FROM transactions
), summary AS (
    SELECT COALESCE(SUM(entrada), 0) AS income, COALESCE(SUM(saida), 0) AS expense FROM movements
), daily AS (
    SELECT ((data AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date AS local_day,
        SUM(entrada) AS income, SUM(saida) AS expense
    FROM movements GROUP BY local_day
), days AS (
    SELECT generate_series(local_start::timestamp,
        local_start + interval '1 month' - interval '1 day', interval '1 day')::date AS local_day FROM bounds
), rented_items AS (
    SELECT e.id, e.nome, SUM(ai.quantidade) AS count
    FROM rentals r JOIN agenda_itens ai ON ai."agendaId" = r.id JOIN estoques e ON e.id = ai."itemId"
    GROUP BY e.id, e.nome ORDER BY count DESC, e.id LIMIT 5
), clients AS (
    SELECT c.id, c.nome, SUM(r.amount) AS total
    FROM rentals r JOIN clientes c ON c.id = r."clienteId" WHERE r.amount > 0
    GROUP BY c.id, c.nome ORDER BY total DESC, c.id LIMIT 5
), expense_categories AS (
    SELECT COALESCE(NULLIF(trim(split_part(descricao, ' — ', 1)), ''), 'Outras despesas') AS category,
        SUM(valor) AS value FROM transactions WHERE tipo = 'GASTO' GROUP BY category
), ranked_expenses AS (
    SELECT *, row_number() OVER (ORDER BY value DESC, category) AS position FROM expense_categories
), expense_display AS (
    SELECT category, value, position FROM ranked_expenses WHERE position <= 5
    UNION ALL
    SELECT 'Outros', SUM(value), 6 FROM ranked_expenses WHERE position > 5 HAVING COUNT(*) > 0
)
SELECT jsonb_build_object(
    'totals', jsonb_build_object('lucros', s.income, 'gastos', s.expense, 'saldo', s.income - s.expense),
    'dailyTrendData', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'dia', EXTRACT(DAY FROM days.local_day)::int::text,
        'Entradas', COALESCE(d.income, 0), 'Saídas', COALESCE(d.expense, 0)) ORDER BY days.local_day)
        FROM days LEFT JOIN daily d ON d.local_day = days.local_day), '[]'::jsonb),
    'mostRentedToys', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'nome', i.nome, 'count', i.count,
        'pct', i.count * 100.0 / GREATEST((SELECT MAX(count) FROM rented_items), 1)) ORDER BY i.count DESC, i.id)
        FROM rented_items i), '[]'::jsonb),
    'topSpendingClients', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'nome', c.nome, 'total', c.total,
        'pct', c.total * 100.0 / GREATEST((SELECT MAX(total) FROM clients), 1)) ORDER BY c.total DESC, c.id)
        FROM clients c), '[]'::jsonb),
    'expensesBreakdown', jsonb_build_object('total', s.expense,
        'list', COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'category', e.category, 'value', e.value,
            'pct', CASE WHEN s.expense > 0 THEN e.value * 100.0 / s.expense ELSE 0 END) ORDER BY e.position)
            FROM expense_display e), '[]'::jsonb)),
    'rentalCount', (SELECT COUNT(*) FROM rentals),
    'ticketMedio', (SELECT COALESCE(SUM(amount) / NULLIF(COUNT(*), 0), 0) FROM rentals)
) AS analytics FROM summary s`;
}

export async function getFinanceAnalytics(prisma: Pick<PrismaClient, '$queryRaw'>, input: z.infer<typeof financeAnalyticsSchema>): Promise<FinanceAnalytics> {
    const rows = await prisma.$queryRaw<{ analytics: FinanceAnalytics }[]>(financeAnalyticsQuery(input));
    return rows[0].analytics;
}

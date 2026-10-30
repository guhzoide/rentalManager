import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalyticsDashboard } from './FinanceAnalytics';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/lib/trpc';

type Analytics = inferRouterOutputs<AppRouter>['transacoes']['analytics'];
const empty: Analytics = {
    totals: { lucros: 0, gastos: 0, saldo: 0 }, dailyTrendData: [],
    mostRentedToys: [], topSpendingClients: [], expensesBreakdown: { list: [], total: 0 },
    rentalCount: 0, ticketMedio: 0,
};

test('empty month displays useful empty states and no invented result badge', () => {
    const html = renderToStaticMarkup(<AnalyticsDashboard data={empty} period="Outubro de 2026" />);
    assert.ok(html.includes('Outubro de 2026'));
    assert.ok(html.includes('Nenhuma movimentação registrada neste período.'));
    assert.ok(html.includes('Nenhuma despesa registrada neste período.'));
    assert.ok(!html.includes('Resultado positivo'));
    assert.ok(html.includes('aria-pressed="true"'));
});

test('shows negative result, full ranking names and complete expense legend', () => {
    const data: Analytics = {
        ...empty, totals: { lucros: 1000, gastos: 1500, saldo: -500 },
        expensesBreakdown: { total: 1500, list: [{ category: 'Manutenção de equipamentos', value: 1000, pct: 1000 / 15 }, { category: 'Outros', value: 500, pct: 500 / 15 }] },
        rentalCount: 2, ticketMedio: 500,
        mostRentedToys: [{ id: '1', nome: 'Cama elástica Linha Aventura — Modelo Família', count: 5, pct: 100 }],
        topSpendingClients: [{ id: '1', nome: 'Ana Almeida Silva', total: 1000, pct: 100 }],
    };
    const html = renderToStaticMarkup(<AnalyticsDashboard data={data} period="Outubro de 2026" />);
    assert.ok(html.includes('Resultado negativo'));
    assert.ok(html.includes('Cama elástica Linha Aventura — Modelo Família'));
    assert.ok(html.includes('Ana Almeida Silva'));
    assert.ok(html.includes('Manutenção de equipamentos'));
    assert.ok(html.includes('Outros'));
    assert.ok(!html.includes('Infinity'));
});

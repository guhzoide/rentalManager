import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import { trpc, type AppRouter } from '@/lib/trpc';
import type { inferRouterOutputs } from '@trpc/server';
import { formatCurrency, MONTHS } from '@/utils/financeUtils';
import '@/styles/FinanceAnalytics.css';

type Analytics = inferRouterOutputs<AppRouter>['transacoes']['analytics'];
const palette = ['#60a5fa', '#a78bfa', '#2dd4bf', '#fbbf24', '#fb923c', '#94a3b8'];
const compact = (value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function ChartTooltip({ active, payload, label, currency = true }: {
    active?: boolean;
    payload?: readonly { name?: string | number; value?: unknown; color?: string; payload?: { category?: string } }[];
    label?: string | number;
    currency?: boolean;
}) {
    if (!active || !payload?.length) return null;
    return <div className="fa-tooltip">
        <span>{payload[0].payload?.category ?? (label ? `Dia ${label}` : 'Saídas')}</span>
        {payload.map((entry, i) => <div key={i}>
            <i style={{ background: entry.color }} />
            <span>{entry.payload?.category ? 'Valor' : entry.name}</span>
            <strong>{currency ? formatCurrency(Number(entry.value)) : entry.value as number}</strong>
        </div>)}
    </div>;
}

function EmptyChart({ children }: { children: string }) {
    return <div className="fa-empty"><AccountBalanceWalletOutlined /><p>{children}</p></div>;
}

function Ranking({ title, subtitle, data, money = false }: {
    title: string;
    subtitle: string;
    data: { id: string; nome: string; value: number; pct: number }[];
    money?: boolean;
}) {
    return <section className={`fa-panel fa-ranking ${money ? 'fa-ranking--clients' : ''}`} aria-label={title}>
        <div className="fa-panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="fa-panel-tag">Top 5</span></div>
        {data.length ? <ol className="fa-rank-list">{data.map((row, i) => <li key={row.id}>
            <span className="fa-rank-position">{String(i + 1).padStart(2, '0')}</span>
            <div className="fa-rank-content">
                <div className="fa-rank-label"><span title={row.nome}>{row.nome}</span><strong>{money ? formatCurrency(row.value) : `${row.value.toLocaleString('pt-BR')} un.`}</strong></div>
                <div className="fa-rank-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} /></div>
            </div>
        </li>)}</ol> : <EmptyChart>Nenhuma locação concluída neste período.</EmptyChart>}
        <p className="fa-panel-note">{money ? 'Receita de locações concluídas por cliente.' : 'Quantidade de unidades em locações concluídas.'}</p>
    </section>;
}

export function AnalyticsDashboard({ data, period }: { data: Analytics; period: string }) {
    const [view, setView] = useState<'daily' | 'cumulative'>('daily');
    const chartId = useId().replace(/:/g, '');
    const chartData = useMemo(() => {
        if (view === 'daily') return data.dailyTrendData;
        return data.dailyTrendData.reduce<Analytics['dailyTrendData']>((rows, row) => {
            const previous = rows[rows.length - 1];
            return [...rows, { ...row,
                Entradas: (previous?.Entradas ?? 0) + row.Entradas,
                Saídas: (previous?.Saídas ?? 0) + row.Saídas,
            }];
        }, []);
    }, [data.dailyTrendData, view]);
    const positive = data.totals.saldo >= 0;
    const expenseRatio = data.totals.lucros > 0 ? data.totals.gastos / data.totals.lucros * 100 : null;
    const hasActivity = data.totals.lucros > 0 || data.totals.gastos > 0;
    const metrics = [
        { label: 'Entradas', value: data.totals.lucros, detail: 'Locações concluídas e outras receitas', tone: 'income', icon: ArrowUpwardRounded },
        { label: 'Saídas', value: data.totals.gastos, detail: expenseRatio === null ? 'Despesas registradas no período' : `${expenseRatio.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% das entradas do período`, tone: 'expense', icon: ArrowDownwardRounded },
        { label: 'Resultado do período', value: data.totals.saldo, detail: 'Diferença entre entradas e saídas', tone: positive ? 'balance' : 'expense', icon: AccountBalanceWalletOutlined },
        { label: 'Ticket médio', value: data.ticketMedio, detail: `${data.rentalCount.toLocaleString('pt-BR')} ${data.rentalCount === 1 ? 'locação concluída' : 'locações concluídas'}`, tone: 'ticket', icon: ReceiptLongOutlined },
    ];
    return <div className="finance-analytics">
        <div className="fa-overview">
            <div><span className="fa-eyebrow">Visão do período</span><h2>{period}</h2></div>
            {hasActivity && <span className={`fa-result-badge ${positive ? 'is-positive' : 'is-negative'}`}><i />{positive ? 'Resultado positivo' : 'Resultado negativo'}</span>}
        </div>
        <div className="fa-metrics">{metrics.map(({ label, value, detail, tone, icon: Icon }) => <article className={`fa-metric fa-metric--${tone}`} key={label}>
            <div className="fa-metric-label"><span>{label}</span><Icon fontSize="small" /></div>
            <strong>{formatCurrency(value)}</strong><p>{detail}</p>
        </article>)}</div>
        <div className="fa-chart-grid">
            <section className="fa-panel fa-flow" aria-label="Evolução do caixa">
                <div className="fa-panel-heading"><div><h3>Evolução do caixa</h3><p>{view === 'daily' ? 'Entradas e saídas a cada dia do mês' : 'Valores acumulados desde o primeiro dia do mês'}</p></div>
                    <div className="fa-view-switch" role="group" aria-label="Exibição do fluxo de caixa">
                        <button type="button" aria-pressed={view === 'daily'} onClick={() => setView('daily')}>Por dia</button>
                        <button type="button" aria-pressed={view === 'cumulative'} onClick={() => setView('cumulative')}>Acumulado</button>
                    </div>
                </div>
                <div className="fa-chart-legend"><span><i className="is-income" />Entradas</span><span><i className="is-expense" />Saídas</span></div>
                <div className="fa-flow-chart" role="img" aria-label={`Entradas de ${formatCurrency(data.totals.lucros)} e saídas de ${formatCurrency(data.totals.gastos)} em ${period}`}>
                    {hasActivity ? <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 325 }}>
                        <AreaChart data={chartData} margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`${chartId}-income`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity={0.22} /><stop offset="95%" stopColor="var(--success)" stopOpacity={0.01} /></linearGradient>
                                <linearGradient id={`${chartId}-expense`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--danger)" stopOpacity={0.14} /><stop offset="95%" stopColor="var(--danger)" stopOpacity={0.01} /></linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                            <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={22} tickMargin={12} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={compact} width={52} tickMargin={8} />
                            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="Entradas" stroke="var(--success)" strokeWidth={2.5} fill={`url(#${chartId}-income)`} activeDot={{ r: 4, strokeWidth: 3, stroke: 'var(--bg-secondary)' }} isAnimationActive={false} />
                            <Area type="monotone" dataKey="Saídas" stroke="var(--danger)" strokeWidth={2} fill={`url(#${chartId}-expense)`} activeDot={{ r: 4, strokeWidth: 3, stroke: 'var(--bg-secondary)' }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer> : <EmptyChart>Nenhuma movimentação registrada neste período.</EmptyChart>}
                </div>
                <p className="fa-panel-note">Valores em reais · Receitas de locações reconhecidas na data da entrega.</p>
            </section>
            <section className="fa-panel fa-expenses" aria-label="Composição das saídas">
                <div className="fa-panel-heading"><div><h3>Composição das saídas</h3><p>Participação de cada tipo de despesa</p></div></div>
                {data.expensesBreakdown.total > 0 ? <>
                    <div className="fa-donut" role="img" aria-label={`Total de despesas: ${formatCurrency(data.expensesBreakdown.total)}`}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 200, height: 210 }}><PieChart>
                            <Pie data={data.expensesBreakdown.list} dataKey="value" nameKey="category" cx="50%" cy="50%" innerRadius="71%" outerRadius="92%" paddingAngle={2} stroke="var(--bg-secondary)" strokeWidth={2} isAnimationActive={false}>
                                {data.expensesBreakdown.list.map((row, i) => <Cell key={row.category} fill={palette[i % palette.length]} />)}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                        </PieChart></ResponsiveContainer>
                        <div className="fa-donut-center"><span>Total de saídas</span><strong title={formatCurrency(data.expensesBreakdown.total)}>R$ {compact(data.expensesBreakdown.total)}</strong></div>
                    </div>
                    <ul className="fa-expense-legend">{data.expensesBreakdown.list.map((row, i) => <li key={row.category}>
                        <i style={{ background: palette[i % palette.length] }} /><span title={row.category}>{row.category}</span><strong>{row.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</strong>
                        <small>{formatCurrency(row.value)}</small>
                    </li>)}</ul>
                </> : <EmptyChart>Nenhuma despesa registrada neste período.</EmptyChart>}
            </section>
        </div>
        <div className="fa-rank-grid">
            <Ranking title="Itens mais alugados" subtitle="Os produtos com maior saída no período" data={data.mostRentedToys.map((row) => ({ ...row, value: row.count }))} />
            <Ranking title="Clientes com maior receita" subtitle="Relacionamentos que movimentam o negócio" money data={data.topSpendingClients.map((row) => ({ ...row, value: row.total }))} />
        </div>
    </div>;
}

export function FinanceAnalytics({ month, year }: { month: number; year: number }) {
    const query = trpc.transacoes.analytics.useQuery({ mes: month, ano: year }, { staleTime: 30_000 });
    if (query.isLoading) return <div className="fa-loading" role="status" aria-label="Carregando indicadores financeiros"><span>Carregando indicadores do período…</span><div className="fa-metrics">{[1, 2, 3, 4].map((key) => <div className="fa-skeleton fa-metric" key={key} />)}</div><div className="fa-skeleton fa-loading-chart" /></div>;
    if (query.isError) return <div className="fa-error" role="alert"><h3>Não foi possível carregar os indicadores.</h3><p>Tente novamente para consultar o período selecionado.</p><button className="btn btn-primary" onClick={() => void query.refetch()}>Tentar novamente</button></div>;
    if (!query.data) return null;
    return <AnalyticsDashboard data={query.data} period={`${MONTHS[month]} de ${year}`} />;
}

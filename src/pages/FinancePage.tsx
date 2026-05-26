import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend as RechartsLegend,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
} from 'recharts';

interface FinanceMovement {
    id: string;
    descricao: string;
    valor: number;
    tipo: 'LUCRO' | 'GASTO';
    data: string;
    isAgenda?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>
                    Dia {label}
                </p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: p.color || p.fill }}>
                        {p.name}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const CustomCountTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    {label}
                </p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                    Aluguéis: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const YEARS = ['2024', '2025', '2026', '2027', '2028'];

export function FinancePage() {
    const today = dayjs();
    const [selectedMonth, setSelectedMonth] = useState(today.month());
    const [selectedYear, setSelectedYear] = useState(String(today.year()));
    const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

    const utils = trpc.useUtils();

    // Form transaction state
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('');
    const [tipo, setTipo] = useState<'LUCRO' | 'GASTO'>('LUCRO');
    const [dataStr, setDataStr] = useState(today.format('YYYY-MM-DD'));

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

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

    const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'movements'>('movements');

    // 1. Most rented toys (brinquedos mais alugados)
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

    // 2. Oldest clients (clientes mais antigos)
    const oldestClients = useMemo(() => {
        if (!allClientesRes?.data) return [];
        return [...allClientesRes.data]
            .sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)))
            .slice(0, 5);
    }, [allClientesRes]);

    // 3. Clients that spend the most (clientes que mais gastam)
    const topSpendingClients = useMemo(() => {
        if (!allAgendasRes?.data) return [];
        const spends: Record<string, { nome: string; total: number }> = {};

        allAgendasRes.data.forEach((agenda: any) => {
            const cId = agenda.clienteId;
            const nome = agenda.clientes?.nome || 'Cliente Desconhecido';
            const val = agenda.valorTotal || 0;
            if (!spends[cId]) {
                spends[cId] = { nome, total: 0 };
            }
            spends[cId].total += val;
        });

        const list = Object.values(spends);
        const maxVal = Math.max(...list.map(x => x.total), 1);

        return list
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map(x => ({ ...x, pct: (x.total / maxVal) * 100 }));
    }, [allAgendasRes]);

    // 4. Company expenses breakdown (gastos da empresa)
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

        // Manual transactions
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

        // Agenda rentals (count as Lucro automatically)
        if (agendasRes?.data) {
            agendasRes.data.forEach((a: any) => {
                if (a.valorTotal > 0) {
                    list.push({
                        id: a.id,
                        descricao: `Locação — ${a.clientes?.nome || 'Cliente'}`,
                        valor: a.valorTotal,
                        tipo: 'LUCRO',
                        data: a.data,
                        isAgenda: true,
                    });
                }
            });
        }

        // Sort by date desc
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

    // Chronological cash-flow trend (daily revenue vs expenses) for the selected month
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

    // Mutations
    const createMutation = trpc.transacoes.create.useMutation({
        onSuccess: () => {
            toast.success('Movimentação registrada com sucesso!', { theme: 'colored' });
            setDescricao('');
            setValor('');
            utils.transacoes.list.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro: ${err.message}`, { theme: 'colored' });
        }
    });

    const deleteMutation = trpc.transacoes.delete.useMutation({
        onSuccess: () => {
            toast.success('Movimentação removida!', { theme: 'colored' });
            utils.transacoes.list.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro: ${err.message}`, { theme: 'colored' });
        }
    });

    const handleCreateTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedValor = parseFloat(valor);

        if (!descricao.trim() || isNaN(parsedValor) || parsedValor <= 0 || !dataStr) {
            toast.error('Preencha todos os campos obrigatórios corretamente.', { theme: 'colored' });
            return;
        }

        createMutation.mutate({
            descricao,
            valor: parsedValor,
            tipo,
            data: new Date(dataStr),
        });
    };

    const handleDelete = (id: string) => {
        triggerConfirm(
            'Remover Transação',
            'Tem certeza que deseja remover esta transação financeira? Esta ação não pode ser desfeita.',
            () => deleteMutation.mutate({ id })
        );
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const columns: Column<FinanceMovement>[] = [
        {
            key: 'descricao',
            label: 'Descrição',
            render: (_, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{row.descricao}</span>
                    {row.isAgenda && (
                        <span style={{
                            fontSize: '10px',
                            background: 'rgba(var(--primary-rgb), 0.15)',
                            color: 'var(--primary)',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            border: '1px solid rgba(var(--primary-rgb), 0.3)'
                        }}>
                            Locação
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'tipo',
            label: 'Tipo',
            render: (_, row) => (
                <span className={`pill ${row.tipo === 'LUCRO' ? 'success' : 'danger'}`} style={{
                    background: row.tipo === 'LUCRO' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
                    color: row.tipo === 'LUCRO' ? '#4caf50' : '#f44336',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '12px',
                    border: row.tipo === 'LUCRO' ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(244,67,54,0.3)'
                }}>
                    {row.tipo === 'LUCRO' ? '🟢 ENTRADA' : '🔴 SAÍDA'}
                </span>
            )
        },
        {
            key: 'data',
            label: 'Data',
            render: (_, row) => dayjs(row.data).format('DD/MM/YYYY')
        },
        {
            key: 'valor',
            label: 'Valor',
            render: (_, row) => (
                <span style={{
                    fontWeight: '700',
                    color: row.tipo === 'LUCRO' ? '#4caf50' : '#f44336'
                }}>
                    {row.tipo === 'LUCRO' ? '+' : '-'} {formatCurrency(row.valor)}
                </span>
            )
        },
        {
            key: 'id',
            label: 'Ações',
            render: (_, row) => {
                if (row.isAgenda) return <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Automático</span>;
                return (
                    <button
                        className="btn btn-ghost"
                        onClick={() => handleDelete(row.id)}
                        style={{
                            padding: '4px 8px',
                            color: 'var(--danger)',
                            borderRadius: '4px'
                        }}
                        title="Excluir Transação"
                    >
                        🗑️
                    </button>
                );
            }
        }
    ];

    return (
        <div className="page-inner">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <h2>💵 Painel Financeiro</h2>
                    <p>Controle de movimentações, estatísticas de locação e fluxo consolidado</p>
                </div>

                {/* Date Selectors (only relevant for cash flow movements view) */}
                {activeSubTab === 'movements' && (
                    <div style={{ display: 'flex', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <select
                            className="form-control"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            style={{ width: '130px', margin: 0 }}
                        >
                            {MONTHS.map((m, idx) => (
                                <option key={m} value={idx}>{m}</option>
                            ))}
                        </select>

                        <select
                            className="form-control"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{ width: '90px', margin: 0 }}
                        >
                            {YEARS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '12px',
                marginBottom: '28px'
            }}>
                <button
                    className={`btn ${activeSubTab === 'movements' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveSubTab('movements')}
                    style={{
                        borderRadius: '8px',
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '700',
                        fontSize: '14px'
                    }}
                >
                    📋 Fluxo de Caixa Mensal
                </button>
                <button
                    className={`btn ${activeSubTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveSubTab('analytics')}
                    style={{
                        borderRadius: '8px',
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '700',
                        fontSize: '14px'
                    }}
                >
                    📊 Estatísticas & Gráficos
                </button>
            </div>

            {activeSubTab === 'analytics' ? (
                /* ─── GRAPHICAL ANALYTICS DASHBOARD ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {/* HERO CASH FLOW TREND AREA CHART */}
                    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📈 Fluxo Diário de Caixa (Entradas vs Saídas)
                            </h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                Acompanhamento diário das receitas e despesas registradas no mês corrente
                            </p>
                        </div>
                        
                        <div style={{ width: '100%', height: '320px', minHeight: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                                    <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <RechartsLegend verticalAlign="top" height={36} iconType="circle" />
                                    <Area type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntradas)" name="Receitas" />
                                    <Area type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSaidas)" name="Despesas" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                        gap: '24px'
                    }}>
                        {/* 1. BRINQUEDOS MAIS ALUGADOS (Vertical BarChart) */}
                        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🧸 Brinquedos Mais Alugados
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Os itens de estoque com maior recorrência de agendamento (total)
                                </p>
                            </div>

                            <div style={{ width: '100%', height: '260px' }}>
                                {mostRentedToys.length === 0 ? (
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '100px' }}>Nenhum aluguel encontrado no sistema.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={mostRentedToys} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                                            <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                                            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
                                            <RechartsTooltip content={<CustomCountTooltip />} />
                                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Aluguéis">
                                                {mostRentedToys.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'][index % 5]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 2. CLIENTES QUE MAIS GASTAM (Horizontal BarChart) */}
                        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    👑 Clientes VIP (Maior Faturamento)
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Clientes que mais geraram faturamento consolidado por locações
                                </p>
                            </div>

                            <div style={{ width: '100%', height: '260px' }}>
                                {topSpendingClients.length === 0 ? (
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '100px' }}>Sem dados de faturamento.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topSpendingClients} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                                            <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                                            <YAxis dataKey="nome" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} width={100} />
                                            <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                            <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} name="Total Gasto">
                                                {topSpendingClients.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'][index % 5]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 3. GASTOS DA EMPRESA (Pie Donut Chart) */}
                        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    💸 Distribuição de Gastos da Empresa
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Principais categorias de saídas manuais e operacionais (Consolidado: {formatCurrency(expensesBreakdown.total)})
                                </p>
                            </div>

                            <div style={{ width: '100%', height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {expensesBreakdown.list.length === 0 ? (
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma despesa manual lançada.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expensesBreakdown.list}
                                                dataKey="value"
                                                nameKey="category"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                            >
                                                {expensesBreakdown.list.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6'][index % 5]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            
                            {expensesBreakdown.list.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', fontSize: '11px', fontWeight: '600' }}>
                                    {expensesBreakdown.list.map((item, index) => (
                                        <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6'][index % 5] }} />
                                            <span style={{ color: 'var(--text-muted)' }}>{item.category}: {item.pct.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 4. CLIENTES MAIS ANTIGOS (Timeline List) */}
                        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📅 Clientes Mais Antigos (Parceiros de Início)
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Clientes registrados há mais tempo no banco de dados da locadora
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                                {oldestClients.length === 0 ? (
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum cliente cadastrado.</p>
                                ) : (
                                    oldestClients.map((client, idx) => (
                                        <div key={client.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 14px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {idx + 1}. {client.nome}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    📞 {client.contato}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '11px',
                                                background: 'rgba(168, 85, 247, 0.15)',
                                                color: '#a855f7',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontWeight: '600'
                                            }}>
                                                📅 {dayjs(client.createdAt).format('DD/MM/YYYY')}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── CASH FLOW MOVEMENTS & TRANSACTIONS TABLE ─── */
                <>
                    {/* Dashboards Cards row */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px',
                        marginBottom: '28px'
                    }}>
                        {/* Entradas */}
                        <div className="card" style={{
                            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                            border: '1px solid rgba(76, 175, 80, 0.25)',
                            padding: '24px',
                            borderRadius: '12px'
                        }}>
                            <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                📈 Entradas (Lucros)
                            </span>
                            <h3 style={{ fontSize: '32px', margin: '8px 0 0', fontWeight: '800', color: '#4caf50' }}>
                                {formatCurrency(totals.lucros)}
                            </h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Mês de {MONTHS[selectedMonth]} — Total consolidado
                            </p>
                        </div>

                        {/* Saídas */}
                        <div className="card" style={{
                            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                            border: '1px solid rgba(244, 67, 54, 0.25)',
                            padding: '24px',
                            borderRadius: '12px'
                        }}>
                            <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                📉 Saídas (Gastos)
                            </span>
                            <h3 style={{ fontSize: '32px', margin: '8px 0 0', fontWeight: '800', color: '#f44336' }}>
                                {formatCurrency(totals.gastos)}
                            </h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Custos corporativos e operacionais inseridos
                            </p>
                        </div>

                        {/* Saldo Líquido */}
                        <div className="card" style={{
                            background: totals.saldo >= 0
                                ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)'
                                : 'linear-gradient(135deg, rgba(244, 67, 54, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)',
                            border: totals.saldo >= 0
                                ? '1px solid rgba(76, 175, 80, 0.4)'
                                : '1px solid rgba(244, 67, 54, 0.4)',
                            padding: '24px',
                            borderRadius: '12px'
                        }}>
                            <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                ⚖️ Saldo Líquido
                            </span>
                            <h3 style={{
                                fontSize: '32px',
                                margin: '8px 0 0',
                                fontWeight: '800',
                                color: totals.saldo >= 0 ? '#4caf50' : '#f44336'
                            }}>
                                {formatCurrency(totals.saldo)}
                            </h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {totals.saldo >= 0 ? 'Resultado financeiro positivo!' : 'Atenção, fluxo negativo!'}
                            </p>
                        </div>
                    </div>

                    <div className="finance-grid">
                        {/* Historic Table */}
                        <div className="card" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>
                                📋 Histórico mensal de fluxo de caixa
                            </h3>

                            {(loadingTrans || loadingAgendas) ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    Carregando movimentações...
                                </div>
                            ) : (
                                <DataGrid
                                    columns={columns}
                                    data={movements}
                                    emptyText={`Nenhuma transação ou locação registrada em ${MONTHS[selectedMonth]} de ${selectedYear}.`}
                                />
                            )}
                        </div>

                        {/* Form to insert Manual Transaction */}
                        <div className={`card finance-form-card ${isMobileFormOpen ? 'mobile-modal' : 'mobile-hide'}`} style={{ padding: '20px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '600' }}>
                                    💸 Nova Movimentação
                                </h3>
                                <button
                                    className="desktop-hide"
                                    onClick={() => setIsMobileFormOpen(false)}
                                    style={{
                                        background: 'var(--danger-light)',
                                        color: 'var(--danger)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 18,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Descrição *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Ex: Gasolina, Manutenção"
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control"
                                        placeholder="0,00"
                                        value={valor}
                                        onChange={(e) => setValor(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tipo de Movimentação *</label>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            type="button"
                                            className={`btn ${tipo === 'LUCRO' ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => setTipo('LUCRO')}
                                            style={{
                                                flex: 1,
                                                borderColor: tipo === 'LUCRO' ? '#4caf50' : 'transparent',
                                                background: tipo === 'LUCRO' ? 'rgba(76, 175, 80, 0.15)' : '',
                                                color: tipo === 'LUCRO' ? '#4caf50' : ''
                                            }}
                                        >
                                            📈 Lucro (Entrada)
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${tipo === 'GASTO' ? 'btn-danger' : 'btn-ghost'}`}
                                            onClick={() => setTipo('GASTO')}
                                            style={{
                                                flex: 1,
                                                borderColor: tipo === 'GASTO' ? '#f44336' : 'transparent',
                                                background: tipo === 'GASTO' ? 'rgba(244, 67, 54, 0.15)' : '',
                                                color: tipo === 'GASTO' ? '#f44336' : ''
                                            }}
                                        >
                                            📉 Gasto (Saída)
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Data *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={dataStr}
                                        onChange={(e) => setDataStr(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ marginTop: '8px', width: '100%' }}
                                    disabled={createMutation.isPending}
                                >
                                    {createMutation.isPending ? 'Gravando...' : '➕ Registrar Movimentação'}
                                </button>
                            </form>
                        </div>
                    </div>
                </>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            {activeSubTab === 'movements' && (
                <button
                    className="mobile-fab desktop-hide"
                    onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
                    title={isMobileFormOpen ? "Fechar" : "Nova Movimentação"}
                >
                    {isMobileFormOpen ? '↓' : '➕'}
                </button>
            )}
        </div>
    );
}
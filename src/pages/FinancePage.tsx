import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { DataGrid } from '@/components/ui/DataGrid';
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
import {
    MONTHS,
    YEARS,
    formatCurrency,
} from '@/utils/financeUtils';
import { useFinanceData } from '@/hooks/useFinanceData';
import {
    CustomTooltip,
    CustomCountTooltip,
    getColumns,
} from '@/components/finance/financeComponents';

export function FinancePage() {
    const today = dayjs();
    const [selectedMonth, setSelectedMonth] = useState(today.month());
    const [selectedYear, setSelectedYear] = useState(String(today.year()));
    const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<'movements' | 'analytics'>('movements');

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

    const {
        loadingTrans,
        loadingAgendas,
        mostRentedToys,
        oldestClients,
        topSpendingClients,
        expensesBreakdown,
        movements,
        totals,
        dailyTrendData
    } = useFinanceData(selectedMonth, selectedYear);

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

    const columns = getColumns(handleDelete);

    return (
        <div className="page-inner">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                    <h2>💵 Painel Financeiro</h2>
                    <p>Controle de movimentações, estatísticas de locação e fluxo consolidado</p>
                </div>

                {/* Date selectors shared by both finance tabs */}
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
                    📋 Fluxo de caixa mensal
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
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                        gap: '24px'
                    }}>
                        {/* Rankings use the full row so labels and values remain readable as data grows. */}
                        <div className="card" style={{ gridColumn: '1 / -1', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🧸 Brinquedos Mais Alugados
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Os itens de estoque com maior recorrência de agendamento (total)
                                </p>
                            </div>

                            <div style={{ width: '100%', height: '340px' }}>
                                {mostRentedToys.length === 0 ? (
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '100px' }}>Nenhum aluguel encontrado no sistema.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={mostRentedToys} margin={{ top: 10, right: 16, left: 0, bottom: 44 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                                            <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={11} tickLine={false} interval={0} angle={-18} textAnchor="end" height={60} />
                                            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
                                            <RechartsTooltip content={<CustomCountTooltip />} />
                                            <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} name="Aluguéis" maxBarSize={56}>
                                                {mostRentedToys.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'][index % 5]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 2. CLIENTES QUE MAIS GASTAM (Vertical BarChart) */}
                        <div className="card" style={{ gridColumn: '1 / -1', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    👑 Clientes VIP (Maior Faturamento)
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Clientes que mais geraram faturamento consolidado por locações
                                </p>
                            </div>

                            <div style={{ width: '100%', height: '340px' }}>
                                {topSpendingClients.length === 0 ? (
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: '100px' }}>Sem dados de faturamento.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topSpendingClients} margin={{ top: 10, right: 16, left: 0, bottom: 44 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                                            <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={11} tickLine={false} interval={0} angle={-18} textAnchor="end" height={60} />
                                            <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                                            <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                            <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} name="Total Gasto" maxBarSize={56}>
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
                                    📅 Clientes Mais Antigos
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

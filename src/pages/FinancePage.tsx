import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface FinanceMovement {
    id: string;
    descricao: string;
    valor: number;
    tipo: 'LUCRO' | 'GASTO';
    data: string;
    isAgenda?: boolean;
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const YEARS = ['2024', '2025', '2026', '2027', '2028'];

export function FinancePage() {
    const today = dayjs();
    const [selectedMonth, setSelectedMonth] = useState(today.month());
    const [selectedYear, setSelectedYear] = useState(String(today.year()));

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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2>💵 Painel Financeiro</h2>
                    <p>Controle de movimentações, gastos corporativos e lucros consolidados de locações</p>
                </div>

                {/* Date Selectors */}
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

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>

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
                <div className="card" style={{ padding: '20px', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>
                        💸 Nova Movimentação
                    </h3>

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
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}

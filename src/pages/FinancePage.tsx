import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { DataGrid } from '@/components/ui/DataGrid';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { FinanceAnalytics } from '@/components/finance/FinanceAnalytics';
import {
    MONTHS,
    YEARS,
    formatCurrency,
} from '@/utils/financeUtils';
import { useFinanceData } from '@/hooks/useFinanceData';
import {
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
        movements,
        totals,
    } = useFinanceData(selectedMonth, selectedYear, activeSubTab === 'movements');

    // Mutations
    const createMutation = trpc.transacoes.create.useMutation({
        onSuccess: () => {
            toast.success('Movimentação registrada com sucesso!', { theme: 'colored' });
            setDescricao('');
            setValor('');
            utils.transacoes.list.invalidate(); void utils.seletores.invalidate();
            utils.transacoes.analytics.invalidate();
        },
        onError: (err) => {
            toast.error(`Erro: ${err.message}`, { theme: 'colored' });
        }
    });

    const deleteMutation = trpc.transacoes.delete.useMutation({
        onSuccess: () => {
            toast.success('Movimentação removida!', { theme: 'colored' });
            utils.transacoes.list.invalidate(); void utils.seletores.invalidate();
            utils.transacoes.analytics.invalidate();
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
        <div className="page-inner finance-page">
            {/* Sub-Tab Navigation Bar */}
            <div className="finance-page-toolbar">
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
                <div className="finance-period-filter">
                    <select
                        className="form-control"
                        aria-label="Mês do financeiro"
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
                        aria-label="Ano do financeiro"
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

            {activeSubTab === 'analytics' ? (
                <FinanceAnalytics month={selectedMonth} year={Number(selectedYear)} />
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
                            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), var(--finance-summary-base, transparent)',
                            border: '1px solid rgba(76, 175, 80, 0.25)',
                            padding: '24px',
                            borderRadius: '12px'
                        }}>
                            <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                📈 Entradas (Lucros)
                            </span>
                            <h3 style={{ fontSize: '32px', margin: '8px 0 0', fontWeight: '800', color: 'var(--finance-income, #4caf50)' }}>
                                {formatCurrency(totals.lucros)}
                            </h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Mês de {MONTHS[selectedMonth]} — Total consolidado
                            </p>
                        </div>

                        {/* Saídas */}
                        <div className="card" style={{
                            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), var(--finance-summary-base, transparent)',
                            border: '1px solid rgba(244, 67, 54, 0.25)',
                            padding: '24px',
                            borderRadius: '12px'
                        }}>
                            <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                📉 Saídas (Gastos)
                            </span>
                            <h3 style={{ fontSize: '32px', margin: '8px 0 0', fontWeight: '800', color: 'var(--finance-expense, #f44336)' }}>
                                {formatCurrency(totals.gastos)}
                            </h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Custos corporativos e operacionais inseridos
                            </p>
                        </div>

                        {/* Saldo Líquido */}
                        <div className="card" style={{
                            background: totals.saldo >= 0
                                ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%), var(--finance-summary-base, transparent)'
                                : 'linear-gradient(135deg, rgba(244, 67, 54, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%), var(--finance-summary-base, transparent)',
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
                                color: totals.saldo >= 0 ? 'var(--finance-income, #4caf50)' : 'var(--finance-expense, #f44336)'
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
                        <div className="card finance-history-card">
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
                                                borderColor: tipo === 'LUCRO' ? 'var(--finance-income, #4caf50)' : 'transparent',
                                                background: tipo === 'LUCRO' ? 'rgba(76, 175, 80, 0.15)' : '',
                                                color: tipo === 'LUCRO' ? 'var(--finance-income, #4caf50)' : ''
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
                                                borderColor: tipo === 'GASTO' ? 'var(--finance-expense, #f44336)' : 'transparent',
                                                background: tipo === 'GASTO' ? 'rgba(244, 67, 54, 0.15)' : '',
                                                color: tipo === 'GASTO' ? 'var(--finance-expense, #f44336)' : ''
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

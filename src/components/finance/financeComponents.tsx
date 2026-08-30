import React from 'react';
import dayjs from 'dayjs';
import { Column } from '@/components/ui/DataGrid';
import { FinanceMovement, formatCurrency } from '@/utils/financeUtils';

export const CustomTooltip = ({ active, payload, label }: any) => {
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
                        {p.name}: {formatCurrency(p.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const CustomCountTooltip = ({ active, payload, label }: any) => {
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

export const getColumns = (handleDelete: (id: string) => void): Column<FinanceMovement>[] => [
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

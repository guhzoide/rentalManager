import React, { useState, useMemo } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleIcon from '@mui/icons-material/AddCircle';

export interface Column<T = any> {
    key: string;
    label: string;
    render?: (value: any, row: T) => React.ReactNode;
    width?: string;
}

interface DataGridProps<T = any> {
    columns: Column<T>[];
    data: T[];
    onRowClick?: (row: T) => void;
    onAdd?: () => void;
    loading?: boolean;
    emptyText?: string;
    keyField?: string;
    total?: number;
    page?: number;
    onPageChange?: (page: number) => void;
    pageSize?: number;
    onRefresh?: () => void;
}

export function DataGrid<T extends Record<string, any>>({
    columns,
    data,
    onRowClick,
    onAdd,
    loading = false,
    emptyText = 'Nenhum registro encontrado.',
    keyField = 'id',
    total,
    page = 1,
    onPageChange,
    pageSize = 20,
    onRefresh,
}: DataGridProps<T>) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter((row) =>
            Object.values(row).some((v) =>
                String(v ?? '').toLowerCase().includes(q)
            )
        );
    }, [data, search]);

    const totalCount = total ?? filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="datagrid-wrapper">
            {/* Toolbar */}
            <div className="datagrid-toolbar">
                <div className="datagrid-search">
                    <span className="datagrid-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'left' }}>
                    {onRefresh && (
                        <button className="btn btn-primary" onClick={onRefresh}>
                            <RefreshIcon />
                        </button>
                    )}
                    {onAdd && (
                        <button className="btn btn-primary" onClick={onAdd}>
                            <AddCircleIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="datagrid-table-wrapper">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner" />
                        <span>Carregando...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="datagrid-empty">
                        <div className="datagrid-empty-icon">📭</div>
                        <p>{emptyText}</p>
                    </div>
                ) : (
                    <table className="datagrid">
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row, idx) => (
                                <tr
                                    key={row[keyField] ?? idx}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            {col.render
                                                ? col.render(row[col.key], row)
                                                : (row[col.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            <div className="datagrid-footer">
                <span>{totalCount} registro(s)</span>

                {totalPages > 1 && (
                    <div className="datagrid-pagination">
                        <button
                            className="btn btn-ghost btn-sm btn-icon"
                            disabled={page <= 1}
                            onClick={() => onPageChange?.(page - 1)}
                        >
                            ‹
                        </button>
                        <span>
                            {page} / {totalPages}
                        </span>
                        <button
                            className="btn btn-ghost btn-sm btn-icon"
                            disabled={page >= totalPages}
                            onClick={() => onPageChange?.(page + 1)}
                        >
                            ›
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

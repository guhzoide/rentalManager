import '@/styles/DataGridColumns.css';
import { applyGridColumns, type GridColumnConfig, type GridFilters, type GridSort } from '@/lib/gridColumns';
import { GridColumnMenu } from './GridColumnMenu';
import { CardGrid } from './CardGrid';
import TableRowsIcon from '@mui/icons-material/TableRows';
import GridViewIcon from '@mui/icons-material/GridView';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React, { useState, useMemo, useRef, useEffect, useId } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleIcon from '@mui/icons-material/AddCircle';

export interface Column<T = any> extends GridColumnConfig<T> {
    key: string;
    label: string;
    render?: (value: any, row: T) => React.ReactNode;
    width?: string;
    mobileLayout?: 'stacked' | 'half';
}

export type GridView = 'table' | 'cards';

export interface DataGridProps<T = any> {
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
    onPageSizeChange?: (size: number) => void;
    onRefresh?: () => void;
    toolbarActions?: React.ReactNode;
    filters?: React.ReactNode;
    rowClassName?: (row: T) => string;
    activeFilterCount?: number;
    search?: string;
    onSearchChange?: (search: string) => void;
    view?: GridView;
    defaultView?: GridView;
    onViewChange?: (view: GridView) => void;
    allowViewSwitch?: boolean;
    sort?: GridSort | null;
    onSortChange?: (sort: GridSort | null) => void;
    columnFilters?: GridFilters;
    onColumnFiltersChange?: (filters: GridFilters) => void;
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
    page: controlledPage,
    onPageChange,
    pageSize: controlledPageSize,
    onPageSizeChange,
    onRefresh,
    toolbarActions,
    filters,
    rowClassName,
    activeFilterCount,
    search: controlledSearch,
    onSearchChange,
    view: controlledView,
    defaultView = 'cards',
    onViewChange,
    allowViewSwitch = true,
    sort: controlledSort,
    onSortChange,
    columnFilters: controlledFilters,
    onColumnFiltersChange,
}: DataGridProps<T>) {
    const [localSearch, setLocalSearch] = useState('');
    const search = controlledSearch ?? localSearch;
    const [localView, setLocalView] = useState<GridView>(defaultView);
    const view = controlledView ?? localView;
    const changeView = (next: GridView) => {
        setLocalView(next);
        onViewChange?.(next);
    };
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [localSort, setLocalSort] = useState<GridSort | null>(null);
    const [localFilters, setLocalFilters] = useState<GridFilters>({});
    const [columnMenu, setColumnMenu] = useState<{ anchor: HTMLElement; key: string } | null>(null);
    const [localPage, setLocalPage] = useState(1);
    const [localPageSize, setLocalPageSize] = useState(25);
    const bodyRef = useRef<HTMLDivElement>(null);
    const sizeId = useId();
    const filtersId = useId();
    const filterCount = activeFilterCount ?? (search.trim() ? 1 : 0);
    const serverPagination = !!onPageChange;
    const pageSize = controlledPageSize ?? localPageSize;

    const sort = controlledSort === undefined ? localSort : controlledSort;
    const columnFilters = controlledFilters ?? localFilters;
    const canSort = (column: Column<T>) => column.sortable !== false && (!serverPagination || !!onSortChange);
    const canFilter = (column: Column<T>) => column.filterable !== false && (!serverPagination || !!onColumnFiltersChange);
    const controlColumns = columns.map((column) => ({ ...column, sortable: canSort(column), filterable: canFilter(column) }))
        .filter((column) => column.sortable || column.filterable);
    const changeSort = (next: GridSort | null) => {
        if (onSortChange) onSortChange(next);
        else setLocalSort(next);
        setLocalPage(1);
    };
    const changeFilters = (next: GridFilters) => {
        if (onColumnFiltersChange) onColumnFiltersChange(next);
        else setLocalFilters(next);
        setLocalPage(1);
    };
    const filtered = useMemo(() => {
        const processed = serverPagination ? data : applyGridColumns(data, columns, columnFilters, sort);
        if (serverPagination || !search.trim()) return processed;
        const q = search.toLowerCase();
        return processed.filter((row) =>
            Object.values(row).some((v) =>
                String(v ?? '').toLowerCase().includes(q)
            )
        );
    }, [data, search, serverPagination, columns, columnFilters, sort]);

    const totalCount = total ?? filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = serverPagination ? (controlledPage ?? 1) : Math.min(localPage, totalPages);
    const visibleRows = serverPagination ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize);
    const changePage = (next: number) => {
        if (onPageChange) onPageChange(next);
        else setLocalPage(next);
    };
    const changePageSize = (size: number) => {
        if (onPageSizeChange) onPageSizeChange(size);
        else setLocalPageSize(size);
        setLocalPage(1);
        onPageChange?.(1);
    };
    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }, [page, pageSize, search, columnFilters, sort, view]);

    const renderValue = (column: Column<T>, row: T) =>
        column.render ? column.render(row[column.key], row) : (row[column.key] ?? '—');

    const handleRowKeyDown = (event: React.KeyboardEvent, row: T) => {
        if (
            !onRowClick
            || event.target !== event.currentTarget
            || (event.key !== 'Enter' && event.key !== ' ')
        ) return;
        event.preventDefault();
        onRowClick(row);
    };

    return (
        <div className={`datagrid-wrapper datagrid-view--${view}`}>
            {/* Toolbar */}
            <div className="datagrid-toolbar">
                <div className={`datagrid-filter-area${filters ? ' datagrid-filter-area--custom' : ''}${filtersExpanded ? ' is-expanded' : ''}`}>
                    <button type="button" className="btn btn-ghost datagrid-filter-toggle"
                        aria-label={filtersExpanded ? 'Recolher filtros' : 'Abrir filtros'} title="Filtros"
                        aria-expanded={filtersExpanded} aria-controls={filtersId}
                        onClick={() => setFiltersExpanded((expanded) => !expanded)}>
                        <FilterListIcon /><span>Filtros</span>
                        {filterCount > 0 && <span className="badge" aria-label={`${filterCount} filtro(s) ativo(s)`}>{filterCount}</span>}
                        <ExpandMoreIcon className="datagrid-filter-toggle-chevron" />
                    </button>
                    <div id={filtersId} className="datagrid-filter-content">
                        {filters ?? <div className="datagrid-search">
                            <span className="datagrid-search-icon">🔍</span>
                            <input
                                type="text"
                                aria-label="Buscar registros"
                                placeholder="Buscar..."
                                value={search}
                                maxLength={100}
                                disabled={serverPagination && !onSearchChange}
                                onChange={(e) => { if (onSearchChange) onSearchChange(e.target.value); else setLocalSearch(e.target.value); setLocalPage(1); }}
                            />
                        </div>}
                    </div>
                </div>

                <div className="datagrid-actions">
                    {allowViewSwitch && <button type="button" className="btn btn-ghost datagrid-view-switch"
                        data-view={view}
                        aria-label={view === 'cards' ? 'Visualização em cards. Alterar para tabela' : 'Visualização em tabela. Alterar para cards'}
                        title={view === 'cards' ? 'Visualização em cards. Alterar para tabela' : 'Visualização em tabela. Alterar para cards'}
                        onClick={() => changeView(view === 'cards' ? 'table' : 'cards')}>
                        {view === 'cards' ? <GridViewIcon /> : <TableRowsIcon />}
                    </button>}
                    {controlColumns.length > 0 && <button type="button" className="btn btn-ghost datagrid-columns-button"
                        aria-label="Filtrar e ordenar colunas" title="Filtrar e ordenar colunas" aria-haspopup="dialog"
                        onClick={(event) => setColumnMenu({ anchor: event.currentTarget, key: controlColumns[0].key })}>
                        <ViewColumnIcon /><span>Colunas</span>
                        {Object.values(columnFilters).filter(Boolean).length > 0 && <span className="badge">{Object.values(columnFilters).filter(Boolean).length}</span>}
                    </button>}
                    {toolbarActions}
                    {onRefresh && (
                        <button className="btn btn-primary" onClick={onRefresh} aria-label="Atualizar listagem" title="Atualizar listagem">
                            <RefreshIcon />
                        </button>
                    )}
                    {onAdd && (
                        <button className="btn btn-primary" onClick={onAdd} aria-label="Adicionar registro" title="Adicionar registro">
                            <AddCircleIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="datagrid-table-wrapper" ref={bodyRef} aria-busy={loading}>
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner" />
                        <span>Carregando...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="datagrid-empty">
                        <div className="datagrid-empty-icon">📭</div>
                        <p>{search.trim() || Object.values(columnFilters).some(Boolean) ? 'Nenhum registro encontrado para os filtros selecionados.' : emptyText}</p>
                    </div>
                ) : (
                    <>
                    <table className="datagrid datagrid-desktop">
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <th key={col.key} style={col.width ? { width: col.width } : undefined}
                                        aria-sort={sort?.key === col.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
                                        <div className="datagrid-column-heading">
                                            {canSort(col) ? <button type="button" className="datagrid-column-sort"
                                                title={`Ordenar por ${col.label}`} onClick={() => changeSort(sort?.key !== col.key ? { key: col.key, direction: 'asc' }
                                                    : sort.direction === 'asc' ? { key: col.key, direction: 'desc' } : null)}>
                                                {col.label}<span aria-hidden="true">{sort?.key === col.key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                                            </button> : <span>{col.label}</span>}
                                            {canFilter(col) && <button type="button" className={`datagrid-column-filter${columnFilters[col.key] ? ' active' : ''}`}
                                                aria-label={`Filtrar ${col.label}`} title={`Filtrar ${col.label}`} aria-haspopup="dialog"
                                                onClick={(event) => setColumnMenu({ anchor: event.currentTarget, key: col.key })}><FilterListIcon fontSize="small" /></button>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row, idx) => (
                                <tr
                                    key={row[keyField] ?? idx}
                                    className={rowClassName?.(row)}
                                    onClick={() => onRowClick?.(row)}
                                    onKeyDown={(event) => handleRowKeyDown(event, row)}
                                    tabIndex={onRowClick ? 0 : undefined}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            {renderValue(col, row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <CardGrid columns={columns} data={visibleRows} keyField={keyField} onRowClick={onRowClick} rowClassName={rowClassName} />
                    </>
                )}
            </div>

            <GridColumnMenu columns={controlColumns} anchor={columnMenu?.anchor ?? null} selectedKey={columnMenu?.key ?? ''}
                onColumnChange={(key) => setColumnMenu((current) => current ? { ...current, key } : null)}
                onClose={() => setColumnMenu(null)} filters={columnFilters} onFiltersChange={changeFilters} sort={sort} onSortChange={changeSort} />

            {/* Footer */}
            <div className="datagrid-footer">
                <span>{totalCount} registro(s)</span>

                <div className="datagrid-footer-controls">
                    <label className="datagrid-page-size" htmlFor={sizeId}>
                        <span className="datagrid-page-size-label">Por página</span>
                        <select aria-label="Registros por página" id={sizeId} value={pageSize} disabled={loading} onChange={(event) => changePageSize(Number(event.target.value))}>
                            {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                {totalPages > 1 && (
                    <div className="datagrid-pagination">
                        <button
                            className="btn btn-ghost btn-sm btn-icon"
                            disabled={loading || page <= 1}
                            aria-label="Página anterior"
                            onClick={() => changePage(page - 1)}
                        >
                            ‹
                        </button>
                        <span>
                            {page} / {totalPages}
                        </span>
                        <button
                            className="btn btn-ghost btn-sm btn-icon"
                            disabled={loading || page >= totalPages}
                            aria-label="Próxima página"
                            onClick={() => changePage(page + 1)}
                        >
                            ›
                        </button>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}

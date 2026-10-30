import Popover from '@mui/material/Popover';
import type { GridColumnConfig, GridFilters, GridSort } from '@/lib/gridColumns';

type MenuColumn = Pick<GridColumnConfig, 'key' | 'sortable' | 'filterable' | 'filterType' | 'filterOptions'> & { label: string };
interface Props {
    columns: MenuColumn[];
    anchor: HTMLElement | null;
    selectedKey: string;
    onColumnChange: (key: string) => void;
    onClose: () => void;
    filters: GridFilters;
    onFiltersChange: (filters: GridFilters) => void;
    sort: GridSort | null;
    onSortChange: (sort: GridSort | null) => void;
}

export function GridColumnMenu({ columns, anchor, selectedKey, onColumnChange, onClose, filters, onFiltersChange, sort, onSortChange }: Props) {
    const column = columns.find((column) => column.key === selectedKey);
    const updateFilter = (value: string) => {
        const next = { ...filters };
        if (value) next[selectedKey] = value;
        else delete next[selectedKey];
        onFiltersChange(next);
    };
    return <Popover open={!!anchor && !!column} anchorEl={anchor} onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        {column && <section className="datagrid-column-menu" role="dialog" aria-label="Filtros e ordenação por coluna">
            <div className="datagrid-column-menu-title"><strong>Filtrar e ordenar</strong><button type="button" onClick={onClose} aria-label="Fechar filtros">×</button></div>
            <label>Coluna<select value={selectedKey} onChange={(event) => onColumnChange(event.target.value)}>
                {columns.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select></label>
            {column.filterable && <label>Filtrar {column.label}
                {column.filterType === 'boolean' || column.filterType === 'select'
                    ? <select value={filters[selectedKey] ?? ''} onChange={(event) => updateFilter(event.target.value)}>
                        <option value="">Todos</option>
                        {(column.filterType === 'boolean' ? [{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }] : column.filterOptions ?? [])
                            .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    : <input type={column.filterType === 'date' ? 'date' : column.filterType === 'number' ? 'number' : 'text'}
                        value={filters[selectedKey] ?? ''} maxLength={100} step="any"
                        placeholder={column.filterType === 'number' ? 'Valor exato' : 'Contém...'} onChange={(event) => updateFilter(event.target.value)} />}
            </label>}
            {column.sortable && <label>Ordenação<select value={sort?.key === selectedKey ? sort.direction : ''}
                onChange={(event) => onSortChange(event.target.value ? { key: selectedKey, direction: event.target.value as 'asc' | 'desc' } : null)}>
                <option value="">Padrão</option><option value="asc">Crescente ↑</option><option value="desc">Decrescente ↓</option>
            </select></label>}
            <div className="datagrid-column-menu-actions">
                <button type="button" className="btn btn-ghost" onClick={() => { updateFilter(''); if (sort?.key === selectedKey) onSortChange(null); }}>Limpar coluna</button>
                <button type="button" className="btn btn-ghost" onClick={() => { onFiltersChange({}); onSortChange(null); }}>Limpar tudo</button>
            </div>
        </section>}
    </Popover>;
}

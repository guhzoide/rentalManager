import '@/styles/CardGrid.css';
import type { KeyboardEvent } from 'react';
import type { Column } from './DataGrid';

interface CardGridProps<T> {
    columns: Column<T>[];
    data: T[];
    keyField?: string;
    onRowClick?: (row: T) => void;
    rowClassName?: (row: T) => string;
}

// A mesma apresentação é usada no mobile e na visualização em cards do desktop.
// Filtros, ordenação e paginação são compartilhados pelo DataGrid.
export function CardGrid<T extends Record<string, unknown>>({ columns, data, keyField = 'id', onRowClick, rowClassName }: CardGridProps<T>) {
    const handleKeyDown = (event: KeyboardEvent, row: T) => {
        if (!onRowClick || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onRowClick(row);
    };
    return <div className="cardgrid datagrid-mobile-list">
        {data.map((row, index) => <article
            key={String(row[keyField] ?? index)}
            className={`datagrid-mobile-card${onRowClick ? ' clickable' : ''} ${rowClassName?.(row) ?? ''}`}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(event) => handleKeyDown(event, row)}
            tabIndex={onRowClick ? 0 : undefined}
            role={onRowClick ? 'button' : undefined}
        >
            {columns.map((column) => <div key={column.key}
                className={`datagrid-mobile-field${column.mobileLayout ? ` datagrid-mobile-field--${column.mobileLayout}` : ''}`}>
                <span className="datagrid-mobile-label">{column.label}</span>
                <div className="datagrid-mobile-value">{column.render
                    ? column.render(row[column.key], row)
                    : (row[column.key] as string | number | null | undefined) ?? '—'}</div>
            </div>)}
        </article>)}
    </div>;
}

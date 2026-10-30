export type GridFilters = Record<string, string>;
export interface GridSort { key: string; direction: 'asc' | 'desc'; }
export type GridFilterType = 'text' | 'number' | 'date' | 'boolean' | 'select';
export interface GridColumnConfig<T = Record<string, unknown>> {
    key: string;
    field?: string;
    sortable?: boolean;
    filterable?: boolean;
    filterType?: GridFilterType;
    filterOptions?: { value: string; label: string }[];
    getValue?: (row: T) => unknown;
}

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function applyGridColumns<T extends Record<string, unknown>>(data: T[], columns: GridColumnConfig<T>[], filters: GridFilters, sort: GridSort | null) {
    const value = (row: T, column: GridColumnConfig<T>) => column.getValue ? column.getValue(row) : row[column.key];
    const filtered = data.filter((row) => columns.every((column) => {
        const term = filters[column.key]?.trim();
        if (!term || column.filterable === false) return true;
        const current = value(row, column);
        if (column.filterType === 'number') return current != null && Number(current) === Number(term);
        if (column.filterType === 'boolean') return current != null && String(current) === term;
        if (column.filterType === 'select') return String(current ?? '') === term;
        if (column.filterType === 'date') return String(current ?? '').slice(0, 10) === term;
        return normalize(current).includes(normalize(term));
    }));
    const column = columns.find((column) => column.key === sort?.key && column.sortable !== false);
    if (!sort || !column) return filtered;
    return filtered.sort((a, b) => {
        const left = value(a, column), right = value(b, column);
        const comparison = left == null ? (right == null ? 0 : 1) : right == null ? -1
            : typeof left === 'number' && typeof right === 'number' ? left - right
            : typeof left === 'boolean' && typeof right === 'boolean' ? Number(left) - Number(right)
            : collator.compare(String(left), String(right));
        return sort.direction === 'asc' ? comparison : -comparison;
    });
}

function nested(path: string, value: unknown): Record<string, unknown> {
    return path.split('.').reverse().reduce<unknown>((child, key) => ({ [key]: child }), value) as Record<string, unknown>;
}

// Os campos vêm das definições de coluna da tela, nunca de texto digitado pelo usuário.
export function gridPrismaQuery<T>(columns: GridColumnConfig<T>[], filters: GridFilters, sort: GridSort | null, search = '') {
    const conditions: Record<string, unknown>[] = [];
    for (const column of columns) {
        const text = filters[column.key]?.trim();
        if (!text || column.filterable === false) continue;
        let value: unknown = { contains: text, mode: 'insensitive' };
        if (column.filterType === 'number') {
            if (!Number.isFinite(Number(text))) continue;
            value = Number(text);
        } else if (column.filterType === 'date') {
            const start = new Date(`${text}T00:00:00`);
            if (Number.isNaN(start.getTime())) continue;
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            value = { gte: start.toISOString(), lt: end.toISOString() };
        } else if (column.filterType === 'boolean') value = text === 'true';
        else if (column.filterType === 'select') value = text;
        conditions.push(nested(column.field ?? column.key, value));
    }
    if (search.trim()) {
        const term = search.trim().slice(0, 100);
        const alternatives: Record<string, unknown>[] = [];
        for (const column of columns) {
            if (column.filterable === false) continue;
            let match: unknown = { contains: term, mode: 'insensitive' };
            if (column.filterType === 'number') {
                if (!Number.isFinite(Number(term))) continue;
                match = Number(term);
            } else if (column.filterType === 'boolean') {
                const normalized = normalize(term);
                if (!['sim', 'nao', 'true', 'false', 'ativo', 'inativo'].includes(normalized)) continue;
                match = ['sim', 'true', 'ativo'].includes(normalized);
            } else if (column.filterType === 'date') {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(term)) continue;
                const date = new Date(`${term}T00:00:00`);
                if (Number.isNaN(date.getTime())) continue;
                const next = new Date(date); next.setDate(next.getDate() + 1);
                match = { gte: date.toISOString(), lt: next.toISOString() };
            } else if (column.filterType === 'select') {
                const option = column.filterOptions?.find((option) => normalize(option.label).includes(normalize(term)) || option.value === term);
                if (!option) continue;
                match = option.value;
            }
            alternatives.push(nested(column.field ?? column.key, match));
        }
        conditions.push({ OR: alternatives });
    }
    const column = columns.find((column) => column.key === sort?.key && column.sortable !== false);
    return {
        filtros: conditions.length ? { AND: conditions } : undefined,
        orderBy: sort && column ? nested(column.field ?? column.key, sort.direction) : undefined,
    };
}

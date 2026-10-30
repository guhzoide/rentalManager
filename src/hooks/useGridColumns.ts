import { useEffect, useState } from 'react';
import { gridPrismaQuery, type GridColumnConfig, type GridFilters, type GridSort } from '@/lib/gridColumns';

export function useGridColumns<T>(columns: GridColumnConfig<T>[], resetPage: (page: number) => void) {
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState<GridFilters>({});
    const [appliedFilters, setAppliedFilters] = useState<GridFilters>({});
    const [sort, setSort] = useState<GridSort | null>(null);
    useEffect(() => {
        const timer = setTimeout(() => { setAppliedFilters(columnFilters); setAppliedSearch(search.trim().slice(0, 100)); resetPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [columnFilters, search, resetPage]);
    return {
        query: gridPrismaQuery(columns, appliedFilters, sort, appliedSearch),
        appliedFilters,
        appliedSearch,
        props: {
            search,
            onSearchChange: setSearch,
            columnFilters,
            onColumnFiltersChange: setColumnFilters,
            sort,
            onSortChange: (next: GridSort | null) => { setSort(next); resetPage(1); },
        },
    };
}

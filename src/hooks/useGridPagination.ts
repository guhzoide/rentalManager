import { useState } from 'react';

export function useGridPagination() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const onPageSizeChange = (size: number) => {
        setPageSize(size);
        setPage(1);
    };
    return { page, setPage, pageSize, onPageSizeChange };
}

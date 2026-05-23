import type { GridElement, DbData, DbTableName } from "@/utils/canvasUtils";
import { getContrastColor, getColumnsFromRecords, formatDbValue } from "@/utils/canvasUtils";

const cellInputStyle: React.CSSProperties = {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 12,
    color: 'inherit',
    fontFamily: 'inherit',
};

export function GridElementView({
    el, dbData, onUpdate, onStartEdit, onEndEdit,
}: {
    el: GridElement;
    dbData: DbData;
    onUpdate: (patch: Partial<GridElement>) => void;
    onStartEdit: () => void;
    onEndEdit: () => void;
}) {
    const setHeader = (i: number, v: string) => {
        const headers = [...el.headers];
        headers[i] = v;
        onUpdate({ headers });
    };
    const setCell = (r: number, c: number, v: string) => {
        const cells = el.cells.map((row) => [...row]);
        cells[r][c] = v;
        onUpdate({ cells });
    };

    const headerBg = el.headerBgColor || '#f1f5f9';
    const headerColor = getContrastColor(headerBg);

    if (el.dbTable && dbData[el.dbTable as DbTableName]) {
        const allRecords = dbData[el.dbTable as DbTableName] || [];
        const allCols = getColumnsFromRecords(allRecords);
        const cols = el.selectedColumns && el.selectedColumns.length > 0
            ? el.selectedColumns.filter((c) => allCols.includes(c))
            : allCols;
        const records = el.selectedRecordIds && el.selectedRecordIds.length > 0
            ? allRecords.filter((r: any) => el.selectedRecordIds!.includes(String(r?.id)))
            : allRecords;

        return (
            <table
                style={{
                    width: '100%', height: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                    color: '#0f172a',
                    tableLayout: 'fixed',
                }}
            >
                <thead>
                    <tr>
                        {cols.map((c) => (
                            <th
                                key={c}
                                style={{
                                    border: '1px solid #94a3b8',
                                    background: headerBg,
                                    color: headerColor,
                                    padding: 4,
                                    fontWeight: 600,
                                    textAlign: 'left',
                                }}
                            >
                                {el.columnMappings?.[c] ?? c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {records.length === 0 ? (
                        <tr>
                            <td
                                colSpan={Math.max(1, cols.length)}
                                style={{ border: '1px solid #cbd5e1', padding: 6, textAlign: 'center', opacity: 0.6 }}
                            >
                                Nenhum registro
                            </td>
                        </tr>
                    ) : records.map((rec: any, r: number) => (
                        <tr key={rec?.id ?? r}>
                            {cols.map((c) => (
                                <td
                                    key={c}
                                    style={{ border: '1px solid #cbd5e1', padding: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={formatDbValue(rec?.[c], c)}
                                >
                                    {formatDbValue(rec?.[c], c)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    return (
        <table
            style={{
                width: '100%', height: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                color: '#0f172a',
                tableLayout: 'fixed',
            }}
            onMouseDown={(e) => {
                const tag = (e.target as HTMLElement).tagName;
                if (tag === 'INPUT') e.stopPropagation();
            }}
        >
            <thead>
                <tr>
                    {el.headers.map((h, i) => (
                        <th
                            key={i}
                            style={{
                                border: '1px solid #94a3b8',
                                background: headerBg,
                                color: headerColor,
                                padding: 4,
                                fontWeight: 600,
                            }}
                        >
                            <input
                                value={h}
                                onChange={(e) => setHeader(i, e.target.value)}
                                onFocus={onStartEdit}
                                onBlur={onEndEdit}
                                style={{ ...cellInputStyle, color: headerColor }}
                            />
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {el.cells.map((row, r) => (
                    <tr key={r}>
                        {row.map((cell, c) => (
                            <td
                                key={c}
                                style={{ border: '1px solid #cbd5e1', padding: 4 }}
                            >
                                <input
                                    value={cell}
                                    onChange={(e) => setCell(r, c, e.target.value)}
                                    onFocus={onStartEdit}
                                    onBlur={onEndEdit}
                                    style={cellInputStyle}
                                />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
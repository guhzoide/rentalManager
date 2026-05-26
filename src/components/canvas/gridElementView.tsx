import type { GridElement, DbData, DbTableName } from "@/utils/canvasUtils";
import { getContrastColor, getColumnsFromRecords, formatDbValue } from "@/utils/canvasUtils";
import dayjs from "dayjs";

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

    if (el.dbTable === 'agendas') {
        const allRecords = dbData.agendas || [];
        const agendaRecord = el.selectedRecordIds && el.selectedRecordIds.length > 0
            ? allRecords.find((r: any) => el.selectedRecordIds!.includes(String(r?.id)))
            : allRecords[0];

        if (!agendaRecord) {
            return (
                <div style={{ padding: 12, textAlign: 'center', opacity: 0.6, border: '1px dashed #cbd5e1', borderRadius: 4 }}>
                    Nenhum agendamento selecionado
                </div>
            );
        }

        const d1 = dayjs(agendaRecord.data);
        const d2 = dayjs(agendaRecord.dataColeta);
        const diffHours = d2.isValid() && d1.isValid() ? d2.diff(d1, 'hour') : 24;
        const diffDays = Math.max(1, Math.ceil(diffHours / 24));

        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const agendaItens = agendaRecord.itens || [];

        let itemsSum = 0;
        const rows = agendaItens.map((item: any) => {
            const name = item.estoques?.nome || 'Item';
            const qty = item.quantidade || 0;
            const price = item.estoques?.valorDiaria || 0;
            const subtotal = qty * price * diffDays;
            itemsSum += subtotal;
            return {
                name,
                qty,
                price: fmt(price),
                days: `${diffDays} d`,
                total: fmt(subtotal)
            };
        });

        const discountVal = (agendaRecord.desconto ?? 0);
        const discountAmount = itemsSum * (discountVal / 100);
        const freightVal = (agendaRecord.frete ?? 0);
        const grandTotal = (itemsSum - discountAmount) + freightVal;

        return (
            <table
                style={{
                    width: '100%', height: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 11,
                    color: '#0f172a',
                    tableLayout: 'fixed',
                }}
            >
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #94a3b8', background: headerBg, color: headerColor, padding: '4px 6px', fontWeight: 600, textAlign: 'left', width: '45%' }}>Descrição do Item / Serviço</th>
                        <th style={{ border: '1px solid #94a3b8', background: headerBg, color: headerColor, padding: '4px 6px', fontWeight: 600, textAlign: 'center', width: '10%' }}>Qtd</th>
                        <th style={{ border: '1px solid #94a3b8', background: headerBg, color: headerColor, padding: '4px 6px', fontWeight: 600, textAlign: 'center', width: '12%' }}>Diária</th>
                        <th style={{ border: '1px solid #94a3b8', background: headerBg, color: headerColor, padding: '4px 6px', fontWeight: 600, textAlign: 'center', width: '13%' }}>Período</th>
                        <th style={{ border: '1px solid #94a3b8', background: headerBg, color: headerColor, padding: '4px 6px', fontWeight: 600, textAlign: 'right', width: '20%' }}>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: 10, textAlign: 'center', opacity: 0.6 }}>
                                Nenhum item cadastrado nesta agenda
                            </td>
                        </tr>
                    ) : (
                        rows.map((row: any, idx: number) => (
                            <tr key={idx}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>{row.qty}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>{row.price}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'center' }}>{row.days}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', fontWeight: 500 }}>{row.total}</td>
                            </tr>
                        ))
                    )}
                    <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={3} style={{ border: '1px solid #cbd5e1' }} />
                        <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Subtotal:</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>{fmt(itemsSum)}</td>
                    </tr>
                    {freightVal > 0 && (
                        <tr style={{ background: '#f8fafc' }}>
                            <td colSpan={3} style={{ border: '1px solid #cbd5e1' }} />
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Frete:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', color: 'var(--success)' }}>{fmt(freightVal)}</td>
                        </tr>
                    )}
                    {discountVal > 0 && (
                        <tr style={{ background: '#f8fafc' }}>
                            <td colSpan={3} style={{ border: '1px solid #cbd5e1' }} />
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Desconto ({discountVal}%):</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', color: 'var(--danger)' }}>-{fmt(discountAmount)}</td>
                        </tr>
                    )}
                    <tr style={{ background: '#f1f5f9' }}>
                        <td colSpan={3} style={{ border: '1px solid #cbd5e1' }} />
                        <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>VALOR TOTAL:</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>{fmt(grandTotal)}</td>
                    </tr>
                </tbody>
            </table>
        );
    }

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
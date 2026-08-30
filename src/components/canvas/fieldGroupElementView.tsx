import type { FieldGroupElement, DbData, DbTableName } from "@/utils/canvasUtils";
import { getContrastColor, formatDbValue, FieldGroupField } from "@/utils/canvasUtils";

export function FieldGroupElementView({ el, dbData }: { el: FieldGroupElement; dbData: DbData }) {
    const borderColor = el.borderColor ?? '#cbd5e1';
    const titleBg = el.titleBgColor ?? '#2563eb';
    const titleColor = getContrastColor(titleBg);

    const record = (() => {
        if (!el.dbTable) return null;
        const records = dbData[el.dbTable as DbTableName];
        if (!records) return null;
        return el.dbRecordId
            ? records.find((r: any) => String(r?.id) === String(el.dbRecordId))
            : records[0];
    })();

    const resolveValue = (f: FieldGroupField): string => {
        if (f.isCurrency && f.sumColumn && el.dbTable) {
            const records = dbData[el.dbTable as DbTableName] || [];
            const total = records.reduce((sum: number, r: any) => {
                const val = r[f.sumColumn!];
                const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d,-]/g, '').replace(',', '.'));
                return sum + (isNaN(num) ? 0 : num);
            }, 0);
            return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        let rawVal = undefined;
        if (f.dbColumn && record) {
            const parts = f.dbColumn.split('.');
            let curr = record;
            for (const part of parts) {
                if (curr && typeof curr === 'object') {
                    curr = curr[part];
                } else {
                    curr = undefined;
                }
            }
            rawVal = curr;
            if (rawVal === undefined && f.dbColumn.includes('.')) {
                const lastPart = f.dbColumn.split('.').pop()!;
                rawVal = record[lastPart];
            }
        } else {
            rawVal = f.staticValue;
        }

        if (rawVal === undefined || rawVal === null) return '';

        if (f.isCurrency) {
            const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^\d,-]/g, '').replace(',', '.'));
            if (!isNaN(num)) {
                return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
        }

        if (f.dbColumn && record) return formatDbValue(rawVal, f.dbColumn);
        return f.staticValue ?? '';
    };

    return (
        <div style={{
            width: '100%', height: '100%',
            border: `1px solid ${borderColor}`,
            boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column',
            background: '#ffffff',
            overflow: 'hidden',
            fontSize: el.fontSize,
            color: '#0f172a',
        }}>
            {el.title && (
                <div style={{
                    background: titleBg, color: titleColor,
                    padding: '4px 8px', fontWeight: 700, fontSize: el.fontSize,
                    letterSpacing: 0.5,
                }}>
                    {el.title}
                </div>
            )}
            <div style={{
                display: 'grid',
                gridTemplateColumns: el.columns === 2 ? '1fr 1fr' : '1fr',
                gap: '4px 12px',
                padding: 8,
                flex: 1,
                alignContent: 'start',
            }}>
                {el.fields.map((f) => (
                    <div key={f.id} style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
                        <span style={{
                            fontWeight: el.labelBold ? 700 : 400,
                            whiteSpace: 'nowrap',
                        }}>{f.label}:</span>
                        <span style={{
                            flex: 1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{resolveValue(f) || <span style={{ opacity: 0.35 }}>—</span>}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
import { useState } from 'react';
import type { DbData, DbTableName, TextElement } from '@/utils/canvasUtils';
import { formatDbValue } from '@/utils/canvasUtils';


export function TextElementView({
    el, dbData, onUpdate, onStartEdit, onEndEdit,
}: {
    el: TextElement;
    dbData: DbData;
    onUpdate: (patch: Partial<TextElement>) => void;
    onStartEdit: () => void;
    onEndEdit: () => void;
}) {
    const [editing, setEditing] = useState(false);

    const boundValue: string | null = (() => {
        if (!el.dbTable || !el.dbColumn) return null;
        const records = dbData[el.dbTable as DbTableName];
        if (!records) return null;
        const record = el.dbRecordId
            ? records.find((r: any) => String(r?.id) === String(el.dbRecordId))
            : records[0];
        if (!record) return null;
        return formatDbValue(record[el.dbColumn], el.dbColumn);
    })();

    const displayedContent = boundValue !== null ? boundValue : el.content;

    return editing ? (
        <textarea
            autoFocus
            value={el.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onBlur={() => { setEditing(false); onEndEdit(); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
                width: '100%', height: '100%',
                fontSize: el.fontSize,
                fontWeight: el.fontWeight,
                textAlign: el.align,
                color: el.color,
                background: 'transparent',
                border: '1px dashed #2563eb',
                outline: 'none',
                resize: 'none',
                padding: 2,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
            }}
        />
    ) : (
        <div
            onDoubleClick={() => { setEditing(true); onStartEdit(); }}
            style={{
                width: '100%', height: '100%',
                fontSize: el.fontSize,
                fontWeight: el.fontWeight,
                textAlign: el.align,
                color: el.color,
                padding: 2,
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                boxSizing: 'border-box',
                userSelect: 'none',
            }}
        >
            {displayedContent || <span style={{ opacity: 0.4 }}>Texto vazio</span>}
        </div>
    );
}
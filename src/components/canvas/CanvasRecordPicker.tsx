import { useState } from 'react';
import { toast } from 'react-toastify';
import { RemoteAutocomplete } from '@/components/ui/RemoteAutocomplete';
import { formatRecordLabel, type DbData, type DbTableName } from '@/utils/canvasUtils';

export function CanvasRecordPicker({ table, records, value, onChange, ensureRecord, multiple = false }: {
    table: DbTableName;
    records: DbData[DbTableName];
    value: string[];
    onChange: (ids: string[]) => void;
    ensureRecord: (table: DbTableName, id: string) => Promise<void>;
    multiple?: boolean;
}) {
    const [pending, setPending] = useState(false);
    return <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
        <RemoteAutocomplete key={table} tipo={table === 'estoque' ? 'itens' : table} size="small"
            label={multiple ? 'Buscar e adicionar registro' : 'Buscar registro (vazio = primeiro)'}
            valueId={multiple ? '' : value[0] ?? ''} disabled={pending}
            initialOptions={records.map((row) => ({ id: String(row.id), nome: formatRecordLabel(table, row) }))}
            isOptionDisabled={multiple ? (option) => value.includes(option.id) : undefined}
            onChange={async (option) => {
                if (!option) { if (!multiple) onChange([]); return; }
                setPending(true);
                try {
                    await ensureRecord(table, option.id);
                    onChange(multiple ? [...value, option.id] : [option.id]);
                } catch {
                    toast.error('Não foi possível carregar o registro. Tente novamente.');
                } finally { setPending(false); }
            }} />
        {multiple && value.length > 0 && <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {value.map((id) => {
                const row = records.find((record) => String(record.id) === id);
                return <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, fontSize: 12 }}>
                    <input type="checkbox" checked disabled={pending} onChange={() => onChange(value.filter((value) => value !== id))} />
                    <span>{row ? formatRecordLabel(table, row) : 'Carregando registro...'}</span>
                </label>;
            })}
        </div>}
    </div>;
}

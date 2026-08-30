import { getColumnsFromRecords, TextElement, GridElement, FieldGroupElement, DB_TABLES, newId, formatRecordLabel } from '@/utils/canvasUtils';
import type { DbData, SeparatorElement, DbTableName, KanvasElement, FieldGroupField } from '@/utils/canvasUtils';
import { Field } from '@/components/canvas/canvasComponent';

const inputStyle = {
    width: '100%',
    padding: '4px 6px',
    borderRadius: 4,
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 13,
}

export function PropertiesPanel({
    el, dbData, onChange, onDelete,
}: {
    el: KanvasElement;
    dbData: DbData;
    onChange: (patch: Partial<KanvasElement>) => void;
    onDelete: () => void;
}) {
    return (
        <>
            <Field label="Tipo">
                <div style={{ fontSize: 12, opacity: 0.7 }}>{el.type}</div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <Field label="X">
                    <input type="number" value={el.x} style={inputStyle}
                        onChange={(e) => onChange({ x: Number(e.target.value) || 0 } as Partial<KanvasElement>)} />
                </Field>
                <Field label="Y">
                    <input type="number" value={el.y} style={inputStyle}
                        onChange={(e) => onChange({ y: Number(e.target.value) || 0 } as Partial<KanvasElement>)} />
                </Field>
                <Field label="Largura">
                    <input type="number" value={el.width} style={inputStyle}
                        onChange={(e) => onChange({ width: Number(e.target.value) || 0 } as Partial<KanvasElement>)} />
                </Field>
                <Field label="Altura">
                    <input type="number" value={el.height} style={inputStyle}
                        onChange={(e) => onChange({ height: Number(e.target.value) || 0 } as Partial<KanvasElement>)} />
                </Field>
            </div>

            {el.type === 'text' && (
                <>
                    <Field label="Conteúdo">
                        <textarea
                            value={el.content}
                            onChange={(e) => onChange({ content: e.target.value } as Partial<TextElement>)}
                            style={{ ...inputStyle, minHeight: 60, fontFamily: 'inherit' }}
                            disabled={!!(el.dbTable && el.dbColumn)}
                            title={el.dbTable && el.dbColumn ? 'Conteúdo vindo do banco' : ''}
                        />
                    </Field>
                    <Field label="Vincular ao banco (opcional)">
                        <select
                            value={el.dbTable ?? ''}
                            onChange={(e) => onChange({
                                dbTable: e.target.value || undefined,
                                dbRecordId: undefined,
                                dbColumn: undefined,
                            } as Partial<TextElement>)}
                            style={inputStyle}
                        >
                            <option value="">— sem vínculo —</option>
                            {DB_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                    {el.dbTable && (
                        <>
                            <Field label="Registro">
                                <select
                                    value={el.dbRecordId ?? ''}
                                    onChange={(e) => onChange({ dbRecordId: e.target.value || undefined } as Partial<TextElement>)}
                                    style={inputStyle}
                                >
                                    <option value="">— primeiro registro —</option>
                                    {(dbData[el.dbTable as DbTableName] || []).map((r: any) => (
                                        <option key={String(r.id)} value={String(r.id)}>
                                            {formatRecordLabel(el.dbTable!, r)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Coluna">
                                <select
                                    value={el.dbColumn ?? ''}
                                    onChange={(e) => onChange({ dbColumn: e.target.value || undefined } as Partial<TextElement>)}
                                    style={inputStyle}
                                >
                                    <option value="">— escolher coluna —</option>
                                    {getColumnsFromRecords(dbData[el.dbTable as DbTableName] || []).map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </Field>
                        </>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <Field label="Tamanho">
                            <input
                                type="number"
                                value={el.fontSize}
                                style={inputStyle}
                                onChange={(e) => onChange({ fontSize: Number(e.target.value) || 12 } as Partial<TextElement>)}
                            />
                        </Field>
                        <Field label="Peso">
                            <select
                                value={el.fontWeight}
                                onChange={(e) => onChange({ fontWeight: e.target.value as 'normal' | 'bold' } as Partial<TextElement>)}
                                style={inputStyle}
                            >
                                <option value="normal">Normal</option>
                                <option value="bold">Negrito</option>
                            </select>
                        </Field>
                    </div>
                    <Field label="Alinhamento">
                        <select
                            value={el.align}
                            onChange={(e) => onChange({ align: e.target.value as 'left' | 'center' | 'right' } as Partial<TextElement>)}
                            style={inputStyle}
                        >
                            <option value="left">Esquerda</option>
                            <option value="center">Centro</option>
                            <option value="right">Direita</option>
                        </select>
                    </Field>
                    <Field label="Cor">
                        <input
                            type="color"
                            value={el.color}
                            onChange={(e) => onChange({ color: e.target.value } as Partial<TextElement>)}
                            style={{ ...inputStyle, padding: 0, height: 28 }}
                        />
                    </Field>
                </>
            )}

            {el.type === 'grid' && (
                <>
                    <Field label="Cor do cabeçalho">
                        <input
                            type="color"
                            value={el.headerBgColor ?? '#f1f5f9'}
                            onChange={(e) => onChange({ headerBgColor: e.target.value } as Partial<GridElement>)}
                            style={{ ...inputStyle, padding: 0, height: 28 }}
                        />
                    </Field>

                    <Field label="Vincular tabela (opcional)">
                        <select
                            value={el.dbTable ?? ''}
                            onChange={(e) => {
                                const v = e.target.value as DbTableName | '';
                                if (!v) {
                                    onChange({
                                        dbTable: undefined,
                                        selectedColumns: undefined,
                                        selectedRecordIds: undefined,
                                        columnMappings: undefined,
                                    } as Partial<GridElement>);
                                } else {
                                    const cols = getColumnsFromRecords(dbData[v] || []);
                                    onChange({
                                        dbTable: v,
                                        selectedColumns: cols,
                                        selectedRecordIds: [],
                                        columnMappings: {},
                                    } as Partial<GridElement>);
                                }
                            }}
                            style={inputStyle}
                        >
                            <option value="">— sem vínculo (manual) —</option>
                            {DB_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>

                    {el.dbTable ? (
                        <>
                            <Field label="Colunas exibidas / renomear">
                                <div style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 4,
                                    padding: 6,
                                    maxHeight: 180,
                                    overflowY: 'auto',
                                    background: 'var(--bg-primary)',
                                }}>
                                    {getColumnsFromRecords(dbData[el.dbTable as DbTableName] || []).map((c) => {
                                        const selectedCols = el.selectedColumns ?? [];
                                        const checked = selectedCols.includes(c);
                                        return (
                                            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        const next = e.target.checked
                                                            ? [...selectedCols, c]
                                                            : selectedCols.filter((x) => x !== c);
                                                        onChange({ selectedColumns: next } as Partial<GridElement>);
                                                    }}
                                                />
                                                <span style={{ fontSize: 11, minWidth: 70, opacity: 0.7 }}>{c}</span>
                                                <input
                                                    type="text"
                                                    placeholder="rótulo"
                                                    value={el.columnMappings?.[c] ?? ''}
                                                    onChange={(e) => {
                                                        const map = { ...(el.columnMappings ?? {}) };
                                                        if (e.target.value) map[c] = e.target.value;
                                                        else delete map[c];
                                                        onChange({ columnMappings: map } as Partial<GridElement>);
                                                    }}
                                                    style={{ ...inputStyle, padding: '2px 4px', fontSize: 11 }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </Field>

                            <Field label="Registros (vazio = todos)">
                                <div style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 4,
                                    padding: 6,
                                    maxHeight: 180,
                                    overflowY: 'auto',
                                    background: 'var(--bg-primary)',
                                }}>
                                    {(dbData[el.dbTable as DbTableName] || []).map((r: any) => {
                                        const id = String(r.id);
                                        const selectedIds = el.selectedRecordIds ?? [];
                                        const checked = selectedIds.includes(id);
                                        return (
                                            <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, fontSize: 11 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        const next = e.target.checked
                                                            ? [...selectedIds, id]
                                                            : selectedIds.filter((x) => x !== id);
                                                        onChange({ selectedRecordIds: next } as Partial<GridElement>);
                                                    }}
                                                />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {formatRecordLabel(el.dbTable!, r)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </Field>
                        </>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <Field label="Linhas">
                                <input
                                    type="number"
                                    min={1}
                                    value={el.cells.length}
                                    style={inputStyle}
                                    onChange={(e) => {
                                        const n = Math.max(1, Number(e.target.value) || 1);
                                        const cols = el.headers.length;
                                        const cells = Array.from({ length: n }, (_, i) =>
                                            el.cells[i] ?? Array.from({ length: cols }, () => ''),
                                        );
                                        onChange({ cells, rows: n + 1 } as Partial<GridElement>);
                                    }}
                                />
                            </Field>
                            <Field label="Colunas">
                                <input
                                    type="number"
                                    min={1}
                                    value={el.headers.length}
                                    style={inputStyle}
                                    onChange={(e) => {
                                        const n = Math.max(1, Number(e.target.value) || 1);
                                        const headers = Array.from({ length: n }, (_, i) => el.headers[i] ?? `Col ${i + 1}`);
                                        const cells = el.cells.map((row) =>
                                            Array.from({ length: n }, (_, i) => row[i] ?? ''),
                                        );
                                        onChange({ headers, cells, cols: n } as Partial<GridElement>);
                                    }}
                                />
                            </Field>
                        </div>
                    )}
                </>
            )}

            {el.type === 'separator' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 6 }}>
                    <Field label="Cor">
                        <input
                            type="color"
                            value={el.color || '#1044a4'}
                            onChange={(e) => onChange({ color: e.target.value } as Partial<SeparatorElement>)}
                            style={{ ...inputStyle, padding: 0, height: 28, width: 44 }}
                        />
                    </Field>
                    <Field label="Espessura (px)">
                        <input
                            type="number"
                            min={1}
                            value={el.thickness ?? 2}
                            onChange={(e) => onChange({ thickness: Number(e.target.value) || 1 } as Partial<SeparatorElement>)}
                            style={inputStyle}
                        />
                    </Field>
                </div>
            )}

            {el.type === 'fieldGroup' && (
                <>
                    <Field label="Título (vazio = sem barra)">
                        <input
                            type="text"
                            value={el.title ?? ''}
                            onChange={(e) => onChange({ title: e.target.value || undefined } as Partial<FieldGroupElement>)}
                            style={inputStyle}
                        />
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <Field label="Cor barra">
                            <input
                                type="color"
                                value={el.titleBgColor ?? '#2563eb'}
                                onChange={(e) => onChange({ titleBgColor: e.target.value } as Partial<FieldGroupElement>)}
                                style={{ ...inputStyle, padding: 0, height: 28 }}
                            />
                        </Field>
                        <Field label="Borda">
                            <input
                                type="color"
                                value={el.borderColor ?? '#cbd5e1'}
                                onChange={(e) => onChange({ borderColor: e.target.value } as Partial<FieldGroupElement>)}
                                style={{ ...inputStyle, padding: 0, height: 28 }}
                            />
                        </Field>
                        <Field label="Tamanho fonte">
                            <input
                                type="number"
                                value={el.fontSize}
                                onChange={(e) => onChange({ fontSize: Number(e.target.value) || 12 } as Partial<FieldGroupElement>)}
                                style={inputStyle}
                            />
                        </Field>
                        <Field label="Colunas">
                            <select
                                value={el.columns}
                                onChange={(e) => onChange({ columns: (Number(e.target.value) === 2 ? 2 : 1) } as Partial<FieldGroupElement>)}
                                style={inputStyle}
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                            </select>
                        </Field>
                    </div>
                    <Field label="Rótulo em negrito">
                        <input
                            type="checkbox"
                            checked={el.labelBold}
                            onChange={(e) => onChange({ labelBold: e.target.checked } as Partial<FieldGroupElement>)}
                        />
                    </Field>

                    <Field label="Vincular tabela (opcional)">
                        <select
                            value={el.dbTable ?? ''}
                            onChange={(e) => onChange({
                                dbTable: e.target.value || undefined,
                                dbRecordId: undefined,
                            } as Partial<FieldGroupElement>)}
                            style={inputStyle}
                        >
                            <option value="">— sem vínculo —</option>
                            {DB_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </Field>
                    {el.dbTable && (
                        <Field label="Registro">
                            <select
                                value={el.dbRecordId ?? ''}
                                onChange={(e) => onChange({ dbRecordId: e.target.value || undefined } as Partial<FieldGroupElement>)}
                                style={inputStyle}
                            >
                                <option value="">— primeiro registro —</option>
                                {(dbData[el.dbTable as DbTableName] || []).map((r: any) => (
                                    <option key={String(r.id)} value={String(r.id)}>
                                        {formatRecordLabel(el.dbTable!, r)}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}

                    <Field label="Campos">
                        <div style={{
                            border: '1px solid var(--border)', borderRadius: 4, padding: 6,
                            maxHeight: 260, overflowY: 'auto', background: 'var(--bg-primary)',
                        }}>
                            {el.fields.map((f, idx) => {
                                const cols = el.dbTable
                                    ? getColumnsFromRecords(dbData[el.dbTable as DbTableName] || [])
                                    : [];
                                const update = (patch: Partial<FieldGroupField>) => {
                                    const fields = el.fields.map((x) => x.id === f.id ? { ...x, ...patch } : x);
                                    onChange({ fields } as Partial<FieldGroupElement>);
                                };
                                const remove = () => {
                                    onChange({ fields: el.fields.filter((x) => x.id !== f.id) } as Partial<FieldGroupElement>);
                                };
                                const move = (dir: -1 | 1) => {
                                    const next = [...el.fields];
                                    const j = idx + dir;
                                    if (j < 0 || j >= next.length) return;
                                    [next[idx], next[j]] = [next[j], next[idx]];
                                    onChange({ fields: next } as Partial<FieldGroupElement>);
                                };
                                return (
                                    <div key={f.id} style={{
                                        marginBottom: 6, paddingBottom: 6,
                                        borderBottom: '1px dashed var(--border)',
                                    }}>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                                            <input
                                                type="text" placeholder="Rótulo"
                                                value={f.label}
                                                onChange={(e) => update({ label: e.target.value })}
                                                style={{ ...inputStyle, fontSize: 11 }}
                                            />
                                            <button onClick={() => move(-1)} title="Subir"
                                                style={{ padding: '2px 6px', cursor: 'pointer' }}>↑</button>
                                            <button onClick={() => move(1)} title="Descer"
                                                style={{ padding: '2px 6px', cursor: 'pointer' }}>↓</button>
                                            <button onClick={remove} title="Remover"
                                                style={{ padding: '2px 6px', cursor: 'pointer', color: '#ef4444' }}>×</button>
                                        </div>
                                        {el.dbTable ? (
                                            <select
                                                value={f.dbColumn ?? ''}
                                                onChange={(e) => update({ dbColumn: e.target.value || undefined, staticValue: undefined })}
                                                style={{ ...inputStyle, fontSize: 11 }}
                                            >
                                                <option value="">— estático —</option>
                                                {cols.map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        ) : null}
                                        {(!el.dbTable || !f.dbColumn) && (
                                            <input
                                                type="text" placeholder="Valor"
                                                value={f.staticValue ?? ''}
                                                onChange={(e) => update({ staticValue: e.target.value })}
                                                style={{ ...inputStyle, fontSize: 11, marginTop: 4 }}
                                            />
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={f.isCurrency ?? false}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        update({
                                                            isCurrency: checked,
                                                            sumColumn: checked ? f.sumColumn : undefined
                                                        });
                                                    }}
                                                />
                                                Valor é moeda
                                            </label>
                                        </div>
                                        {f.isCurrency && el.dbTable && (
                                            <div style={{ marginTop: 4 }}>
                                                <span style={{ fontSize: 10, opacity: 0.7, display: 'block', marginBottom: 2 }}>Somar coluna para total:</span>
                                                <select
                                                    value={f.sumColumn ?? ''}
                                                    onChange={(e) => update({ sumColumn: e.target.value || undefined })}
                                                    style={{ ...inputStyle, fontSize: 11 }}
                                                >
                                                    <option value="">— somar coluna (opcional) —</option>
                                                    {cols.map((c) => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                onClick={() => onChange({
                                    fields: [...el.fields, { id: newId(), label: 'Novo campo', staticValue: '' }],
                                } as Partial<FieldGroupElement>)}
                                style={{
                                    width: '100%', padding: '4px 8px',
                                    border: '1px dashed var(--border)', borderRadius: 4,
                                    background: 'transparent', cursor: 'pointer', fontSize: 11,
                                    color: 'var(--text-primary)',
                                }}
                            >＋ Adicionar campo</button>
                        </div>
                    </Field>
                </>
            )}

            <button
                onClick={onDelete}
                style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #ef4444',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 12,
                }}
            >
                🗑️ Excluir elemento
            </button>
        </>
    );
}
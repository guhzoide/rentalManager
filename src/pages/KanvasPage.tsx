import { trpc } from '@/lib/trpc';
import { ElementView } from '@/components/canvas/elementView';
import { useState, useRef, useEffect, useCallback } from 'react';
import { PropertiesPanel } from '@/components/canvas/propertiesLabel';
import { ToolbarButton, Divider, Field } from '@/components/canvas/canvasComponent';
import { emptyDocument, templateNotaFiscal, templateOrdemServico, templateRecibo, newId } from '@/utils/canvasUtils';

import type { KanvasDoc, KanvasElement, ElementType } from '@/utils/canvasUtils';

const GRID_SIZE = 10;
const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '5px 8px',
    borderRadius: 4,
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 12,
    boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 13,
    cursor: 'pointer',
};

interface DragState {
    mode: 'move' | 'resize';
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
}

export function KanvasPage() {
    const { data: estoqueData } = trpc.estoque.list.useQuery({ limit: 1000 });
    const { data: clientesData } = trpc.clientes.list.useQuery({ limit: 1000 });
    const { data: agendasData } = trpc.agendas.list.useQuery({ limit: 1000 });
    const { data: transacoesData } = trpc.transacoes.list.useQuery({ limit: 1000 });

    const dbData = {
        estoque: estoqueData?.data || [],
        clientes: clientesData?.data || [],
        agendas: agendasData?.data || [],
        transacoes: transacoesData?.data || [],
    };

    const [documents, setDocuments] = useState<KanvasDoc[]>(() => [emptyDocument('Documento 1')]);
    const [activeDocId, setActiveDocId] = useState<string>(documents[0].id);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(0.85);
    const [showGrid, setShowGrid] = useState(false);
    const dragRef = useRef<DragState | null>(null);
    const editingTextRef = useRef<string | null>(null);

    const activeDoc = documents.find((d) => d.id === activeDocId) ?? documents[0];

    const updateDoc = useCallback((patch: Partial<KanvasDoc>) => {
        setDocuments((prev) => prev.map((d) => (d.id === activeDoc.id ? { ...d, ...patch } : d)));
    }, [activeDoc.id]);

    const updateElement = useCallback((id: string, patch: Partial<KanvasElement>) => {
        setDocuments((prev) =>
            prev.map((d) =>
                d.id === activeDoc.id
                    ? {
                        ...d,
                        elements: d.elements.map((el: any) =>
                            el.id === id ? ({ ...el, ...patch } as KanvasElement) : el,
                        ),
                    }
                    : d,
            ),
        );
    }, [activeDoc.id]);

    const deleteElement = useCallback((id: string) => {
        setDocuments((prev) =>
            prev.map((d) =>
                d.id === activeDoc.id
                    ? { ...d, elements: d.elements.filter((el) => el.id !== id) }
                    : d,
            ),
        );
        setSelectedId(null);
    }, [activeDoc.id]);

    const addElement = useCallback((type: ElementType) => {
        let el: KanvasElement;
        const baseX = 60;
        const baseY = 60 + activeDoc.elements.length * 12;
        if (type === 'text') {
            el = {
                id: newId(), type: 'text', x: baseX, y: baseY, width: 300, height: 40,
                content: 'Digite seu texto', fontSize: 14, fontWeight: 'normal',
                align: 'left', color: '#0f172a',
            };
        } else if (type === 'grid') {
            el = {
                id: newId(), type: 'grid', x: baseX, y: baseY, width: 500, height: 160,
                rows: 4, cols: 3,
                headers: ['Coluna A', 'Coluna B', 'Coluna C'],
                cells: Array.from({ length: 3 }, () => ['', '', '']),
            };
        } else if (type === 'separator') {
            el = {
                id: newId(), type: 'separator', x: baseX, y: baseY, width: 300, height: 2,
                color: '#0f172a',
            };
        } else {
            el = {
                id: newId(), type: 'fieldGroup', x: baseX, y: baseY, width: 500, height: 120,
                title: 'Grupo', titleBgColor: '#2563eb', borderColor: '#cbd5e1',
                fontSize: 12, labelBold: true, columns: 2,
                fields: [
                    { id: newId(), label: 'Campo 1', staticValue: '' },
                    { id: newId(), label: 'Campo 2', staticValue: '' },
                ],
            };
        }
        setDocuments((prev) =>
            prev.map((d) =>
                d.id === activeDoc.id ? { ...d, elements: [...d.elements, el] } : d,
            ),
        );
        setSelectedId(el.id);
    }, [activeDoc]);

    const onMouseDownElement = (e: React.MouseEvent, id: string, mode: 'move' | 'resize') => {
        if (editingTextRef.current) return;
        e.stopPropagation();
        const el = activeDoc.elements.find((x) => x.id === id);
        if (!el) return;
        setSelectedId(id);
        dragRef.current = {
            mode, id,
            startX: e.clientX, startY: e.clientY,
            origX: el.x, origY: el.y, origW: el.width, origH: el.height,
        };
    };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const d = dragRef.current;
            if (!d) return;
            const dx = (e.clientX - d.startX) / zoom;
            const dy = (e.clientY - d.startY) / zoom;
            if (d.mode === 'move') {
                updateElement(d.id, { x: snap(d.origX + dx), y: snap(d.origY + dy) });
            } else {
                updateElement(d.id, {
                    width: Math.max(40, snap(d.origW + dx)),
                    height: Math.max(20, snap(d.origH + dy)),
                });
            }
        };
        const onUp = () => { dragRef.current = null; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [zoom, updateElement]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) {
                    e.preventDefault();
                    deleteElement(selectedId);
                }
            } else if (e.key === 'Escape') {
                setSelectedId(null);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedId, deleteElement]);

    const selected = activeDoc.elements.find((e) => e.id === selectedId) ?? null;

    const handlePrint = useCallback(() => {
        const w = activeDoc.pageWidth;
        const h = activeDoc.pageHeight;
        let styleEl = document.getElementById('kanvas-print-style') as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'kanvas-print-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            @media print {
                @page { size: ${w}px ${h}px; margin: 0; }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #fff !important;
                }
                body * { visibility: hidden !important; }
                [data-kanvas-print], [data-kanvas-print] * { visibility: visible !important; }
                [data-kanvas-print] {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: ${w}px !important;
                    height: ${h}px !important;
                    transform: none !important;
                    box-shadow: none !important;
                    overflow: hidden !important;
                    background-image: none !important;
                }
            }
        `;
        setSelectedId(null);
        requestAnimationFrame(() => window.print());
    }, [activeDoc.pageWidth, activeDoc.pageHeight]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                flexWrap: 'wrap',
            }}>
                <strong style={{ marginRight: 8 }}>🖼️ Kanvas</strong>

                <ToolbarButton onClick={() => addElement('text')}>＋ Texto</ToolbarButton>
                <ToolbarButton onClick={() => addElement('grid')}>＋ Grid</ToolbarButton>
                <ToolbarButton onClick={() => addElement('fieldGroup')}>＋ Campos</ToolbarButton>
                <ToolbarButton onClick={() => addElement('separator')}>― Separador</ToolbarButton>

                <Divider />

                <select
                    onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        let doc: KanvasDoc | null = null;
                        if (v === 'blank') doc = emptyDocument(`Documento ${documents.length + 1}`);
                        if (v === 'nf') doc = templateNotaFiscal();
                        if (v === 'recibo') doc = templateRecibo();
                        if (v === 'os') doc = templateOrdemServico();
                        if (doc) {
                            const created = doc;
                            setDocuments((p) => [...p, created]);
                            setActiveDocId(created.id);
                            setSelectedId(null);
                        }
                        e.target.value = '';
                    }}
                    defaultValue=""
                    style={selectStyle}
                >
                    <option value="" disabled>Novo documento</option>
                    <option value="blank">Em branco</option>
                    <option value="nf">Nota Fiscal</option>
                    <option value="recibo">Recibo</option>
                    <option value="os">Ordem de Serviço</option>
                </select>

                <Divider />

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                    />
                    Grade
                </label>

                <Divider />

                <ToolbarButton onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}>−</ToolbarButton>
                <span style={{ fontSize: 13, width: 48, textAlign: 'center' }}>
                    {Math.round(zoom * 100)}%
                </span>
                <ToolbarButton onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>＋</ToolbarButton>

                <div style={{ flex: 1 }} />

                <ToolbarButton onClick={handlePrint}>🖨️ Gerar PDF</ToolbarButton>
            </div>

            {/* Document tabs */}
            <div style={{
                display: 'flex',
                gap: 4,
                padding: '6px 10px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                overflowX: 'auto',
            }}>
                {documents.map((d) => (
                    <div
                        key={d.id}
                        onClick={() => { setActiveDocId(d.id); setSelectedId(null); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                            background: d.id === activeDocId ? 'var(--accent-light)' : 'transparent',
                            border: `1px solid ${d.id === activeDocId ? 'var(--accent)' : 'var(--border)'}`,
                            fontSize: 12,
                        }}
                    >
                        <input
                            value={d.name}
                            onChange={(e) => {
                                const v = e.target.value;
                                setDocuments((p) => p.map((x) => (x.id === d.id ? { ...x, name: v } : x)));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'transparent', border: 'none', outline: 'none',
                                color: 'var(--text-primary)', width: Math.max(80, d.name.length * 7),
                                fontSize: 12,
                            }}
                        />
                        {documents.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDocuments((p) => {
                                        const next = p.filter((x) => x.id !== d.id);
                                        if (d.id === activeDocId && next[0]) setActiveDocId(next[0].id);
                                        return next;
                                    });
                                }}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-primary)', fontSize: 14, lineHeight: 1,
                                }}
                                title="Fechar"
                            >×</button>
                        )}
                    </div>
                ))}
            </div>

            {/* Canvas + properties */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        background: 'var(--bg-primary)',
                        padding: 40,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                    }}
                    onClick={() => setSelectedId(null)}
                >
                    <div
                        style={{
                            width: activeDoc.pageWidth * zoom,
                            height: activeDoc.pageHeight * zoom,
                            position: 'relative',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            data-kanvas-print
                            style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: activeDoc.pageWidth,
                                height: activeDoc.pageHeight,
                                transformOrigin: 'top left',
                                transform: `scale(${zoom})`,
                                background: '#ffffff',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                                backgroundImage: showGrid
                                    ? `linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px),
                                       linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)`
                                    : undefined,
                                backgroundSize: showGrid ? `${GRID_SIZE}px ${GRID_SIZE}px` : undefined,
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={() => setSelectedId(null)}
                        >
                            {activeDoc.elements.map((el) => (
                                <ElementView
                                    key={el.id}
                                    el={el}
                                    selected={selectedId === el.id}
                                    dbData={dbData}
                                    onMouseDown={(e: any, mode: any) => onMouseDownElement(e, el.id, mode)}
                                    onUpdate={(patch: any) => updateElement(el.id, patch)}
                                    onStartEdit={() => { editingTextRef.current = el.id; }}
                                    onEndEdit={() => { editingTextRef.current = null; }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <aside style={{
                    width: 260,
                    borderLeft: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    padding: 14,
                    overflowY: 'auto',
                    fontSize: 13,
                }}>
                    <h3 style={{ marginTop: 0, fontSize: 14 }}>Propriedades</h3>
                    {!selected && (
                        <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: 12 }}>
                            Selecione um elemento no canvas para editar.
                        </p>
                    )}
                    {selected && (
                        <PropertiesPanel
                            el={selected}
                            dbData={dbData}
                            onChange={(patch) => updateElement(selected.id, patch)}
                            onDelete={() => deleteElement(selected.id)}
                        />
                    )}

                    <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />
                    <h3 style={{ fontSize: 14 }}>Página</h3>
                    <Field label="Largura">
                        <input
                            type="number"
                            value={activeDoc.pageWidth}
                            onChange={(e) => updateDoc({ pageWidth: Number(e.target.value) || 0 })}
                            style={inputStyle}
                        />
                    </Field>
                    <Field label="Altura">
                        <input
                            type="number"
                            value={activeDoc.pageHeight}
                            onChange={(e) => updateDoc({ pageHeight: Number(e.target.value) || 0 })}
                            style={inputStyle}
                        />
                    </Field>
                </aside>
            </div>
        </div>
    );
}
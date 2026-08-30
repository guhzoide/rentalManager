import { trpc } from '@/lib/trpc';
import { ElementView } from '@/components/canvas/elementView';
import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Modal } from '@/components/ui/Modal';
import { PropertiesPanel } from '@/components/canvas/propertiesLabel';
import { ToolbarButton, Divider, Field } from '@/components/canvas/canvasComponent';
import { emptyDocument, templateNotaFiscal, templateOrdemServico, templateRecibo, newId } from '@/utils/canvasUtils';
import type { DbData, KanvasDoc, KanvasElement, ElementType } from '@/utils/canvasUtils';

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

export function CanvasPage() {
    const utils = trpc.useUtils();
    const { data: estoqueData } = trpc.estoque.list.useQuery({ limit: 1000 });
    const { data: clientesData } = trpc.clientes.list.useQuery({ limit: 1000 });
    const { data: agendasData } = trpc.agendas.list.useQuery({ limit: 1000 });
    const { data: transacoesData } = trpc.transacoes.list.useQuery({ limit: 1000 });
    const { data: empresasRes } = trpc.empresa.listAll.useQuery();
    const { data: documentosList } = trpc.documentos.list.useQuery();

    const createDoc = trpc.documentos.create.useMutation({
        onSuccess: () => utils.documentos.list.invalidate(),
    });
    const updateDocMutation = trpc.documentos.update.useMutation({
        onSuccess: () => utils.documentos.list.invalidate(),
    });
    const deleteDoc = trpc.documentos.delete.useMutation({
        onSuccess: () => utils.documentos.list.invalidate(),
    });
    const emitirNf = trpc.documentos.emitirNf.useMutation();

    const dbData: DbData = {
        estoque: estoqueData?.data || [],
        clientes: clientesData?.data || [],
        agendas: agendasData?.data || [],
        transacoes: transacoesData?.data || [],
        empresas: empresasRes || [],
    };

    const [activeDocId, setActiveDocId] = useState<string | null>(null);
    const [activeDoc, setActiveDoc] = useState<KanvasDoc>(() => emptyDocument('Documento 1'));
    const [agendaModalOpen, setAgendaModalOpen] = useState(false);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(0.85);
    const [showGrid, setShowGrid] = useState(false);
    const [isMobilePropsOpen, setIsMobilePropsOpen] = useState(false);
    const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
    const [confirmEmitId, setConfirmEmitId] = useState<string | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const editingTextRef = useRef<string | null>(null);

    const loadDocument = async (id: string) => {
        const doc = await utils.documentos.get.fetch({ id });
        if (doc && doc.content) {
            setActiveDoc(doc.content as unknown as KanvasDoc);
            setActiveDocId(doc.id);
            setSelectedId(null);
        }
    };

    const handleSelectAgendaForNf = (agendaId: string) => {
        const agenda = agendasData?.data?.find((a: any) => String(a.id) === agendaId);
        if (!agenda) return;

        const doc = templateNotaFiscal();

        const firstCompanyId = empresasRes?.[0]?.id;

        doc.elements = doc.elements.map((el) => {
            if (el.type === 'fieldGroup' && el.title?.includes('PRESTADOR')) {
                return { ...el, dbRecordId: firstCompanyId };
            }
            if (el.type === 'fieldGroup' && el.title?.includes('TOMADOR')) {
                return { ...el, dbRecordId: agenda.clienteId };
            }
            if (el.type === 'grid' && el.dbTable === 'agendas') {
                return { ...el, selectedRecordIds: [agendaId] };
            }
            return el;
        }) as KanvasElement[];

        setActiveDoc(doc);
        setActiveDocId(null);
        setSelectedId(null);
        setAgendaModalOpen(false);
        toast.success('Template de Nota Fiscal criado e preenchido com sucesso!');
    };

    const handleSave = async () => {
        if (activeDocId) {
            await updateDocMutation.mutateAsync({ id: activeDocId, nome: activeDoc.name, content: activeDoc });
            toast.success('Documento atualizado com sucesso!');
        } else {
            const res = await createDoc.mutateAsync({ nome: activeDoc.name, content: activeDoc });
            setActiveDocId(res.id);
            toast.success('Documento salvo com sucesso!');
        }
    };

    const handleDeleteDoc = (id: string) => {
        setDeleteDocId(id);
    };

    const confirmDeleteDoc = async () => {
        if (!deleteDocId) return;
        await deleteDoc.mutateAsync({ id: deleteDocId });
        if (activeDocId === deleteDocId) {
            setActiveDoc(emptyDocument('Novo Documento'));
            setActiveDocId(null);
        }
        setDeleteDocId(null);
        toast.success('Documento excluído com sucesso!');
    };

    const confirmEmitirNf = async () => {
        if (!confirmEmitId) return;
        const toastId = toast.loading('Processando emissão da Nota Fiscal...');
        try {
            const res = await emitirNf.mutateAsync({ id: confirmEmitId });
            toast.update(toastId, { render: res.message, type: 'success', isLoading: false, autoClose: 4000 });
        } catch (e: any) {
            toast.update(toastId, { render: e.message || 'Erro ao emitir NF', type: 'error', isLoading: false, autoClose: 4000 });
        }
        setConfirmEmitId(null);
    };

    const updateDoc = useCallback((patch: Partial<KanvasDoc>) => {
        setActiveDoc((prev) => ({ ...prev, ...patch }));
    }, []);

    const updateElement = useCallback((id: string, patch: Partial<KanvasElement>) => {
        setActiveDoc((prev) => ({
            ...prev,
            elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } as KanvasElement : el))
        }));
    }, []);

    const deleteElement = useCallback((id: string) => {
        setActiveDoc((prev) => ({
            ...prev,
            elements: prev.elements.filter((el) => el.id !== id)
        }));
        setSelectedId(null);
    }, []);

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
        setActiveDoc((prev) => ({ ...prev, elements: [...prev.elements, el] }));
        setSelectedId(el.id);
    }, [activeDoc.elements.length]);

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
            <div className="kanvas-toolbar" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                flexWrap: 'wrap',
            }}>
                <strong style={{ marginRight: 8 }}>🖼️ Canvas</strong>

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
                        if (v === 'blank') doc = emptyDocument('Novo Documento');
                        if (v === 'nf') {
                            setAgendaModalOpen(true);
                            e.target.value = '';
                            return;
                        }
                        if (v === 'recibo') doc = templateRecibo();
                        if (v === 'os') doc = templateOrdemServico();
                        if (doc) {
                            setActiveDoc(doc);
                            setActiveDocId(null);
                            setSelectedId(null);
                        }
                        e.target.value = '';
                    }}
                    value=""
                    style={selectStyle}
                >
                    <option value="" disabled>Novo documento...</option>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                        value={activeDoc.name}
                        onChange={(e) => updateDoc({ name: e.target.value })}
                        style={{ ...inputStyle, width: 150 }}
                        placeholder="Nome do documento"
                    />
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '6px 16px',
                            borderRadius: 6,
                            border: 'none',
                            background: 'var(--accent)',
                            color: 'var(--accent-text)',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 'bold',
                        }}
                    >
                        💾 Salvar
                    </button>
                </div>

                <Divider />

                {activeDoc.type === 'nf' && (
                    <ToolbarButton onClick={() => {
                        if (activeDocId) setConfirmEmitId(activeDocId);
                        else toast.warn('Salve o documento antes de emitir a NF!');
                    }}>📄 Emitir NF</ToolbarButton>
                )}
                <ToolbarButton onClick={handlePrint}>🖨️ Gerar PDF</ToolbarButton>
            </div>

            {/* Canvas + properties */}
            <div className="kanvas-layout">
                {/* Left Sidebar - Documents List */}
                <aside className="kanvas-sidebar" style={{ borderLeft: 'none', borderRight: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 14 }}>Meus documentos</h3>
                    </div>
                    <hr style={{ marginBottom: 12, borderColor: 'var(--border)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {documentosList?.map((doc: any) => (
                            <div
                                key={doc.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 10px',
                                    background: activeDocId === doc.id ? 'var(--accent-light)' : 'var(--bg-primary)',
                                    border: `1px solid ${activeDocId === doc.id ? 'var(--accent)' : 'var(--border)'}`,
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                }}
                                onClick={() => loadDocument(doc.id)}
                            >
                                <span style={{ fontSize: 12, fontWeight: activeDocId === doc.id ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {doc.nome}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--danger)',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                    }}
                                    title="Excluir"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        {(!documentosList || documentosList.length === 0) && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
                                Nenhum documento salvo.
                            </div>
                        )}
                    </div>
                </aside>

                <div
                    className="kanvas-canvas-area"
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

                <aside className={`kanvas-sidebar ${isMobilePropsOpen ? 'open' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 14 }}>Propriedades</h3>
                        <button
                            className="desktop-hide"
                            onClick={() => setIsMobilePropsOpen(false)}
                            style={{
                                background: 'var(--danger-light)',
                                color: 'var(--danger)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                                cursor: 'pointer'
                            }}
                        >
                            ×
                        </button>
                    </div>
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

            <button
                className="mobile-fab"
                onClick={() => setIsMobilePropsOpen(!isMobilePropsOpen)}
                title={isMobilePropsOpen ? "Fechar Propriedades" : "Propriedades"}
            >
                {isMobilePropsOpen ? '↓' : '⚙️'}
            </button>
            <ConfirmationModal
                isOpen={!!deleteDocId}
                title="Excluir Documento"
                message="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
                onConfirm={confirmDeleteDoc}
                onCancel={() => setDeleteDocId(null)}
                confirmText="Excluir"
            />
            <ConfirmationModal
                isOpen={!!confirmEmitId}
                title="Emitir Nota Fiscal"
                message="Atenção: A emissão da Nota Fiscal não pode ser desfeita e terá validade fiscal. Deseja prosseguir com a emissão?"
                onConfirm={confirmEmitirNf}
                onCancel={() => setConfirmEmitId(null)}
                confirmText="Emitir NF"
                isDanger={false}
            />
            {/* Modal de Seleção de Agendamento */}
            <Modal
                title="Faturar Agendamento (Nota Fiscal)"
                open={agendaModalOpen}
                onClose={() => setAgendaModalOpen(false)}
                size="md"
                content={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                            Selecione abaixo o agendamento de origem. O sistema irá carregar os itens, calcular datas, frete e desconto, e auto-preencher os dados do cliente na Nota Fiscal.
                        </p>
                        <div style={{
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            paddingRight: 4,
                            maxHeight: '40vh'
                        }}>
                            {(dbData.agendas || []).map((agenda: any) => {
                                const clientName = agenda.clientes?.nome || 'Cliente Sem Nome';
                                const dateStr = agenda.data ? new Date(agenda.data).toLocaleDateString('pt-BR') : '';
                                const endStr = agenda.dataColeta ? new Date(agenda.dataColeta).toLocaleDateString('pt-BR') : '';
                                const qtyItems = agenda.itens?.length || 0;
                                const fmtTotal = agenda.valorTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

                                return (
                                    <div
                                        key={agenda.id}
                                        onClick={() => handleSelectAgendaForNf(agenda.id)}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 10,
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-primary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.2s',
                                        }}
                                        className="agenda-item-hover"
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{clientName}</strong>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                📅 Período: {dateStr} até {endStr} | 📦 {qtyItems} item(ns)
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <strong style={{ fontSize: 14, color: 'var(--accent)' }}>{fmtTotal}</strong>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!dbData.agendas || dbData.agendas.length === 0) && (
                                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                                    Nenhum agendamento encontrado no banco de dados.
                                </div>
                            )}
                        </div>
                    </div>
                }
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setAgendaModalOpen(false)}
                            style={{ padding: '8px 16px', borderRadius: 6 }}
                        >
                            Cancelar
                        </button>
                    </div>
                }
            />
            <style>{`
                .agenda-item-hover:hover {
                    border-color: var(--accent) !important;
                    background-color: var(--accent-light) !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.1);
                }
            `}</style>
        </div>
    );
}

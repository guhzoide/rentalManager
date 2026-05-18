interface SelectedItemState {
    itemId: string;
    quantidade: number;
}

interface SelectItem {
    id: string;
    nome: string;
    disponivel?: number;
    valorDiaria?: number;
}

interface SelectEndereco {
    id: string;
    rua: string;
    numero: string;
    cep: string;
    clienteId: string;
}

interface AgendaFormProps {
    selectedItens: SelectedItemState[];
    setSelectedItens: (val: SelectedItemState[]) => void;
    clienteId: string;
    setClienteId: (val: string) => void;
    enderecoId: string;
    setEnderecoId: (val: string) => void;
    observacao: string;
    setObservacao: (val: string) => void;
    data: string;
    setData: (val: string) => void;
    dataColeta: string;
    setDataColeta: (val: string) => void;
    desconto: number;
    setDesconto: (val: number) => void;
    valorTotalCalculado: number;
    itens: SelectItem[];
    clientes: SelectItem[];
    filteredEnderecos: SelectEndereco[];
}

export function AgendaForm({
    selectedItens,
    setSelectedItens,
    clienteId,
    setClienteId,
    enderecoId,
    setEnderecoId,
    observacao,
    setObservacao,
    data,
    setData,
    dataColeta,
    setDataColeta,
    desconto,
    setDesconto,
    valorTotalCalculado,
    itens,
    clientes,
    filteredEnderecos,
}: AgendaFormProps) {
    const handleAddItem = () => {
        setSelectedItens([...selectedItens, { itemId: '', quantidade: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItens(selectedItens.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index: number, field: keyof SelectedItemState, value: any) => {
        const updated = selectedItens.map((selected, idx) => {
            if (idx === index) {
                return { ...selected, [field]: value };
            }
            return selected;
        });
        setSelectedItens(updated);
    };

    return (
        <div className="form-grid single" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* Itens Locados - Span 2 Columns */}
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: '600' }}>Itens Locados *</label>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleAddItem}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        ＋ Adicionar Item
                    </button>
                </div>

                {selectedItens.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '24px', 
                        color: 'var(--text-muted)', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '8px', 
                        border: '1px dashed var(--border)',
                        fontSize: '14px'
                    }}>
                        Nenhum item selecionado. Adicione pelo menos um item para locação.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedItens.map((selected, idx) => {
                            return (
                                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
                                    <div style={{ flex: 1 }}>
                                        <select
                                            className="form-control"
                                            value={selected.itemId}
                                            onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">Selecione um item...</option>
                                            {itens.map((i) => {
                                                const isCurrent = i.id === selected.itemId;
                                                
                                                // Calcular quantidade consumida nas outras linhas do mesmo agendamento
                                                const consumedElsewhere = selectedItens
                                                    .filter((_, sIdx) => sIdx !== idx)
                                                    .reduce((acc, curr) => curr.itemId === i.id ? acc + curr.quantidade : acc, 0);

                                                const currentAvailable = (i.disponivel !== undefined ? i.disponivel : 0) - consumedElsewhere;
                                                const isUnavailable = currentAvailable <= 0 && !isCurrent;

                                                const formattedPrice = i.valorDiaria !== undefined 
                                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valorDiaria)
                                                    : '';

                                                return (
                                                    <option
                                                        key={i.id}
                                                        value={i.id}
                                                        disabled={isUnavailable}
                                                        style={{
                                                            color: isUnavailable ? 'var(--text-muted)' : 'inherit',
                                                        }}
                                                    >
                                                        {i.nome} {formattedPrice ? `(${formattedPrice}/dia)` : ''} {isUnavailable ? '— Esgotado' : `— ${currentAvailable} disponível`}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div style={{ width: '120px' }}>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min={1}
                                            value={selected.quantidade}
                                            onChange={(e) => handleItemChange(idx, 'quantidade', parseInt(e.target.value) || 1)}
                                            placeholder="Qtd"
                                            style={{ textAlign: 'center' }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => handleRemoveItem(idx)}
                                        style={{ 
                                            padding: '8px 12px', 
                                            color: 'var(--danger)', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            border: '1px solid transparent',
                                            borderRadius: '6px'
                                        }}
                                        title="Remover Item"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cliente */}
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Cliente *</label>
                <select
                    className="form-control"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                </select>
            </div>

            {/* Endereço */}
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Endereço do Cliente *</label>
                <select
                    className="form-control"
                    value={enderecoId}
                    onChange={(e) => setEnderecoId(e.target.value)}
                    disabled={!clienteId}
                >
                    <option value="">
                        {!clienteId
                            ? 'Selecione um cliente primeiro...'
                            : filteredEnderecos.length === 0
                                ? 'Nenhum endereço cadastrado'
                                : 'Selecione o endereço...'}
                    </option>
                    {filteredEnderecos.map((e) => (
                        <option key={e.id} value={e.id}>
                            {e.rua}, {e.numero} — CEP {e.cep}
                        </option>
                    ))}
                </select>
            </div>

            {/* Data e Hora de Entrega */}
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Data e Hora da Entrega *</label>
                <input
                    type="datetime-local"
                    className="form-control"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                />
            </div>

            {/* Data e Hora de Coleta */}
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Data e Hora da Coleta *</label>
                <input
                    type="datetime-local"
                    className="form-control"
                    value={dataColeta}
                    onChange={(e) => setDataColeta(e.target.value)}
                />
            </div>

            {/* Desconto (%) */}
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Desconto (%)</label>
                <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={100}
                    value={desconto}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setDesconto(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                    }}
                    placeholder="Ex: 10"
                />
            </div>

            {/* Valor Total Calculado (R$) */}
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
                <label className="form-label">Valor Total Calculado</label>
                <input
                    type="text"
                    className="form-control"
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalCalculado)}
                    disabled
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--primary)',
                        fontWeight: '700',
                        cursor: 'not-allowed',
                    }}
                />
            </div>

            {/* Observações - Span 2 Columns */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Observação</label>
                <textarea
                    className="form-control"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observações adicionais..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                />
            </div>
        </div>
    );
}

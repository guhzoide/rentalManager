import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

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
    errors?: Partial<Record<string, string>>;
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
    errors = {},
}: AgendaFormProps) {
    const handleAddItem = () => {
        setSelectedItens([...selectedItens, { itemId: '', quantidade: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItens(selectedItens.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index: number, field: keyof SelectedItemState, value: any) => {
        setSelectedItens(
            selectedItens.map((s, idx) => (idx === index ? { ...s, [field]: value } : s))
        );
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const selectedCliente = clientes.find((c) => c.id === clienteId) ?? null;
    const selectedEndereco = filteredEnderecos.find((e) => e.id === enderecoId) ?? null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* ── Itens Locados ── */}
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '8px',
                    marginBottom: '4px',
                }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: errors.itens ? 'var(--danger)' : 'var(--text-primary)' }}>
                        Itens Locados *
                        {errors.itens && (
                            <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '12px' }}>{errors.itens}</span>
                        )}
                    </span>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleAddItem}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <AddIcon style={{ fontSize: 16 }} /> Adicionar Item
                    </button>
                </div>

                {selectedItens.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '24px',
                        color: errors.itens ? 'var(--danger)' : 'var(--text-muted)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        border: `1px dashed ${errors.itens ? 'var(--danger)' : 'var(--border)'}`,
                        fontSize: '14px',
                    }}>
                        Nenhum item selecionado. Adicione pelo menos um item para locação.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedItens.map((selected, idx) => {
                            // Calcula disponibilidade de cada item descontando outras linhas
                            const itemOptions = itens.map((i) => {
                                const isCurrent = i.id === selected.itemId;
                                const consumedElsewhere = selectedItens
                                    .filter((_, sIdx) => sIdx !== idx)
                                    .reduce((acc, curr) => (curr.itemId === i.id ? acc + curr.quantidade : acc), 0);
                                const currentAvailable = (i.disponivel ?? 0) - consumedElsewhere;
                                return { ...i, currentAvailable, isUnavailable: currentAvailable <= 0 && !isCurrent };
                            });

                            const selectedItemObj = itemOptions.find((i) => i.id === selected.itemId) ?? null;

                            return (
                                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', width: '100%' }}>
                                    {/* Autocomplete Item */}
                                    <div style={{ flex: 1 }}>
                                        <Autocomplete
                                            options={itemOptions}
                                            getOptionLabel={(opt) => {
                                                const price = opt.valorDiaria !== undefined
                                                    ? ` (${formatCurrency(opt.valorDiaria)}/dia)`
                                                    : '';
                                                const avail = opt.isUnavailable
                                                    ? ' — Esgotado'
                                                    : ` — ${opt.currentAvailable} disponível`;
                                                return `${opt.nome}${price}${avail}`;
                                            }}
                                            getOptionDisabled={(opt) => opt.isUnavailable}
                                            value={selectedItemObj}
                                            onChange={(_, newVal) =>
                                                handleItemChange(idx, 'itemId', newVal?.id ?? '')
                                            }
                                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                                            size="small"
                                            fullWidth
                                            noOptionsText="Nenhum item encontrado"
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Item *"
                                                    variant="outlined"
                                                    error={!!errors[`item_${idx}`]}
                                                    helperText={errors[`item_${idx}`]}
                                                />
                                            )}
                                        />
                                    </div>

                                    {/* Quantidade */}
                                    <div style={{ width: '120px' }}>
                                        <TextField
                                            label="Qtd"
                                            type="number"
                                            variant="outlined"
                                            fullWidth
                                            size="small"
                                            value={selected.quantidade}
                                            onChange={(e) =>
                                                handleItemChange(idx, 'quantidade', parseInt(e.target.value) || 1)
                                            }
                                            slotProps={{ htmlInput: { min: 1, style: { textAlign: 'center' } } }}
                                        />
                                    </div>

                                    {/* Remover */}
                                    <IconButton
                                        onClick={() => handleRemoveItem(idx)}
                                        title="Remover item"
                                        sx={{ color: 'var(--danger)', mt: '2px' }}
                                        size="small"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Cliente ── */}
            <div>
                <Autocomplete
                    options={clientes}
                    getOptionLabel={(opt) => opt.nome}
                    value={selectedCliente}
                    onChange={(_, newVal) => {
                        setClienteId(newVal?.id ?? '');
                        setEnderecoId(''); // limpa endereço ao trocar cliente
                    }}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    fullWidth
                    noOptionsText="Nenhum cliente encontrado"
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Cliente *"
                            variant="outlined"
                            error={!!errors.clienteId}
                            helperText={errors.clienteId}
                        />
                    )}
                />
            </div>

            {/* ── Endereço ── */}
            <div>
                <Autocomplete
                    options={filteredEnderecos}
                    getOptionLabel={(opt) => `${opt.rua}, ${opt.numero} — CEP ${opt.cep}`}
                    value={selectedEndereco}
                    onChange={(_, newVal) => setEnderecoId(newVal?.id ?? '')}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    disabled={!clienteId}
                    fullWidth
                    noOptionsText={
                        !clienteId
                            ? 'Selecione um cliente primeiro'
                            : 'Nenhum endereço cadastrado'
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Endereço do Cliente *"
                            variant="outlined"
                            error={!!errors.enderecoId}
                            helperText={errors.enderecoId}
                        />
                    )}
                />
            </div>

            {/* ── Data de Entrega ── */}
            <div>
                <TextField
                    label="Data e Hora da Entrega *"
                    type="datetime-local"
                    variant="outlined"
                    fullWidth
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    error={!!errors.data}
                    helperText={errors.data}
                    slotProps={{ inputLabel: { shrink: true } }}
                />
            </div>

            {/* ── Data de Coleta ── */}
            <div>
                <TextField
                    label="Data e Hora da Coleta *"
                    type="datetime-local"
                    variant="outlined"
                    fullWidth
                    value={dataColeta}
                    onChange={(e) => setDataColeta(e.target.value)}
                    error={!!errors.dataColeta}
                    helperText={errors.dataColeta}
                    slotProps={{ inputLabel: { shrink: true } }}
                />
            </div>

            {/* ── Desconto ── */}
            <div>
                <TextField
                    label="Desconto"
                    type="number"
                    variant="outlined"
                    fullWidth
                    value={desconto}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setDesconto(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                    }}
                    slotProps={{
                        input: {
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        },
                        htmlInput: { min: 0, max: 100, step: 0.5 },
                    }}
                />
            </div>

            {/* ── Valor Total Calculado ── */}
            <div>
                <TextField
                    label="Valor Total Calculado"
                    variant="outlined"
                    fullWidth
                    value={formatCurrency(valorTotalCalculado)}
                    disabled
                    slotProps={{
                        input: {
                            readOnly: true,
                            sx: { color: 'var(--primary)', fontWeight: 700 },
                        },
                    }}
                />
            </div>

            {/* ── Observações ── */}
            <div style={{ gridColumn: 'span 2' }}>
                <TextField
                    label="Observação"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observações adicionais..."
                />
            </div>
        </div>
    );
}

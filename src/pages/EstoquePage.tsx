import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-toastify';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

interface EstoqueItem {
    id: number;
    nome: string;
    peso: number;
    largura: number;
    altura: number;
    valorDiaria: number;
    quantidade: number;
    ativo: boolean;
}

const EMPTY: Omit<EstoqueItem, 'id'> = {
    nome: '', peso: 0, largura: 0, altura: 0, valorDiaria: 0, quantidade: 0, ativo: true,
};

const columns: Column<EstoqueItem>[] = [
    { key: 'nome', label: 'Nome do Item' },
    {
        key: 'peso',
        label: 'Peso (kg)',
        width: '100px',
        render: (v) => `${v} kg`,
    },
    {
        key: 'quantidade',
        label: 'Qtd Estoque',
        width: '100px',
        render: (v) => <strong style={{ color: Number(v) > 0 ? 'var(--success)' : 'var(--danger)' }}>{v}</strong>,
    },
    {
        key: 'valorDiaria',
        label: 'Valor/Diária',
        width: '120px',
        render: (v) =>
            `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    },
    {
        key: 'ativo',
        label: 'Status',
        width: '100px',
        render: (v) => (
            <span className={`badge ${v ? 'badge-success' : 'badge-danger'}`} style={!v ? { background: 'var(--danger-light)', color: 'var(--danger)' } : {}}>
                {v ? 'Ativo' : 'Inativo'}
            </span>
        ),
    },
];

export function EstoquePage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<EstoqueItem> | null>(null);
    const [form, setForm] = useState<Omit<EstoqueItem, 'id'>>(EMPTY);

    const utils = trpc.useUtils();

    const { data: estoqueData, isLoading: isLoadingList } = trpc.estoque.list.useQuery({
        pagina: page,
        limit: 20
    });

    const createMutation = trpc.estoque.create.useMutation({
        onSuccess: () => {
            toast.success('Item salvo com sucesso!');
            utils.estoque.list.invalidate();
            setTimeout(() => { setModalOpen(false); }, 500);
        },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = trpc.estoque.update.useMutation({
        onSuccess: () => {
            toast.success('Item atualizado com sucesso!');
            utils.estoque.list.invalidate();
            setTimeout(() => { setModalOpen(false); }, 500);
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.estoque.delete.useMutation({
        onSuccess: () => {
            toast.success('Item removido!');
            utils.estoque.list.invalidate();
            setModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });


    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY);
        setModalOpen(true);
    };

    const openEdit = (row: EstoqueItem) => {
        setEditing(row);
        const { id: _id, ...rest } = row;
        setForm(rest);
        setModalOpen(true);
    };

    const handleSave = () => {
        if (editing?.id) {
            updateMutation.mutate({
                id: editing.id,
                data: form
            });
        } else {
            createMutation.mutate(form);
        }
    };

    const numField = (key: keyof Omit<EstoqueItem, 'id' | 'nome' | 'ativo'>, label: string, suffix: string, step = "0.01") => (
        <TextField
            label={label}
            type="number"
            variant="outlined"
            fullWidth
            slotProps={{
                input: {
                    endAdornment: <InputAdornment position="end">{suffix}</InputAdornment>,
                },
                htmlInput: {
                    step: step,
                    min: 0,
                }
            }}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: (step === "1" ? parseInt(e.target.value) : parseFloat(e.target.value)) || 0 })}
        />
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DataGrid
                columns={columns}
                data={estoqueData?.data || []}
                loading={isLoadingList}
                onRowClick={openEdit}
                onAdd={openAdd}
                total={estoqueData?.total || 0}
                page={page}
                onPageChange={(p) => setPage(p)}
                pageSize={20}
                emptyText="Nenhum item no estoque."
                onRefresh={() => utils.estoque.list.invalidate()}
            />

            <Modal
                title={editing ? 'Editar Item' : 'Novo Item'}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                footer={
                    <>
                        {editing?.id && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    if (confirm('Remover este item?')) {
                                        deleteMutation.mutate({ id: editing.id as number });
                                    }
                                }}
                            >
                                🗑 Remover
                            </button>
                        )}

                        <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : '💾 Salvar'}
                        </button>

                    </>
                }
            >

                <div className="form-grid">
                    <div className="form-group full">
                        <TextField
                            label="Nome do item"
                            variant="outlined"
                            fullWidth
                            value={form.nome}
                            onChange={(e: any) => setForm({ ...form, nome: e.target.value })}
                        />
                    </div>

                    <div className="form-group full">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.ativo}
                                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                                />
                            }
                            label="Ativo"
                        />
                    </div>

                    {numField('peso', 'Peso (kg)', 'kg')}
                    {numField('largura', 'Largura (m)', 'm')}
                    {numField('altura', 'Altura (m)', 'm')}
                    {numField('quantidade', 'Quantidade em estoque *', 'un', '1')}
                    <div className="form-group full">
                        <TextField
                            label="Valor da diária"
                            type="number"
                            variant="outlined"
                            fullWidth
                            slotProps={{
                                input: {
                                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                },
                                htmlInput: {
                                    step: "0.01",
                                    min: 0,
                                }
                            }}
                            value={form.valorDiaria}
                            onChange={(e) => setForm({ ...form, valorDiaria: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}

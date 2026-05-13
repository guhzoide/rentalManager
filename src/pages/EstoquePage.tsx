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
    disponivel: number;
    ativo: boolean;
}

const EMPTY: Omit<EstoqueItem, 'id'> = {
    nome: '', peso: 0, largura: 0, altura: 0, valorDiaria: 0, quantidade: 0, disponivel: 0, ativo: true,
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
        key: 'disponivel',
        label: 'Qtd Disponível',
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
    }
];

export function EstoquePage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<EstoqueItem> | null>(null);
    const [form, setForm] = useState<Omit<EstoqueItem, 'id'>>(EMPTY);
    const [rows, setRows] = useState<EstoqueItem[]>([]);
    const [total, setTotal] = useState(0);

    const readMutation = trpc.service.read.useMutation({
        onSuccess: (res: any) => { setRows(res.data); setTotal(res.total); },
    });

    const saveMutation = trpc.service.create.useMutation({
        onSuccess: () => {
            toast.success('Item salvo com sucesso!');
            fetchItems();
            setTimeout(() => { setModalOpen(false); }, 1200);
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.service.delete.useMutation({
        onSuccess: () => fetchItems(),
    });

    const fetchItems = (p = page) => {
        readMutation.mutate(
            {
                table: 'estoques',
                pagina: p,
                limit: 20
            },
            {
                onError: (err) => toast.error(err.message)
            }
        );
    };

    useEffect(() => { fetchItems(1); }, []);

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
        const payload = {
            id: editing?.id ? editing.id : undefined,
            ...form
        };

        saveMutation.mutate({
            table: 'estoques',
            Itens: payload,
        });
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
                data={rows}
                loading={readMutation.isPending}
                onRowClick={openEdit}
                onAdd={openAdd}
                total={total}
                page={page}
                onPageChange={(p) => { setPage(p); fetchItems(p); }}
                pageSize={20}
                emptyText="Nenhum item no estoque."
                onRefresh={() => fetchItems(page)}
            />

            <Modal
                title={editing ? 'Editar Item' : 'Novo Item'}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                footer={
                    <>
                        {editing && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    if (confirm('Remover este item?')) {
                                        deleteMutation.mutate({ table: 'estoques', Filtros: { id: editing.id } });
                                        setModalOpen(false);
                                    }
                                }}
                            >
                                🗑 Remover
                            </button>
                        )}
                        <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? 'Salvando...' : '💾 Salvar'}
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
                    <div className="form-group">
                        <TextField
                            type="number"
                            label="Quantidade disponível"
                            fullWidth
                            value={form.disponivel}
                            onChange={(e) => setForm({ ...form, disponivel: parseInt(e.target.value) || 0 })}
                        />
                    </div>
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

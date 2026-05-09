import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import TextField from '@mui/material/TextField';
import { toast } from 'react-toastify';

interface Cliente {
    id: number;
    nome: string;
    cep: string;
    rua: string;
    numero: string;
    contato: string;
}

const EMPTY: Omit<Cliente, 'id'> = {
    nome: '', cep: '', rua: '', numero: '', contato: '',
};

const columns: Column<Cliente>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'contato', label: 'Contato', width: '160px' },
    { key: 'cep', label: 'CEP', width: '110px' },
    { key: 'rua', label: 'Rua' },
    { key: 'numero', label: 'Nº', width: '80px' },
];

export function ClientesPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Cliente> | null>(null);
    const [form, setForm] = useState<Omit<Cliente, 'id'>>(EMPTY);
    const [cepLoading, setCepLoading] = useState(false);
    const [rows, setRows] = useState<Cliente[]>([]);
    const [total, setTotal] = useState(0);

    const readMutation = trpc.service.read.useMutation({
        onSuccess: (res: any) => { setRows(res.data); setTotal(res.total); },
    });

    const saveMutation = trpc.service.create.useMutation({
        onSuccess: () => {
            toast.success('Cliente salvo com sucesso!');
            fetchClientes();
            setModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.service.delete.useMutation({
        onSuccess: () => fetchClientes(),
    });

    const fetchClientes = (p = page) => {
        readMutation.mutate({ table: 'clientes', pagina: p, limit: 20 });
    };

    useEffect(() => { fetchClientes(1); }, []);

    const fetchCep = async (cep: string) => {
        const clean = cep.replace(/\D/g, '');
        if (clean.length !== 8) return;
        setCepLoading(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setForm((f) => ({ ...f, rua: data.logradouro || f.rua }));
            }
        } catch { /* silencioso */ }
        setCepLoading(false);
    };

    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY);
        setModalOpen(true);
    };

    const openEdit = (row: Cliente) => {
        setEditing(row);
        const { id: _id, ...rest } = row;
        setForm(rest);
        setModalOpen(true);
    };

    const handleSave = () => {
        saveMutation.mutate({
            table: 'clientes',
            Itens: editing?.id ? {
                id: editing.id,
                updatedAt: new Date(),
                ...form
            } : { createdAt: new Date(), updatedAt: new Date(), ...form },
        });
    };

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
                onPageChange={(p) => { setPage(p); fetchClientes(p); }}
                pageSize={20}
                emptyText="Nenhum cliente cadastrado."
            />

            <Modal
                title={editing ? 'Editar cliente' : 'Novo cliente'}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                footer={
                    <>
                        {editing && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    if (confirm('Remover este cliente?')) {
                                        deleteMutation.mutate({ table: 'clientes', Filtros: { id: editing.id } });
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
                            label="Nome"
                            variant="outlined"
                            fullWidth
                            value={form.nome}
                            onChange={(e) => setForm({ ...form, nome: e.target.value })}
                            placeholder="Nome completo"
                        />
                    </div>

                    <div className="form-group">
                        <TextField
                            label="CEP"
                            variant="outlined"
                            fullWidth
                            value={form.cep}
                            onChange={(e) => {
                                setForm({ ...form, cep: e.target.value });
                                fetchCep(e.target.value);
                            }}
                            slotProps={{ htmlInput: { maxLength: 9 } }}
                            placeholder="00000-000"
                        />
                    </div>

                    <div className="form-group">
                        <TextField
                            label="Número"
                            variant="outlined"
                            fullWidth
                            value={form.numero}
                            onChange={(e) => setForm({ ...form, numero: e.target.value })}
                            placeholder="123"
                        />
                    </div>

                    <div className="form-group full">
                        <TextField
                            label="Rua"
                            variant="outlined"
                            fullWidth
                            value={form.rua}
                            onChange={(e) => setForm({ ...form, rua: e.target.value })}
                            placeholder="Nome da rua"
                            helperText={cepLoading ? "Buscando endereço..." : ""}
                        />
                    </div>

                    <div className="form-group full">
                        <TextField
                            label="Contato"
                            variant="outlined"
                            fullWidth
                            value={form.contato}
                            onChange={(e) => setForm({ ...form, contato: e.target.value })}
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}

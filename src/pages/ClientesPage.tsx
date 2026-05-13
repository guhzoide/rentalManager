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
    bairro: string;
    contato: string;
}

interface Endereco {
    id: number;
    clienteId: number;
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
}

const EMPTY: Omit<Cliente, 'id'> = {
    nome: '', cep: '', rua: '', numero: '', bairro: '', contato: '',
};

const columns: Column<Cliente>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'contato', label: 'Contato', width: '160px' },
    { key: 'cep', label: 'CEP', width: '110px' },
    { key: 'rua', label: 'Rua' },
    { key: 'bairro', label: 'Bairro' },
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

    const [enderecosRows, setEnderecosRows] = useState<Endereco[]>([]);
    const [enderecoForm, setEnderecoForm] = useState<Omit<Endereco, 'id' | 'clienteId'>>({ cep: '', rua: '', numero: '', bairro: '' });
    const [showEnderecoForm, setShowEnderecoForm] = useState(false);
    const [cepEnderecoLoading, setCepEnderecoLoading] = useState(false);

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

    const readEnderecosMutation = trpc.service.read.useMutation({
        onSuccess: (res: any) => setEnderecosRows(res.data),
    });

    const saveEnderecoMutation = trpc.service.create.useMutation({
        onSuccess: () => {
            toast.success('Endereço salvo com sucesso!', { theme: 'colored' });
            setEnderecoForm({ cep: '', rua: '', numero: '', bairro: '' });
            setShowEnderecoForm(false);
            if (editing?.id) {
                readEnderecosMutation.mutate({ table: 'enderecos', filtros: { clienteId: editing.id }, limit: 100 });
            }
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteEnderecoMutation = trpc.service.delete.useMutation({
        onSuccess: () => {
            if (editing?.id) {
                readEnderecosMutation.mutate({ table: 'enderecos', filtros: { clienteId: editing.id }, limit: 100 });
            }
        },
    });

    useEffect(() => {
        if (editing?.id) {
            readEnderecosMutation.mutate({ table: 'enderecos', filtros: { clienteId: editing.id }, limit: 100 });
        } else {
            setEnderecosRows([]);
        }
    }, [editing]);

    const fetchCepEndereco = async (cep: string) => {
        const clean = cep.replace(/\D/g, '');
        if (clean.length !== 8) return;
        setCepEnderecoLoading(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setEnderecoForm((f) => ({ ...f, rua: data.logradouro || f.rua, bairro: data.bairro || f.bairro }));
            }
        } catch { /* silencioso */ }
        setCepEnderecoLoading(false);
    };

    const handleAddEndereco = () => {
        if (!editing?.id) return;
        saveEnderecoMutation.mutate({
            table: 'enderecos',
            Itens: {
                clienteId: editing.id,
                ...enderecoForm,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    };

    const enderecoColumns: Column<Endereco>[] = [
        { key: 'cep', label: 'CEP', width: '100px' },
        { key: 'rua', label: 'Rua' },
        { key: 'bairro', label: 'Bairro' },
        { key: 'numero', label: 'Nº', width: '80px' },
        {
            key: 'id',
            label: '',
            width: '40px',
            render: (_, row) => (
                <button
                    className="btn btn-ghost btn-sm btn-icon"
                    style={{ color: 'var(--danger)' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Remover este endereço?')) {
                            deleteEnderecoMutation.mutate({ table: 'enderecos', Filtros: { id: row.id } });
                        }
                    }}
                >
                    ✕
                </button>
            ),
        },
    ];

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
                setForm((f) => ({ ...f, rua: data.logradouro || f.rua, bairro: data.bairro || f.bairro }));
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
                        <button className="btn btn-danger" onClick={() => setModalOpen(false)}>Cancelar</button>
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
                            label="Bairro"
                            variant="outlined"
                            fullWidth
                            value={form.bairro}
                            onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                            placeholder="Nome do bairro"
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

                {editing && (
                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginBottom: 16 }}>Endereços Adicionais</h4>
                        {showEnderecoForm && (
                            <div className="form-grid" style={{ alignItems: 'flex-start', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', background: 'var(--bg-subtle)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                <div className="form-group">
                                    <TextField
                                        label="CEP"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        value={enderecoForm.cep}
                                        onChange={(e) => {
                                            setEnderecoForm({ ...enderecoForm, cep: e.target.value });
                                            fetchCepEndereco(e.target.value);
                                        }}
                                        slotProps={{ htmlInput: { maxLength: 9 } }}
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <TextField
                                        label="Rua"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        value={enderecoForm.rua}
                                        onChange={(e) => setEnderecoForm({ ...enderecoForm, rua: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <TextField
                                        label="Nº"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        value={enderecoForm.numero}
                                        onChange={(e) => setEnderecoForm({ ...enderecoForm, numero: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <TextField
                                        label="Bairro"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        value={enderecoForm.bairro}
                                        onChange={(e) => setEnderecoForm({ ...enderecoForm, bairro: e.target.value })}
                                        helperText={cepEnderecoLoading ? "Buscando..." : ""}
                                    />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 4, gap: 8 }}>
                                    <button className="btn btn-ghost" style={{ height: 40 }} onClick={() => setShowEnderecoForm(false)}>
                                        Cancelar
                                    </button>
                                    <button className="btn btn-primary" style={{ height: 40, width: '100%' }} onClick={handleAddEndereco} disabled={saveEnderecoMutation.isPending || !enderecoForm.rua}>
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <DataGrid
                                columns={enderecoColumns}
                                data={enderecosRows}
                                loading={readEnderecosMutation.isPending}
                                emptyText="Nenhum endereço adicional cadastrado."
                                onAdd={() => setShowEnderecoForm(true)}
                            />
                        </div>
                    </div>
                )}
                {!editing && (
                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 14 }}>
                        Salve este cliente para poder adicionar múltiplos endereços.
                    </div>
                )}
            </Modal>
        </div>
    );
}

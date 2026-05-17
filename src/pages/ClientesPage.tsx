import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import TextField from '@mui/material/TextField';
import { toast } from 'react-toastify';
import Switch from '@mui/material/Switch';

interface Cliente {
    id: number;
    nome: string;
    cpf?: string | null;
    contato: string;
}

interface Endereco {
    id: number;
    clienteId: number;
    cep: string;
    rua: string;
    numero: string;
    bairro?: string | null;
    complemento?: string | null;
    principal: boolean;
}

const EMPTY: Omit<Cliente, 'id'> = {
    nome: '', cpf: '', contato: '',
};

const columns: Column<Cliente>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'cpf', label: 'CPF', width: '130px' },
    { key: 'contato', label: 'Contato', width: '150px' },
];

const addressColumns: Column<Endereco>[] = [
    { key: 'cep', label: 'CEP', width: '100px' },
    { key: 'bairro', label: 'Bairro' },
    { key: 'rua', label: 'Rua' },
    { key: 'bairro', label: 'Bairro' },
    { key: 'numero', label: 'Nº', width: '80px' },
    { key: 'complemento', label: 'Complemento', width: '130px' },
];

export function ClientesPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Cliente> | null>(null);
    const [form, setForm] = useState<Omit<Cliente, 'id'>>(EMPTY);
    const [cepLoading, setCepLoading] = useState(false);

    // Endereços Adicionais States
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Partial<Endereco> | null>(null);
    const [addressForm, setAddressForm] = useState({ cep: '', rua: '', numero: '', bairro: '', complemento: '', principal: false });
    const [addrCepLoading, setAddrCepLoading] = useState(false);

    const utils = trpc.useUtils();

    // Query de clientes
    const { data: clientesData, isLoading: isLoadingList } = trpc.clientes.list.useQuery({
        limit: 20
    });

    // Query de endereços do cliente sendo editado
    const { data: addressesData, isLoading: isLoadingAddresses } = trpc.enderecos.byClienteId.useQuery(
        { clienteId: editing?.id as number },
        { enabled: !!editing?.id }
    );

    // Filtra os endereços para exibir apenas os adicionais (excluindo o Principal que está no form principal)
    const additionalAddresses = (addressesData || []).filter(addr => addr.complemento !== 'Principal');

    // Mutations Clientes
    const createMutation = trpc.clientes.create.useMutation({
        onSuccess: () => {
            toast.success('Cliente cadastrado com sucesso!');
            utils.clientes.list.invalidate();
            setModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = trpc.clientes.update.useMutation({
        onSuccess: () => {
            toast.success('Cliente atualizado com sucesso!');
            utils.clientes.list.invalidate();
            setModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.clientes.delete.useMutation({
        onSuccess: () => {
            toast.success('Cliente removido!');
            utils.clientes.list.invalidate();
            setModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    // Mutations Endereços Adicionais
    const createAddressMutation = trpc.enderecos.create.useMutation({
        onSuccess: () => {
            toast.success('Endereço adicionado com sucesso!');
            utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as number });
            setAddressModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const updateAddressMutation = trpc.enderecos.update.useMutation({
        onSuccess: () => {
            toast.success('Endereço atualizado com sucesso!');
            utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as number });
            setAddressModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteAddressMutation = trpc.enderecos.delete.useMutation({
        onSuccess: () => {
            toast.success('Endereço removido com sucesso!');
            utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as number });
            setAddressModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const fetchAddrCep = async (cep: string) => {
        const clean = cep.replace(/\D/g, '');
        if (clean.length !== 8) return;
        setAddrCepLoading(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setAddressForm((f) => ({ ...f, rua: data.logradouro || f.rua, bairro: data.bairro || f.bairro }));
            }
        } catch { /* silencioso */ }
        setAddrCepLoading(false);
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
        if (editing?.id) {
            updateMutation.mutate({
                id: editing.id,
                data: form
            });
        } else {
            createMutation.mutate(form);
        }
    };

    // Gerenciamento de Endereços Adicionais
    const openAddAddress = () => {
        setEditingAddress(null);
        setAddressForm({ cep: '', rua: '', numero: '', bairro: '', complemento: '', principal: false });
        setAddressModalOpen(true);
    };

    const openEditAddress = (row: Endereco) => {
        setEditingAddress(row);
        setAddressForm({
            cep: row.cep,
            rua: row.rua,
            numero: row.numero,
            bairro: row.bairro || '',
            complemento: row.complemento || '',
            principal: row.principal
        });
        setAddressModalOpen(true);
    };

    const handleSaveAddress = () => {
        if (!editing?.id) return;

        if (editingAddress?.id) {
            updateAddressMutation.mutate({
                id: editingAddress.id,
                data: {
                    ...addressForm,
                    clienteId: editing.id,
                }
            });
        } else {
            createAddressMutation.mutate({
                ...addressForm,
                clienteId: editing.id,
            });
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DataGrid
                columns={columns}
                data={clientesData?.data || []}
                loading={isLoadingList}
                onRowClick={openEdit}
                onAdd={openAdd}
                total={clientesData?.total || 0}
                page={page}
                onPageChange={(p) => setPage(p)}
                pageSize={20}
                emptyText="Nenhum cliente cadastrado."
            />

            <Modal
                title={editing ? 'Editar cliente' : 'Novo cliente'}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                size={editing?.id ? 'lg' : 'md'}
                footer={
                    <>
                        {editing?.id && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    if (confirm('Remover este cliente?')) {
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

                <div style={{ display: 'flex', gap: '24px', flexDirection: editing?.id ? 'row' : 'column' }}>
                    <div style={{ flex: 1 }}>
                        <div className="form-grid">
                            <div className="form-group">
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
                                    label="CPF"
                                    variant="outlined"
                                    fullWidth
                                    value={form.cpf || ''}
                                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
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
                    </div>

                    {editing?.id && (
                        <div style={{
                            flex: 1.2,
                            borderLeft: '1px solid var(--border)',
                            paddingLeft: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0,
                        }}>
                            <h3 style={{
                                margin: '0 0 12px 0',
                                fontSize: '14.5px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                🏠 Endereços Adicionais
                            </h3>
                            <div style={{ flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                                <DataGrid
                                    columns={addressColumns}
                                    data={additionalAddresses}
                                    loading={isLoadingAddresses}
                                    onRowClick={openEditAddress}
                                    onAdd={openAddAddress}
                                    emptyText="Nenhum endereço adicional cadastrado."
                                    keyField="id"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Sub-modal para Adicionar/Editar Endereço Adicional */}
            <Modal
                title={editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
                open={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                size="sm"
                footer={
                    <>
                        {editingAddress?.id && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    if (confirm('Remover este endereço?')) {
                                        deleteAddressMutation.mutate({ id: editingAddress.id as number });
                                    }
                                }}
                            >
                                🗑 Remover
                            </button>
                        )}
                        <button className="btn btn-ghost" onClick={() => setAddressModalOpen(false)}>Cancelar</button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveAddress}
                            disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                        >
                            {createAddressMutation.isPending || updateAddressMutation.isPending ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </>
                }
            >
                <div className="form-grid single">
                    <div className="form-group">
                        <TextField
                            label="CEP"
                            variant="outlined"
                            fullWidth
                            value={addressForm.cep}
                            onChange={(e) => {
                                setAddressForm({ ...addressForm, cep: e.target.value });
                                fetchAddrCep(e.target.value);
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
                            value={addressForm.numero}
                            onChange={(e) => setAddressForm({ ...addressForm, numero: e.target.value })}
                            placeholder="123"
                        />
                    </div>

                    <div className="form-group">
                        <TextField
                            label="Bairro"
                            variant="outlined"
                            fullWidth
                            value={addressForm.bairro}
                            onChange={(e) => setAddressForm({ ...addressForm, bairro: e.target.value })}
                            placeholder="Bairro"
                        />
                    </div>


                    <div className="form-group">
                        <TextField
                            label="Rua"
                            variant="outlined"
                            fullWidth
                            value={addressForm.rua}
                            onChange={(e) => setAddressForm({ ...addressForm, rua: e.target.value })}
                            placeholder="Nome da rua"
                            helperText={addrCepLoading ? "Buscando endereço..." : ""}
                        />
                    </div>

                    <div className="form-group">
                        <TextField
                            label="Complemento (Ex: Ap 12, Bloco B)"
                            variant="outlined"
                            fullWidth
                            value={addressForm.complemento}
                            onChange={(e) => setAddressForm({ ...addressForm, complemento: e.target.value })}
                            placeholder="Complemento"
                        />
                    </div>
                    <div className="form-group">
                        <span >Principal</span>
                        <Switch
                            checked={addressForm.principal}
                            onChange={(e) => setAddressForm({ ...addressForm, principal: e.target.checked })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}

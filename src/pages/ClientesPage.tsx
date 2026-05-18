import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-toastify';
import { ClientForm } from '@/components/forms/ClientForm';
import { AddressForm } from '@/components/forms/AddressForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface Cliente {
    id: string;
    nome: string;
    cpf?: string | null;
    contato: string;
}

interface Endereco {
    id: string;
    clienteId: string;
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

export function ClientesPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Cliente> | null>(null);
    const [form, setForm] = useState<Omit<Cliente, 'id'>>(EMPTY);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

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
        { clienteId: editing?.id as string },
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
            utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as string });
            setAddressModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const updateAddressMutation = trpc.enderecos.update.useMutation({
        onSuccess: () => {
            toast.success('Endereço atualizado com sucesso!');
            utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as string });
            setAddressModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteAddressMutation = trpc.enderecos.delete.useMutation({
        onSuccess: () => {
            toast.success('Endereço removido com sucesso!');
            utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as string });
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
                size="lg"
                footer={
                    <>
                        {editing?.id && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    triggerConfirm(
                                        'Remover Cliente',
                                        'Tem certeza que deseja remover este cliente? Todos os endereços e vínculos serão afetados.',
                                        () => deleteMutation.mutate({ id: editing.id as string })
                                    );
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

                <ClientForm
                    form={form}
                    onChange={setForm}
                    editingId={editing?.id}
                    additionalAddresses={additionalAddresses}
                    isLoadingAddresses={isLoadingAddresses}
                    onAddAddress={openAddAddress}
                    onEditAddress={openEditAddress}
                />
            </Modal>

            {/* Sub-modal para Adicionar/Editar Endereço Adicional */}
            <Modal
                title={editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
                open={addressModalOpen}
                onClose={() => setAddressModalOpen(false)}
                size="lg"
                footer={
                    <>
                        {editingAddress?.id && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    triggerConfirm(
                                        'Remover Endereço',
                                        'Tem certeza que deseja remover este endereço?',
                                        () => deleteAddressMutation.mutate({ id: editingAddress.id as string })
                                    );
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
                <AddressForm
                    form={addressForm}
                    onChange={setAddressForm}
                    onCepChange={fetchAddrCep}
                    cepLoading={addrCepLoading}
                />
            </Modal>
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}

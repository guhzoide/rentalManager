import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-toastify';
import { ClientForm } from '@/components/forms/ClientForm';
import { AddressForm } from '@/components/forms/AddressForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import type { ClienteInput } from '@/lib/schemas';


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

const columns: Column<Cliente>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'cpf', label: 'CPF', width: '130px' },
    { key: 'contato', label: 'Contato', width: '150px' },
];

export function ClientesPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Cliente> | null>(null);
    const [formKey, setFormKey] = useState(0);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({
            isOpen: true, title, message,
            onConfirm: () => { onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }
        });
    };

    // Endereços Adicionais States
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Partial<Endereco> | null>(null);
    const [addressFormKey, setAddressFormKey] = useState(0);
    const [addrCepLoading, setAddrCepLoading] = useState(false);

    const utils = trpc.useUtils();

    const { data: clientesData, isLoading: isLoadingList } = trpc.clientes.list.useQuery({ limit: 20 });

    const { data: addressesData, isLoading: isLoadingAddresses } = trpc.enderecos.byClienteId.useQuery(
        { clienteId: editing?.id as string },
        { enabled: !!editing?.id }
    );

    const additionalAddresses = (addressesData || []).filter(addr => addr.complemento !== 'Principal');

    const createMutation = trpc.clientes.create.useMutation({
        onSuccess: () => { toast.success('Cliente cadastrado com sucesso!'); utils.clientes.list.invalidate(); setModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = trpc.clientes.update.useMutation({
        onSuccess: () => { toast.success('Cliente atualizado com sucesso!'); utils.clientes.list.invalidate(); setModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.clientes.delete.useMutation({
        onSuccess: () => { toast.success('Cliente removido!'); utils.clientes.list.invalidate(); setModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const createAddressMutation = trpc.enderecos.create.useMutation({
        onSuccess: () => { toast.success('Endereço adicionado!'); utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as string }); setAddressModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const updateAddressMutation = trpc.enderecos.update.useMutation({
        onSuccess: () => { toast.success('Endereço atualizado!'); utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as string }); setAddressModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const deleteAddressMutation = trpc.enderecos.delete.useMutation({
        onSuccess: () => { toast.success('Endereço removido!'); utils.enderecos.byClienteId.invalidate({ clienteId: editing?.id as string }); setAddressModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const [_addrViaCep, _setAddrViaCep] = useState<{ cep: string; rua: string; bairro: string } | null>(null);

    const fetchAddrCep = async (cep: string) => {
        const clean = cep.replace(/\D/g, '');
        if (clean.length !== 8) return;
        setAddrCepLoading(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
            const data = await res.json();
            if (!data.erro) {
                _setAddrViaCep({ cep, rua: data.logradouro || '', bairro: data.bairro || '' });
                setAddressFormKey(k => k + 1);
            }
        } catch { /* silencioso */ }
        setAddrCepLoading(false);
    };

    const openAdd = () => { setEditing(null); setFormKey(k => k + 1); setModalOpen(true); };

    const openEdit = (row: Cliente) => {
        setEditing(row);
        setFormKey(k => k + 1);
        setModalOpen(true);
    };

    const handleClientSubmit = (data: ClienteInput) => {
        if (editing?.id) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const openAddAddress = () => {
        setEditingAddress(null);
        _setAddrViaCep(null);
        setAddressFormKey(k => k + 1);
        setAddressModalOpen(true);
    };

    const openEditAddress = (row: Endereco) => {
        setEditingAddress(row);
        _setAddrViaCep(null);
        setAddressFormKey(k => k + 1);
        setAddressModalOpen(true);
    };

    const handleAddressSubmit = (data: any) => {
        if (!editing?.id) return;
        if (editingAddress?.id) {
            updateAddressMutation.mutate({ id: editingAddress.id, data: { ...data, clienteId: editing.id } });
        } else {
            createAddressMutation.mutate({ ...data, clienteId: editing.id });
        }
    };

    const isClientPending = createMutation.isPending || updateMutation.isPending;
    const isAddrPending = createAddressMutation.isPending || updateAddressMutation.isPending;

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
                                onClick={() => triggerConfirm(
                                    'Remover Cliente',
                                    'Tem certeza? Todos os endereços e vínculos serão afetados.',
                                    () => deleteMutation.mutate({ id: editing.id as string })
                                )}
                            >
                                🗑 Remover
                            </button>
                        )}
                        <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                        <button className="btn btn-primary" type="submit" form="client-form" disabled={isClientPending}>
                            {isClientPending ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </>
                }
            >
                <ClientForm
                    key={formKey}
                    defaultValues={editing ? { nome: editing.nome || '', cpf: editing.cpf || '', contato: editing.contato || '' } : undefined}
                    editingId={editing?.id}
                    additionalAddresses={additionalAddresses}
                    isLoadingAddresses={isLoadingAddresses}
                    onAddAddress={openAddAddress}
                    onEditAddress={openEditAddress}
                    onSubmit={handleClientSubmit}
                />
            </Modal>

            {/* Sub-modal Endereço */}
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
                                onClick={() => triggerConfirm(
                                    'Remover Endereço',
                                    'Tem certeza que deseja remover este endereço?',
                                    () => deleteAddressMutation.mutate({ id: editingAddress.id as string })
                                )}
                            >
                                🗑 Remover
                            </button>
                        )}
                        <button className="btn btn-ghost" onClick={() => setAddressModalOpen(false)}>Cancelar</button>
                        <button className="btn btn-primary" type="submit" form="address-form" disabled={isAddrPending}>
                            {isAddrPending ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </>
                }
            >
                <AddressForm
                    key={addressFormKey}
                    defaultValues={editingAddress ? {
                        cep: _addrViaCep?.cep || editingAddress.cep || '',
                        rua: _addrViaCep?.rua || editingAddress.rua || '',
                        numero: editingAddress.numero || '',
                        bairro: _addrViaCep?.bairro || editingAddress.bairro || '',
                        complemento: editingAddress.complemento || '',
                        principal: editingAddress.principal ?? false,
                    } : _addrViaCep ? {
                        cep: _addrViaCep.cep,
                        rua: _addrViaCep.rua,
                        numero: '',
                        bairro: _addrViaCep.bairro,
                        complemento: '',
                        principal: false,
                    } : undefined}
                    onSubmit={handleAddressSubmit}
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

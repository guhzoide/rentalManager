import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import { UsuarioForm, type UsuarioFormValues } from '@/components/forms/UsuarioForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { toast } from 'react-toastify';
import type { UsuarioCreateInput } from '@/lib/schemas';

interface Usuario {
    id: string;
    nome: string;
    email: string;
    atendente: boolean;
    whatsapp?: string | null;
}

const columns: Column<Usuario>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    {
        key: 'atendente',
        label: 'Atendente',
        render: (v: any) => v ? <span className="badge badge-accent">Sim</span> : <span style={{ color: 'var(--text-muted)' }}>Não</span>
    },
];

export function UsuariosPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Usuario> | null>(null);
    const [formKey, setFormKey] = useState(0); // força reset do form ao abrir

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

    const utils = trpc.useUtils();

    const { data: usuariosData, isLoading: isLoadingList } = trpc.usuarios.list.useQuery({
        pagina: page,
        limit: 20
    });

    const createMutation = trpc.usuarios.create.useMutation({
        onSuccess: () => {
            toast.success('Usuário cadastrado com sucesso!');
            utils.usuarios.list.invalidate();
            setModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = trpc.usuarios.update.useMutation({
        onSuccess: () => {
            toast.success('Usuário atualizado com sucesso!');
            utils.usuarios.list.invalidate();
            setModalOpen(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.usuarios.delete.useMutation({
        onSuccess: () => {
            toast.success('Usuário removido!');
            utils.usuarios.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const openAdd = () => {
        setEditing(null);
        setFormKey(k => k + 1);
        setModalOpen(true);
    };

    const openEdit = (row: Usuario) => {
        setEditing(row);
        setFormKey(k => k + 1);
        setModalOpen(true);
    };

    const handleFormSubmit = (data: UsuarioFormValues) => {
        if (editing?.id) {
            const updateData: any = {
                nome: data.nome,
                email: data.email,
                atendente: data.atendente,
                whatsapp: data.whatsapp || null,
            };
            if (data.senha) updateData.senha = data.senha;
            updateMutation.mutate({ id: editing.id, data: updateData });
        } else {
            createMutation.mutate(data as any);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DataGrid
                columns={columns}
                data={usuariosData?.data || []}
                loading={isLoadingList}
                onRowClick={openEdit}
                onAdd={openAdd}
                total={usuariosData?.total || 0}
                page={page}
                onPageChange={(p) => setPage(p)}
                pageSize={20}
                emptyText="Nenhum usuário cadastrado."
            />

            <Modal
                title={editing ? 'Editar Usuário' : 'Novo Usuário'}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                footer={
                    <>
                        {editing?.id && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    triggerConfirm(
                                        'Remover Usuário',
                                        'Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.',
                                        () => {
                                            deleteMutation.mutate({ id: editing.id as string });
                                            setModalOpen(false);
                                        }
                                    );
                                }}
                            >
                                🗑 Remover
                            </button>
                        )}
                        <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                        {/* O botão Salvar submete o form pelo atributo form= */}
                        <button
                            className="btn btn-primary"
                            type="submit"
                            form="usuario-form"
                            disabled={isPending}
                        >
                            {isPending ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </>
                }
            >
                <UsuarioForm
                    key={formKey}
                    defaultValues={editing ? {
                        nome: editing.nome || '',
                        email: editing.email || '',
                        senha: '',
                        atendente: editing.atendente ?? false,
                        whatsapp: editing.whatsapp || '',
                    } : undefined}
                    isEditing={!!editing?.id}
                    onSubmit={handleFormSubmit}
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

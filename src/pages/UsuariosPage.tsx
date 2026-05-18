import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import { UsuarioForm } from '@/components/forms/UsuarioForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface Usuario {
    id: string;
    nome: string;
    email: string;
    atendente: boolean;
    whatsapp?: string | null;
}

const EMPTY = { nome: '', email: '', senha: '', atendente: false, whatsapp: '' };

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
    const [form, setForm] = useState(EMPTY);

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
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);


    const utils = trpc.useUtils();

    const { data: usuariosData, isLoading: isLoadingList } = trpc.usuarios.list.useQuery({
        pagina: page,
        limit: 20
    });

    const createMutation = trpc.usuarios.create.useMutation({
        onSuccess: () => {
            setStatus({ type: 'success', msg: 'Usuário cadastrado com sucesso!' });
            utils.usuarios.list.invalidate();
            setTimeout(() => { setModalOpen(false); setStatus(null); }, 1200);
        },
        onError: (err) => setStatus({ type: 'error', msg: err.message }),
    });

    const updateMutation = trpc.usuarios.update.useMutation({
        onSuccess: () => {
            setStatus({ type: 'success', msg: 'Usuário atualizado com sucesso!' });
            utils.usuarios.list.invalidate();
            setTimeout(() => { setModalOpen(false); setStatus(null); }, 1200);
        },
        onError: (err) => setStatus({ type: 'error', msg: err.message }),
    });

    const deleteMutation = trpc.usuarios.delete.useMutation({
        onSuccess: () => {
            utils.usuarios.list.invalidate();
        },
        onError: (err) => setStatus({ type: 'error', msg: err.message }),
    });


    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY);
        setStatus(null);
        setModalOpen(true);
    };

    const openEdit = (row: Usuario) => {
        setEditing(row);
        setForm({ nome: row.nome, email: row.email, senha: '', atendente: row.atendente, whatsapp: row.whatsapp || '' });
        setStatus(null);
        setModalOpen(true);
    };

    const handleSave = () => {
        if (editing?.id) {
            const updateData: any = {
                nome: form.nome,
                email: form.email,
                atendente: (form as any).atendente,
                whatsapp: (form as any).whatsapp || null,
            };
            if (form.senha) updateData.senha = form.senha;

            updateMutation.mutate({
                id: editing.id,
                data: updateData
            });
        } else {
            createMutation.mutate(form as any);
        }
    };

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
                        <button className="btn btn-primary" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : '💾 Salvar'}
                        </button>

                    </>
                }
            >
                {status && (
                    <div className={`status-bar ${status.type}`}>
                        {status.type === 'success' ? '✅' : '❌'} {status.msg}
                    </div>
                )}

                <UsuarioForm form={form} onChange={setForm} isEditing={!!editing?.id} />
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

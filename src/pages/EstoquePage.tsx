import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-toastify';
import { EstoqueForm } from '@/components/forms/EstoqueForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import type { EstoqueInput } from '@/lib/schemas';

interface EstoqueItem {
    id: string;
    nome: string;
    peso: number;
    largura: number;
    altura: number;
    valorDiaria: number;
    quantidade: number;
    disponivel: number;
    ativo: boolean;
}

const columns: Column<EstoqueItem>[] = [
    { key: 'nome', label: 'Nome do Item' },
    { key: 'peso', label: 'Peso (kg)', width: '100px', render: (v) => `${v} kg` },
    {
        key: 'quantidade', label: 'Qtd Estoque', width: '100px',
        render: (v) => <strong style={{ color: Number(v) > 0 ? 'var(--success)' : 'var(--danger)' }}>{v}</strong>,
    },
    {
        key: 'disponivel', label: 'Qtd Disponível', width: '100px',
        render: (v) => <strong style={{ color: Number(v) > 0 ? 'var(--success)' : 'var(--danger)' }}>{v}</strong>,
    },
    {
        key: 'valorDiaria', label: 'Valor/Diária', width: '120px',
        render: (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    },
    {
        key: 'ativo', label: 'Status', width: '100px',
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
    const [formKey, setFormKey] = useState(0);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({
            isOpen: true, title, message,
            onConfirm: () => { onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }
        });
    };

    const utils = trpc.useUtils();

    const { data: estoqueData, isLoading: isLoadingList } = trpc.estoque.list.useQuery({ pagina: page, limit: 20 });

    const createMutation = trpc.estoque.create.useMutation({
        onSuccess: () => { toast.success('Item salvo com sucesso!'); utils.estoque.list.invalidate(); setModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = trpc.estoque.update.useMutation({
        onSuccess: () => { toast.success('Item atualizado com sucesso!'); utils.estoque.list.invalidate(); setModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.estoque.delete.useMutation({
        onSuccess: () => { toast.success('Item removido!'); utils.estoque.list.invalidate(); setModalOpen(false); },
        onError: (err) => toast.error(err.message),
    });

    const openAdd = () => { setEditing(null); setFormKey(k => k + 1); setModalOpen(true); };

    const openEdit = (row: EstoqueItem) => {
        setEditing(row);
        setFormKey(k => k + 1);
        setModalOpen(true);
    };

    const handleFormSubmit = (data: EstoqueInput) => {
        if (editing?.id) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

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
                                onClick={() => triggerConfirm(
                                    'Remover Item',
                                    'Tem certeza? Esta ação não pode ser desfeita e afetará o histórico.',
                                    () => deleteMutation.mutate({ id: editing.id as string })
                                )}
                            >
                                🗑 Remover
                            </button>
                        )}
                        <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                        <button className="btn btn-primary" type="submit" form="estoque-form" disabled={isPending}>
                            {isPending ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </>
                }
            >
                <EstoqueForm
                    key={formKey}
                    defaultValues={editing ? {
                        nome: editing.nome || '',
                        peso: editing.peso ?? 0,
                        largura: editing.largura ?? 0,
                        altura: editing.altura ?? 0,
                        valorDiaria: editing.valorDiaria ?? 0,
                        quantidade: editing.quantidade ?? 0,
                        disponivel: editing.disponivel ?? 0,
                        ativo: editing.ativo ?? true,
                    } : undefined}
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

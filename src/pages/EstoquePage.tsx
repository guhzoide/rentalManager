import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-toastify';
import { EstoqueForm } from '@/components/forms/EstoqueForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import type { EstoqueInput } from '@/lib/schemas';
import { isDefaultCategory } from '@/lib/categories';
import TextField from '@mui/material/TextField';

interface Categoria {
    id: string;
    nome: string;
}

interface EstoqueItem {
    id: string;
    nome: string;
    categoriaId: string;
    categoria: Categoria;
    peso: number;
    largura: number;
    altura: number;
    valorDiaria: number;
    quantidade: number;
    disponivel: number;
    ativo: boolean;
    imageUrl?: string | null;
    imageUrls?: string[];
}

const columns: Column<EstoqueItem>[] = [
    { key: 'nome', label: 'Nome do Item' },
    { key: 'categoria', label: 'Categoria', render: (_, row) => row.categoria?.nome ?? '—' },
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
    const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
    const [categoryName, setCategoryName] = useState('');

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
    const { data: categoryData, isLoading: isLoadingCategories } = trpc.categorias.list.useQuery({ pagina: 1, limit: 1000 });
    const categories = (categoryData?.data ?? []) as Categoria[];

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

    const refreshCategories = () => {
        utils.categorias.list.invalidate();
        utils.estoque.list.invalidate();
        setEditingCategory(null);
        setCategoryName('');
    };
    const createCategoryMutation = trpc.categorias.create.useMutation({
        onSuccess: () => { toast.success('Categoria criada com sucesso!'); refreshCategories(); },
        onError: (err) => toast.error(err.message),
    });
    const updateCategoryMutation = trpc.categorias.update.useMutation({
        onSuccess: () => { toast.success('Categoria atualizada com sucesso!'); refreshCategories(); },
        onError: (err) => toast.error(err.message),
    });
    const deleteCategoryMutation = trpc.categorias.delete.useMutation({
        onSuccess: () => { toast.success('Categoria removida!'); refreshCategories(); },
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

    const saveCategory = (event: React.FormEvent) => {
        event.preventDefault();
        const nome = categoryName.trim();
        if (nome.length < 2) {
            toast.error('O nome da categoria deve ter pelo menos 2 caracteres.');
            return;
        }
        if (editingCategory) updateCategoryMutation.mutate({ id: editingCategory.id, data: { nome } });
        else createCategoryMutation.mutate({ nome });
    };

    const isPending = createMutation.isPending || updateMutation.isPending;
    const isCategoryPending = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;

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
                toolbarActions={(
                    <button className="btn btn-primary" onClick={() => setCategoryManagerOpen(true)} title="Gerenciar categorias">
                        🏷 Categorias
                    </button>
                )}
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
                        categoriaId: editing.categoriaId || '',
                        peso: editing.peso ?? 0,
                        largura: editing.largura ?? 0,
                        altura: editing.altura ?? 0,
                        valorDiaria: editing.valorDiaria ?? 0,
                        quantidade: editing.quantidade ?? 0,
                        disponivel: editing.disponivel ?? 0,
                        ativo: editing.ativo ?? true,
                        imageUrl: editing.imageUrl || '',
                        imageUrls: editing.imageUrls || [],
                    } : undefined}
                    categorias={categories}
                    categoriasLoading={isLoadingCategories}
                    onSubmit={handleFormSubmit}
                />
            </Modal>

            <Modal
                title="Categorias de produtos"
                open={categoryManagerOpen}
                onClose={() => setCategoryManagerOpen(false)}
                footer={<button className="btn btn-ghost" onClick={() => setCategoryManagerOpen(false)}>Fechar</button>}
            >
                <form onSubmit={saveCategory} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
                    <TextField
                        label={editingCategory ? 'Editar categoria' : 'Nova categoria'}
                        value={categoryName}
                        onChange={(event) => setCategoryName(event.target.value)}
                        slotProps={{ htmlInput: { maxLength: 80 } }}
                        size="small"
                        fullWidth
                        autoFocus
                    />
                    {editingCategory && (
                        <button type="button" className="btn btn-ghost" onClick={() => { setEditingCategory(null); setCategoryName(''); }}>
                            Cancelar
                        </button>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={isCategoryPending}>
                        {isCategoryPending ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Adicionar'}
                    </button>
                </form>

                <div style={{ display: 'grid', gap: 8 }} aria-live="polite">
                    {isLoadingCategories ? (
                        <div className="loading-container"><div className="loading-spinner" /><span>Carregando categorias...</span></div>
                    ) : categories.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Nenhuma categoria cadastrada.</p>
                    ) : categories.map((category) => (
                        <div key={category.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
                            <strong style={{ overflowWrap: 'anywhere' }}>{category.nome}</strong>
                            {isDefaultCategory(category) ? (
                                <span className="badge">Padrão do sistema</span>
                            ) : (
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditingCategory(category); setCategoryName(category.nome); }}>Editar</button>
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => triggerConfirm(
                                            'Remover categoria',
                                            `Deseja remover a categoria “${category.nome}”?`,
                                            () => deleteCategoryMutation.mutate({ id: category.id }),
                                        )}
                                    >
                                        Remover
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
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

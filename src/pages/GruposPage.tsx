import { useState } from 'react';
import { toast } from 'react-toastify';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { trpc } from '@/lib/trpc';
import { DataGrid, type Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface Group {
    id: string;
    codigo: number;
    nome: string;
    descricao?: string | null;
    moduloIds: string[];
}

const columns: Column<Group>[] = [
    { key: 'codigo', label: 'Código', width: '90px' },
    { key: 'nome', label: 'Grupo' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'moduloIds', label: 'Módulos', render: (value: string[]) => value.length },
];

export function GruposPage() {
    const utils = trpc.useUtils();
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<Group | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [moduloIds, setModuloIds] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const { data, isLoading } = trpc.grupos.list.useQuery({ pagina: page, limit: 20 });
    const { data: modules = [] } = trpc.grupos.modules.useQuery();

    const closeModal = () => setModalOpen(false);
    const refresh = () => {
        utils.grupos.list.invalidate();
        utils.usuarios.list.invalidate();
        closeModal();
    };
    const createMutation = trpc.grupos.create.useMutation({
        onSuccess: () => { toast.success('Grupo criado com sucesso!'); refresh(); },
        onError: (error) => toast.error(error.message),
    });
    const updateMutation = trpc.grupos.update.useMutation({
        onSuccess: () => { toast.success('Grupo atualizado com sucesso!'); refresh(); },
        onError: (error) => toast.error(error.message),
    });
    const deleteMutation = trpc.grupos.delete.useMutation({
        onSuccess: () => { toast.success('Grupo removido!'); refresh(); },
        onError: (error) => toast.error(error.message),
    });

    const openForm = (group?: Group) => {
        setEditing(group ?? null);
        setNome(group?.nome ?? '');
        setDescricao(group?.descricao ?? '');
        setModuloIds(group?.moduloIds ?? []);
        setModalOpen(true);
    };

    const save = () => {
        if (nome.trim().length < 2) {
            toast.error('Informe um nome para o grupo.');
            return;
        }
        const payload = { nome: nome.trim(), descricao: descricao.trim() || null, moduloIds };
        if (editing) updateMutation.mutate({ id: editing.id, data: payload });
        else createMutation.mutate(payload);
    };

    const pending = createMutation.isPending || updateMutation.isPending;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DataGrid
                columns={columns}
                data={(data?.data ?? []) as Group[]}
                loading={isLoading}
                onRowClick={openForm}
                onAdd={() => openForm()}
                total={data?.total ?? 0}
                page={page}
                onPageChange={setPage}
                pageSize={20}
                emptyText="Nenhum grupo cadastrado."
            />

            <Modal
                title={editing ? `Editar grupo ${editing.codigo}` : 'Novo grupo'}
                open={modalOpen}
                onClose={closeModal}
                footer={<>
                    {editing && <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>🗑 Remover</button>}
                    <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save} disabled={pending}>{pending ? 'Salvando...' : '💾 Salvar'}</button>
                </>}
            >
                <div className="form-grid">
                    <div className="form-group full">
                        <TextField label="Nome *" value={nome} onChange={(event) => setNome(event.target.value)} fullWidth />
                    </div>
                    <div className="form-group full">
                        <TextField label="Descrição" value={descricao} onChange={(event) => setDescricao(event.target.value)} fullWidth multiline rows={2} />
                    </div>
                    <div className="form-group full">
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Telas liberadas</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 4 }}>
                            {modules.map((module) => <FormControlLabel
                                key={module.id}
                                control={<Checkbox
                                    checked={moduloIds.includes(module.id)}
                                    onChange={(event) => setModuloIds((current) => event.target.checked
                                        ? [...current, module.id]
                                        : current.filter((id) => id !== module.id))}
                                />}
                                label={module.nome}
                            />)}
                        </div>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={confirmDelete}
                title="Remover grupo"
                message="Tem certeza que deseja remover este grupo?"
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => {
                    if (editing) deleteMutation.mutate({ id: editing.id });
                    setConfirmDelete(false);
                }}
            />
        </div>
    );
}

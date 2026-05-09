import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { Modal } from '@/components/ui/Modal';

interface Usuario {
    id: number;
    nome: string;
    loginName: string;
    email: string;
}

const EMPTY = { nome: '', loginName: '', email: '', senha: '' };

const columns: Column<Usuario>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'loginName', label: 'Login', width: '160px' },
    { key: 'email', label: 'E-mail' },
];

export function UsuariosPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Usuario> | null>(null);
    const [form, setForm] = useState(EMPTY);
    const [rows, setRows] = useState<Usuario[]>([]);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const readMutation = trpc.service.read.useMutation({
        onSuccess: (res: any) => { setRows(res.data); setTotal(res.total); },
    });

    const saveMutation = trpc.service.create.useMutation({
        onSuccess: () => {
            setStatus({ type: 'success', msg: 'Usuário salvo com sucesso!' });
            fetchUsers();
            setTimeout(() => { setModalOpen(false); setStatus(null); }, 1200);
        },
        onError: (err) => setStatus({ type: 'error', msg: err.message }),
    });

    const deleteMutation = trpc.service.delete.useMutation({
        onSuccess: () => fetchUsers(),
    });

    const fetchUsers = (p = page) => {
        readMutation.mutate({ table: 'usuarios', pagina: p, limit: 20 });
    };

    useState(() => { fetchUsers(1); });

    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY);
        setStatus(null);
        setShowPassword(false);
        setModalOpen(true);
    };

    const openEdit = (row: Usuario) => {
        setEditing(row);
        setForm({ nome: row.nome, loginName: row.loginName, email: row.email, senha: '' });
        setStatus(null);
        setShowPassword(false);
        setModalOpen(true);
    };

    const handleSave = () => {
        const payload: any = editing?.id
            ? { id: editing.id, nome: form.nome, loginName: form.loginName, email: form.email }
            : { ...form };

        // só inclui senha se foi preenchida (no edit)
        if (form.senha) payload.senha = form.senha;

        saveMutation.mutate({ table: 'usuarios', Itens: payload });
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
                onPageChange={(p) => { setPage(p); fetchUsers(p); }}
                pageSize={20}
                emptyText="Nenhum usuário cadastrado."
            />

            <Modal
                title={editing ? 'Editar Usuário' : 'Novo Usuário'}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                footer={
                    <>
                        {editing && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    if (confirm('Remover este usuário?')) {
                                        deleteMutation.mutate({ table: 'usuarios', Filtros: { id: editing.id } });
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
                {status && (
                    <div className={`status-bar ${status.type}`}>
                        {status.type === 'success' ? '✅' : '❌'} {status.msg}
                    </div>
                )}

                <div className="form-grid">
                    <div className="form-group full">
                        <label className="form-label">Nome *</label>
                        <input
                            className="form-control"
                            value={form.nome}
                            onChange={(e) => setForm({ ...form, nome: e.target.value })}
                            placeholder="Nome completo"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Login *</label>
                        <input
                            className="form-control"
                            value={form.loginName}
                            onChange={(e) => setForm({ ...form, loginName: e.target.value })}
                            placeholder="nome.sobrenome"
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">E-mail *</label>
                        <input
                            className="form-control"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="email@exemplo.com"
                        />
                    </div>

                    <div className="form-group full">
                        <label className="form-label">
                            Senha {editing ? '(deixe em branco para manter)' : '*'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-control"
                                type={showPassword ? 'text' : 'password'}
                                value={form.senha}
                                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                style={{ paddingRight: 40 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', fontSize: 16,
                                }}
                            >
                                {showPassword ? '🙈' : '👁'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

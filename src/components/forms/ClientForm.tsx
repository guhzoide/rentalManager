import TextField from '@mui/material/TextField';
import { DataGrid, Column } from '../ui/DataGrid';

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

interface ClientFormProps {
    form: Omit<Cliente, 'id'>;
    onChange: (form: Omit<Cliente, 'id'>) => void;
    editingId?: string;
    additionalAddresses: Endereco[];
    isLoadingAddresses: boolean;
    onAddAddress: () => void;
    onEditAddress: (address: Endereco) => void;
}

const addressColumns: Column<Endereco>[] = [
    { key: 'cep', label: 'CEP', width: '100px' },
    { key: 'bairro', label: 'Bairro' },
    { key: 'rua', label: 'Rua' },
    { key: 'numero', label: 'Nº', width: '80px' },
    { key: 'complemento', label: 'Complemento', width: '130px' },
    {
        key: 'principal', label: 'Principal', width: '100px',
        render: (v: any) => v ? <span className="badge badge-accent">Sim</span> : <span style={{ color: 'var(--text-muted)' }}>Não</span>
    },
];

export function ClientForm({
    form,
    onChange,
    editingId,
    additionalAddresses,
    isLoadingAddresses,
    onAddAddress,
    onEditAddress,
}: ClientFormProps) {
    return (
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
                <div className="form-grid">
                    <div className="form-group">
                        <TextField
                            label="Nome"
                            variant="outlined"
                            fullWidth
                            value={form.nome}
                            onChange={(e) => onChange({ ...form, nome: e.target.value })}
                            placeholder="Nome completo"
                        />
                    </div>

                    <div className="form-group">
                        <TextField
                            label="CPF"
                            variant="outlined"
                            fullWidth
                            value={form.cpf || ''}
                            onChange={(e) => onChange({ ...form, cpf: e.target.value || null })}
                            placeholder="000.000.000-00"
                        />
                    </div>

                    <div className="form-group full">
                        <TextField
                            label="Contato"
                            variant="outlined"
                            fullWidth
                            value={form.contato}
                            onChange={(e) => onChange({ ...form, contato: e.target.value })}
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </div>
            </div>

            {editingId && (
                <div style={{
                    flex: 1.2,
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
                        🏠 Endereços adicionais
                    </h3>
                    <div style={{ flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                        <DataGrid
                            columns={addressColumns}
                            data={additionalAddresses}
                            loading={isLoadingAddresses}
                            onRowClick={onEditAddress}
                            onAdd={onAddAddress}
                            emptyText="Nenhum endereço adicional cadastrado."
                            keyField="id"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

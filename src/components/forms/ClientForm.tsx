import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextField from '@mui/material/TextField';
import { clienteSchema, type ClienteInput } from '@/lib/schemas';
import { DataGrid, Column } from '../ui/DataGrid';

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

interface ClientFormProps {
    cliente?: ClientFormRecord | null;
    editingId?: string;
    additionalAddresses: Endereco[];
    isLoadingAddresses: boolean;
    onAddAddress: () => void;
    onEditAddress: (address: Endereco) => void;
    onSubmit: (data: ClienteInput) => void;
}

export type ClientFormRecord = Partial<ClienteInput> & { id?: string };

function getFormValues(cliente?: ClientFormRecord | null): ClienteInput {
    return {
        nome: cliente?.nome ?? '',
        email: cliente?.email ?? '',
        cpf: cliente?.cpf ?? '',
        contato: cliente?.contato ?? '',
        cep: cliente?.cep ?? '',
        bairro: cliente?.bairro ?? '',
        rua: cliente?.rua ?? '',
        numero: cliente?.numero ?? '',
        complemento: cliente?.complemento ?? '',
        principal: cliente?.principal ?? true,
    };
}

export function ClientForm({
    cliente,
    editingId,
    additionalAddresses,
    isLoadingAddresses,
    onAddAddress,
    onEditAddress,
    onSubmit,
}: ClientFormProps) {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ClienteInput>({
        resolver: zodResolver(clienteSchema),
        defaultValues: getFormValues(cliente),
    });

    useEffect(() => {
        reset(getFormValues(cliente));
    }, [cliente, reset]);

    return (
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
                <form id="client-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="form-grid">
                        <div className="form-group">
                            <Controller
                                name="nome"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Nome *"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="Nome completo"
                                        error={!!errors.nome}
                                        helperText={errors.nome?.message}
                                    />
                                )}
                            />
                        </div>

                        <div className="form-group">
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="E-mail *"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="email@exemplo.com"
                                        error={!!errors.email}
                                        helperText={errors.email?.message}
                                    />
                                )}
                            />
                        </div>

                        <div className="form-group">
                            <Controller
                                name="cpf"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ''}
                                        label="CPF"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="000.000.000-00"
                                        error={!!errors.cpf}
                                        helperText={errors.cpf?.message}
                                    />
                                )}
                            />
                        </div>

                        <div className="form-group">
                            <Controller
                                name="contato"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Contato *"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="(00) 00000-0000"
                                        error={!!errors.contato}
                                        helperText={errors.contato?.message}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </form>
            </div>

            {/* O DataGrid agora fica FORA da tag form */}
            {editingId && (
                <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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

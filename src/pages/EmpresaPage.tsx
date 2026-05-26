import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-toastify';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextField from '@mui/material/TextField';
import { empresaSchema, type EmpresaInput } from '@/lib/schemas';
import { getCep } from '@/utils/viacep';

export function EmpresaPage() {
    const utils = trpc.useUtils();

    const { data: empresa, isLoading } = trpc.empresa.list.useQuery({ id: "58f51956-983a-4046-b011-ca785ff41205" });

    const updateMutation = trpc.empresa.update.useMutation({
        onSuccess: () => {
            toast.success('Configurações da empresa salvas com sucesso!');
            utils.empresa.list.invalidate();
            utils.empresa.listAll.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<EmpresaInput>({
        resolver: zodResolver(empresaSchema),
        defaultValues: {
            nome: '',
            logoUrl: '',
            cnpj: '',
            telefone: '',
            logradouro: '',
            numero: '',
            cep: '',
            bairro: '',
            complemento: '',
        },
    });

    useEffect(() => {
        if (empresa) {
            reset({
                nome: empresa.nome || '',
                logoUrl: empresa.logoUrl || '',
                cnpj: empresa.cnpj || '',
                telefone: empresa.telefone || '',
                logradouro: empresa.logradouro || '',
                numero: empresa.numero || '',
                cep: empresa.cep || '',
                bairro: empresa.bairro || '',
                complemento: empresa.complemento || '',
            });
        }
    }, [empresa, reset]);

    const handleCepChange = async (cepVal: string) => {
        const cleanCep = cepVal.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const res = await getCep(cleanCep);
                if (!res?.success) {
                    toast.error('CEP não encontrado!');
                    return;
                }
                const data = res.data;
                setValue('logradouro', data.logradouro || '', { shouldValidate: true });
                setValue('bairro', data.bairro || '', { shouldValidate: true });
                toast.success('Endereço auto-preenchido pelo CEP!');
            } catch (err) {
                console.error("ViaCEP error: ", err);
            }
        }
    };

    const onSubmit = (data: EmpresaInput) => {
        if (!empresa?.id) return;
        updateMutation.mutate({ id: empresa.id, data });
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        border: '3px solid var(--border)',
                        borderTopColor: 'var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 10px auto'
                    }} />
                    <p style={{ fontSize: '12px' }}>Carregando dados da empresa...</p>
                </div>
            </div>
        );
    }

    const isPending = updateMutation.isPending;

    return (
        <div style={{
            padding: '24px',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '800px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            🏢 Configurações da Empresa
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                            Configure a identidade visual, dados cadastrais e endereço padrão da sua empresa.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '28px',
                    boxShadow: 'var(--shadow-md, 0 4px 20px rgba(0,0,0,0.15))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px', color: 'var(--text-primary)' }}>
                        Identificação e Contato
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '20px'
                    }}>
                        <Controller
                            name="nome"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Razão Social / Nome Fantasia *"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.nome}
                                    helperText={errors.nome?.message}
                                />
                            )}
                        />

                        <Controller
                            name="cnpj"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value || ''}
                                    label="CNPJ"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.cnpj}
                                    helperText={errors.cnpj?.message}
                                />
                            )}
                        />

                        <Controller
                            name="telefone"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value || ''}
                                    label="Telefone / Contato"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.telefone}
                                    helperText={errors.telefone?.message}
                                />
                            )}
                        />

                        <Controller
                            name="logoUrl"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value || ''}
                                    label="URL do Logotipo"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.logoUrl}
                                    helperText={errors.logoUrl?.message}
                                />
                            )}
                        />
                    </div>

                    <h3 style={{ margin: '12px 0 0 0', fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--border)', paddingBottom: '12px', color: 'var(--text-primary)' }}>
                        Endereço Comercial (Emitente)
                    </h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px'
                    }}>
                        <Controller
                            name="cep"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value || ''}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        handleCepChange(e.target.value);
                                    }}
                                    label="CEP"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.cep}
                                    helperText={errors.cep?.message}
                                />
                            )}
                        />

                        <Controller
                            name="logradouro"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value || ''}
                                    label="Rua / Logradouro"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.logradouro}
                                    helperText={errors.logradouro?.message}
                                />
                            )}
                        />

                        <Controller
                            name="numero"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value || ''}
                                    label="Número"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.numero}
                                    helperText={errors.numero?.message}
                                />
                            )}
                        />

                        <Controller
                            name="bairro"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value || ''}
                                    label="Bairro"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.bairro}
                                    helperText={errors.bairro?.message}
                                />
                            )}
                        />

                        <div style={{ gridColumn: 'span 1' }}>
                            <Controller
                                name="complemento"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        value={field.value || ''}
                                        label="Complemento"
                                        variant="outlined"
                                        fullWidth
                                        error={!!errors.complemento}
                                        helperText={errors.complemento?.message}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={isPending}
                            style={{
                                padding: '12px 32px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 14px rgba(96, 165, 250, 0.4)',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                            }}
                        >
                            {isPending ? 'Salvando...' : '💾 Salvar Configurações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

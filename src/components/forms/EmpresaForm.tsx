import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextField from '@mui/material/TextField';
import { empresaSchema, type EmpresaInput } from '@/lib/schemas';

interface EmpresaFormProps {
    defaultValues?: Partial<EmpresaInput>;
    onSubmit: (data: EmpresaInput) => void;
}

export function EmpresaForm({ defaultValues, onSubmit }: EmpresaFormProps) {
    const { control, handleSubmit, reset, formState: { errors } } = useForm<EmpresaInput>({
        resolver: zodResolver(empresaSchema),
        defaultValues: { nome: '', logoUrl: '', cnpj: '', telefone: '', ...defaultValues },
    });

    useEffect(() => {
        reset({ nome: '', logoUrl: '', cnpj: '', telefone: '', ...defaultValues });
    }, [defaultValues, reset]);

    return (
        <form id="empresa-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
                <div className="form-group full">
                    <Controller name="nome" control={control} render={({ field }) => (
                        <TextField {...field} label="Nome da empresa *" fullWidth error={!!errors.nome} helperText={errors.nome?.message} />
                    )} />
                </div>
                <div className="form-group full">
                    <Controller name="logoUrl" control={control} render={({ field }) => (
                        <TextField {...field} value={field.value || ''} label="URL do logo" fullWidth placeholder="https://exemplo.com/logo.png" error={!!errors.logoUrl} helperText={errors.logoUrl?.message} />
                    )} />
                </div>
                <div className="form-group">
                    <Controller name="cnpj" control={control} render={({ field }) => (
                        <TextField {...field} value={field.value || ''} label="CNPJ" fullWidth error={!!errors.cnpj} helperText={errors.cnpj?.message} />
                    )} />
                </div>
                <div className="form-group">
                    <Controller name="telefone" control={control} render={({ field }) => (
                        <TextField {...field} value={field.value || ''} label="Telefone" fullWidth error={!!errors.telefone} helperText={errors.telefone?.message} />
                    )} />
                </div>
            </div>
        </form>
    );
}

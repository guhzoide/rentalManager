import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useState } from 'react';
import { usuarioCreateSchema, type UsuarioCreateInput } from '@/lib/schemas';
import { z } from 'zod';

// Schema de edição: senha é opcional
const usuarioEditSchema = usuarioCreateSchema.extend({
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').or(z.literal('')).optional(),
});

export type UsuarioFormValues = Omit<UsuarioCreateInput, 'senha'> & { senha?: string };

export interface UsuarioFormRef {
    submit: () => Promise<UsuarioFormValues | null>;
}

interface UsuarioFormProps {
    defaultValues?: Partial<UsuarioFormValues>;
    isEditing: boolean;
    onSubmit: (data: UsuarioFormValues) => void;
}

export function UsuarioForm({ defaultValues, isEditing, onSubmit }: UsuarioFormProps) {
    const [showPassword, setShowPassword] = useState(false);

    const schema = isEditing ? usuarioEditSchema : usuarioCreateSchema;

    const {
        control,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<UsuarioFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            nome: '',
            email: '',
            senha: '',
            atendente: false,
            whatsapp: '',
            ...defaultValues,
        },
    });

    // Sync external defaultValues changes (open edit modal)
    useEffect(() => {
        if (defaultValues) {
            reset({
                nome: '',
                email: '',
                senha: '',
                atendente: false,
                whatsapp: '',
                ...defaultValues,
            });
        }
    }, [JSON.stringify(defaultValues)]);

    const atendente = watch('atendente');

    return (
        <form id="usuario-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
                {/* Nome */}
                <div className="form-group full">
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

                {/* E-mail */}
                <div className="form-group full">
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="E-mail *"
                                type="email"
                                variant="outlined"
                                fullWidth
                                placeholder="email@exemplo.com"
                                error={!!errors.email}
                                helperText={errors.email?.message}
                            />
                        )}
                    />
                </div>

                {/* Senha */}
                <div className="form-group full">
                    <Controller
                        name="senha"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label={isEditing ? 'Senha (deixe em branco para manter)' : 'Senha *'}
                                type={showPassword ? 'text' : 'password'}
                                variant="outlined"
                                fullWidth
                                placeholder="••••••••"
                                autoComplete="new-password"
                                error={!!errors.senha}
                                helperText={errors.senha?.message}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                    tabIndex={-1}
                                                    size="small"
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        )}
                    />
                </div>

                {/* Atendente */}
                <div className="form-group full">
                    <Controller
                        name="atendente"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={field.value ?? false}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                }
                                label="Atendente"
                            />
                        )}
                    />
                </div>

                {/* WhatsApp (condicional) */}
                {atendente && (
                    <div className="form-group full">
                        <Controller
                            name="whatsapp"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="WhatsApp do Atendente"
                                    type="tel"
                                    variant="outlined"
                                    fullWidth
                                    placeholder="(99) 99999-9999"
                                    helperText="Número exibido no catálogo para contato"
                                    error={!!errors.whatsapp}
                                />
                            )}
                        />
                    </div>
                )}
            </div>
        </form>
    );
}

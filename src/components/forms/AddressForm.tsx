import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { z } from 'zod';
import { enderecoSchema, type EnderecoInput } from '@/lib/schemas';

// AddressForm usa um subconjunto do enderecoSchema (sem clienteId, gerenciado pela page)
const addressFormSchema = enderecoSchema.omit({ clienteId: true });
type AddressFormValues = z.infer<typeof addressFormSchema>;

interface AddressFormProps {
    defaultValues?: Partial<AddressFormValues>;
    onSubmit: (data: AddressFormValues) => void;
    onCepChange: (cep: string) => void;
    cepLoading: boolean;
    // Permite que a page injete valores via ViaCEP
    onRuaBairroFetched?: (rua: string, bairro: string) => void;
}

export function AddressForm({
    defaultValues,
    onSubmit,
    onCepChange,
    cepLoading,
}: AddressFormProps) {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<AddressFormValues>({
        resolver: zodResolver(addressFormSchema),
        defaultValues: {
            cep: '',
            rua: '',
            numero: '',
            bairro: '',
            complemento: '',
            principal: false,
            ...defaultValues,
        },
    });

    useEffect(() => {
        reset({
            cep: '',
            rua: '',
            numero: '',
            bairro: '',
            complemento: '',
            principal: false,
            ...defaultValues,
        });
    }, [JSON.stringify(defaultValues)]);

    return (
        <form id="address-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid single">
                {/* CEP */}
                <div className="form-group">
                    <Controller
                        name="cep"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="CEP *"
                                variant="outlined"
                                fullWidth
                                placeholder="00000-000"
                                error={!!errors.cep}
                                helperText={errors.cep?.message}
                                slotProps={{ htmlInput: { maxLength: 9 } }}
                                onChange={(e) => {
                                    field.onChange(e);
                                    onCepChange(e.target.value);
                                }}
                            />
                        )}
                    />
                </div>

                {/* Número */}
                <div className="form-group">
                    <Controller
                        name="numero"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Número *"
                                variant="outlined"
                                fullWidth
                                placeholder="123"
                                error={!!errors.numero}
                                helperText={errors.numero?.message}
                            />
                        )}
                    />
                </div>

                {/* Bairro */}
                <div className="form-group">
                    <Controller
                        name="bairro"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                value={field.value ?? ''}
                                label="Bairro"
                                variant="outlined"
                                fullWidth
                                placeholder="Bairro"
                                error={!!errors.bairro}
                                helperText={errors.bairro?.message}
                            />
                        )}
                    />
                </div>

                {/* Rua */}
                <div className="form-group">
                    <Controller
                        name="rua"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Rua *"
                                variant="outlined"
                                fullWidth
                                placeholder="Nome da rua"
                                error={!!errors.rua}
                                helperText={cepLoading ? 'Buscando endereço...' : errors.rua?.message}
                            />
                        )}
                    />
                </div>

                {/* Complemento */}
                <div className="form-group">
                    <Controller
                        name="complemento"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                value={field.value ?? ''}
                                label="Complemento (Ex: Ap 12, Bloco B)"
                                variant="outlined"
                                fullWidth
                                placeholder="Complemento"
                                error={!!errors.complemento}
                                helperText={errors.complemento?.message}
                            />
                        )}
                    />
                </div>

                {/* Principal */}
                <div className="form-group">
                    <Controller
                        name="principal"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={field.value}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                }
                                label="Endereço Principal"
                            />
                        )}
                    />
                </div>
            </div>
        </form>
    );
}

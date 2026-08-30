import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import { estoqueSchema, type EstoqueInput } from '@/lib/schemas';

interface EstoqueFormProps {
    defaultValues?: Partial<EstoqueInput>;
    onSubmit: (data: EstoqueInput) => void;
}

export function EstoqueForm({ defaultValues, onSubmit }: EstoqueFormProps) {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<EstoqueInput>({
        resolver: zodResolver(estoqueSchema),
        defaultValues: {
            nome: '',
            peso: 0,
            largura: 0,
            altura: 0,
            valorDiaria: 0,
            quantidade: 0,
            disponivel: 0,
            ativo: true,
            imageUrl: '',
            imageUrls: [],
            ...defaultValues,
        },
    });

    const imageUrls = watch('imageUrls') || [];

    useEffect(() => {
        reset({
            nome: '',
            peso: 0,
            largura: 0,
            altura: 0,
            valorDiaria: 0,
            quantidade: 0,
            disponivel: 0,
            ativo: true,
            imageUrl: '',
            imageUrls: [],
            ...defaultValues,
        });
    }, [JSON.stringify(defaultValues)]);

    const numField = (
        name: 'peso' | 'largura' | 'altura' | 'quantidade' | 'disponivel' | 'valorDiaria',
        label: string,
        adornment: string,
        position: 'start' | 'end' = 'end',
        step = 0.01
    ) => (
        <div className="form-group">
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        value={field.value}
                        onChange={(e) => {
                            const val = step === 1
                                ? parseInt(e.target.value)
                                : parseFloat(e.target.value);
                            field.onChange(isNaN(val) ? 0 : val);
                        }}
                        label={label}
                        type="number"
                        variant="outlined"
                        fullWidth
                        error={!!errors[name]}
                        helperText={(errors[name] as any)?.message}
                        slotProps={{
                            input: {
                                [position === 'end' ? 'endAdornment' : 'startAdornment']: (
                                    <InputAdornment position={position}>{adornment}</InputAdornment>
                                ),
                            },
                            htmlInput: { step, min: 0 },
                        }}
                    />
                )}
            />
        </div>
    );

    return (
        <form id="estoque-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
                {/* Nome */}
                <div className="form-group full">
                    <Controller
                        name="nome"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Nome do item *"
                                variant="outlined"
                                fullWidth
                                error={!!errors.nome}
                                helperText={errors.nome?.message}
                            />
                        )}
                    />
                </div>

                <div className="form-group full">
                    <Controller
                        name="imageUrl"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                value={field.value || ''}
                                label="URL da imagem de capa"
                                variant="outlined"
                                fullWidth
                                placeholder="https://exemplo.com/capa.jpg"
                                error={!!errors.imageUrl}
                                helperText={errors.imageUrl?.message || 'A imagem de capa será exibida no catálogo.'}
                            />
                        )}
                    />
                </div>

                <div className="form-group full">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Galeria de imagens</span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setValue('imageUrls', [...imageUrls, ''])}>
                            + Adicionar imagem
                        </button>
                    </div>
                    {imageUrls.length === 0 ? (
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>Nenhuma imagem adicional cadastrada.</p>
                    ) : imageUrls.map((_, index) => (
                        <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <Controller
                                name={`imageUrls.${index}`}
                                control={control}
                                render={({ field: imageField }) => (
                                    <TextField
                                        {...imageField}
                                        label={`Imagem ${index + 1}`}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        placeholder="https://exemplo.com/imagem.jpg"
                                        error={!!errors.imageUrls?.[index]}
                                        helperText={errors.imageUrls?.[index]?.message}
                                    />
                                )}
                            />
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => setValue('imageUrls', imageUrls.filter((_, imageIndex) => imageIndex !== index))} title="Remover imagem">
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {/* Ativo */}
                <div className="form-group full">
                    <Controller
                        name="ativo"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={field.value}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                }
                                label="Ativo"
                            />
                        )}
                    />
                </div>

                {numField('peso', 'Peso (kg)', 'kg')}
                {numField('largura', 'Largura (m)', 'm')}
                {numField('altura', 'Altura (m)', 'm')}
                {numField('quantidade', 'Quantidade em estoque *', 'un', 'end', 1)}

                {/* Disponível */}
                <div className="form-group">
                    <Controller
                        name="disponivel"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                value={field.value}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                label="Quantidade disponível"
                                type="number"
                                variant="outlined"
                                fullWidth
                                error={!!errors.disponivel}
                                helperText={(errors.disponivel as any)?.message}
                                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                            />
                        )}
                    />
                </div>

                {/* Valor Diária */}
                <div className="form-group full">
                    <Controller
                        name="valorDiaria"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                label="Valor da diária *"
                                type="number"
                                variant="outlined"
                                fullWidth
                                error={!!errors.valorDiaria}
                                helperText={(errors.valorDiaria as any)?.message}
                                slotProps={{
                                    input: {
                                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                    },
                                    htmlInput: { step: 0.01, min: 0 },
                                }}
                            />
                        )}
                    />
                </div>
            </div>
        </form>
    );
}

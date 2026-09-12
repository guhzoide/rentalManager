import { ImageUpload } from '@/components/ui/ImageUpload';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import type { z } from 'zod';
import { estoqueSchema, type EstoqueInput } from '@/lib/schemas';

type EstoqueFormValues = z.input<typeof estoqueSchema>;

interface EstoqueFormProps {
    defaultValues?: Partial<EstoqueInput>;
    categorias: Array<{ id: string; nome: string }>;
    categoriasLoading?: boolean;
    onSubmit: (data: EstoqueInput) => void;
}

export function EstoqueForm({ defaultValues, categorias, categoriasLoading = false, onSubmit }: EstoqueFormProps) {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<EstoqueFormValues, unknown, EstoqueInput>({
        resolver: zodResolver(estoqueSchema),
        defaultValues: {
            nome: '',
            categoriaId: '',
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
            categoriaId: '',
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
                        name="categoriaId"
                        control={control}
                        render={({ field }) => (
                            <Autocomplete
                                options={categorias}
                                getOptionLabel={(option) => option.nome}
                                value={categorias.find((categoria) => categoria.id === field.value) ?? null}
                                onChange={(_, categoria) => field.onChange(categoria?.id ?? '')}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                loading={categoriasLoading}
                                disabled={categoriasLoading || categorias.length === 0}
                                noOptionsText="Nenhuma categoria cadastrada"
                                fullWidth
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Categoria *"
                                        variant="outlined"
                                        error={!!errors.categoriaId}
                                        helperText={errors.categoriaId?.message || (categorias.length === 0 && !categoriasLoading ? 'Cadastre uma categoria antes de salvar o produto.' : undefined)}
                                    />
                                )}
                            />
                        )}
                    />
                </div>

                <div className="form-group full">
                    <Controller
                        name="imageUrl"
                        control={control}
                        render={({ field }) => (
                            <ImageUpload label="Imagem de capa" value={field.value} onChange={field.onChange} error={errors.imageUrl?.message} />
                        )}
                    />
                </div>

                <div className="form-group full">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Galeria de imagens</span>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={imageUrls.length >= 8} onClick={() => setValue('imageUrls', [...imageUrls, ''], { shouldDirty: true })}>
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
                                    <ImageUpload label={`Imagem ${index + 1}`} value={imageField.value} onChange={imageField.onChange} error={errors.imageUrls?.[index]?.message} />
                                )}
                            />
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => setValue('imageUrls', imageUrls.filter((_, imageIndex) => imageIndex !== index), { shouldDirty: true, shouldValidate: true })} title="Remover imagem">
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

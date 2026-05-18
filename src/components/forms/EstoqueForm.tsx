import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';

interface EstoqueItem {
    id: string;
    nome: string;
    peso: number;
    largura: number;
    altura: number;
    valorDiaria: number;
    quantidade: number;
    disponivel: number;
    ativo: boolean;
}

interface EstoqueFormProps {
    form: Omit<EstoqueItem, 'id'>;
    onChange: (form: Omit<EstoqueItem, 'id'>) => void;
}

export function EstoqueForm({ form, onChange }: EstoqueFormProps) {
    const numField = (key: keyof Omit<EstoqueItem, 'id' | 'nome' | 'ativo'>, label: string, suffix: string, step = "0.01") => (
        <TextField
            label={label}
            type="number"
            variant="outlined"
            fullWidth
            slotProps={{
                input: {
                    endAdornment: <InputAdornment position="end">{suffix}</InputAdornment>,
                },
                htmlInput: {
                    step: step,
                    min: 0,
                }
            }}
            value={form[key]}
            onChange={(e) => onChange({ ...form, [key]: (step === "1" ? parseInt(e.target.value) : parseFloat(e.target.value)) || 0 })}
        />
    );

    return (
        <div className="form-grid">
            <div className="form-group full">
                <TextField
                    label="Nome do item"
                    variant="outlined"
                    fullWidth
                    value={form.nome}
                    onChange={(e: any) => onChange({ ...form, nome: e.target.value })}
                />
            </div>

            <div className="form-group full">
                <FormControlLabel
                    control={
                        <Switch
                            checked={form.ativo}
                            onChange={(e) => onChange({ ...form, ativo: e.target.checked })}
                        />
                    }
                    label="Ativo"
                />
            </div>

            {numField('peso', 'Peso (kg)', 'kg')}
            {numField('largura', 'Largura (m)', 'm')}
            {numField('altura', 'Altura (m)', 'm')}
            {numField('quantidade', 'Quantidade em estoque *', 'un', '1')}
            
            <div className="form-group">
                <TextField
                    type="number"
                    label="Quantidade disponível"
                    fullWidth
                    value={form.disponivel}
                    onChange={(e) => onChange({ ...form, disponivel: parseInt(e.target.value) || 0 })}
                />
            </div>

            <div className="form-group full">
                <TextField
                    label="Valor da diária"
                    type="number"
                    variant="outlined"
                    fullWidth
                    slotProps={{
                        input: {
                            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        },
                        htmlInput: {
                            step: "0.01",
                            min: 0,
                        }
                    }}
                    value={form.valorDiaria}
                    onChange={(e) => onChange({ ...form, valorDiaria: parseFloat(e.target.value) || 0 })}
                />
            </div>
        </div>
    );
}

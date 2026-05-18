import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';

interface EnderecoFormState {
    cep: string;
    numero: string;
    bairro: string;
    rua: string;
    complemento: string;
    principal: boolean;
}

interface AddressFormProps {
    form: EnderecoFormState;
    onChange: (form: EnderecoFormState) => void;
    onCepChange: (cep: string) => void;
    cepLoading: boolean;
}

export function AddressForm({
    form,
    onChange,
    onCepChange,
    cepLoading,
}: AddressFormProps) {
    return (
        <div className="form-grid single">
            <div className="form-group">
                <TextField
                    label="CEP"
                    variant="outlined"
                    fullWidth
                    value={form.cep}
                    onChange={(e) => {
                        onChange({ ...form, cep: e.target.value });
                        onCepChange(e.target.value);
                    }}
                    slotProps={{ htmlInput: { maxLength: 9 } }}
                    placeholder="00000-000"
                />
            </div>

            <div className="form-group">
                <TextField
                    label="Número"
                    variant="outlined"
                    fullWidth
                    value={form.numero}
                    onChange={(e) => onChange({ ...form, numero: e.target.value })}
                    placeholder="123"
                />
            </div>

            <div className="form-group">
                <TextField
                    label="Bairro"
                    variant="outlined"
                    fullWidth
                    value={form.bairro}
                    onChange={(e) => onChange({ ...form, bairro: e.target.value })}
                    placeholder="Bairro"
                />
            </div>

            <div className="form-group">
                <TextField
                    label="Rua"
                    variant="outlined"
                    fullWidth
                    value={form.rua}
                    onChange={(e) => onChange({ ...form, rua: e.target.value })}
                    placeholder="Nome da rua"
                    helperText={cepLoading ? "Buscando endereço..." : ""}
                />
            </div>

            <div className="form-group">
                <TextField
                    label="Complemento (Ex: Ap 12, Bloco B)"
                    variant="outlined"
                    fullWidth
                    value={form.complemento}
                    onChange={(e) => onChange({ ...form, complemento: e.target.value })}
                    placeholder="Complemento"
                />
            </div>

            <div className="form-group">
                <span>Principal</span>
                <Switch
                    checked={form.principal}
                    onChange={(e) => onChange({ ...form, principal: e.target.checked })}
                />
            </div>
        </div>
    );
}

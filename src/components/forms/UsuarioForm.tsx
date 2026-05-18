import Switch from '@mui/material/Switch';
import { useState } from 'react';

interface UsuarioFormProps {
    form: {
        nome: string;
        email: string;
        senha?: string;
        atendente?: boolean;
        whatsapp?: string | null;
    };
    onChange: (form: any) => void;
    isEditing: boolean;
}

export function UsuarioForm({ form, onChange, isEditing }: UsuarioFormProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="form-grid">
            <div className="form-group full">
                <label className="form-label">Nome *</label>
                <input
                    className="form-control"
                    value={form.nome}
                    onChange={(e) => onChange({ ...form, nome: e.target.value })}
                    placeholder="Nome completo"
                />
            </div>

            <div className="form-group full">
                <label className="form-label">E-mail *</label>
                <input
                    className="form-control"
                    type="email"
                    value={form.email}
                    onChange={(e) => onChange({ ...form, email: e.target.value })}
                    placeholder="email@exemplo.com"
                />
            </div>

            <div className="form-group full">
                <label className="form-label">
                    Senha {isEditing ? '(deixe em branco para manter)' : '*'}
                </label>
                <div style={{ position: 'relative' }}>
                    <input
                        className="form-control"
                        type={showPassword ? 'text' : 'password'}
                        value={form.senha || ''}
                        onChange={(e) => onChange({ ...form, senha: e.target.value })}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        style={{ paddingRight: 40 }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: 16,
                        }}
                    >
                        {showPassword ? '🙈' : '👁'}
                    </button>
                </div>
            </div>

            <div className="form-group full">
                <label className="form-label">
                    Atendente
                </label>
                <Switch
                    checked={form.atendente}
                    onChange={(e) => onChange({ ...form, atendente: e.target.checked })}
                />
            </div>

            {form.atendente && (
                <div className="form-group full">
                    <label className="form-label">WhatsApp do Atendente</label>
                    <input
                        className="form-control"
                        type="tel"
                        value={form.whatsapp || ''}
                        onChange={(e) => onChange({ ...form, whatsapp: e.target.value })}
                        placeholder="(99) 99999-9999"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                        Número exibido no catálogo para contato
                    </span>
                </div>
            )}
        </div>
    );
}

import { base64Image } from '@/lib/images';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { z } from 'zod';
import { signIn } from '@/lib/auth-client';
import { toast } from 'react-toastify';
import { LOGIN_STYLES } from '@/utils/loginUtils';

const loginSchema = z.object({
    email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginInput = z.infer<typeof loginSchema>;

interface LoginPageProps {
    onLoginSuccess: () => void;
    empresaData: any;
}

export function LoginPage({ onLoginSuccess, empresaData }: LoginPageProps) {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const styleId = 'login-page-styles';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.innerHTML = LOGIN_STYLES;
            document.head.appendChild(styleEl);
        }
        return () => {
            const el = document.getElementById(styleId);
            if (el) {
                el.remove();
            }
        };
    }, []);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginInput) => {
        setLoading(true);
        try {
            await signIn.email({ email: data.email, password: data.password }, {
                onRequest: () => setLoading(true),
                onSuccess: () => {
                    setLoading(false);
                    toast.success('Login efetuado com success!');
                    onLoginSuccess();
                },
                onError: (ctx) => {
                    setLoading(false);
                    toast.error(ctx.error.message || 'Credenciais inválidas. Tente novamente.');
                }
            });
        } catch {
            setLoading(false);
            toast.error('Ocorreu um erro inesperado.');
        }
    };

    return (
        <div className="login-root">
            {/* Animated background layers */}
            <div className="login-bg-gradient" />
            <div className="login-bg-grid" />
            <div className="login-orb login-orb-a" />
            <div className="login-orb login-orb-b" />
            <div className="login-orb login-orb-c" />

            {/* Card */}
            <div className="login-card">
                <div className="login-card-bar" />

                {/* Logo */}
                <div className="login-logo">
                    <div className="login-logo-icon"><img src={base64Image(empresaData?.logoUrl) ?? "/favicon.svg"} alt="" style={{ width: '100%', height: '100%', borderRadius: '20%' }} /></div>

                    <div>
                        <h2 className="login-logo-title">{empresaData?.nome ?? 'Bem-vindo (a)'}</h2>
                        <p className="login-logo-sub">Insira suas credenciais para acessar o sistema</p>
                    </div>
                </div>

                {/* Form */}
                <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
                    <div className="login-field">
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
                                    placeholder="seuemail@exemplo.com"
                                    error={!!errors.email}
                                    helperText={errors.email?.message}
                                    disabled={loading}
                                />
                            )}
                        />
                    </div>

                    <div className="login-field">
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Senha *"
                                    type={showPassword ? 'text' : 'password'}
                                    variant="outlined"
                                    fullWidth
                                    placeholder="••••••••"
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                    disabled={loading}
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                        tabIndex={-1}
                                                        size="small"
                                                        disabled={loading}
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

                    <div className="login-submit-wrap">
                        <button
                            className="login-btn"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    Processando
                                    <span className="login-dots">
                                        <span className="login-dot" />
                                        <span className="login-dot" />
                                        <span className="login-dot" />
                                    </span>
                                </>
                            ) : 'Entrar'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}

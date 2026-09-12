import { ImageUpload } from '@/components/ui/ImageUpload';
import { useMemo, useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlineOutlined';
import StorageOutlined from '@mui/icons-material/StorageOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import RocketLaunchOutlined from '@mui/icons-material/RocketLaunchOutlined';
import { toast, ToastContainer } from 'react-toastify';
import { trpc } from '@/lib/trpc';
import {
    databaseConnectionSchema,
    deployMasterSchema,
    empresaSchema,
    type DatabaseConnectionInput,
    type DeployMasterInput,
    type EmpresaInput,
} from '@/lib/schemas';

type FieldErrors = Record<string, string>;

const initialConnection: DatabaseConnectionInput = {
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
};

const initialCompany: EmpresaInput = {
    nome: '', logoUrl: '', cnpj: '', telefone: '', logradouro: '', numero: '', cep: '', bairro: '', complemento: '',
};

const initialMaster: DeployMasterInput = { nome: '', email: '', senha: '' };

function schemaErrors(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }) {
    if (result.success || !result.error) return {};
    return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

function getErrorMessage(error: unknown) {
    if (error && typeof error === 'object' && 'message' in error) return String(error.message);
    return 'Não foi possível concluir a operação.';
}

export function DeployPage({ isDarkMode }: { isDarkMode: boolean }) {
    const [token, setToken] = useState('');
    const [tokenVisible, setTokenVisible] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [tokenValidated, setTokenValidated] = useState(false);
    const [activeStep, setActiveStep] = useState(1);
    const [connectionTested, setConnectionTested] = useState(false);
    const [connection, setConnection] = useState(initialConnection);
    const [company, setCompany] = useState(initialCompany);
    const [master, setMaster] = useState(initialMaster);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [finished, setFinished] = useState(false);
    const [installed, setInstalled] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState<Array<{ id: string; title: string }>>([]);
    const [resultMode, setResultMode] = useState<'created' | 'updated'>('created');

    const validateToken = trpc.deploy.validateToken.useMutation();
    const testConnection = trpc.deploy.testConnection.useMutation();
    const executeDeploy = trpc.deploy.execute.useMutation();
    const updateDatabase = trpc.deploy.update.useMutation();
    const busy = executeDeploy.isPending || updateDatabase.isPending || testConnection.isPending;

    const masterIsValid = useMemo(() => deployMasterSchema.safeParse(master).success, [master]);

    const handleToken = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token.trim()) return setErrors({ token: 'Informe o token de implantação' });
        try {
            await validateToken.mutateAsync({ token });
            setErrors({});
            setTokenValidated(true);
            toast.success('Token validado. Configure a implantação.');
        } catch (error) {
            setErrors({ token: getErrorMessage(error) });
        }
    };

    const handleTestConnection = async () => {
        const parsed = databaseConnectionSchema.safeParse(connection);
        if (!parsed.success) return setErrors(schemaErrors(parsed));
        try {
            const status = await testConnection.mutateAsync({ token, connection: parsed.data });
            setInstalled(status.installed);
            setPendingUpdates(status.pendingUpdates);
            setErrors({});
            setConnectionTested(true);
            toast.success('Conexão realizada com sucesso.');
        } catch (error) {
            setConnectionTested(false);
            toast.error(getErrorMessage(error));
        }
    };

    const handleCompany = (event: React.FormEvent) => {
        event.preventDefault();
        const parsed = empresaSchema.safeParse(company);
        if (!parsed.success) return setErrors(schemaErrors(parsed));
        setErrors({});
        setCompany(parsed.data);
        setActiveStep(3);
    };

    const handleDeploy = async (event: React.FormEvent) => {
        event.preventDefault();
        const companyResult = empresaSchema.safeParse(company);
        const masterResult = deployMasterSchema.safeParse(master);
        if (!masterResult.success) return setErrors(schemaErrors(masterResult));
        if (!companyResult.success) {
            setActiveStep(2);
            return setErrors(schemaErrors(companyResult));
        }
        try {
            await executeDeploy.mutateAsync({
                token,
                connection,
                company: companyResult.data,
                masterUser: masterResult.data,
            });
            setErrors({});
            setResultMode('created');
            setFinished(true);
            toast.success('Implantação concluída com sucesso!', { autoClose: 5000 });
        } catch (error) {
            toast.error(getErrorMessage(error), { autoClose: 7000 });
        }
    };

    const handleUpdate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!connectionTested || !installed) return;
        try {
            await updateDatabase.mutateAsync({ token, connection });
            setResultMode('updated');
            setFinished(true);
            setErrors({});
            toast.success('Banco atualizado com sucesso!');
        } catch (error) {
            toast.error(getErrorMessage(error), { autoClose: 7000 });
        }
    };

    const updateConnection = <K extends keyof DatabaseConnectionInput>(key: K, value: DatabaseConnectionInput[K]) => {
        setConnection((current) => ({ ...current, [key]: value }));
        setConnectionTested(false);
        setInstalled(false);
        setPendingUpdates([]);
        setErrors((current) => ({ ...current, [key]: '' }));
    };

    const updateCompany = <K extends keyof EmpresaInput>(key: K, value: EmpresaInput[K]) => {
        setCompany((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: '' }));
    };

    const updateMaster = <K extends keyof DeployMasterInput>(key: K, value: DeployMasterInput[K]) => {
        setMaster((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: '' }));
    };

    const steps = [
        { number: 1, label: 'Banco de dados', icon: <StorageOutlined fontSize="small" /> },
        { number: 2, label: installed ? 'Atualização' : 'Empresa', icon: <BusinessOutlined fontSize="small" /> },
        ...(!installed ? [{ number: 3, label: 'Usuário master', icon: <AdminPanelSettingsOutlined fontSize="small" /> }] : []),
    ];

    return (
        <main className="deploy-page">
            <div className="deploy-background deploy-background-one" />
            <div className="deploy-background deploy-background-two" />
            <section className={`deploy-shell ${!tokenValidated ? 'deploy-shell-token' : ''}`}>
                <header className="deploy-brand">
                    <div className="deploy-brand-icon"><StorageOutlined /></div>
                    <div>
                        <strong>RentalManager</strong>
                        <span>Implantação e atualização</span>
                    </div>
                </header>

                {!tokenValidated ? (
                    <div className="deploy-token-card">
                        <div className="deploy-token-icon"><LockOutlined /></div>
                        <p className="deploy-eyebrow">ACESSO PROTEGIDO</p>
                        <h1>Prepare seu ambiente</h1>
                        <p className="deploy-description">Informe o token definido para esta instalação para implantar ou atualizar o banco de dados.</p>
                        <form onSubmit={handleToken}>
                            <TextField
                                value={token}
                                onChange={(event) => { setToken(event.target.value); setErrors({}); }}
                                label="Token de implantação"
                                type={tokenVisible ? 'text' : 'password'}
                                autoFocus
                                autoComplete="off"
                                fullWidth
                                error={!!errors.token}
                                helperText={errors.token}
                                slotProps={{
                                    input: {
                                        startAdornment: <InputAdornment position="start"><LockOutlined fontSize="small" /></InputAdornment>,
                                        endAdornment: <InputAdornment position="end"><IconButton onClick={() => setTokenVisible(!tokenVisible)} edge="end">{tokenVisible ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                                    },
                                }}
                            />
                            <button className="btn btn-primary deploy-main-button" disabled={validateToken.isPending}>
                                {validateToken.isPending ? 'Validando...' : 'Validar token'}
                            </button>
                        </form>
                        <p className="deploy-security-note">🔒 O token é validado com segurança e não é armazenado no navegador.</p>
                    </div>
                ) : finished ? (
                    <div className="deploy-token-card deploy-success-card">
                        <div className="deploy-success-icon"><CheckCircleOutline /></div>
                        <p className="deploy-eyebrow">{resultMode === 'updated' ? 'ATUALIZAÇÃO CONCLUÍDA' : 'IMPLANTAÇÃO CONCLUÍDA'}</p>
                        <h1>Ambiente pronto para uso</h1>
                        <p className="deploy-description">{resultMode === 'updated' ? 'As atualizações pendentes foram aplicadas. Os cadastros e acessos existentes foram mantidos.' : 'O banco, os dados da empresa e o usuário master foram criados com sucesso.'}</p>
                        <a className="btn btn-primary deploy-main-button" href="/login">Ir para o login</a>
                    </div>
                ) : (
                    <div className="deploy-wizard">
                        <div className="deploy-heading">
                            <div><p className="deploy-eyebrow">{installed ? 'BANCO EXISTENTE' : 'CONFIGURAÇÃO DO AMBIENTE'}</p><h1>{installed ? 'Atualização do banco de dados' : 'Implantação do banco de dados'}</h1><p>{installed ? 'Revise e aplique as atualizações disponíveis para esta instalação.' : 'Teste a conexão para identificar se o banco precisa de implantação ou atualização.'}</p></div>
                            <div className="deploy-secure-badge"><LockOutlined fontSize="small" /> Sessão protegida</div>
                        </div>

                        <nav className="deploy-steps" aria-label="Etapas da implantação">
                            {steps.map((step, index) => {
                                const complete = activeStep > step.number;
                                const available = step.number === 1 || (step.number === 2 && connectionTested) || step.number < activeStep;
                                return <div key={step.number} className="deploy-step-wrap">
                                    <button type="button" disabled={!available || busy} onClick={() => available && setActiveStep(step.number)} className={`deploy-step ${activeStep === step.number ? 'active' : ''} ${complete ? 'complete' : ''}`}>
                                        <span className="deploy-step-number">{complete ? <CheckCircleOutline fontSize="small" /> : step.icon}</span>
                                        <span><small>ETAPA {step.number}</small><strong>{step.label}</strong></span>
                                    </button>
                                    {index < steps.length - 1 && <div className={`deploy-step-line ${complete ? 'complete' : ''}`} />}
                                </div>;
                            })}
                        </nav>

                        <fieldset className="deploy-form-card" disabled={busy} style={{ minWidth: 0, margin: 0 }}>
                            {activeStep === 1 && <form onSubmit={(event) => { event.preventDefault(); void handleTestConnection(); }}>
                                <div className="deploy-form-title"><div className="deploy-form-icon"><StorageOutlined /></div><div><h2>Conexão com o banco</h2><p>Informe as credenciais do servidor PostgreSQL de destino.</p></div></div>
                                <div className="form-grid deploy-fields">
                                    <TextField className="form-group full" label="Host *" value={connection.host} onChange={(e) => updateConnection('host', e.target.value)} error={!!errors.host} helperText={errors.host} placeholder="postgresql ou db.exemplo.com" />
                                    <TextField label="Porta *" type="number" value={connection.port} onChange={(e) => updateConnection('port', Number(e.target.value))} error={!!errors.port} helperText={errors.port} />
                                    <TextField label="Database *" value={connection.database} onChange={(e) => updateConnection('database', e.target.value)} error={!!errors.database} helperText={errors.database} />
                                    <TextField label="Usuário *" value={connection.username} onChange={(e) => updateConnection('username', e.target.value)} error={!!errors.username} helperText={errors.username} />
                                    <TextField label="Senha *" type={passwordVisible ? 'text' : 'password'} value={connection.password} onChange={(e) => updateConnection('password', e.target.value)} error={!!errors.password} helperText={errors.password} slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton onClick={() => setPasswordVisible(!passwordVisible)} edge="end">{passwordVisible ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }} />
                                </div>
                                <div className="deploy-actions">
                                    {connectionTested && <span className="deploy-connected"><CheckCircleOutline fontSize="small" /> Conexão testada</span>}
                                    <button type="submit" className="btn btn-primary" disabled={testConnection.isPending}>{testConnection.isPending ? 'Testando...' : connectionTested ? 'Testar novamente' : 'Testar conexão'}</button>
                                    <button type="button" className="btn btn-primary" disabled={!connectionTested} onClick={() => setActiveStep(2)}>Continuar →</button>
                                </div>
                            </form>}

                            {activeStep === 2 && installed && <form onSubmit={handleUpdate}>
                                <div className="deploy-form-title"><div className="deploy-form-icon"><StorageOutlined /></div><div><h2>Atualizar banco existente</h2><p>Destino: {connection.database} em {connection.host}:{connection.port}</p></div></div>
                                <p>A estrutura do banco será atualizada para esta versão do RentalManager. Empresa, usuários e permissões existentes serão preservados.</p>
                                {pendingUpdates.length > 0 ? <>
                                    <h3 style={{ marginTop: 20 }}>Atualizações pendentes</h3>
                                    <ul>{pendingUpdates.map((update) => <li key={update.id}>{update.title}</li>)}</ul>
                                    {pendingUpdates.some((update) => update.id === '20260912000100_images_base64') && <p>Referências antigas de imagens externas serão removidas. As imagens já salvas em base64 serão preservadas.</p>}
                                </> : <p style={{ marginTop: 20 }}>Nenhuma atualização de dados pendente. Você pode verificar e atualizar a estrutura do banco.</p>}
                                <div className="deploy-actions">
                                    <button type="button" className="btn btn-ghost" onClick={() => setActiveStep(1)}>← Voltar</button>
                                    <button type="submit" className="btn btn-primary" disabled={!connectionTested || updateDatabase.isPending}>{updateDatabase.isPending ? 'Atualizando banco...' : 'Atualizar banco'}</button>
                                </div>
                            </form>}

                            {activeStep === 2 && !installed && <form onSubmit={handleCompany}>
                                <div className="deploy-form-title"><div className="deploy-form-icon"><BusinessOutlined /></div><div><h2>Dados da empresa</h2><p>Cadastre as informações que identificarão o cliente no sistema.</p></div></div>
                                <div className="form-grid deploy-fields">
                                    <TextField className="form-group full" label="Nome da empresa *" value={company.nome} onChange={(e) => updateCompany('nome', e.target.value)} error={!!errors.nome} helperText={errors.nome} />
                                    <TextField label="CNPJ" value={company.cnpj ?? ''} onChange={(e) => updateCompany('cnpj', e.target.value)} />
                                    <TextField label="Telefone" value={company.telefone ?? ''} onChange={(e) => updateCompany('telefone', e.target.value)} />
                                    <ImageUpload label="Logotipo" value={company.logoUrl} onChange={(value) => updateCompany('logoUrl', value)} error={errors.logoUrl} />
                                    <TextField label="CEP" value={company.cep ?? ''} onChange={(e) => updateCompany('cep', e.target.value)} />
                                    <TextField label="Bairro" value={company.bairro ?? ''} onChange={(e) => updateCompany('bairro', e.target.value)} />
                                    <TextField label="Logradouro" value={company.logradouro ?? ''} onChange={(e) => updateCompany('logradouro', e.target.value)} />
                                    <TextField label="Número" value={company.numero ?? ''} onChange={(e) => updateCompany('numero', e.target.value)} />
                                    <TextField className="form-group full" label="Complemento" value={company.complemento ?? ''} onChange={(e) => updateCompany('complemento', e.target.value)} />
                                </div>
                                <div className="deploy-actions"><button type="button" className="btn btn-ghost" onClick={() => setActiveStep(1)}>← Voltar</button><button type="submit" className="btn btn-primary">Continuar →</button></div>
                            </form>}

                            {activeStep === 3 && !installed && <form onSubmit={handleDeploy}>
                                <div className="deploy-form-title"><div className="deploy-form-icon"><AdminPanelSettingsOutlined /></div><div><h2>Usuário administrador</h2><p>Este será o primeiro acesso, criado automaticamente como master.</p></div><span className="deploy-master-badge">MASTER</span></div>
                                <div className="form-grid deploy-fields">
                                    <TextField className="form-group full" label="Nome completo *" value={master.nome} onChange={(e) => updateMaster('nome', e.target.value)} error={!!errors.nome} helperText={errors.nome} />
                                    <TextField label="E-mail *" type="email" value={master.email} onChange={(e) => updateMaster('email', e.target.value)} error={!!errors.email} helperText={errors.email} />
                                    <TextField label="Senha *" type={passwordVisible ? 'text' : 'password'} value={master.senha} onChange={(e) => updateMaster('senha', e.target.value)} error={!!errors.senha} helperText={errors.senha || 'Mínimo de 6 caracteres'} slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton onClick={() => setPasswordVisible(!passwordVisible)} edge="end">{passwordVisible ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }} />
                                </div>
                                <div className="deploy-master-info"><AdminPanelSettingsOutlined /><span><strong>Acesso total habilitado</strong><small>O usuário terá permissão integral sobre todos os módulos.</small></span></div>
                                <div className="deploy-actions"><button type="button" className="btn btn-ghost" onClick={() => setActiveStep(2)}>← Voltar</button><button type="submit" className="btn btn-primary deploy-button" disabled={!masterIsValid || executeDeploy.isPending}><RocketLaunchOutlined fontSize="small" />{executeDeploy.isPending ? 'Implantando...' : 'Fazer deploy'}</button></div>
                            </form>}
                        </fieldset>
                    </div>
                )}
            </section>
            <ToastContainer position="top-right" autoClose={3000} newestOnTop closeOnClick pauseOnHover theme={isDarkMode ? 'dark' : 'light'} />
        </main>
    );
}

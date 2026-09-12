import { resolveAppRoute, sessionScope, permittedTabs } from '@/lib/appNavigation';
import { base64Image } from '@/lib/images';
import { useState, useEffect, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/lib/trpc';

import { MenuPage } from '@/pages/MenuPage';
import { LoginPage } from '@/pages/LoginPage';
import { DeployPage } from '@/pages/DeployPage';

const ClientesPage = lazy(() => import('@/pages/ClientesPage').then(m => ({ default: m.ClientesPage })));
const EstoquePage = lazy(() => import('@/pages/EstoquePage').then(m => ({ default: m.EstoquePage })));
const UsuariosPage = lazy(() => import('@/pages/UsuariosPage').then(m => ({ default: m.UsuariosPage })));
const AgendaPage = lazy(() => import('@/pages/AgendaPage').then(m => ({ default: m.AgendaPage })));
const FinancePage = lazy(() => import('@/pages/FinancePage').then(m => ({ default: m.FinancePage })));
const CatalogPage = lazy(() => import('@/pages/CatalogPage').then(m => ({ default: m.CatalogPage })));
const CanvasPage = lazy(() => import('@/pages/CanvasPage').then(m => ({ default: m.CanvasPage })));
const EmpresaPage = lazy(() => import('@/pages/EmpresaPage').then(m => ({ default: m.EmpresaPage })));
const GruposPage = lazy(() => import('@/pages/GruposPage').then(m => ({ default: m.GruposPage })));

import { useSession, signOut } from '@/lib/auth-client';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useMemo } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function PageLoader() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '200px',
            color: 'var(--text-secondary)'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '28px',
                    height: '28px',
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 10px auto'
                }} />
                <p style={{ fontSize: '12px' }}>Carregando...</p>
            </div>
        </div>
    );
}

// ─── Tab system ───────────────────────────────────────────────────────────────

interface Tab {
    id: string;
    label: string;
    icon: string;
}

interface SessionModule {
    id: string;
    nome: string;
    descricao?: string | null;
    icone: string;
    ordem: number;
}

function renderPage(id: string) {
    switch (id) {
        case 'clientes': return <ClientesPage />;
        case 'estoque': return <EstoquePage />;
        case 'usuarios': return <UsuariosPage />;
        case 'grupos': return <GruposPage />;
        case 'agenda': return <AgendaPage />;
        case 'financeiro': return <FinancePage />;
        case 'canvas': return <CanvasPage />;
        case 'empresa': return <EmpresaPage />;
        default: return null;
    }
}

// ─── QueryClient ──────────────────────────────────────────────────────────────


// ─── Main App ─────────────────────────────────────────────────────────────────
function AppInner({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean, setIsDarkMode: (v: boolean) => void }) {
    const { data: session, isPending: sessionLoading } = useSession();
    const [openTabs, setOpenTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null); // null = menu
    const pathname = window.location.pathname;
    const isCatalog = pathname === '/' || pathname === '/catalog' || pathname === '/catalogo';
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const allowedPages = useMemo(
        () => new Set((session?.user as { allowedPages?: string[] } | undefined)?.allowedPages
            ?? []),
        [session],
    );
    const allowedModules = useMemo(
        () => ((session?.user as { allowedModules?: SessionModule[] } | undefined)?.allowedModules ?? []),
        [session],
    );
    const availableTabs = useMemo(() => Object.fromEntries(
        allowedModules.map((module) => [module.id, {
            id: module.id,
            label: module.nome,
            icon: module.icone,
        }]),
    ) as Record<string, Tab>, [allowedModules]);

    // Theme effect
    useEffect(() => {
        if (!isDarkMode) {
            document.body.classList.add('light');
        } else {
            document.body.classList.remove('light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (isCatalog) {
            if (pathname !== '/') window.history.replaceState({}, '', '/');
            return;
        }
        if (sessionLoading) return;
        const target = resolveAppRoute(pathname, Boolean(session));
        if (target !== pathname) window.location.replace(target);
    }, [pathname, isCatalog, sessionLoading, session]);

    const visibleTabs = permittedTabs(openTabs, allowedPages, availableTabs);
    const visibleActiveTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : null;

    const { data: empresaData } = trpc.empresa.catalog.useQuery(
        undefined,
        { enabled: !isCatalog }
    );

    if (isCatalog) {
        return (
            <Suspense fallback={<PageLoader />}>
                <CatalogPage />
            </Suspense>
        );
    }

    if (sessionLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid var(--border)',
                        borderTopColor: 'var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 12px auto'
                    }} />
                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                    <p style={{ fontSize: '13px' }}>Carregando sessão...</p>
                </div>
            </div>
        );
    }

    if (pathname === '/login' && !session) {
        return <LoginPage empresaData={empresaData} onLoginSuccess={() => window.location.replace('/menu')} />;
    }
    if (!session || pathname !== '/menu') return <PageLoader />;

    const navigate = (id: string) => {
        setIsSidebarOpen(false);
        if (id === 'menu') {
            setActiveTab(null);
            return;
        }

        const tab = availableTabs[id];
        if (!tab || !allowedPages.has(id)) return;

        if (!openTabs.find((t) => t.id === id)) {
            setOpenTabs((prev) => [...prev, tab]);
        }
        setActiveTab(id);
    };

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newTabs = visibleTabs.filter((t) => t.id !== id);
        setOpenTabs(newTabs);
        if (activeTab === id) {
            setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        }
    };

    const currentSidebarId = visibleActiveTab ?? 'menu';
    const mobileTitle = visibleActiveTab ? availableTabs[visibleActiveTab]?.label ?? 'RentalManager' : 'Menu';

    return (
        <div className="app-layout">
            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon"><img src={base64Image(empresaData?.logoUrl) ?? "/favicon.svg"} alt="" style={{ width: '100%', height: '100%', borderRadius: '20%' }} /></div>
                    <span className="sidebar-logo-text">{empresaData?.nome}</span>
                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'right', alignItems: 'center' }}
                        onClick={() => setIsDarkMode(!isDarkMode)}
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {[{ id: 'menu', nome: 'Menu', icone: '🏠' }, ...allowedModules].map((item) => (
                        <button
                            key={item.id}
                            className={`sidebar-item${currentSidebarId === item.id ? ' active' : ''}`}
                            onClick={() => navigate(item.id)}
                        >
                            <span className="item-icon">{item.icone}</span>
                            <span className="item-label">{item.nome}</span>
                        </button>
                    ))}

                    <div style={{ marginTop: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => {
                                window.location.assign('/');
                            }}
                        >
                            🌐 Ver catálogo
                        </button>
                        <button
                            className="btn btn-danger btn-sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={async () => {
                                await signOut();
                                setOpenTabs([]);
                                setActiveTab(null);
                                window.location.replace('/login');
                            }}
                        >
                            🚪 Sair
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main area */}
            <div className="main-area">
                {/* Mobile Topbar */}
                <div className="mobile-topbar desktop-hide">
                    <button className="mobile-hamburger" onClick={() => setIsSidebarOpen(true)}>
                        ☰
                    </button>
                    <span className="mobile-title">{mobileTitle}</span>
                </div>

                {/* Tab bar */}
                {visibleTabs.length > 0 && (
                    <div className="tab-bar">
                        {visibleTabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={`tab-item${visibleActiveTab === tab.id ? ' active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                                <button
                                    className="tab-close"
                                    onClick={(e) => closeTab(tab.id, e)}
                                    title="Fechar"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Page content */}
                <main className="page-content">
                    {/* Menu page */}
                    <div className={`page-view${visibleActiveTab === null ? ' active' : ''}`}>
                        <MenuPage onNavigate={navigate} modules={allowedModules} />
                    </div>

                    {/* Tab pages */}
                    {visibleTabs.map((tab) => (
                        visibleActiveTab === tab.id && (
                            <div
                                key={tab.id}
                                className="page-view active"
                            >
                                <div className={`page-view-content${tab.id === 'canvas' ? ' page-view-content--kanvas' : ''}`}>
                                    <Suspense fallback={<PageLoader />}>
                                        {renderPage(tab.id)}
                                    </Suspense>
                                </div>
                            </div>
                        )
                    ))}
                </main>
            </div>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={isDarkMode ? 'dark' : 'light'}
            />
        </div>
    );
}

// Remount both the query cache and the tab state for every authenticated session.
function SessionContent({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean; setIsDarkMode: (value: boolean) => void }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
    }));
    useEffect(() => () => queryClient.clear(), [queryClient]);
    return (
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    {window.location.pathname === '/deploy'
                        ? <DeployPage isDarkMode={isDarkMode} />
                        : <AppInner isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
                </QueryClientProvider>
            </trpc.Provider>
    );
}

export default function App() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const { data: session } = useSession();
    const sessionKey = sessionScope(session);
    const theme = useMemo(() => createTheme({
        palette: {
            mode: isDarkMode ? 'dark' : 'light',
        },
        components: {
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'var(--border)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'var(--accent)',
                            opacity: 0.7,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'var(--accent)',
                            borderWidth: '1px',
                        },
                    },
                },
            },
            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        color: 'var(--text-muted)',
                        '&.Mui-focused': {
                            color: 'var(--accent)',
                        },
                    },
                },
            },
        },
    }), [isDarkMode]);

    return (
        <ThemeProvider theme={theme}>
            <SessionContent key={sessionKey} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        </ThemeProvider>
    );
}

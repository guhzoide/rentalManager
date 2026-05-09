import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/lib/trpc';

import { MenuPage } from '@/pages/MenuPage';
import { ClientesPage } from '@/pages/ClientesPage';
import { EstoquePage } from '@/pages/EstoquePage';
import { UsuariosPage } from '@/pages/UsuariosPage';
import { AgendaPage } from '@/pages/AgendaPage';
import { CatalogPage } from '@/pages/CatalogPage';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useMemo } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ─── Tab system ───────────────────────────────────────────────────────────────

interface Tab {
    id: string;
    label: string;
    icon: string;
}

const ALL_TABS: Record<string, Tab> = {
    agenda: { id: 'agenda', label: 'Agenda', icon: '📅' },
    clientes: { id: 'clientes', label: 'Clientes', icon: '👥' },
    estoque: { id: 'estoque', label: 'Estoque', icon: '📦' },
    usuarios: { id: 'usuarios', label: 'Usuários', icon: '👤' },
};

const SIDEBAR_ITEMS = [
    { id: 'menu', label: 'Menu', icon: '🏠' },
    { id: 'agenda', label: 'Agenda', icon: '📅' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'estoque', label: 'Estoque', icon: '📦' },
    { id: 'usuarios', label: 'Usuários', icon: '👤' },
];

function renderPage(id: string) {
    switch (id) {
        case 'clientes': return <ClientesPage />;
        case 'estoque': return <EstoquePage />;
        case 'usuarios': return <UsuariosPage />;
        case 'agenda': return <AgendaPage />;
        default: return null;
    }
}

// ─── QueryClient ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// ─── Main App ─────────────────────────────────────────────────────────────────
function AppInner({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean, setIsDarkMode: (v: boolean) => void }) {
    const [openTabs, setOpenTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null); // null = menu
    const [isCatalog, setIsCatalog] = useState(false);

    // Theme effect
    useEffect(() => {
        if (!isDarkMode) {
            document.body.classList.add('light');
        } else {
            document.body.classList.remove('light');
        }
    }, [isDarkMode]);

    // Simple routing for Catalog
    useEffect(() => {
        const checkRoute = () => {
            setIsCatalog(window.location.pathname === '/catalog');
        };
        checkRoute();
        window.addEventListener('popstate', checkRoute);
        return () => window.removeEventListener('popstate', checkRoute);
    }, []);

    if (isCatalog) {
        return <CatalogPage />;
    }

    const navigate = (id: string) => {
        if (id === 'menu') {
            setActiveTab(null);
            return;
        }

        const tab = ALL_TABS[id];
        if (!tab) return;

        if (!openTabs.find((t) => t.id === id)) {
            setOpenTabs((prev) => [...prev, tab]);
        }
        setActiveTab(id);
    };

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newTabs = openTabs.filter((t) => t.id !== id);
        setOpenTabs(newTabs);
        if (activeTab === id) {
            setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        }
    };

    const currentSidebarId = activeTab ?? 'menu';

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🏗</div>
                    <span className="sidebar-logo-text">LocaSystem</span>
                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'right', alignItems: 'center' }}
                        onClick={() => setIsDarkMode(!isDarkMode)}
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {SIDEBAR_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            className={`sidebar-item${currentSidebarId === item.id ? ' active' : ''}`}
                            onClick={() => navigate(item.id)}
                        >
                            <span className="item-icon">{item.icon}</span>
                            <span className="item-label">{item.label}</span>
                        </button>
                    ))}

                    <div style={{ marginTop: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => {
                                window.history.pushState({}, '', '/catalog');
                                setIsCatalog(true);
                            }}
                        >
                            🌐 Ver Catálogo
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main area */}
            <div className="main-area">
                {/* Tab bar */}
                {openTabs.length > 0 && (
                    <div className="tab-bar">
                        {openTabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
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
                <div className="page-content">
                    {/* Menu page */}
                    <div style={{ display: activeTab === null ? 'block' : 'none', height: '100%' }}>
                        <MenuPage onNavigate={navigate} />
                    </div>

                    {/* Tab pages */}
                    {openTabs.map((tab) => (
                        activeTab === tab.id && (
                            <div
                                key={tab.id}
                                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                            >
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    {renderPage(tab.id)}
                                </div>
                            </div>
                        )
                    ))}
                </div>
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

export default function App() {
    const [isDarkMode, setIsDarkMode] = useState(true);

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
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    <AppInner isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
                </QueryClientProvider>
            </trpc.Provider>
        </ThemeProvider>
    );
}


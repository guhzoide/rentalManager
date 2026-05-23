import { useSession } from '@/lib/auth-client';

interface MenuPageProps {
    onNavigate: (module: string) => void;
}

const modules = [
    {
        id: 'agenda',
        icon: '📅',
        title: 'Agenda',
        desc: 'Gerencie os agendamentos de locação por data',
        color: 'rgba(99, 102, 241, 0.2)',
    },
    {
        id: 'clientes',
        icon: '👥',
        title: 'Clientes',
        desc: 'Cadastre e gerencie os clientes da locadora',
        color: 'rgba(34, 197, 94, 0.2)',
    },
    {
        id: 'estoque',
        icon: '📦',
        title: 'Estoque',
        desc: 'Controle os itens disponíveis para locação',
        color: 'rgba(245, 158, 11, 0.2)',
    },
    {
        id: 'usuarios',
        icon: '👤',
        title: 'Usuários',
        desc: 'Manutenção de usuários do sistema',
        color: 'rgba(239, 68, 68, 0.2)',
    },
    {
        id: 'financeiro',
        icon: '💰',
        title: 'Financeiro',
        desc: 'Gerencie o fluxo de caixa e transações',
        color: 'rgba(16, 185, 129, 0.2)',
    },
    {
        id: 'kanvas',
        icon: '🖼️',
        title: 'Kanvas',
        desc: 'Crie e gerencie documentos personalizados',
        color: 'rgba(99, 102, 241, 0.2)',
    },
];

export function MenuPage({ onNavigate }: MenuPageProps) {
    const { data: session } = useSession();

    return (
        <div className="menu-page">
            <div className="menu-welcome">
                {/* <h1>Sistema de locação</h1> */}
                <p>Bem-vindo(a), {session?.user?.name}!</p>
            </div>

            <div className="menu-grid">
                {modules.map((mod) => (
                    <button
                        key={mod.id}
                        className="menu-card"
                        onClick={() => onNavigate(mod.id)}
                    >
                        <div
                            className="menu-card-icon"
                            style={{ background: mod.color }}
                        >
                            {mod.icon}
                        </div>
                        <div>
                            <div className="menu-card-title">{mod.title}</div>
                            <div className="menu-card-desc">{mod.desc}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

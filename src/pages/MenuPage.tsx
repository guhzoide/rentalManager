import { useSession } from '@/lib/auth-client';

interface MenuPageProps {
    onNavigate: (module: string) => void;
    modules: Array<{
        id: string;
        nome: string;
        descricao?: string | null;
        icone: string;
    }>;
}

export function MenuPage({ onNavigate, modules }: MenuPageProps) {
    const { data: session } = useSession();

    return (
        <div className="menu-page">
            <div className="menu-welcome">
                {/* <h1>Sistema de locação</h1> */}
                <p>Bem-vindo(a), {session?.user?.name}!</p>
            </div>

            <div className="menu-grid">
                {modules.map((module) => (
                    <button
                        key={module.id}
                        className="menu-card"
                        onClick={() => onNavigate(module.id)}
                    >
                        <div
                            className="menu-card-icon"
                            style={{ background: 'rgba(99, 102, 241, 0.2)' }}
                        >
                            {module.icone}
                        </div>
                        <div>
                            <div className="menu-card-title">{module.nome}</div>
                            <div className="menu-card-desc">{module.descricao}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

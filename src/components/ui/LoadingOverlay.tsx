import '@/styles/LoadingOverlay.css';

interface LoadingOverlayProps {
    title: string;
    description?: string;
    tone?: 'theme' | 'catalog';
}

export function LoadingOverlay({ title, description, tone = 'theme' }: LoadingOverlayProps) {
    return (
        <div
            className={`app-loading-overlay app-loading-overlay--${tone}`}
            role="status"
            aria-live="polite"
            aria-label={title}
        >
            <div className="app-loading-card">
                <div className="app-loading-orbit" aria-hidden="true">
                    <span className="app-loading-spark app-loading-spark--one">✦</span>
                    <span className="app-loading-spark app-loading-spark--two">✦</span>
                    <span className="app-loading-package">
                        <i className="app-loading-package-bow" />
                        <i className="app-loading-package-lid" />
                        <i className="app-loading-package-body" />
                    </span>
                </div>
                <strong>{title}</strong>
                {description && <span>{description}</span>}
                <div className="app-loading-dots" aria-hidden="true"><i /><i /><i /></div>
            </div>
        </div>
    );
}

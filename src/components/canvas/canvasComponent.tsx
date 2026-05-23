import React from 'react';

export function ToolbarButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 13,
            }}
        >
            {children}
        </button>
    );
}

export function Divider() {
    return <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginBottom: 3 }}>
                {label}
            </label>
            {children}
        </div>
    );
}

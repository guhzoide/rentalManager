import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDanger = true,
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            animation: 'confirm-fade-in 0.2s ease-out'
        }}>
            <div style={{
                background: 'var(--bg-secondary, #161b27)',
                border: '1px solid var(--border, rgba(96, 165, 250, 0.2))',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: 'var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.5))',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                animation: 'confirm-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {title}
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onCancel}
                        style={{ padding: '8px 16px', borderRadius: '6px' }}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                        style={{ padding: '8px 16px', borderRadius: '6px' }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes confirm-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes confirm-slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

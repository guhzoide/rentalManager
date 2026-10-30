import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import CloseRounded from '@mui/icons-material/CloseRounded';

export function CatalogDialog({ titleId, onClose, children, className = '' }: {
    titleId: string;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => {
            dialog?.close();
            if (previous?.isConnected) previous.focus();
        };
    }, []);

    return createPortal(<div className="catalog-page catalog-dialog-scope">
        <dialog
            ref={dialogRef}
            className={`catalog-dialog ${className}`}
            aria-labelledby={titleId}
            onCancel={(event) => { event.preventDefault(); onClose(); }}
            onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
            }}
        >
            <button type="button" className="catalog-dialog-close" onClick={onClose} aria-label="Fechar detalhes"><CloseRounded fontSize="small" /></button>
            {children}
        </dialog>
    </div>, document.body);
}

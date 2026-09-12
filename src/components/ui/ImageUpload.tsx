import { useId, useState } from 'react';
import { IMAGE_ACCEPT, readImage, base64Image } from '@/lib/images';

interface ImageUploadProps {
    label: string;
    value?: string | null;
    onChange: (value: string) => void;
    error?: string;
}

export function ImageUpload({ label, value, onChange, error }: ImageUploadProps) {
    const id = useId();
    const preview = base64Image(value);
    const [busy, setBusy] = useState(false);
    const [fileError, setFileError] = useState('');
    return (
        <div className="image-upload">
            <label htmlFor={id}>{label}</label>
            {preview && <img src={preview} alt={`Prévia: ${label}`} className="image-upload-preview" />}
            <input id={id} type="file" accept={IMAGE_ACCEPT} disabled={busy}
                aria-describedby={`${id}-help`} aria-invalid={Boolean(error || fileError)}
                onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    setBusy(true);
                    setFileError('');
                    try { onChange(await readImage(file)); }
                    catch (err) { setFileError(err instanceof Error ? err.message : 'Não foi possível ler a imagem.'); }
                    finally { setBusy(false); }
                }} />
            <small id={`${id}-help`} role={fileError || error ? 'alert' : undefined}>
                {fileError || error || (busy ? 'Carregando imagem…' : 'JPEG, PNG ou WebP. Até 2 MB por imagem.')}
            </small>
            {value && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { onChange(''); setFileError(''); }}>Remover imagem</button>}
        </div>
    );
}

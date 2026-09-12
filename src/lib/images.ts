import { z } from 'zod';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_GALLERY_IMAGES = 8;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export const imageDataSchema = z.string()
    .max(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 32, 'A imagem deve ter no máximo 2 MB')
    .refine((value) => {
        if (value === '') return true;
        const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
        if (!match || match[2].length % 4 !== 0) return false;
        const bytes = match[2].length * 3 / 4 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
        return bytes <= MAX_IMAGE_BYTES;
    }, 'Selecione uma imagem JPEG, PNG ou WebP de até 2 MB');

// Never return a remote URL from a persisted image field.
export function base64Image(value: string | null | undefined): string | null {
    return value && imageDataSchema.safeParse(value).success ? value : null;
}

export function base64Gallery(values: string[] | null | undefined): string[] {
    return (values ?? []).filter((value) => base64Image(value) !== null);
}

export async function readImage(file: File): Promise<string> {
    if (!IMAGE_ACCEPT.split(',').includes(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('A imagem deve ter no máximo 2 MB.');
    const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
    });
    imageDataSchema.parse(value);
    return value;
}

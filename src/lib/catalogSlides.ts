import type { CatalogItem } from '@/components/catalog/CatalogProduct';
import { base64Gallery, base64Image } from './images.js';

export interface CatalogSlide {
    id: string;
    item: CatalogItem;
    image: string;
    imageIndex: number;
}

export function buildCatalogSlides(items: CatalogItem[]): CatalogSlide[] {
    const products: { item: CatalogItem; images: string[] }[] = [];
    for (const item of items) {
        if (!item.ativo || !item.exibirCatalogo || !(item.disponivel > 0)) continue;
        const cover = base64Image(item.imageUrl);
        const gallery = base64Gallery(item.imageUrls);
        const images = [...new Set(cover ? [cover, ...gallery] : gallery)];
        if (images.length === 0) continue;
        products.push({ item, images });
        // Twelve products already fill every slide with their first photo.
        if (products.length === 12) break;
    }

    const slides: CatalogSlide[] = [];
    const imageCount = Math.max(0, ...products.map((product) => product.images.length));
    // Show one photo of every product before using their additional photos.
    for (let imageIndex = 0; imageIndex < imageCount && slides.length < 12; imageIndex++) {
        for (const { item, images } of products) {
            const image = images[imageIndex];
            if (!image) continue;
            slides.push({ id: `${item.id}:${imageIndex}`, item, image, imageIndex });
            if (slides.length === 12) break;
        }
    }
    return slides;
}

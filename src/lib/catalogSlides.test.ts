import assert from 'node:assert/strict';
import test from 'node:test';
import type { CatalogItem } from '@/components/catalog/CatalogProduct';
import { buildCatalogSlides } from './catalogSlides.js';

const image = (value: string) => `data:image/png;base64,${Buffer.from(value).toString('base64')}`;
const fixture: CatalogItem = {
    id: 'produto', nome: 'Cama elástica', categoriaId: 'categoria',
    categoria: { id: 'categoria', nome: 'Brinquedos', createdAt: '', updatedAt: '' },
    peso: 5, largura: 2.5, altura: 3, valorDiaria: 150, quantidade: 2, disponivel: 1,
    ativo: true, exibirCatalogo: true, imageUrl: null, imageUrls: [], createdAt: '', updatedAt: '',
};

const product = (id: string, cover: string | null, gallery: string[] = []): CatalogItem => ({
    ...fixture, id, imageUrl: cover, imageUrls: gallery,
});

test('prioritizes product variety before additional gallery images', () => {
    const first = product('a', image('cover-a'), [image('a-1'), image('a-2')]);
    const second = product('b', image('cover-b'), [image('b-1')]);
    const slides = buildCatalogSlides([first, second]);
    assert.deepEqual(slides.map((slide) => slide.id), ['a:0', 'b:0', 'a:1', 'b:1', 'a:2']);
    assert.deepEqual(slides.map((slide) => slide.imageIndex), [0, 0, 1, 1, 2]);
    assert.equal(slides[0].item, first);
    assert.equal(slides[1].item, second);
});

test('deduplicates cover and gallery per product without changing source data', () => {
    const cover = image('cover');
    const extra = image('extra');
    const item = product('a', cover, [cover, extra, extra]);
    const slides = buildCatalogSlides([item]);
    assert.deepEqual(slides.map((slide) => slide.image), [cover, extra]);
    assert.deepEqual(slides.map((slide) => slide.id), ['a:0', 'a:1']);
    assert.deepEqual(item.imageUrls, [cover, extra, extra]);
});

test('uses valid gallery photos when cover is absent or invalid', () => {
    const slides = buildCatalogSlides([
        product('a', 'https://example.com/photo.png', ['', 'data:image/png;base64,a', image('gallery-a')]),
        product('b', null, [image('gallery-b')]),
    ]);
    assert.deepEqual(slides.map((slide) => slide.id), ['a:0', 'b:0']);
    assert.equal(slides[0].image, image('gallery-a'));
});

test('keeps photos shared by different products and excludes invalid formats', () => {
    const shared = image('shared');
    const slides = buildCatalogSlides([
        product('a', shared, ['data:image/svg+xml;base64,YQ==']),
        product('b', shared, ['javascript:alert(1)']),
    ]);
    assert.equal(slides.length, 2);
    assert.deepEqual(slides.map((slide) => slide.id), ['a:0', 'b:0']);
});

test('limits output to twelve photos while prioritizing distinct products', () => {
    const products = Array.from({ length: 20 }, (_, index) => product(String(index), image(`cover-${index}`), [image('extra')]));
    const slides = buildCatalogSlides(products);
    assert.equal(slides.length, 12);
    assert.deepEqual(slides.map((slide) => slide.id), Array.from({ length: 12 }, (_, index) => `${index}:0`));
    assert.deepEqual(buildCatalogSlides(products).map((slide) => slide.id), slides.map((slide) => slide.id));
});

test('caps a long gallery and keeps indexes from its deduplicated image order', () => {
    const slides = buildCatalogSlides([product('a', image('cover'), Array.from({ length: 20 }, (_, i) => image(`extra-${i}`)))]);
    assert.equal(slides.length, 12);
    assert.equal(slides[11].id, 'a:11');
    assert.equal(slides[11].image, image('extra-10'));
});

test('omits inactive, hidden, unavailable and imageless products', () => {
    const item = product('a', image('cover'));
    assert.deepEqual(buildCatalogSlides([]), []);
    assert.deepEqual(buildCatalogSlides([
        { ...item, ativo: false },
        { ...item, exibirCatalogo: false },
        { ...item, disponivel: 0 },
        { ...item, disponivel: -1 },
        product('empty', '', ['', 'https://example.com/photo.png']),
    ]), []);
});

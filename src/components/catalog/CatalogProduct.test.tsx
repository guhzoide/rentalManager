import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatalogCard, type CatalogItem } from './CatalogProduct';

const item: CatalogItem = {
    id: 'produto', nome: 'Cama elástica Aventura — Modelo Família',
    categoriaId: 'categoria', categoria: { id: 'categoria', nome: 'Brinquedos', createdAt: '', updatedAt: '' },
    peso: 5, largura: 2.5, altura: 3, valorDiaria: 150, quantidade: 2, disponivel: 1,
    ativo: true, exibirCatalogo: true, imageUrl: null, imageUrls: [], createdAt: '', updatedAt: '',
};

test('card is a native keyboard-accessible button with product details and availability', () => {
    const html = renderToStaticMarkup(<CatalogCard item={item} onClick={() => {}} />);
    assert.ok(html.startsWith('<button type="button"'));
    assert.ok(html.includes('Ver detalhes de Cama elástica Aventura'));
    assert.ok(html.includes('Brinquedos'));
    assert.ok(html.includes('Disponível'));
    assert.ok(html.includes('2,5'));
    assert.ok(html.includes('150,00'));
    assert.ok(!html.includes('undefined'));
});

test('unavailable products remain inspectable and clearly identified', () => {
    const html = renderToStaticMarkup(<CatalogCard item={{ ...item, disponivel: 0 }} onClick={() => {}} />);
    assert.ok(html.includes('Indisponível no momento'));
    assert.ok(!html.includes('disabled=""'));
    assert.ok(html.includes('Sem imagem'));
});

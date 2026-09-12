export const DEFAULT_CATEGORY_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_CATEGORY_NAME = 'Sem categoria';

export function isDefaultCategory(category: { id: string; nome: string }) {
    return category.id === DEFAULT_CATEGORY_ID
        || category.nome.trim().toLocaleLowerCase('pt-BR') === DEFAULT_CATEGORY_NAME.toLocaleLowerCase('pt-BR');
}

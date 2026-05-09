/**
 * Parsea filtros no formato ExtJS (JSON stringificado) para um objeto plano.
 * Ex: '[{"property":"name","value":"John"}]' -> { "name": "John" }
 */
export function parseExtJsFilter(filterStr?: string): Record<string, any> {
    if (!filterStr) return {};

    try {
        const parsed = JSON.parse(filterStr);
        if (!Array.isArray(parsed)) return {};

        const result: Record<string, any> = {};
        for (const item of parsed) {
            if (item.property && item.value !== undefined) {
                result[item.property] = item.value;
            }
        }
        return result;
    } catch (e) {
        console.error('Erro ao parsear filtro ExtJS:', e);
        return {};
    }
}

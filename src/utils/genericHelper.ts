import { Prisma } from '@prisma/client';

/**
 * Converte o nome da tabela (que pode vir em diferentes formatos) para o nome do modelo no Prisma.
 */
export function getPrismaModelName(tableName: string): string {
    if (!tableName) return '';
    
    // Tenta encontrar o modelo no DMMF ignorando case
    const models = Prisma.dmmf.datamodel.models;
    const found = models.find(m => m.name.toLowerCase() === tableName.toLowerCase());
    
    if (found) return found.name;
    
    // Fallback: primeira letra minúscula (padrão comum)
    return tableName.charAt(0).toLowerCase() + tableName.slice(1);
}

/**
 * Retorna os nomes dos campos que compõem a chave primária de um modelo.
 */
export function getPrimaryKeyFields(modelName: string): string[] {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    if (!model) return ['id'];
    
    if (model.primaryKey) {
        return model.primaryKey.fields;
    }
    
    const idFields = model.fields.filter(f => f.isId).map(f => f.name);
    return idFields.length > 0 ? idFields : ['id'];
}

/**
 * Retorna todos os nomes de campos válidos (colunas) de um modelo.
 */
export function getValidFieldNames(modelName: string): string[] {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    if (!model) return [];
    return model.fields.filter(f => f.kind === 'scalar').map(f => f.name);
}

/**
 * Retorna os nomes dos campos que são relações (objetos ou listas).
 */
export function getRelationFieldNames(modelName: string): string[] {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    if (!model) return [];
    return model.fields.filter(f => f.kind === 'object').map(f => f.name);
}

/**
 * Retorna os nomes dos campos que são auto-incrementáveis.
 */
export function getAutoIncrementFields(modelName: string): string[] {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    if (!model) return [];
    // Nota: O DMMF nem sempre mostra isAutoIncrement de forma clara, 
    // mas campos @id com default autoincrement() geralmente são o alvo.
    return model.fields.filter(f => f.isId && (f as any).isAutoIncrement).map(f => f.name);
}

/**
 * Retorna os nomes dos campos que são do tipo Bytes ou Buffer.
 */
export function getByteFieldNames(modelName: string): string[] {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    if (!model) return [];
    return model.fields.filter(f => f.type === 'Bytes').map(f => f.name);
}

/**
 * Verifica se um campo é uma chave estrangeira.
 */
export function isForeignKey(modelName: string, fieldName: string): boolean {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    if (!model) return false;
    
    // No Prisma, chaves estrangeiras são campos escalares referenciados por um campo de relação
    return model.fields.some(f => f.kind === 'object' && f.relationFromFields?.includes(fieldName));
}

/**
 * Expande notação de ponto em objetos aninhados.
 * Ex: { "user.name": "John" } -> { "user": { "name": "John" } }
 */
export function expandDotNotation(obj: any): any {
    const result: any = {};
    for (const key in obj) {
        const parts = key.split('.');
        let current = result;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                current[part] = obj[key];
            } else {
                current[part] = current[part] || {};
                current = current[part];
            }
        }
    }
    return result;
}

/**
 * Ajusta filtros para compatibilidade com o Prisma (ex: strings para contains/startsWith).
 */
export function fixPrismaFilters(modelName: string, filters: any): any {
    if (!filters || typeof filters !== 'object') return filters;

    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    const newFilters: any = {};

    for (const key in filters) {
        const value = filters[key];
        const field = model?.fields.find(f => f.name === key);

        if (field?.type === 'String' && typeof value === 'string') {
            // Se o valor for numérico em string, mantém literal
            if (!isNaN(Number(value))) {
                newFilters[key] = value;
            } else {
                // Filtro "fuzzy" por padrão para strings
                newFilters[key] = { contains: value };
            }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursão para objetos aninhados (relações)
            newFilters[key] = fixPrismaFilters(field?.type || '', value);
        } else {
            newFilters[key] = value;
        }
    }

    return newFilters;
}

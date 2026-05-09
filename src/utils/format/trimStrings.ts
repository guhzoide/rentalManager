/**
 * Percorre recursivamente um objeto ou array e remove espaços em branco de todas as strings.
 */
export function trimStrings(data: any): any {
    if (typeof data === 'string') {
        return data.trim();
    }

    if (Array.isArray(data)) {
        return data.map(item => trimStrings(item));
    }

    if (typeof data === 'object' && data !== null && !(data instanceof Date) && !(data instanceof Buffer)) {
        const newObj: any = {};
        for (const key in data) {
            newObj[key] = trimStrings(data[key]);
        }
        return newObj;
    }

    return data;
}

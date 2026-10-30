import { createHash } from 'node:crypto';

export const DATASET = 'rental-manager-load-v1';
export const COUNTS = { clientes: 5000, produtos: 1000, agendas: 50000, usuarios: 100 };
export function testId(kind: string, index = 0) {
    const hex = createHash('sha256').update(`${DATASET}:${kind}:${index}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}


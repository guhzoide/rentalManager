/**
 * Retorna o token seed para criptografia.
 */
export function getSeedToken(): string {
    return process.env.ISO_SEED_TOKEN || 'iso@default#seed';
}

/**
 * Função simples de "criptografia" (Base64) para compatibilidade.
 * @param text - Texto a ser criptografado.
 * @param seed - Seed opcional (não utilizada nesta versão simplificada).
 */
export function Encrypt64(text: string, seed?: string): string {
    if (!text) return '';
    try {
        // Simulação simples de Base64. Em sistemas legados reais, isso pode ser um algoritmo customizado.
        return Buffer.from(text).toString('base64');
    } catch (e) {
        console.error('Erro ao criptografar:', e);
        return text;
    }
}

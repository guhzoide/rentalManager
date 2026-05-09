/**
 * Extrai o input real de um objeto de requisição tRPC, 
 * tratando casos de chamadas batch ou JSON aninhado.
 */
export function getParsedInput(rawBody: any): any {
    if (!rawBody) return undefined;

    // O tRPC envia { "0": { json: { ... } } } ou { json: { ... } }
    if (rawBody.json !== undefined) {
        return rawBody.json;
    }

    if (rawBody['0']?.json !== undefined) {
        return rawBody['0'].json;
    }

    return rawBody;
}

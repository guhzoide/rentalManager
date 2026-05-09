import { prisma } from '@/server/trpc';

/**
 * Cria uma sessão no banco de dados e retorna o token.
 */
export async function createSession(data: any): Promise<string> {
    const token = crypto.randomUUID();
    
    // Armazena na tabela ISOSessao (seguindo o padrão observado)
    await (prisma as any).iSOSessao.create({
        data: {
            ISOSes_Identificacao: token,
            ISOEmp_Codigo: data.ISOEmp_Codigo,
            ISOEntUsu_Codigo: data.ISOEntUsu_Codigo,
            ISOSes_DataAcesso: new Date(),
            ISOSes_TimeOut: 1440, // 24 horas por padrão
            ISOSes_JSON: JSON.stringify(data)
        }
    });
    
    return token;
}

/**
 * Recupera uma sessão do banco de dados pelo token.
 */
export async function getSession(token: string): Promise<any | null> {
    if (!token) return null;
    
    const sessao = await (prisma as any).iSOSessao.findUnique({
        where: { ISOSes_Identificacao: token }
    });
    
    if (!sessao) return null;
    
    try {
        return JSON.parse(sessao.ISOSes_JSON);
    } catch {
        return null;
    }
}

import { prisma } from '@/server/trpc';

export const isoEmpParametrosValidator = {
    async validate(data: any, tx?: any) {
        await gerarSequencia(data, tx);
    }

};

/**
 * 🔵 REGRAS DE NEGÓCIO - GERAÇÃO DE SEQUÊNCIA
 */
async function gerarSequencia(data: any, tx: any) {
    // 🔹 Gerar sequência para ISOEmpParametros apenas se for um novo registro (sem código informado)
    if (data.ISOEmpPrm_Codigo && !data.ISOEmpPrm_GrpUsu_Codigo) {
        const client = tx || prisma;

        const lastRecord = await client.iSOEmpParametros.findFirst({
            where: {
                ISOEmp_Codigo: data.ISOEmp_Codigo,
                ISOEmpPrm_Codigo: data.ISOEmpPrm_Codigo
            },
            orderBy: {
                ISOEmpPrm_Sequencia: 'desc'
            },
            select: {
                ISOEmpPrm_Sequencia: true
            }
        });
        if (lastRecord) {
            const sequencia = (lastRecord?.ISOEmpPrm_Sequencia ?? 0) + 1;
            data.ISOEmpPrm_Sequencia = sequencia;
        } else {
            data.ISOEmpPrm_Sequencia = 0;
        }
    }
}

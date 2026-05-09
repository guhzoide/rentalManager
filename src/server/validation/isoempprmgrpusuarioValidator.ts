import { prisma } from '@/server/trpc';

export const isoempprmgrpusuarioValidator = {
    async validate(data: any, tx?: any) {
        await gerarSequencia(data, tx);
    },

    async afterSave(record: any, tx?: any) {
        await atualizarSequenciaPai(record, tx);
    }
};

/**
 * 🔵 REGRAS DE NEGÓCIO - GERAÇÃO DE SEQUÊNCIA
 */
async function gerarSequencia(data: any, tx: any) {
    // 🔹 Gerar sequência para ISOEmpParametros apenas se for um novo registro (sem código informado)
    if (data.ISOEmpPrm_Codigo && !data.ISOEmpPrm_GrpUsu_Codigo) {
        const client = tx || prisma;

        const lastRecord = await client.iSOEmpPrm_GrpUsuario.findFirst({
            where: {
                ISOEmp_Codigo: data.ISOEmp_Codigo,
                ISOEmpPrm_Codigo: data.ISOEmpPrm_Codigo
            },
            orderBy: {
                ISOEmpPrm_GrpUsu_Sequencia: 'desc'
            },
            select: {
                ISOEmpPrm_GrpUsu_Sequencia: true
            }
        });

        const sequencia = (lastRecord?.ISOEmpPrm_GrpUsu_Sequencia ?? 0) + 1;
        data.ISOEmpPrm_GrpUsu_Sequencia = sequencia;
    }
}

/**
 * 🔵 AÇÕES PÓS-PERSISTÊNCIA - ATUALIZAR PAI
 */
async function atualizarSequenciaPai(record: any, tx: any) {
    if (record.ISOEmp_Codigo && record.ISOEmpPrm_Codigo) {
        const client = tx || prisma;

        // Atualiza a sequência no pai (ISOEmpPrm_GrpUsuario)
        await client.iSOEmpParametros.updateMany({
            where: {
                ISOEmp_Codigo: record.ISOEmp_Codigo,
                ISOEmpPrm_Codigo: record.ISOEmpPrm_Codigo
            },
            data: {
                ISOEmpPrm_Sequencia: record.ISOEmpPrm_GrpUsu_Sequencia
            }
        });
    }
}
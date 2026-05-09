import { prisma } from '@/server/trpc';

export const isoempprmgrpusudetalheValidator = {
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
    // 🔹 Gerar sequência para ISOEmpPrm_GrpUsuDet_Codigo apenas se for um novo registro (sem código informado)
    if (data.ISOEmp_Codigo && data.ISOEmpPrm_Codigo && data.ISOEmpPrm_GrpUsu_Codigo && !data.ISOEmpPrm_GrpUsuDet_Codigo) {
        const client = tx || prisma;

        const lastRecord = await client.iSOEmpPrm_GrpUsuDetalhe.findFirst({
            where: {
                ISOEmp_Codigo: data.ISOEmp_Codigo,
                ISOEmpPrm_Codigo: data.ISOEmpPrm_Codigo,
                ISOEmpPrm_GrpUsu_Codigo: data.ISOEmpPrm_GrpUsu_Codigo
            },
            orderBy: {
                ISOEmpPrm_GrpUsuDet_Codigo: 'desc'
            },
            select: {
                ISOEmpPrm_GrpUsuDet_Codigo: true
            }
        });

        const sequencia = (lastRecord?.ISOEmpPrm_GrpUsuDet_Codigo ?? 0) + 1;
        data.ISOEmpPrm_GrpUsuDet_Codigo = sequencia;
    }
}

/**
 * 🔵 AÇÕES PÓS-PERSISTÊNCIA - ATUALIZAR PAI
 */
async function atualizarSequenciaPai(record: any, tx: any) {
    if (record.ISOEmp_Codigo && record.ISOEmpPrm_Codigo && record.ISOEmpPrm_GrpUsu_Codigo && record.ISOEmpPrm_GrpUsuDet_Codigo) {
        const client = tx || prisma;

        // Atualiza a sequência no pai (ISOEmpPrm_GrpUsuario)
        await client.iSOEmpPrm_GrpUsuario.updateMany({
            where: {
                ISOEmp_Codigo: record.ISOEmp_Codigo,
                ISOEmpPrm_Codigo: record.ISOEmpPrm_Codigo,
                ISOEmpPrm_GrpUsu_Codigo: record.ISOEmpPrm_GrpUsu_Codigo
            },
            data: {
                ISOEmpPrm_GrpUsu_Sequencia: record.ISOEmpPrm_GrpUsuDet_Codigo
            }
        });
    }
}
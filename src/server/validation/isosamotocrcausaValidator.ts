import { prisma } from '@/server/trpc';

export const isoSaMotOcrCausaValidator = {
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
    // 🔹 Gerar sequência para ISOSAMotOcrCausa apenas se for um novo registro (sem código informado)
    if (data.ISOEmp_Codigo && data.ISOSAMot_Codigo && data.ISOSAMotOcr_Codigo && !data.ISOSAMotOcrCau_Codigo) {
        const client = tx || prisma;

        const lastRecord = await client.iSOSAMotOcrCausa.findFirst({
            where: {
                ISOEmp_Codigo: data.ISOEmp_Codigo,
                ISOSAMot_Codigo: data.ISOSAMot_Codigo,
                ISOSAMotOcr_Codigo: data.ISOSAMotOcr_Codigo,
            },
            orderBy: {
                ISOSAMotOcrCau_Codigo: 'desc'
            },
            select: {
                ISOSAMotOcrCau_Codigo: true
            }
        });

        const sequencia = (lastRecord?.ISOSAMotOcrCau_Codigo ?? 0) + 1;
        data.ISOSAMotOcrCau_Codigo = sequencia;
    }
}

/**
 * 🔵 AÇÕES PÓS-PERSISTÊNCIA - ATUALIZAR PAI
 */
async function atualizarSequenciaPai(record: any, tx: any) {
    if (record.ISOEmp_Codigo && record.ISOSAMot_Codigo && record.ISOSAMotOcr_Codigo && record.ISOSAMotOcrCau_Codigo) {
        const client = tx || prisma;

        // Atualiza a sequência no pai (iSOSAMotOcrCausa)
        await client.iSOSAMotOcorrencia.updateMany({
            where: {
                ISOEmp_Codigo: record.ISOEmp_Codigo,
                ISOSAMot_Codigo: record.ISOSAMot_Codigo,
                ISOSAMotOcr_Codigo: record.ISOSAMotOcr_Codigo,
            },
            data: {
                ISOSAMotOcr_SeqCausa: record.ISOSAMotOcrCau_Codigo
            }
        });
    }
}

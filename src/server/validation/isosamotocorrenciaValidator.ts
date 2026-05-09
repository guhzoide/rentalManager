import { prisma } from '@/server/trpc';

export const isoSaMotOcorrenciaValidator = {
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
    // 🔹 Gerar sequência para ISOSAMotOcr_Codigo apenas se for um novo registro (sem código informado)
    if (data.ISOEmp_Codigo && data.ISOSAMot_Codigo && !data.ISOSAMotOcr_Codigo) {
        const client = tx || prisma;

        const lastRecord = await client.iSOSAMotOcorrencia.findFirst({
            where: {
                ISOEmp_Codigo: data.ISOEmp_Codigo,
                ISOSAMot_Codigo: data.ISOSAMot_Codigo,
            },
            orderBy: {
                ISOSAMotOcr_Codigo: 'desc'
            },
            select: {
                ISOSAMotOcr_Codigo: true
            }
        });

        const sequencia = (lastRecord?.ISOSAMotOcr_Codigo ?? 0) + 1;
        data.ISOSAMotOcr_Codigo = sequencia;
    }
}

/**
 * 🔵 AÇÕES PÓS-PERSISTÊNCIA - ATUALIZAR PAI
 */
async function atualizarSequenciaPai(record: any, tx: any) {
    if (record.ISOEmp_Codigo && record.ISOSAMot_Codigo && record.ISOSAMotOcr_Codigo) {
        const client = tx || prisma;

        // Atualiza a sequência no pai (iSOSAMotivo)
        await client.iSOSAMotivo.updateMany({
            where: {
                ISOEmp_Codigo: record.ISOEmp_Codigo,
                ISOSAMot_Codigo: record.ISOSAMot_Codigo,
            },
            data: {
                ISOSAMot_SeqOcorrencia: record.ISOSAMotOcr_Codigo
            }
        });
    }
}

import { prisma } from '@/server/trpc';
import { isoserviceCreate, isoserviceRead } from '@/server/services/isoserviceService';

export const isoMkFinFaseValidator = {
    async validate(data: any, tx?: any) {
        await gerarSequencia(data, tx);
    },

    async afterSave(record: any, tx?: any) {
        await atualizarSequenciaPai(record, tx);
    }
};

async function gerarSequencia(data: any, tx?: any) {
    if (!data || data.action !== 'INSERT') return;

    // Se já tem um código fornecido, não faz nada
    if (data.ISOMkFinFase_Codigo) return;

    // Encontrar a maior sequência para este pai
    let result = await isoserviceRead({
        table: 'ISOMkFinFase',
        filtros: {
            ISOMkFin_Codigo: data.ISOMkFin_Codigo,
        },
        select: {
            ISOMKFinFase_Codigo: true
        }
    });

    const maiorCodigo = result.retorno.ISOMKFinFase_Codigo.reduce((max: any, item: any) => Math.max(max, item.ISOMkFinFase_Codigo), 0) || 0;
    // Atribuir o próximo código
    data.ISOMKFinFase_Codigo = maiorCodigo + 1;
}

async function atualizarSequenciaPai(record: any, tx?: any) {
    if (!record || !record.ISOMkFin_Codigo) return;

    await isoserviceCreate({
        table: 'ISOMKFinalidade',
        Itens: {
            ISOEmp_Codigo: record.ISOEmp_Codigo,
            ISOMkFin_Codigo: record.ISOMkFin_Codigo,
            ISOMkFin_SeqFase: record.ISOMKFinFase_Codigo,
        }
    });
}

import { isoserviceCreate, isoserviceRead } from '@/server/services/isoserviceService';

export const isoentrlctipnivelValidator = {
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
    if (data.ISOEntRlcTipNiv_EmpCodigo && data.ISOEntRlcTip_Codigo && !data.ISOEntRlcTipNiv_Codigo) {

        const result = await isoserviceRead({
            table: 'ISOEntRlcTipNivel',
            filtros: { 
                ISOEntRlcTipNiv_EmpCodigo: data.ISOEntRlcTipNiv_EmpCodigo,
                ISOEntRlcTip_Codigo: data.ISOEntRlcTip_Codigo
            },
            select: {
                ISOEntRlcTipNiv_Codigo: true
            }
        }, tx);

        const maiorCodigo = Array.isArray(result.retorno)
            ? result.retorno.reduce((max: number, item: any) => Math.max(max, item.ISOEntRlcTipNiv_Codigo || 0), 0)
            : 0;
        data.ISOEntRlcTipNiv_Codigo = maiorCodigo + 1;
    }
}

/**
 * 🔵 AÇÕES PÓS-PERSISTÊNCIA - ATUALIZAR PAI
 */
async function atualizarSequenciaPai(record: any, tx: any) {
    if (!record || !record.ISOEntRlcTip_Codigo) return;

    await isoserviceCreate({
        table: 'ISOEntRlcTipo',
        Itens: {
            ISOEntRlcTip_EmpCodigo: record.ISOEntRlcTipNiv_EmpCodigo,
            ISOEntRlcTip_Codigo: record.ISOEntRlcTip_Codigo,
            ISOEntRlcTip_SeqNivel: record.ISOEntRlcTipNiv_Codigo
        }
    }, tx);
}

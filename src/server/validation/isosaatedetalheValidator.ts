import { isoserviceCreate, isoserviceRead } from '@/server/services/isoserviceService';

export const isosaatedetalheValidator = {
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
    // 🔹 Gerar sequência para ISOSAAte_SeqDetalhe apenas se for um novo registro (sem código informado)
    if (data.ISOEmp_Codigo && data.ISOSAAte_Codigo && !data.ISOSAAteDet_Codigo) {
        // Encontrar a maior sequência para este pai
        let result = await isoserviceRead({
            table: 'ISOSAAteDetalhe',
            filtros: {
                ISOSAAte_Codigo: data.ISOSAAte_Codigo,
            },
            select: {
                ISOSAAteDet_Codigo: true
            }
        }, tx);

        // Atribuir o próximo código
        const maiorCodigo = Array.isArray(result.retorno) ? result.retorno.reduce((max: any, item: any) => Math.max(max, item.ISOSAAteDet_Codigo || 0), 0) : 0;
        data.ISOSAAteDet_Codigo = maiorCodigo + 1;

        // Atribuir a data de resposta
        if (data.ISOSAAteDet_Resposta && data.ISOSAAteDet_Resposta != null && data.ISOSAAteDet_Resposta != "") {
            data.ISOSAAteDet_DataResposta = data.ISOSAAteDet_DataResposta || "{{date}}";
        } else {
            data.ISOSAAteDet_DataResposta = new Date('1753-01-01T00:00:00.000Z');
        }
    }
}

/**
 * 🔵 AÇÕES PÓS-PERSISTÊNCIA - ATUALIZAR PAI
 */
async function atualizarSequenciaPai(record: any, tx: any) {
    if (record.ISOEmp_Codigo && record.ISOSAAte_Codigo) {

        // Atualiza a sequência no pai (ISOSAAtendimento)
        await isoserviceCreate({
            table: 'ISOSAAtendimento',
            Itens: {
                ISOEmp_Codigo: record.ISOEmp_Codigo,
                ISOSAAte_Codigo: record.ISOSAAte_Codigo,
                ISOSAAte_SeqDetalhe: record.ISOSAAteDet_Codigo,
            }
        }, tx);
    }
}
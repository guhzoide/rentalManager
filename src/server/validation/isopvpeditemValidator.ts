import { isoserviceRead } from '@/server/services/isoserviceService';
import { GenericValidator } from './index';

export const isoPvPedItemValidator: GenericValidator = {
    async beforeSave(data: any, tx?: any) {
        if (data.ISOPrd_Codigo) {
            const prdCheck = await isoserviceRead({
                table: 'ISOProduto',
                filtros: { ISOPrd_Codigo: data.ISOPrd_Codigo },
                select: { ISOPrd_Codigo: true }
            });

            if (!prdCheck.retorno || prdCheck.retorno.length === 0) {
                throw new Error(`Produto com código '${data.ISOPrd_Codigo}' não encontrado no banco de dados. Verifique se o produto existe.`);
            }
        } else {
            throw new Error(`Código do Produto não informado para o item do pedido.`);
        }
    }
};

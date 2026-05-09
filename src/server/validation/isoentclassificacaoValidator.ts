import { domains } from '@/server/domains';
import { isoserviceCreate } from '@/server/services/isoserviceService';

export const isoentclassificacaoValidator = {
    async validate(data: any, tx?: any) {
        validarDominios(data);
    },
    async afterSave(data: any, tx?: any) {
        await handleDependencies(data, tx);
    }
};

function validarDominios(data: any) {
    const domainFlag = domains.ISOFlag;

    if (data.ISOEntCla_Flag !== undefined) {
        const existsISOEntCla_Flag = domainFlag.some(d => d.value === data.ISOEntCla_Flag);
        if (!existsISOEntCla_Flag) {
            throw new Error('ISOEntCla_Flag inválido.');
        }
    }
}



async function handleDependencies(data: any, tx: any) {

    const codigo = data?.ISOEntCla_Codigo;

    await isoserviceCreate({
        table: 'ISOAutEmpresa',
        Itens: {
            ISOEmp_Codigo: "{{empresaId}}",
            ISOAutEmp_Codigo: 'TISOEntClassificacao',
            ISOAutEmp_Numero: codigo,
            ISOAutEmp_DataAlteracao: "{{date}}",
            ISOAutEmp_UsuarioAlteracao: "{{userId}}",
            ISOAutEmp_Descricao: "TISOEntClassificacao",
            ISOAutEmp_Automatica: 1,
            ISOAutEmp_Flag: "A",
            ISOSite_Codigo: "{{siteId}}",
        }
    });
}
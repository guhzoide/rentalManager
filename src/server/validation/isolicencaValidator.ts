import { domains } from '@/server/domains';
import { Encrypt64 } from '@/utils/encrypt';
import { getSeedToken } from '@/utils/getSeed';

export const isolicencaValidator = {
    async validate(data: any, tx?: any, originalData?: any) {
        validarDominios(data);
        await handleDependencies(data, tx, originalData);
    },
};

/**
 * 🔴 DOMINIOS EXISTENTES
 */
function validarDominios(data: any) {
    const domainFlag = domains.ISOFlag;

    if (data.ISOLic_Flag !== undefined) {
        const existsISOLic_Flag = domainFlag.some(d => d.value === data.ISOLic_Flag);
        if (!existsISOLic_Flag) {
            throw new Error('ISOLic_Flag inválido.');
        }
    }
}

/**
 * Executado ANTES de se criar um registro em ISOLicenca.
 * Transforma os dados em JSON e criptografa para gerar a licença.
 */
async function handleDependencies(data: any, tx: any, originalData: any) {
    // Estrutura JSON com os campos desejados para a licença
    const bodyJson = JSON.stringify({
        ISOLic_EmpCodigo: originalData.ISOLic_EmpCodigo || '',
        ISOLic_RazaoSocial: originalData.ISOLic_RazaoSocial || '',
        ISOLic_NomeFantasia: originalData.ISOLic_NomeFantasia || '',
        ISOLic_CNPJ: originalData.ISOLic_CNPJ || ''
    });

    // Criptografa o JSON e atribui ao campo ISOLic_Licenca2 (definido no banco)
    const encryptedLicenca = Encrypt64(bodyJson, getSeedToken());
    const tokenEnv = process.env.TOKEN_ISOLICENCA;

    if (originalData.ISOLic_Token && tokenEnv && originalData.ISOLic_Token.includes(tokenEnv)) {
        data.ISOLic_Licenca2 = encryptedLicenca;
    } else {
        throw new Error('Token inválido');
    }
}
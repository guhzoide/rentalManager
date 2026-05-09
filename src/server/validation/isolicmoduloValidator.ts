import { domains } from '@/server/domains';
import { Encrypt64 } from '@/utils/encrypt';
import { getSeedToken } from '@/utils/getSeed';

export const isolicmoduloValidator = {
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

    if (data.ISOLicMod_Flag !== undefined) {
        const existsISOLicMod_Flag = domainFlag.some(d => d.value === data.ISOLicMod_Flag);
        if (!existsISOLicMod_Flag) {
            throw new Error('ISOLicMod_Flag inválido.');
        }
    }
}

/**
 * Executado ANTES de se criar um registro em ISOLicenca.
 * Transforma os dados em JSON e criptografa para gerar a licença.
 */
async function handleDependencies(data: any, tx: any, originalData: any) {
    const tokenEnv = process.env.TOKEN_ISOLICENCA;

    if (originalData.ISOLicMod_Token && tokenEnv && originalData.ISOLicMod_Token.includes(tokenEnv)) {


        if (originalData.ISOLicMod_Idioma && originalData.ISOLicMod_Idioma != '') {
            const encryptedIdioma = Encrypt64(originalData.ISOLicMod_Idioma, getSeedToken());
            data.ISOLicMod_Idioma = encryptedIdioma
        }
        if (originalData.ISOLicMod_TipoLicenca && originalData.ISOLicMod_TipoLicenca != '') {
            const encryptedtipoLicenca = Encrypt64(originalData.ISOLicMod_TipoLicenca, getSeedToken());
            data.ISOLicMod_TipoLicenca = encryptedtipoLicenca
        }
        if (originalData.ISOLicMod_Validade && originalData.ISOLicMod_Validade != '') {
            const encryptedValidade = Encrypt64(originalData.ISOLicMod_Validade, getSeedToken());
            data.ISOLicMod_Validade = encryptedValidade
        }
        if (originalData.ISOLicMod_Modulo && originalData.ISOLicMod_Modulo != '') {
            const encryptedModulo = Encrypt64(originalData.ISOLicMod_Modulo, getSeedToken());
            data.ISOLicMod_Modulo = encryptedModulo
        }
        if (originalData.ISOLicMod_Quantidade && originalData.ISOLicMod_Quantidade != '') {
            const encryptedQuantidade = Encrypt64(originalData.ISOLicMod_Quantidade, getSeedToken());
            data.ISOLicMod_Quantidade = encryptedQuantidade
        }


    } else {
        throw new Error('Token inválido');
    }
}
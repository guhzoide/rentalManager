import { domains } from '@/server/domains';

export const isolinguaValidator = {
    async validate(data: any) {
        validarCamposObrigatorios(data);
        validarDominios(data);
    },
};

/**
 * 🔴 DOMINIOS EXISTENTES
 */
function validarDominios(data: any) {
    const domainFlag = domains.ISOFlag;
    const existsFlag = domainFlag.some(d => d.value === data.ISOLng_Flag)
    if (!existsFlag) {
        throw new Error('ISOLng_Flag inválido.');
    }
    const domainSN = domains.ISOSN;
    const existsSN = domainSN.some(d => d.value === data.ISOLng_LojaVirtual)
    if (!existsSN) {
        throw new Error('ISOLng_LojaVirtual inválido.');
    }
}

/**
 * 🔴 CAMPOS OBRIGATÓRIOS
 */
function validarCamposObrigatorios(data: any) {
    const requiredFields = [
        'ISOLng_Descricao',
        'ISOLng_LojaVirtual',
        'ISOLng_Flag',
        'ISOLng_DataAlteracao',
        'ISOLng_UsuarioAlteracao',
        'ISOLng_EmpCodigo'
    ];

    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            throw new Error(`O campo "${field}" é obrigatório.`);
        }
    }
}


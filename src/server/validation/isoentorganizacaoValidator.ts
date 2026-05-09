import { isoGetDate } from '@/utils/isoGetDate';
import { isValidCNPJ } from '@/utils/validators';

export const isoEntOrganizacaoValidator = {
    async validate(data: any) {
        if (data.ISOEntOrg_DataCadastro == null) {
            data.ISOEntOrg_DataCadastro = isoGetDate()
        } else {
            data.ISOEntOrg_DataCadastro = data.ISOEntOrg_DataCadastro
        }

        validarCamposObrigatorios(data);
        validarFormatacao(data);
    },
};

/**
 * 🔴 CAMPOS OBRIGATÓRIOS
 */
function validarCamposObrigatorios(data: any) {
    const requiredFields = [
        'ISOEntOrg_RazaoSocial',
        'ISOEntOrg_CNPJ'
    ];

    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            if (data['ISOEntOrg_Estrangeiro'] === 'N' && field === 'ISOEntOrg_CNPJ') {
                continue;
            }
            throw new Error(`O campo "${field}" é obrigatório.`);
        }
    }
}

/**
 * 🟡 VALIDAÇÕES DE FORMATO
 */
function validarFormatacao(data: any) {
    // CNPJ (14 dígitos numéricos)
    if (data.ISOEntOrg_CNPJ) {
        const cnpj = String(data.ISOEntOrg_CNPJ).replace(/\D/g, '');

        if (cnpj.length > 0 && !isValidCNPJ(cnpj)) {
            throw new Error('CNPJ inválido.');
        }
    }
}

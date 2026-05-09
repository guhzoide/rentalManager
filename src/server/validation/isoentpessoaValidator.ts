import { isoGetDate } from '@/utils/isoGetDate';
import { isValidCPF } from '@/utils/validators';

export const isoEntPessoaValidator = {
    async validate(data: any) {
        if (data.ISOEntPes_DataCadastro == null) {
            data.ISOEntPes_DataCadastro = isoGetDate()
        } else {
            data.ISOEntPes_DataCadastro = data.ISOEntPes_DataCadastro
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
        'ISOEntPes_PrimeiroNome',
        'ISOEntPes_NomeCompleto',
        'ISOEntPes_CPF'
    ];

    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            if (data['ISOEntPes_Estrangeiro'] === 'S' && field === 'ISOEntPes_CPF') {
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
    // CPF (11 dígitos numéricos)
    if (data.ISOEntPes_CPF) {
        const cpf = String(data.ISOEntPes_CPF).replace(/\D/g, '');

        if (cpf.length > 0 && !isValidCPF(cpf)) {
            throw new Error('CPF inválido.');
        }
    }
}

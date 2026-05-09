import { prisma } from '@/server/trpc';
import { domains } from '@/server/domains';

export const isoempresaValidator = {
    async validate(data: any) {
        validarCamposObrigatorios(data);
        validarFormatacao(data);
        validarDominios(data);
        await validarRegrasDeNegocio(data);
    },
};

/**
 * 🔴 DOMINIOS EXISTENTES
 */
function validarDominios(data: any) {
    const domain = domains.ISOFlag;

    const exists = domain.some(d => d.value === data.ISOEmp_Flag)

    if (!exists) {
        throw new Error('ISOEmp_Flag inválido.');
    }
}

/**
 * 🔴 CAMPOS OBRIGATÓRIOS
 */
function validarCamposObrigatorios(data: any) {
    const requiredFields = [
        'ISOEmp_RazaoSocial',
        'ISOEmp_NomeFantasia',
        'ISOEmp_CNPJ',
        'ISOEmp_Flag',
        'ISOEmp_DataAlteracao',
        'ISOEmp_UsuarioAlteracao'
    ];

    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            throw new Error(`O campo "${field}" é obrigatório.`);
        }
    }
}

/**
 * 🟡 VALIDAÇÕES DE FORMATO
 */
function validarFormatacao(data: any) {
    // CNPJ (14 dígitos numéricos)
    // if (data.ISOEmp_CNPJ) {
    //     const cnpj = String(data.ISOEmp_CNPJ).replace(/\D/g, '');

    //     if (cnpj.length !== 14) {
    //         throw new Error('CNPJ deve conter 14 dígitos.');
    //     }

    //     if (!isValidCNPJ(cnpj)) {
    //         throw new Error('CNPJ inválido.');
    //     }
    // }

    // URL
    if (data.ISOEmp_URLModern) {
        try {
            new URL(data.ISOEmp_URLModern);
        } catch {
            throw new Error('ISOEmp_URLModern deve ser uma URL válida.');
        }
    }

    // Flag (1 caractere)
    if (data.ISOEmp_Flag && String(data.ISOEmp_Flag).length !== 1) {
        throw new Error('ISOEmp_Flag deve conter apenas 1 caractere.');
    }

    // Extensão de arquivo
    if (data.ISOEmp_LogotipoExtensao) {
        const allowed = ['png', 'jpg', 'jpeg', 'svg', 'gif'];
        const ext = data.ISOEmp_LogotipoExtensao.toLowerCase().replace('.', '');

        if (!allowed.includes(ext)) {
            throw new Error(`Extensão de logotipo inválida. Permitidas: ${allowed.join(', ')}`);
        }
    }
}

/**
 * 🔵 REGRAS DE NEGÓCIO
 */
async function validarRegrasDeNegocio(data: any) {
    // 🔹 Não permitir duas empresas com mesmo CNPJ
    if (data.ISOEmp_CNPJ) {
        const exists = await prisma.iSOEmpresa.findFirst({
            where: {
                ISOEmp_CNPJ: data.ISOEmp_CNPJ,
                ...(data.ISOEmp_Codigo && {
                    NOT: { ISOEmp_Codigo: data.ISOEmp_Codigo }
                })
            }
        });

        if (exists) {
            throw new Error('Já existe uma empresa com este CNPJ.');
        }
    }

    // 🔹 Validar moeda se enviada
    if (data.ISOEmp_MoeCodigo) {
        const moeda = await prisma.iSOMoeda.findUnique({
            where: { ISOMoe_Codigo: data.ISOEmp_MoeCodigo }
        });

        if (!moeda) {
            throw new Error('Moeda informada não existe.');
        }
    }

    // 🔹 Validar língua se enviada
    if (data.ISOEmp_LngCodigo) {
        const lingua = await prisma.iSOLingua.findUnique({
            where: { ISOLng_Codigo: data.ISOEmp_LngCodigo }
        });

        if (!lingua) {
            throw new Error('Língua informada não existe.');
        }
    }

    // 🔹 Data de alteração não pode ser futura
    if (data.ISOEmp_DataAlteracao) {
        const now = new Date();
        const dataAlt = new Date(data.ISOEmp_DataAlteracao);

        if (dataAlt > now) {
            throw new Error('Data de alteração não pode ser futura.');
        }
    }
}

/**
 * 🧠 Validação real de CNPJ
 */
function isValidCNPJ(cnpj: string): boolean {
    if (/^(\d)\1+$/.test(cnpj)) return false;

    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);

    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += Number(numbers[length - i]) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== Number(digits[0])) return false;

    length = length + 1;
    numbers = cnpj.substring(0, length);

    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += Number(numbers[length - i]) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    return result === Number(digits[1]);
}
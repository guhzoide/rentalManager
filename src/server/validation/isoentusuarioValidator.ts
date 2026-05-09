import { domains } from '@/server/domains';
import { isoserviceCreate, isoserviceRead } from '@/server/services/isoserviceService';
import { Decrypt64, Encrypt64, isEncrypted } from '@/utils/encrypt';
import { getSeedToken } from '@/utils/getSeed';
import { isoGetDate } from '@/utils/isoGetDate';

export const isoentusuarioValidator = {
    async validate(data: any, tx?: any, originalData?: any) {
        tratarCamposOpcionais(data);
        validarDominios(data);
        await handleDependencies(data, originalData);
        validarFormatacao(data);
    },
};



/**
 * 🔵 TRATAMENTO DE CAMPOS OPCIONAIS
 * Garante que campos que referenciam outras tabelas sejam null se vierem vazios ou 0
 */
function tratarCamposOpcionais(data: any) {
    const campos = [
        'ISOEntCla_Codigo',
        'ISOEntClaP_Codigo',
        'ISOEntClaPEsp_Codigo',
        'ISOEntUsu_LocCodigo',
        'ISOEntUsu_GrpCodigo'
    ];

    campos.forEach(campo => {
        if (data[campo] === 0 || data[campo] === '0' || data[campo] === '') {
            data[campo] = null;
        } else if (data[campo] !== undefined && data[campo] !== null) {
            data[campo] = Number(data[campo]);
        }
    });
}


/**
 * 🟡 VALIDAÇÕES DE FORMATO
 */
function validarFormatacao(data: any) {


    // Extensão de arquivo
    if (data.ISOEntUsu_ImagemExtensao) {
        const allowed = ['png', 'jpg', 'jpeg', 'svg', 'gif'];
        const ext = data.ISOEntUsu_ImagemExtensao.toLowerCase().replace('.', '');

        if (!allowed.includes(ext)) {
            throw new Error(`Extensão de logotipo inválida. Permitidas: ${allowed.join(', ')}`);
        }
    }
}


/**
 * 🔴 DOMINIOS EXISTENTES
 */
function validarDominios(data: any) {
    const domainFlag = domains.ISOFlag;

    if (data.ISOEntUsu_Flag !== undefined) {
        const existsISOEntUsu_Flag = domainFlag.some(d => d.value === data.ISOEntUsu_Flag);
        if (!existsISOEntUsu_Flag) {
            throw new Error('ISOEntUsu_Flag inválido.');
        }
    }
}

/**
 * Executado ANTES de se criar um registro em ISOEntUsuario.
 * Delega o create/update para o ecosistema isoservice.
 */
async function handleDependencies(data: any, originalData: any) {

    const nomeCompleto = originalData.ISOEntPes_PrimeiroNome + ' ' + originalData.ISOEntPes_SobreNome
    const flag = originalData.ISOEntUsu_Flag || 'A';
    const empCodigo = Number(originalData.ISOEmp_Codigo) || 1;
    const sexo = originalData.ISOEntPes_Sexo || 'N';
    let entCodigo = originalData.ISOEntUsu_Codigo && originalData.ISOEntUsu_Codigo !== 0 && originalData.ISOEntUsu_Codigo !== '0'
        ? originalData.ISOEntUsu_Codigo
        : null;



    if (!entCodigo) {
        // Validação de unicidade do CPF através da leitura genérica do serviço
        if (originalData.ISOEntPes_CPF) {
            const resultPessoa = await isoserviceRead({
                table: 'ISOEntPessoa',
                filtros: { ISOEntPes_CPF: Number(originalData.ISOEntPes_CPF) }
            });
            if (resultPessoa.retorno && resultPessoa.retorno.length > 0) {
                entCodigo = resultPessoa.retorno[0].ISOEntPes_Codigo;
            }
        }
    }

    const resultEntidade = await isoserviceCreate({
        table: 'ISOEntidade',
        Itens: {
            ...(entCodigo ? { ISOEnt_Codigo: entCodigo } : {}),
            ISOEnt_Nome: nomeCompleto,
            ISOEnt_Flag: flag,
            ISOEnt_DataAlteracao: "{{date}}",
            ISOEnt_UsuarioAlteracao: "{{userId}}",
        }
    });

    if (!entCodigo) {
        entCodigo = resultEntidade.retorno.ISOEnt_Codigo;
    }

    // O isoserviceCreate já resolve automaticamente Create vs Update se mandarmos as PKs completas
    await isoserviceCreate({
        table: 'ISOEntPessoa',
        Itens: {
            ISOEntPes_Codigo: entCodigo || null,
            ISOEntPes_PrimeiroNome: originalData.ISOEntPes_PrimeiroNome || null,
            ISOEntPes_SobreNome: originalData.ISOEntPes_SobreNome || null,
            ISOEntPes_NomeCompleto: nomeCompleto,
            ISOEntPes_Sexo: sexo,
            ISOEntPes_Flag: flag,
            ISOEntPes_DataAlteracao: "{{date}}",
            ISOEntPes_UsuarioAlteracao: "{{userId}}",
            ISOEntPes_CPF: originalData.ISOEntPes_CPF || null,
        }
    });

    await isoserviceCreate({
        table: 'ISOEmp_Entidade',
        Itens: {
            ISOEmp_Codigo: data.ISOEmp_Codigo || 1,
            //            ISOEmp_Codigo: "{{empresaId}}",
            ISOEnt_Codigo: entCodigo,
            ISOEmp_Ent_SeqAlerta: 0,
            ISOEmp_Ent_Flag: flag,
            ISOEmp_Ent_DataAlteracao: "{{date}}",
            ISOEmp_Ent_UsuarioAlteracao: "{{userId}}",
        }
    });

    await isoserviceCreate({
        table: 'ISOEntResponsavel',
        Itens: {
            ISOEmp_Codigo: data.ISOEmp_Codigo || 1,
            ISOEntRsp_Codigo: entCodigo,
            ISOEntUnd_Codigo: originalData.ISOEntUnd_Codigo,
            ISOEntRsp_AplicaFeriado: originalData.ISOEntRsp_AplicaFeriado,
            ISOEntRspSit_Codigo: originalData.ISOEntRspSit_Codigo,
            ISOEntRsp_Flag: originalData.ISOEntRsp_Flag,
            ISOEntRsp_DataAlteracao: isoGetDate(),
            ISOEntRsp_UsuarioAlteracao: "{{userId}}",
        }
    });

    // Injeta o ID e empresa no payload
    data.ISOEntUsu_Codigo = entCodigo;
    data.ISOEmp_Codigo = empCodigo;

    const senha = originalData.ISOEntUsu_Senha || '';

    // Criptografa a senha apenas se ela ainda não estiver criptografada
    if (senha && !isEncrypted(senha)) {
        data.ISOEntUsu_Senha = Encrypt64(senha, getSeedToken());
    } else {
        data.ISOEntUsu_Senha = senha;
    }

}
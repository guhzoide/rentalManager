import { isoserviceCreate, isoserviceRead } from '@/server/services/isoserviceService';
import { isoGetDate } from '@/utils/isoGetDate';

export const isoIntEntradaClienteValidator = {
    async validate(data: any, tx: any, originalData: any) {
        const clientes = originalData?.Cliente || [];
        try {
            for (const clienteJson of clientes) {
                await processarCliente(clienteJson, { tx });
            }
        } catch (error: any) {
            console.error('Erro na integração de clientes:', error);
            throw new Error(`Falha na integração: ${error.message}`);
        }
    },
};

async function processarCliente(clienteJson: any, context: any) {
    const taxId = String(clienteJson.CPF || clienteJson.CNPJ || '').trim();

    // 1. Identificar Entidade Existente
    let entCodigo = await findEntityByTaxId(taxId, context);

    // 2. Upsert ISOEntidade
    entCodigo = await upsertISOEntidade(clienteJson, entCodigo, context);

    // 3. Upsert Pessoa ou Organização
    if (clienteJson.Pessoa?.DadosPessoa) {
        await upsertISOEntPessoa(entCodigo, clienteJson.Pessoa.DadosPessoa, taxId, context);
    } else if (clienteJson.Organizacao?.DadosOrganizacao) {
        await upsertISOEntOrganizacao(entCodigo, clienteJson.Organizacao.DadosOrganizacao, taxId, context);
    }

    // 4. ISOEmp_Entidade (Vínculo com Empresa)
    await upsertISOEmpEntidade(entCodigo, context);

    // 5. ISOEntCliente
    await upsertISOEntCliente(entCodigo, clienteJson.Cliente?.DadosCliente, context);

    // 6. Tabelas Secundárias (Responsável, Fiscal, Venda)
    await syncTabelasSecundarias(entCodigo, clienteJson, context);

    // 7. Dados Complementares (Atributos Dinâmicos)
    await syncDadosComplementares(entCodigo, clienteJson, context);
}


/**
 * 🛠️ HELPERS DE BUSCA
 */
async function findEntityByTaxId(taxId: string, { session }: any): Promise<number | null> {
    const cleanTaxId = String(taxId).trim();

    // Busca em Pessoa (Somente se for CPF - 11 dígitos)
    if (cleanTaxId.length <= 11) {
        const resultPessoa = await isoserviceRead({
            table: 'ISOEntPessoa',
            filtros: { ISOEntPes_CPF: taxId },
            select: { ISOEntPes_Codigo: true }
        });

        if (resultPessoa.retorno && resultPessoa.retorno.length > 0) {
            return resultPessoa.retorno[0].ISOEntPes_Codigo;
        }
    }

    // Busca em Organização
    const resultOrganizacao = await isoserviceRead({
        table: 'ISOEntOrganizacao',
        filtros: { ISOEntOrg_CNPJ: cleanTaxId },
        select: { ISOEntOrg_Codigo: true }
    });

    if (resultOrganizacao.retorno && resultOrganizacao.retorno.length > 0) {
        return resultOrganizacao.retorno[0].ISOEntOrg_Codigo;
    }

    return null;
}

/**
 * 🔍 Lookups Dinâmicos
 */
async function getSituacaoId(situacao: any, { tx, session }: any): Promise<number> {
    if (typeof situacao === 'object' && situacao?.ISO_Codigo) {
        return situacao.ISO_Codigo;
    }
    const desc = typeof situacao === 'object' ? situacao.ISO_Descricao : situacao;
    if (!desc) return 1;

    const record = await tx.iSOEntCliSituacao.findFirst({
        where: {
            ISOEmp_Codigo: session.ISOEmp_Codigo,
            ISOEntCliSit_Descricao: { contains: desc }
        },
        select: { ISOEntCliSit_Codigo: true }
    });
    return (record as any)?.ISOEntCliSit_Codigo || 1;
}

async function getEspecialidadeId(claCodigo: number | null, especialidade: any, { tx, session }: any): Promise<number | null> {
    if (!especialidade || !claCodigo) return null;
    if (typeof especialidade === 'object' && especialidade?.ISO_Codigo) {
        return especialidade.ISO_Codigo;
    }
    const desc = typeof especialidade === 'object' ? especialidade.ISO_Descricao : especialidade;
    if (!desc) return null;

    const record = await tx.iSOEntClaPEspecialidade.findFirst({
        where: {
            ISOEmp_Codigo: session.ISOEmp_Codigo,
            ISOEntClaP_Codigo: claCodigo,
            ISOEntClaPEsp_Descricao: { contains: desc }
        },
        select: { ISOEntClaPEsp_Codigo: true }
    });
    return (record as any)?.ISOEntClaPEsp_Codigo || null;
}

async function getNivelResponsabilidadeId(nome: string, { tx, session }: any): Promise<number> {
    if (!nome) return 1;
    const record = await tx.iSOEntNivResponsabilidade.findFirst({
        where: {
            ISOEmp_Codigo: session.ISOEmp_Codigo,
            ISOEntNivRsp_Descricao: { contains: nome }
        },
        select: { ISOEntNivRsp_Codigo: true }
    });
    return (record as any)?.ISOEntNivRsp_Codigo || 1;
}

/**
 * 🛠️ OPERAÇÕES DE ENTIDADE
 */
async function upsertISOEntidade(clienteJson: any, entCodigo: number | null, context: any): Promise<number> {
    const nome = (clienteJson.Pessoa?.DadosPessoa
        ? `${clienteJson.Pessoa.DadosPessoa.PrimeiroNome} ${clienteJson.Pessoa.DadosPessoa.SobreNome}`.trim()
        : clienteJson.Organizacao?.DadosOrganizacao?.RazaoSocial || 'INTEGRAÇÃO').substring(0, 70);

    const dataCadastro = (clienteJson.Pessoa?.DadosPessoa
        ? `${clienteJson.Pessoa.DadosPessoa.DataCadastro}`
        : clienteJson.Organizacao?.DadosOrganizacao?.DataCadastro || '{{date}}');

    const itens: any = {
        ISOEnt_Nome: nome,
        ISOEnt_Flag: 'A',
        ISOEnt_DataAlteracao: '{{date}}',
        ISOEnt_UsuarioAlteracao: '{{userId}}',
        ISOEnt_EmpCodigo: '{{empresaId}}',
        ISOEnt_UsuarioCadastro: '{{userId}}'
    };

    if (entCodigo) {
        itens.ISOEnt_Codigo = entCodigo;
    } else {
        itens.ISOEnt_DataCadastro = isoGetDate(dataCadastro);
    }

    const res = await isoserviceCreate({
        table: 'ISOEntidade',
        Itens: itens
    });

    return res.retorno.ISOEnt_Codigo;
}

async function upsertISOEmpEntidade(entCodigo: number, context: any) {
    await isoserviceCreate({
        table: 'ISOEmp_Entidade',
        Itens: {
            ISOEmp_Codigo: '{{empresaId}}',
            ISOEnt_Codigo: entCodigo,
            ISOEmp_Ent_Flag: 'A',
            ISOEmp_Ent_SeqAlerta: 0,
            ISOEmp_Ent_DataAlteracao: '{{date}}',
            ISOEmp_Ent_UsuarioAlteracao: '{{userId}}'
        }
    });
}

/**
 * 🛠️ PESSOA / ORGANIZAÇÃO
 */
async function upsertISOEntPessoa(entCodigo: number, dados: any, taxId: string, context: any) {
    const data = {
        ISOEntPes_Codigo: entCodigo,
        ISOEntPes_PrimeiroNome: (dados.PrimeiroNome || '').substring(0, 30),
        ISOEntPes_SobreNome: (dados.SobreNome || '').substring(0, 40),
        ISOEntPes_NomeCompleto: `${dados.PrimeiroNome || ''} ${dados.SobreNome || ''}`.trim().substring(0, 70),
        ISOEntPes_CPF: taxId.length <= 11 ? taxId : null,
        ISOEntPes_RG: (dados.RG || '').substring(0, 20),
        ISOEntPes_RG_Data: dados.RGDataEmissao && dados.RGDataEmissao !== '0000-00-00' ? new Date(dados.RGDataEmissao) : null,
        ISOEntPes_RG_Orgao: (dados.RGOrgaoEmissor || '').substring(0, 20),
        ISOEntPes_DataNascimento: dados.DataNascimento && dados.DataNascimento !== '0000-00-00' ? new Date(dados.DataNascimento) : null,
        ISOEntPes_Sexo: (dados.Sexo || 'M').charAt(0).toUpperCase(),
        ISOEntPes_Observacao: (dados.Observacao || '').substring(0, 1024),
        ISOEntPes_Flag: 'A',
        ISOEntPes_DataAlteracao: '{{date}}',
        ISOEntPes_UsuarioAlteracao: '{{userId}}'
    };

    await isoserviceCreate({
        table: 'ISOEntPessoa',
        Itens: data
    });
}

async function upsertISOEntOrganizacao(entCodigo: number, dados: any, taxId: string, context: any) {
    const data = {
        ISOEntOrg_Codigo: entCodigo,
        ISOEntOrg_RazaoSocial: (dados.RazaoSocial || '').substring(0, 70),
        ISOEntOrg_NomeFantasia: (dados.NomeFantasia || '').substring(0, 70),
        ISOEntOrg_CNPJ: String(taxId).trim(),
        ISOEntOrg_InscEstadual: String(dados.InscricaoEstadual || '').trim().substring(0, 27),
        ISOEntOrg_DataAbertura: dados.DataAbertura && dados.DataAbertura !== '0000-00-00' ? new Date(dados.DataAbertura) : null,
        ISOEntOrg_Observacao: (dados.Observacao || '').substring(0, 1024),
        ISOEntOrg_Flag: 'A',
        ISOEntOrg_DataAlteracao: '{{date}}',
        ISOEntOrg_UsuarioAlteracao: '{{userId}}'
    };

    await isoserviceCreate({
        table: 'ISOEntOrganizacao',
        Itens: data
    });
}

/**
 * 🛠️ CLIENTE
 */
async function upsertISOEntCliente(entCodigo: number, dados: any, context: any) {
    if (!dados) return;

    const sitId = await getSituacaoId(dados.Situacao, context);
    const claPCodigo = dados.Classificacao?.ISO_Codigo || 1;
    const espCodigo = await getEspecialidadeId(claPCodigo, dados.Especialidade, context);

    const data = {
        ISOEmp_Codigo: '{{empresaId}}',
        ISOEntCli_Codigo: entCodigo,
        ISOEntCli_Suframa: (dados.CodigoSuframa || '').substring(0, 15),
        ISOEntCli_SuframaDtValidade: dados.SuframaDataValidade && dados.SuframaDataValidade !== '0000-00-00' ? new Date(dados.SuframaDataValidade) : null,
        ISOEntCli_LimiteCredito: parseFloat(dados.LimiteCredito) || 0,
        ISOEntCli_LimiteCreditoDisp: parseFloat(dados.LimiteCreditoDisponivel) || 0,
        ISOEntCliSit_Codigo: sitId,
        ISOEntClaP_Codigo: claPCodigo,
        ISOEntClaPEsp_Codigo: espCodigo,
        ISOEntCli_SitInterna: 'LIB',
        ISOEntCli_BloqCred: dados.BloqueadoCredito === 'S' || dados.BloqueadoCredito === 'Sim' ? 1 : 0,
        ISOEntCli_PoderCompra: dados.PoderCompra === 'S' ? 1 : 0,
        ISOEntCli_VolumeCompra: parseFloat(dados.VolumeCompra) || 0,
        ISOEntCli_Contribuinte: dados.ContribuinteICMS === 'S' || dados.ContribuinteICMS === 'Sim' ? 'S' : 'N',
        ISOEntCli_TicketMedio: parseFloat(dados.TicketMedio) || 0,
        ISOEntCli_EscapeAnvisa: (dados.EscapeAnvisa || '').substring(0, 20),
        ISOEntCli_OrigemMatriz: null,
        ISOEntCli_CodigoMatriz: (dados.CodigoMatriz || '').substring(0, 15),
        ISOEntCli_Flag: 'A',
        ISOEntCli_DataAlteracao: '{{date}}',
        ISOEntCli_UsuarioAlteracao: '{{userId}}',
        ISOEntCli_DataCadastro: '{{date}}'
    };

    await isoserviceCreate({
        table: 'ISOEntCliente',
        Itens: data
    });
}

/**
 * 🛠️ TABELAS SECUNDÁRIAS (Responsável, Fiscal, Venda)
 */
async function syncTabelasSecundarias(entCodigo: number, clienteJson: any, context: any) {
    // 1. RESPONSÁVEL
    for (const rsp of (clienteJson.Responsavel || [])) {
        const resultRespEnt = await isoserviceRead({
            table: 'ISOEntidade',
            filtros: { ISOEnt_Nome: (rsp.Responsavel || '').substring(0, 70) },
            select: { ISOEnt_Codigo: true }
        });
        const respEnt = resultRespEnt.retorno?.[0];
        if (!respEnt) continue;

        const nivRspCodigo = await getNivelResponsabilidadeId(rsp.NivelResponsabilidade || '', context);

        await isoserviceCreate({
            table: 'ISOEntRsp_Clientes',
            Itens: {
                ISOEmp_Codigo: '{{empresaId}}',
                ISOEntRsp_Codigo: respEnt.ISOEnt_Codigo,
                ISOEntCli_Codigo: entCodigo,
                ISOEntNivRsp_Codigo: nivRspCodigo,
                ISOEntRsp_Cli_Principal: rsp.Principal === 'S' ? 'S' : 'N',
                ISOEntRsp_Cli_Flag: 'A',
                ISOEntRsp_Cli_DataAlteracao: '{{date}}',
                ISOEntRsp_Cli_UsuarioAlteracao: '{{userId}}'
            }
        });
    }

    // 2. CATEGORIA FISCAL
    for (const catF of (clienteJson.CategoriaFiscal || [])) {
        await isoserviceCreate({
            table: 'ISOEntCategoriaFiscal',
            Itens: {
                ISOEnt_Codigo: entCodigo,
                ISOEntCatF_CategFiscalCod: (catF.CategoriaFiscal || '').substring(0, 5),
                ISOEntCatF_RepICMS: (catF.RepasseICMS || 'S').charAt(0),
                ISOEntCatF_RepPISCOFINS: (catF.RepassePISCOFINS || 'NNN').substring(0, 3),
                ISOEntCatF_ContribICMS: (catF.ContribuinteICMS || 'S').charAt(0),
                ISOEntCatF_Flag: 'A',
                ISOEntCatF_DataAlteracao: '{{date}}',
                ISOEntCatF_UsuarioAlteracao: '{{userId}}',
                ISOEntCatF_EmpCodigo: '{{empresaId}}'
            }
        });
    }

    // 3. TABELA DE VENDA
    for (const tv of (clienteJson.TabelaVenda || [])) {
        await isoserviceCreate({
            table: 'ISOEntCliTabVenda',
            Itens: {
                ISOEmp_Codigo: '{{empresaId}}',
                ISOEntCliTB_ClienteCodigo: entCodigo,
                ISOEntCliTB_TabVenda: (tv.TabelaVenda || '').substring(0, 10),
                ISOEntCliTB_LocFatOri: '01',
                ISOEntCliTB_LocFatDest: '01',
                ISOEntCliTB_Flag: 'A',
                ISOEntCliTB_DataAlteracao: '{{date}}',
                ISOEntCliTB_UsuarioAlteracao: '{{userId}}'
            }
        });
    }
}

/**
 * 🛠️ DADOS COMPLEMENTARES (Atributos Dinâmicos)
 */
async function syncDadosComplementares(entCodigo: number, clienteJson: any, context: any) {
    for (const dc of (clienteJson.DadoComplementar || [])) {
        const resultForm = await isoserviceRead({
            table: 'ISOEntClienteFormDef',
            filtros: { ISOEntClienteFormDefName: dc.Formulario }
        });
        const formDef = resultForm.retorno?.[0];
        if (!formDef) continue;

        const resultAtt = await isoserviceRead({
            table: 'ISOEntClienteAtt',
            filtros: {
                ISOEntClienteFormDefId: formDef.ISOEntClienteFormDefId,
                ISOEntClienteAttName: dc.Pergunta
            }
        });
        const att = resultAtt.retorno?.[0];
        if (!att) continue;

        const attId = att.ISOEntClienteAttId;

        await isoserviceCreate({
            table: 'ISOEntClienteAttValues',
            Itens: {
                ISOEmp_Codigo: '{{empresaId}}',
                ISOEntCli_Codigo: entCodigo,
                ISOEntClienteAttId: attId,
                ISOEntClienteAttValue: (dc.Resposta || '').substring(0, 100),
                ISOEntClienteAttOtherValue: (dc.Outros || '').substring(0, 2048),
                ISOEntClienteAttValue_DataAlte: '{{date}}',
                ISOEntClienteAttValue_UsuarioA: '{{userId}}',
                ISOEntClienteAttValueFlag: 'A'
            }
        });
    }
}
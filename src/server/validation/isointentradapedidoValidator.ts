import { isoserviceCreate, isoserviceRead } from '@/server/services/isoserviceService';
import { isoGetDate } from '@/utils/isoGetDate';

export const isoIntEntradaPedidoValidator = {
    async validate(data: any, tx: any, originalData: any) {
        const pedidos = originalData?.Itens?.[0]?.Pedido || originalData?.Pedido || [];
        try {
            for (const pedidoJson of pedidos) {
                await processarPedido(pedidoJson, { tx });
            }
        } catch (error: any) {
            console.error('Erro na integração de pedidos:', error);
            throw new Error(`Falha na integração: ${error.message}`);
        }
    },
};

async function processarPedido(pedidoJson: any, context: any) {
    const { tx } = context;

    // 1. Identificar o Cliente pelo CNPJ (Busca similar a cliente)
    const taxId = String(pedidoJson.CNPJ || '').trim();
    let clienteResult = await isoserviceRead({
        table: 'ISOEntOrganizacao',
        filtros: { ISOEntOrg_CNPJ: taxId },
        select: { ISOEntOrg_Codigo: true }
    });

    let entCodigo = clienteResult.retorno?.[0]?.ISOEntOrg_Codigo;

    // Se não encontrou na Organização, tenta na Pessoa (CPF)
    if (!entCodigo && taxId.length <= 11) {
        const resultPessoa = await isoserviceRead({
            table: 'ISOEntPessoa',
            filtros: { ISOEntPes_CPF: taxId },
            select: { ISOEntPes_Codigo: true }
        });
        entCodigo = resultPessoa.retorno?.[0]?.ISOEntPes_Codigo;
    }

    if (!entCodigo) {
        throw new Error(`Cliente não encontrado para o CNPJ/CPF: ${taxId}`);
    }

    const dadosPedido = pedidoJson.DadosPedido?.Pedido || {};

    // 2. Resolver IDs para DadoComplementar
    const dadosComplementares = [];
    if (pedidoJson.DadoComplementar && pedidoJson.DadoComplementar.length > 0) {
        for (const dc of pedidoJson.DadoComplementar) {
            const form = await tx.iSOPvPedidoFormDef.findFirst({
                where: { ISOPvPedidoFormDefName: dc.Formulario }
            });
            if (!form) continue;
            const att = await tx.iSOPvPedidoAtt.findFirst({
                where: {
                    ISOPvPedidoFormDefId: form.ISOPvPedidoFormDefId,
                    ISOPvPedidoAttName: dc.Pergunta
                }
            });
            if (!att) continue;
            dadosComplementares.push({
                ISOEmp_Codigo: '{{empresaId}}',
                ISOPvPedidoAttId: att.ISOPvPedidoAttId,
                ISOPvPedidoAttValue: (dc.Resposta || '').substring(0, 100),
                ISOPvPedidoAttOtherValue: dc.Outros || '',
                ISOPvPedidoAttValue_Flag: 'A',
                ISOPvPedidoAttValue_DataAltera: '{{date}}',
                ISOPvPedidoAttValue_UsuarioAlt: '{{userId}}'
            });
        }
    }
    // A validação de Produtos foi movida para o isopvpeditemValidator.ts

    // 3. Mapeamento dos dados do Pedido e criação em cascata (nested create)
    const pedidoPayload = {
        ISOEmp_Codigo: '{{empresaId}}',
        ISOPvPed_CliCodigo: entCodigo,
        ISOPvPed_CodigoExterno: (pedidoJson.Pedido_externo || pedidoJson.Codigo_externo || dadosPedido.Codigo_externo || '').substring(0, 15),
        ISOPvPed_DtaPedido: pedidoJson.DataPedido ? isoGetDate(pedidoJson.DataPedido) : '{{date}}',
        ISOPvPed_HoraPedido: (dadosPedido.HoraPedido || '').substring(0, 8),
        ISOPvPed_DtaAberPedido: dadosPedido.DataAberturaPedido ? isoGetDate(dadosPedido.DataAberturaPedido) : '{{date}}',
        ISOPvPed_HraAberPedido: (dadosPedido.HoraAberturaPedido || '').substring(0, 8),
        ISOPvPed_ValorTotalPedido: parseFloat(dadosPedido.ValorTotalPedido) || 0,
        ISOPvPed_VlrDesconto: parseFloat(dadosPedido.ValorDesconto) || 0,
        ISOPvPed_TotalFaturado: parseFloat(dadosPedido.TotalFaturado) || 0,
        ISOPvPed_ValorFrete: parseFloat(dadosPedido.ValorFrete) || 0,
        ISOPvPed_Observacao: (dadosPedido.Observacao || '').substring(0, 1024),
        ISOPVPed_OrdCompra: (dadosPedido.OrdemCompra || '').substring(0, 20),
        ISOPvPed_EstadoOrigem: (dadosPedido.UFOrigem || '').substring(0, 2),
        ISOPvPed_EstadoDestino: (dadosPedido.UFDestino || '').substring(0, 2),
        ISOPvPed_EndCep: (dadosPedido.CEPEnderecoEntrega || '').replace(/\D/g, '').substring(0, 10),
        ISOPvPed_EndLogradouro: (dadosPedido.LogradouroEnderecoEntrega || '').substring(0, 70),
        ISOPvPed_EndNumero: (dadosPedido.NumeroEnderecoEntrega || '').substring(0, 15),
        ISOPvPed_EndBairro: (dadosPedido.BairroEnderecoEntrega || '').substring(0, 30),
        ISOPvPed_EndComplemento: (dadosPedido.ComplementoEnderecoEntrega || '').substring(0, 30),

        // Cobrança
        ISOPvPed_EndCep1: (dadosPedido.CEPEnderecoCobranca || '').replace(/\D/g, '').substring(0, 10),
        ISOPvPed_EndLogradouro1: (dadosPedido.LogradouroEnderecoCobranca || '').substring(0, 70),
        ISOPvPed_EndNumero1: (dadosPedido.NumeroEnderecoCobranca || '').substring(0, 15),
        ISOPvPed_EndComplemento1: (dadosPedido.ComplementoEnderecoCobranca || '').substring(0, 30),
        ISOPvPed_EndBairro1: (dadosPedido.BairroEnderecoCobranca || '').substring(0, 30),

        ISOPvPed_DataValidade: '{{date}}',
        ISOPvPed_DtaPrevEntrada: dadosPedido.DataPrevisaoEntrada ? isoGetDate(dadosPedido.DataPrevisaoEntrada) : '{{date}}',
        ISOPvPed_DtaSolEntrega: '{{date}}',
        ISOPvPed_DataDesejadaRec: dadosPedido.DataDesejadaRecebimento ? isoGetDate(dadosPedido.DataDesejadaRecebimento) : '{{date}}',
        ISOPvPed_DtaVencBoleto: dadosPedido.DataVencimentoBoleto ? isoGetDate(dadosPedido.DataVencimentoBoleto) : '{{date}}',
        ISOPvPedOri_Codigo: (dadosPedido.OrigemPedido || '').substring(0, 3),

        ISOPvPed_VlrConfirmado: 0,
        ISOPvPed_NrUltItem: pedidoJson.PedidoItem?.length || 0,
        ISOPvPed_NomeBanco: '',
        ISOPvPed_CodigoBanco: 0,
        ISOPvPed_CodigoAgencia: 0,
        ISOPvPed_NumeroConta: 0,
        ISOPvPed_NumeroCheque: 0,
        ISOPvPed_NomPesCheque: '',
        ISOPvPed_NomeCartao: '',
        ISOPvPed_NumeroCartao: '',
        ISOPvPed_VencCarMes: 0,
        ISOPvPed_VencCarAno: 0,
        ISOPvPed_CodDepBanco: 0,
        ISOPvPed_CodDepAgencia: 0,
        ISOPvPed_NrDepConta: 0,
        ISOPvPed_ObsDinheiro: '',
        ISOPvPed_EndCidade: 0,
        ISOPvPed_EndEstado: 0,
        ISOPvPed_EndPais: 0,
        ISOPvPed_CodEndCobranca: 0,
        ISOPvPed_CodEndEntrega: 0,
        ISOPvPed_CodigoAtendente: '{{userId}}',
        ISOPvPed_IcmBase: 0,
        ISOPvPed_IcmDestino: 0,
        ISOPvPed_IcmImpresso: 0,
        ISOPvPed_CodigoObjetivo: 0,
        ISOPvPed_CodigoContato: 0,
        ISOPvPed_SeqContato: 0,
        ISOPvPed_NumeroCotacao: 0,
        ISOPvPed_CodigoCotacao: '',
        ISOPvPed_AtivoReceptivo: 'A',
        ISOPvPed_CodigoCD: '',
        ISOPvPed_Pagamento: '',
        ISOPvPed_NegociadoExcell: 'N',
        ISOPvPed_FaturadoParcial: 'N',
        ISOPvPed_ConfirmacaoItens: 0,
        ISOPvPed_Flag: 'A',
        ISOPvPed_DataAlteracao: dadosPedido.DataAlteracao ? isoGetDate(dadosPedido.DataAlteracao) : '{{date}}',
        ISOPvPed_UsuarioAlteracao: '{{userId}}',

        // Criação em cascata: Itens do Pedido
        ISOPvPedItem: (pedidoJson.PedidoItem || []).map((item: any, index: number) => ({
            ISOEmp_Codigo: '{{empresaId}}',
            ISOPvPedIte_Codigo: index + 1,
            ISOPrd_Codigo: (item.CodigoItem_isoCRM || item.Produto || '').substring(0, 30),
            ISOPvPedIte_Quantidade: parseFloat(item.Quantidade) || 0,
            ISOPvPedIte_ValorUnitario: parseFloat(item.ValorUnitario) || 0,
            ISOPvPedIte_PercentualIPI: parseFloat(item.PercentualIPI) || 0,
            ISOPvPedIte_UltimaSequencia: 1,
            ISOPvPedIte_DtaSolEntrega: item.DataSolicitacaoEntrega ? isoGetDate(item.DataSolicitacaoEntrega) : '{{date}}',
            ISOPvPedIteSit_Codigo: 1,
            ISOPvPedIte_Observacao: '',
            ISOPvPedIte_TabelaVenda: '',
            ISOPvPedIte_UnidadeOrigem: (item.UnidadeOrigem || '').substring(0, 3),
            ISOPvPedIte_UnidadeDestino: (item.UnidadeDestino || '').substring(0, 3),
            ISOPvPedIte_ValorOriginal: parseFloat(item.ValorOriginal) || 0,
            ISOPvPedIte_QuantidadeFaturada: parseFloat(item.QuantidadeFaturada) || 0,
            ISOPvPedIte_PercSubsTributaria: parseFloat(item.PercentualSubstituicaoTributaria) || 0,
            ISOPvPedIte_PercentualICMS: parseFloat(item.PercentualICMS) || 0,
            ISOPvPedIte_PrecoLista: parseFloat(item.PrecoLista) || 0,
            ISOPvPedIte_ValorBaseOriginal: parseFloat(item.PrecoListaBase) || 0,
            ISOPvPedIte_ValorUnitOriginal: parseFloat(item.ValorUnitarioOriginal) || 0,
            ISOPvPedIte_ValorFCP: parseFloat(item.ValorFCP) || 0,
            ISOPvPedIte_PercentualFCP: parseFloat(item.PercentualFCP) || 0,
            ISOPVPedIte_ValorFCPST: parseFloat(item.ValorFCPST) || 0,
            ISOPvPedIte_PercentualFCPST: parseFloat(item.PercentualFCPST) || 0,
            ISOPvPedIte_DataEmissao: item.DataEmissao ? isoGetDate(item.DataEmissao) : '{{date}}',
            ISOPvPedIte_DataEntregaItem: item.DataEntregaItem ? isoGetDate(item.DataEntregaItem) : '{{date}}',
            ISOPvPedIte_TpRegProgData: (item.TipoRegistroProgramacaoData || '').substring(0, 2),
            ISOPvPedIte_ArmProgData: (item.ArmazemProgramacaoData || '').substring(0, 2),
            ISOPvPedIte_AgendamentoData: item.AgendamentoData ? isoGetDate(item.AgendamentoData) : null,
            ISOPvPedIte_AgendamentoHoraIni: item.AgendamentoHoraInicial ? isoGetDate(item.AgendamentoHoraInicial) : null,
            ISOPvPedIte_AgendamentoHoraFin: item.AgendamentoHoraFinal ? isoGetDate(item.AgendamentoHoraFinal) : null,
            ISOPvPedIte_DataDesejadaRec: item.DataDesejadaRecebimento ? isoGetDate(item.DataDesejadaRecebimento) : null,
            ISOPvPedIte_NrNotaFiscal: (item.NrNotaFiscal || '').substring(0, 15),
            ISOPvPedIte_SerieNotaFiscal: (item.SerieNotaFisca || '').substring(0, 5),
            ISOPvPedIte_NFRefFiscal: (item.RefFNotaFiscal || '').substring(0, 20),
            ISOPvPedIte_SeqItemNotaFiscal: parseInt(item.SeqItemNotaFiscal) || 0,
            ISOPvPedIte_SeqArmLote: parseInt(item.Lote) || 0,
            ISOPvPedIte_PedOriCodigo: (item.PedidoOriginal || '').substring(0, 3),
            // Itens que não constam no JSON
            ISOPvPedIte_SAC: 0,
            ISOPvPedIte_MargemBruta: 0.0,
            ISOPvPedIte_MargemContribuicao: 0.0,
            ISOPvPedIte_TotDescNegociacao: 0,
            ISOPvPedIte_TotalDescontoCP: 0,
            ISOPvPedIte_ValorTotalCalculoF: 0,
            ISOPvPedIte_SequenciaKit: 0,
            ISOPvPedIte_TotDescPromocao: 0,
            ISOPvPedIte_ObservacaoLonga: '',
            ISOPvPedIte_PercentualPIS: 0.0,
            ISOPvPedIte_PercentualCofins: parseFloat(item.PercentualCofins) || 0.0,
            ISOPvPedIte_ValorIPI: parseFloat(item.ValorIPI) || 0,
            ISOPvPedIte_VlrSubsTributaria: parseFloat(item.ValorSubstituicaoTributaria) || 0,
            ISOPvPedIte_ValorICMS: parseFloat(item.ValorICMS) || 0,
            ISOPvPedIte_ValorPIS: parseFloat(item.ValorPIS) || 0,
            ISOPvPedIte_ValorCofins: parseFloat(item.ValorCofins) || 0,
            ISOPvPedIte_SequenciaPromocao: 0,
            ISOPvPedIte_PromocaoAplicada: 'N',

            ISOPvPedIte_QuantidadeBaixada: 0,
            ISOPvPedIte_FlagBaixa: 0,
            ISOPvPedIte_DataHoraBaixa: '{{date}}',
            ISOPvPedIte_NaturezaOperacao: '',
            ISOPvPedIte_Flag: 'A',
            ISOPvPedIte_DataAlteracao: '{{date}}',
            ISOPvPedIte_UsuarioAlteracao: '{{userId}}',

            // Cascata do Item: Desconto/Acréscimo
            ISOPvPedIteDA: (item.DescontoAcrescimo || []).map((da: any, indexDA: number) => ({
                ISOEmp_Codigo: '{{empresaId}}',
                ISOPvPedIteDa_Produto: (item.CodigoItem_isoCRM || item.Produto || '').substring(0, 30),
                ISOPvPedIteDa_Sequencia: parseInt(da.Sequencia) || indexDA + 1,
                ISOPvPedIteDa_PV: (parseFloat(da.PercentualDesconto || da.PercentualAcrescimo) > 0) ? 'P' : 'V',
                ISOPvPedIteDa_PercVlr: parseFloat(da.ValorDesconto || da.ValorAcrescimo || da.PercentualDesconto || da.PercentualAcrescimo) || 0,
                ISOPvPedIteDa_DA: parseFloat(da.ValorDesconto || da.PercentualDesconto) > 0 ? 'D' : 'A',
                ISOPvPedIteDa_Descricao: (da.Descricao || '').substring(0, 70),
                ISOPvPedIteDa_Confirma: 'S',
                ISOPvPedIteDa_PermAlteracao: 'S',
                ISOPvPedIteDa_DFlag: 'N',
                ISOPvPedIteDa_Flag: (da.AtivoInativo || 'A').substring(0, 1),
                ISOPvPedIteDa_DataAlteracao: da.DataAlteracao ? isoGetDate(da.DataAlteracao) : '{{date}}',
                ISOPvPedIteDa_UsuarioAlteracao: '{{userId}}'
            })),

            // Cascata do Item: Ordem de Produção
            ISOPvPedIteOrdProducao: (item.OrdemProducao || []).map((op: any, indexOP: number) => ({
                ISOEmp_Codigo: '{{empresaId}}',
                ISOPvPedIteOrdP_Seq: parseInt(op.SequenciaOrdemProducao) || indexOP + 1,
                ISOPvPedIteOrdP_OrdemP: (op.OrdemProducao || '').substring(0, 20),
                ISOPvPedIteOrdP_DtaProd: op.DataProducao ? isoGetDate(op.DataProducao) : '{{date}}',
                ISOPvPedIteOrdP_QtdAloca: parseFloat(op.QuantidadeAlocada) || 0,
                ISOPvPedIteOrdP_DtaEnt: op.DataEntrega ? isoGetDate(op.DataEntrega) : '{{date}}',
                ISOPvPedIteOrdP_Ref: (op.Referencia || '').substring(0, 20),
                ISOPvPedIteOrdP_Flag: 'A',
                ISOPvPedIteOrdP_DataAlt: '{{date}}',
                ISOPvPedIteOrdP_UsuAlt: '{{userId}}'
            }))
        })),

        // Criação em cascata: Observações
        ISOPvPedObservacao: (pedidoJson.Observacao || []).map((obs: any, index: number) => ({
            ISOEmp_Codigo: '{{empresaId}}',
            ISOPvPedObs_Sequencia: index + 1,
            ISOPvPedObs_Descricao: obs.Observacao,
            ISOPvPedObs_Pick: (obs.Pick || 'N').substring(0, 1),
            ISOPvPedObs_NF: (obs.NotaFiscal || 'N').substring(0, 1),
            ISOPvPedObs_Flag: (obs.AtivoInativo || 'A').substring(0, 1),
            ISOPvPedObs_DataAlteracao: obs.DataAlteracao ? isoGetDate(obs.DataAlteracao) : '{{date}}',
            ISOPvPedObs_UsuAlteracao: '{{userId}}'
        })),

        // Criação em cascata: Dados Complementares
        ISOPvPedidoAttValues: dadosComplementares
    };

    // Chamamos o isoserviceCreate que lidará com a inserção em cascata de forma limpa.
    await isoserviceCreate({
        table: 'ISOPvPedido',
        Itens: pedidoPayload
    });
}

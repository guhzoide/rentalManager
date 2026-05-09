import { prisma } from '@/server/trpc';

export const isoMenuItemValidator = {
    async validate(data: any, tx?: any) {
        await gerarSequencia(data, tx);
    },

    async afterSave(record: any, tx?: any) {
        await inserirReferencia(record, tx);
        await atualizarSequenciaPai(record, tx);
    }
};

/**
 * 🔵 REGRAS DE NEGÓCIO - GERAÇÃO DE SEQUÊNCIA
 */
async function gerarSequencia(data: any, tx: any) {
    // 🔹 Gerar sequência apenas se for um novo registro (sem código informado)
    if (data.ISOEmp_Codigo && (!data.ISOMenuItem_Codigo || data.ISOMenuItem_Codigo === 0)) {
        const client = tx || prisma;

        const lastRecord = await client.iSOMenuItem.findFirst({
            where: {
                ISOEmp_Codigo: data.ISOEmp_Codigo,
            },
            orderBy: {
                ISOMenuItem_Codigo: 'desc'
            },
            select: {
                ISOMenuItem_Codigo: true
            }
        });

        const sequencia = (lastRecord?.ISOMenuItem_Codigo ?? 0) + 1;
        data.ISOMenuItem_Codigo = sequencia;
    }
}

/**
 * 🔵 AÇÕES PÓS-PERSISTÊNCIA - INSERIR REFERENCIA
 */
async function inserirReferencia(record: any, tx: any) {
    if (record.ISOEmp_Codigo) {
        const client = tx || prisma;

        const lastRecord = await client.iSOExtReferences.findFirst({
            where: {
                ISOEmp_Codigo: record.ISOEmp_Codigo,
                ISOExtRef_Reference: record.ISOMenuItem_Reference,
            },
            orderBy: {
                ISOExtRef_Codigo: 'desc'
            },
            select: {
                ISOMenuItem_Codigo: true
            }
        });

        if (lastRecord) return;

        // Atualiza a sequência no pai
        await client.iSOExtReferences.create({
            data: {
                ISOEmp_Codigo: record.ISOEmp_Codigo,
                ISOExtRef_Codigo: "isoCRM.view.isoUsuario.isoUsuarioModel",
                ISOExtRef_Reference: record.ISOMenuItem_Reference,
                ISOExtRef_GrpCodigo: 1,
                ISOExtRef_Require: false,
                ISOExtRef_Visible: true,
                ISOExtRef_Disable: false,
                ISOExtRef_UsrAlteracao: record.ISOMenuItem_UsuarioAlteracao,
                ISOExtRef_UsrDataAlteracao: record.ISOMenuItem_DataAlteracao,
                ISOExtRef_Modulo: record.ISOMenuItem_ISOModulo,
                ISOMenuItem_Codigo: record.ISOMenuItem_Codigo,
            }
        });
    }
}


/**
 * 🔵 AÇÕES PÓS-PERSISTÊNCIA - ATUALIZAR PAI
 */
async function atualizarSequenciaPai(record: any, tx: any) {
    if (record.ISOEmp_Codigo) {
        const client = tx || prisma;

        // Atualiza a sequência no pai
        await client.iSOAutEmpresa.updateMany({
            where: {
                ISOEmp_Codigo: record.ISOEmp_Codigo,
                ISOAutEmp_Codigo: "TISOMenuItem"
            },
            data: {
                ISOAutEmp_Numero: record.ISOMenuItem_Codigo
            }
        });
    }
}

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';
import { agendaSchema } from '../../lib/schemas.js';
import { type agendas } from '@prisma/client';

async function reserveItems(tx: any, items: { itemId: string; quantidade: number }[]) {
    const quantitiesByItem = new Map<string, number>();
    for (const item of items) {
        quantitiesByItem.set(item.itemId, (quantitiesByItem.get(item.itemId) ?? 0) + item.quantidade);
    }

    for (const [itemId, quantidade] of quantitiesByItem) {
        const item = await tx.estoques.findUnique({ where: { id: itemId } });
        if (!item) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Item de estoque não encontrado.' });
        }
        if (item.disponivel < quantidade) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Estoque insuficiente para ${item.nome}. Disponível: ${item.disponivel}.`,
            });
        }
    }

    for (const [itemId, quantidade] of quantitiesByItem) {
        await tx.estoques.update({
            where: { id: itemId },
            data: { disponivel: { decrement: quantidade }, updatedAt: new Date() },
        });
    }
}

async function releaseItems(tx: any, items: { itemId: string; quantidade: number }[]) {
    for (const item of items) {
        await tx.estoques.update({
            where: { id: item.itemId },
            data: { disponivel: { increment: item.quantidade }, updatedAt: new Date() },
        });
    }
}

export const agendaRouter = router({
    list: protectedProcedure
        .input(paginationSchema)
        .query(async ({ input }) => {
            return getPaginatedResult<agendas>(prisma.agendas, input, {
                include: {
                    clientes: true,
                    enderecos: true,
                    itens: {
                        include: {
                            estoques: true,
                        }
                    }
                }
            });
        }),

    create: protectedProcedure
        .input(agendaSchema)
        .mutation(async ({ input }) => {
            return prisma.$transaction(async (tx) => {
                if (!input.concluida) {
                    await reserveItems(tx, input.itens);
                }

                // Criar o agendamento
                return tx.agendas.create({
                    data: {
                        data: input.data,
                        dataColeta: input.dataColeta,
                        clienteId: input.clienteId,
                        enderecoId: input.enderecoId,
                        observacao: input.observacao,
                        desconto: input.desconto,
                        frete: input.frete,
                        valorTotal: input.valorTotal,
                        concluida: input.concluida,
                        itens: {
                            create: input.itens.map((i) => ({
                                itemId: i.itemId,
                                quantidade: i.quantidade,
                            })),
                        },
                        updatedAt: new Date(),
                    },
                    include: {
                        itens: {
                            include: {
                                estoques: true,
                            }
                        }
                    }
                });
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            data: agendaSchema.partial(),
        }))
        .mutation(async ({ input }) => {
            return prisma.$transaction(async (tx) => {
                // Buscar agendamento atual para verificar se existe
                const currentAgenda = await tx.agendas.findUnique({
                    where: { id: input.id },
                    include: { itens: true },
                });

                if (!currentAgenda) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Agendamento não encontrado.',
                    });
                }

                const itemsWereChanged = input.data.itens !== undefined;
                const completionWasChanged = input.data.concluida !== undefined;
                const willBeCompleted = input.data.concluida ?? currentAgenda.concluida;

                if (itemsWereChanged || completionWasChanged) {
                    if (!currentAgenda.concluida) {
                        await releaseItems(tx, currentAgenda.itens);
                    }

                    if (itemsWereChanged) {
                        await tx.agenda_itens.deleteMany({ where: { agendaId: input.id } });
                    }

                    const finalItems = input.data.itens ?? currentAgenda.itens;
                    if (!willBeCompleted) {
                        await reserveItems(tx, finalItems);
                    }
                }

                const { itens, ...restData } = input.data;

                // Atualizar o agendamento
                return tx.agendas.update({
                    where: { id: input.id },
                    data: {
                        ...restData,
                        updatedAt: new Date(),
                        ...(itens ? {
                            itens: {
                                create: itens.map((i) => ({
                                    itemId: i.itemId,
                                    quantidade: i.quantidade,
                                })),
                            }
                        } : {}),
                    },
                    include: {
                        itens: {
                            include: {
                                estoques: true,
                            }
                        }
                    }
                });
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.$transaction(async (tx) => {
                // Somente agendas ainda abertas possuem itens reservados no estoque.
                const agenda = await tx.agendas.findUnique({
                    where: { id: input.id },
                    include: { itens: true },
                });

                if (agenda && !agenda.concluida) {
                    await releaseItems(tx, agenda.itens);
                }

                // Deletar o agendamento
                return tx.agendas.delete({
                    where: { id: input.id },
                });
            });
        }),
});

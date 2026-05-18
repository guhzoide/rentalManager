import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';
import { prisma } from '../trpc';
import { paginationSchema, getPaginatedResult } from '../utils/pagination';
import { agendaSchema } from '../../lib/schemas';
import { type agendas } from '@prisma/client';

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
                // Decrementar quantidade disponível de cada item selecionado
                for (const item of input.itens) {
                    await tx.estoques.update({
                        where: { id: item.itemId },
                        data: {
                            disponivel: { decrement: item.quantidade },
                            updatedAt: new Date(),
                        },
                    });
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
                        valorTotal: input.valorTotal,
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

                // Se a lista de itens foi fornecida no update, realizar os ajustes de estoque correspondentes
                if (input.data.itens) {
                    // Devolver estoque dos itens antigos
                    for (const oldItem of currentAgenda.itens) {
                        await tx.estoques.update({
                            where: { id: oldItem.itemId },
                            data: {
                                disponivel: { increment: oldItem.quantidade },
                                updatedAt: new Date(),
                            },
                        });
                    }

                    // Remover relações de itens antigas
                    await tx.agenda_itens.deleteMany({
                        where: { agendaId: input.id },
                    });

                    // Retirar estoque das novas quantidades dos novos itens solicitados
                    for (const newItem of input.data.itens) {
                        await tx.estoques.update({
                            where: { id: newItem.itemId },
                            data: {
                                disponivel: { decrement: newItem.quantidade },
                                updatedAt: new Date(),
                            },
                        });
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
                // Buscar o agendamento para identificar todos os itens e restaurar o estoque
                const agenda = await tx.agendas.findUnique({
                    where: { id: input.id },
                    include: { itens: true },
                });

                if (agenda) {
                    for (const oldItem of agenda.itens) {
                        await tx.estoques.update({
                            where: { id: oldItem.itemId },
                            data: {
                                disponivel: { increment: oldItem.quantidade },
                                updatedAt: new Date(),
                            },
                        });
                    }
                }

                // Deletar o agendamento
                return tx.agendas.delete({
                    where: { id: input.id },
                });
            });
        }),
});

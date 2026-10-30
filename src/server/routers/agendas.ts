import { z } from 'zod';
import { agendaFiltersSchema, agendaSearchSchema, agendaWhere, agendaOrderBy } from '../utils/agendaFilters.js';
import { TRPCError } from '@trpc/server';
import { moduleProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';
import { agendaSchema, agendaUpdateSchema } from '../../lib/schemas.js';
import { type agendas } from '@prisma/client';
import { agendaStatus } from '../utils/agendaStatus.js';

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
    search: moduleProcedure('agenda')
        .input(agendaSearchSchema)
        .query(async ({ input, ctx }) => {
            const now = new Date();
            const where = agendaWhere(input, now);
            const [total, data] = await Promise.all([
                ctx.prisma.agendas.count({ where }),
                ctx.prisma.agendas.findMany({
                    where,
                    orderBy: agendaOrderBy(input.sort),
                    skip: (input.pagina - 1) * input.limit,
                    take: input.limit,
                    select: {
                        id: true, data: true, dataColeta: true, observacao: true,
                        desconto: true, frete: true, valorTotal: true, entregue: true, concluida: true,
                        clientes: { select: { id: true, nome: true } },
                        enderecos: { select: { id: true, rua: true, numero: true, bairro: true, cep: true, complemento: true } },
                        itens: { select: {
                            id: true, itemId: true, quantidade: true,
                            estoques: { select: { nome: true, valorDiaria: true, disponivel: true } },
                        } },
                    },
                }),
            ]);
            return {
                data: data.map((agenda) => ({ ...agenda, status: agendaStatus(agenda, now.getTime()) })),
                total, totalPaginas: Math.ceil(total / input.limit),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
        }),

    filterOptions: moduleProcedure('agenda')
        .input(z.object({
            tipo: z.enum(['clientes', 'itens']),
            busca: z.string().trim().max(100).default(''),
            cursor: z.number().int().min(0).nullish(),
            limit: z.number().int().min(1).max(50).default(30),
        }))
        .query(async ({ input }) => {
            const args = {
                where: input.busca ? { nome: { contains: input.busca, mode: 'insensitive' as const } } : {},
                select: { id: true, nome: true },
                orderBy: [{ nome: 'asc' as const }, { id: 'asc' as const }],
                skip: input.cursor ?? 0,
                take: input.limit + 1,
            };
            const rows = input.tipo === 'clientes'
                ? await prisma.clientes.findMany(args)
                : await prisma.estoques.findMany(args);
            return {
                data: rows.slice(0, input.limit),
                nextCursor: rows.length > input.limit ? (input.cursor ?? 0) + input.limit : undefined,
            };
        }),

    pendingDeliveryDates: moduleProcedure('agenda')
        .input(agendaFiltersSchema.extend({ inicio: z.coerce.date(), fim: z.coerce.date() }))
        .query(({ input }) => prisma.agendas.findMany({
            where: agendaWhere(input),
            select: { data: true },
            distinct: ['data'],
        })),

    list: moduleProcedure(['agenda', 'financeiro', 'canvas'])
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

    create: moduleProcedure('agenda')
        .input(agendaSchema)
        .mutation(async ({ input, ctx }) => {
            return ctx.prisma.$transaction(async (tx) => {
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
                        entregue: input.entregue,
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

    update: moduleProcedure('agenda')
        .input(z.object({
            id: z.string(),
            data: agendaUpdateSchema,
        }))
        .mutation(async ({ input, ctx }) => {
            return ctx.prisma.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT id FROM agendas WHERE id = ${input.id} FOR UPDATE`;
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

    delete: moduleProcedure('agenda')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
            return ctx.prisma.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT id FROM agendas WHERE id = ${input.id} FOR UPDATE`;
                // Somente agendas ainda não coletadas possuem itens reservados no estoque.
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

import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { prisma } from '../trpc';
import { paginationSchema, getPaginatedResult } from '../utils/pagination';

const agendaInputSchema = z.object({
  data: z.coerce.date(),
  itemId: z.number().int(),
  clienteId: z.number().int(),
  enderecoId: z.number().int(),
  observacao: z.string().optional(),
});

import { type agendas } from '@prisma/client';

export const agendaRouter = router({
  list: publicProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      return getPaginatedResult<agendas>(prisma.agendas, input, {
        include: {
          clientes: true,
          estoques: true,
          enderecos: true,
        }
      });
    }),

  create: publicProcedure
    .input(agendaInputSchema)
    .mutation(async ({ input }) => {
      return prisma.agendas.create({
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: agendaInputSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      return prisma.agendas.update({
        where: { id: input.id },
        data: {
          ...input.data,
          updatedAt: new Date(),
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return prisma.agendas.delete({
        where: { id: input.id },
      });
    }),
});

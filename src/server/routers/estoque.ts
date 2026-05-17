import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { prisma } from '../trpc';
import { paginationSchema, getPaginatedResult } from '../utils/pagination';

const estoqueInputSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  peso: z.number().min(0),
  largura: z.number().min(0),
  altura: z.number().min(0),
  valorDiaria: z.number().min(0),
  quantidade: z.number().int().min(0),
  ativo: z.boolean().default(true),
});

import { type estoques } from '@prisma/client';

export const estoqueRouter = router({
  list: publicProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      return getPaginatedResult<estoques>(prisma.estoques, input);
    }),

  create: publicProcedure
    .input(estoqueInputSchema)
    .mutation(async ({ input }) => {
      return prisma.estoques.create({
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: estoqueInputSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      return prisma.estoques.update({
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
      return prisma.estoques.delete({
        where: { id: input.id },
      });
    }),
});

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';
import { estoqueSchema } from '../../lib/schemas.js';


import { type estoques } from '@prisma/client';

export const estoqueRouter = router({
  list: publicProcedure
    .input(paginationSchema)
    .query(async ({ input, ctx }) => {
      if (!ctx.session) {
        input.filtros = {
          ...input.filtros,
          ativo: true,
        };
      }
      return getPaginatedResult<estoques>(prisma.estoques, input);
    }),

  create: protectedProcedure
    .input(estoqueSchema)
    .mutation(async ({ input }) => {
      return prisma.estoques.create({
        data: {
          ...input,
          imageUrl: input.imageUrl || null,
          imageUrls: input.imageUrls.filter(Boolean),
          updatedAt: new Date(),
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: estoqueSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      return prisma.estoques.update({
        where: { id: input.id },
        data: {
          ...input.data,
          ...(input.data.imageUrl !== undefined ? { imageUrl: input.data.imageUrl || null } : {}),
          ...(input.data.imageUrls !== undefined ? { imageUrls: input.data.imageUrls.filter(Boolean) } : {}),
          updatedAt: new Date(),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.estoques.delete({
        where: { id: input.id },
      });
    }),
});

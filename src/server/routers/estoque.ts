import { base64Image, base64Gallery } from '../../lib/images.js';
import { z } from 'zod';
import { moduleProcedure, publicProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';
import { estoqueSchema } from '../../lib/schemas.js';


import { type categorias, type estoques } from '@prisma/client';

type EstoqueComCategoria = estoques & { categoria: categorias };

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
      const result = await getPaginatedResult<EstoqueComCategoria>(prisma.estoques, input, {
        include: { categoria: true },
      });
      return {
        ...result,
        data: result.data.map((item) => ({
          ...item,
          imageUrl: base64Image(item.imageUrl),
          imageUrls: base64Gallery(item.imageUrls),
        })),
      };
    }),

  create: moduleProcedure('estoque')
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

  update: moduleProcedure('estoque')
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

  delete: moduleProcedure('estoque')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.estoques.delete({
        where: { id: input.id },
      });
    }),
});

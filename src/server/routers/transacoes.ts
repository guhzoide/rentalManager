import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { prisma } from '../trpc';
import { paginationSchema, getPaginatedResult } from '../utils/pagination';
import { type transacoes } from '@prisma/client';

const transacaoInputSchema = z.object({
  descricao: z.string().min(2, "Descrição deve ter pelo menos 2 caracteres"),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  tipo: z.enum(["LUCRO", "GASTO"]),
  data: z.coerce.date(),
});

export const transacaoRouter = router({
  list: protectedProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      if (!input.orderBy) {
        input.orderBy = {
          data: 'desc',
        };
      }
      return getPaginatedResult<transacoes>(prisma.transacoes, input);
    }),

  create: protectedProcedure
    .input(transacaoInputSchema)
    .mutation(async ({ input }) => {
      return prisma.transacoes.create({
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.transacoes.delete({
        where: { id: input.id },
      });
    }),
});

import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';
import { genericRead, genericCreate, genericDelete } from '../services/genericService';

export const serviceRouter = router({
  read: publicProcedure
    .input(z.object({
      table: z.string().optional(),
      pagina: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      filtros: z.record(z.string(), z.any()).optional(),
      include: z.record(z.string(), z.any()).optional(),
      select: z.record(z.string(), z.any()).optional(),
      orderBy: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const table = ctx.table || input.table;
      if (!table) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tabela não informada.' });
      return await genericRead({ ...input, table });
    }),

  create: publicProcedure
    .input(z.object({
      table: z.string().optional(),
      Itens: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]),
      include: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const table = ctx.table || input.table;
      if (!table) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tabela não informada.' });
      return await genericCreate({ ...input, table });
    }),

  delete: publicProcedure
    .input(z.object({
      table: z.string().optional(),
      Filtros: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]),
    }))
    .mutation(async ({ input, ctx }) => {
      const table = ctx.table || input.table;
      if (!table) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tabela não informada.' });
      return await genericDelete({ ...input, table });
    }),
});

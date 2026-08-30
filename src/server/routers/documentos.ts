import { router, publicProcedure } from '../trpc.js';
import { z } from 'zod';

export const documentoRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.documentos.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await ctx.prisma.documentos.findUnique({
        where: { id: input.id },
      });
      return doc as any;
    }),
  create: publicProcedure
    .input(z.object({
      nome: z.string(),
      content: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.documentos.create({
        data: {
          nome: input.nome,
          content: input.content,
        },
      });
      return doc as any;
    }),
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      nome: z.string(),
      content: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.documentos.update({
        where: { id: input.id },
        data: {
          nome: input.nome,
          content: input.content,
        },
      });
      return doc as any;
    }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.documentos.delete({
        where: { id: input.id },
      });
      return doc as any;
    }),
  emitirNf: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Aqui integrariamos com uma API real ou de Sandbox como Focus NFe
      // Para fins de demonstração, simularemos um delay e retornaremos sucesso
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, message: 'Nota fiscal enviada para fila de processamento.' };
    }),
});

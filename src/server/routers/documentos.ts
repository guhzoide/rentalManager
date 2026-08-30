import { router, moduleProcedure } from '../trpc.js';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const documentAccess = (user: { id: string; master?: boolean }) =>
  user.master ? {} : { usuarioId: user.id };

export const documentoRouter = router({
  list: moduleProcedure('canvas').query(async ({ ctx }) => {
    return await ctx.prisma.documentos.findMany({
      where: documentAccess(ctx.session.user),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }),
  get: moduleProcedure('canvas')
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await ctx.prisma.documentos.findFirst({
        where: { id: input.id, ...documentAccess(ctx.session.user) },
      });
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado.' });
      return doc as any;
    }),
  create: moduleProcedure('canvas')
    .input(z.object({
      nome: z.string(),
      content: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.documentos.create({
        data: {
          nome: input.nome,
          content: input.content,
          usuarioId: ctx.session.user.id,
        },
      });
      return doc as any;
    }),
  update: moduleProcedure('canvas')
    .input(z.object({
      id: z.string(),
      nome: z.string(),
      content: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.documentos.findFirst({
        where: { id: input.id, ...documentAccess(ctx.session.user) },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado.' });
      const doc = await ctx.prisma.documentos.update({
        where: { id: existing.id },
        data: {
          nome: input.nome,
          content: input.content,
        },
      });
      return doc as any;
    }),
  delete: moduleProcedure('canvas')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.documentos.findFirst({
        where: { id: input.id, ...documentAccess(ctx.session.user) },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado.' });
      const doc = await ctx.prisma.documentos.delete({
        where: { id: existing.id },
      });
      return doc as any;
    }),
  emitirNf: moduleProcedure('canvas')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.documentos.findFirst({
        where: { id: input.id, ...documentAccess(ctx.session.user) },
        select: { id: true },
      });
      if (!document) throw new TRPCError({ code: 'NOT_FOUND', message: 'Documento não encontrado.' });
      // Aqui integrariamos com uma API real ou de Sandbox como Focus NFe
      // Para fins de demonstração, simularemos um delay e retornaremos sucesso
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, message: 'Nota fiscal enviada para fila de processamento.' };
    }),
});

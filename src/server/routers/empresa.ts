import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';

export const empresaRouter = router({
    list: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return prisma.empresas.findUnique({
                where: { id: input.id },
                select: {
                    id: true,
                    nome: true,
                    logoUrl: true,
                    cnpj: true,
                    telefone: true,
                },
            });
        }),
});
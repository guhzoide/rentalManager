import { z } from 'zod';
import { moduleProcedure, publicProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { empresaSchema } from '../../lib/schemas.js';

export const empresaRouter = router({
    list: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return prisma.empresas.findUnique({
                where: { id: input.id },
            });
        }),

    listAll: moduleProcedure(['empresa', 'canvas'])
        .query(async () => {
            return prisma.empresas.findMany();
        }),

    create: moduleProcedure('empresa')
        .input(empresaSchema)
        .mutation(async ({ input }) => {
            return prisma.empresas.create({
                data: {
                    ...input,
                    updatedAt: new Date(),
                }
            });
        }),

    delete: moduleProcedure('empresa')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.empresas.delete({
                where: { id: input.id },
            });
        }),

    update: moduleProcedure('empresa')
        .input(z.object({
            id: z.string(),
            data: empresaSchema,
        }))
        .mutation(async ({ input }) => {
            return prisma.empresas.update({
                where: { id: input.id },
                data: {
                    ...input.data,
                    logoUrl: input.data.logoUrl || null,
                    updatedAt: new Date(),
                },
            });
        }),
});

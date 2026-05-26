import { z } from 'zod';
import { protectedProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { empresaSchema } from '../../lib/schemas.js';

export const empresaRouter = router({
    list: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return prisma.empresas.findUnique({
                where: { id: input.id },
            });
        }),

    listAll: protectedProcedure
        .query(async () => {
            return prisma.empresas.findMany();
        }),

    create: protectedProcedure
        .input(empresaSchema)
        .mutation(async ({ input }) => {
            return prisma.empresas.create({
                data: {
                    ...input,
                    updatedAt: new Date(),
                }
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            data: empresaSchema,
        }))
        .mutation(async ({ input }) => {
            return prisma.empresas.update({
                where: { id: input.id },
                data: {
                    ...input.data,
                    updatedAt: new Date(),
                }
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.empresas.delete({
                where: { id: input.id },
            });
        }),
});
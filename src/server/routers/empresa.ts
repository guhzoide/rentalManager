import { EMPRESA_ID } from '../../lib/empresa.js';
import { base64Image } from '../../lib/images.js';
import { z } from 'zod';
import { moduleProcedure, publicProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { empresaSchema } from '../../lib/schemas.js';

export const empresaRouter = router({
    catalog: publicProcedure.query(async () => {
        const empresa = await prisma.empresas.findUnique({
            where: { id: EMPRESA_ID },
            select: { nome: true, slogan: true, sobreNos: true, logoUrl: true },
        });
        return empresa ? { ...empresa, logoUrl: base64Image(empresa.logoUrl) } : null;
    }),
    list: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const empresa = await prisma.empresas.findUnique({
                where: { id: input.id },
            });
            return empresa ? { ...empresa, logoUrl: base64Image(empresa.logoUrl) } : null;
        }),

    listAll: moduleProcedure(['empresa', 'canvas'])
        .query(async () => {
            const empresas = await prisma.empresas.findMany();
            return empresas.map((empresa) => ({ ...empresa, logoUrl: base64Image(empresa.logoUrl) }));
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

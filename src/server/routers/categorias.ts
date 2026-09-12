import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { categoriaSchema } from '../../lib/schemas.js';
import { DEFAULT_CATEGORY_ID } from '../../lib/categories.js';
import { moduleProcedure, publicProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';
import { Prisma, type categorias } from '@prisma/client';

function categoryWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Já existe uma categoria com este nome.' });
    }
    throw error;
}

export const categoriaRouter = router({
    list: publicProcedure
        .input(paginationSchema)
        .query(({ input }) => getPaginatedResult<categorias>(prisma.categorias, {
            ...input,
            orderBy: input.orderBy ?? { nome: 'asc' },
        })),

    create: moduleProcedure('estoque')
        .input(categoriaSchema)
        .mutation(async ({ input }) => {
            try {
                return await prisma.categorias.create({ data: input });
            } catch (error) {
                categoryWriteError(error);
            }
        }),

    update: moduleProcedure('estoque')
        .input(z.object({ id: z.string(), data: categoriaSchema }))
        .mutation(async ({ input }) => {
            if (input.id === DEFAULT_CATEGORY_ID) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'A categoria padrão do sistema não pode ser renomeada.' });
            }
            try {
                return await prisma.categorias.update({
                    where: { id: input.id },
                    data: input.data,
                });
            } catch (error) {
                categoryWriteError(error);
            }
        }),

    delete: moduleProcedure('estoque')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            if (input.id === DEFAULT_CATEGORY_ID) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'A categoria padrão do sistema não pode ser removida.' });
            }
            const linkedProducts = await prisma.estoques.count({ where: { categoriaId: input.id } });
            if (linkedProducts > 0) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Esta categoria está vinculada a ${linkedProducts} produto(s). Altere a categoria desses produtos antes de removê-la.`,
                });
            }
            return prisma.categorias.delete({ where: { id: input.id } });
        }),
});

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { grupoSchema } from '../../lib/schemas.js';
import { prisma, moduleProcedure, router } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';

export const grupoRouter = router({
    modules: moduleProcedure('grupos').query(async () => {
        return prisma.modulos.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } });
    }),

    list: moduleProcedure(['grupos', 'usuarios']).input(paginationSchema).query(async ({ input }) => {
        return getPaginatedResult(prisma.grupos, input, { });
    }),

    create: moduleProcedure('grupos').input(grupoSchema).mutation(async ({ input }) => {
        const validModules = await prisma.modulos.count({ where: { id: { in: input.moduloIds } } });
        if (validModules !== new Set(input.moduloIds).size) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Um ou mais módulos são inválidos.' });
        }

        return prisma.$transaction(async (tx) => {
            const counter = await tx.contadores.upsert({
                where: { id: 'grupos' },
                create: { id: 'grupos', valor: 1 },
                update: { valor: { increment: 1 } },
            });
            return tx.grupos.create({
                data: { ...input, moduloIds: [...new Set(input.moduloIds)], codigo: counter.valor },
            });
        });
    }),

    update: moduleProcedure('grupos').input(z.object({
        id: z.string(),
        data: grupoSchema,
    })).mutation(async ({ input }) => {
        const validModules = await prisma.modulos.count({ where: { id: { in: input.data.moduloIds } } });
        if (validModules !== new Set(input.data.moduloIds).size) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Um ou mais módulos são inválidos.' });
        }
        return prisma.grupos.update({
            where: { id: input.id },
            data: { ...input.data, moduloIds: [...new Set(input.data.moduloIds)] },
        });
    }),

    delete: moduleProcedure('grupos').input(z.object({ id: z.string() })).mutation(async ({ input }) => {
        const group = await prisma.grupos.findUnique({ where: { id: input.id } });
        if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'Grupo não encontrado.' });

        const users = await prisma.user.count({ where: { grupoCodigo: group.codigo } });
        if (users > 0) {
            throw new TRPCError({ code: 'CONFLICT', message: 'O grupo possui usuários vinculados.' });
        }
        return prisma.grupos.delete({ where: { id: input.id } });
    }),
});

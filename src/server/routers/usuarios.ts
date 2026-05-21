import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc.js';
import { prisma } from '../trpc.js';
import { paginationSchema, getPaginatedResult } from '../utils/pagination.js';
import { usuarioCreateSchema, usuarioUpdateSchema } from '../../lib/schemas.js';
import { hashPassword } from 'better-auth/crypto';
import crypto from 'crypto';

export const usuarioRouter = router({
    // ── Endpoint público: só retorna atendentes com WhatsApp cadastrado ──
    listAtendentes: publicProcedure
        .query(async () => {
            const atendentes = await prisma.user.findMany({
                where: { atendente: true, whatsapp: { not: null } },
                select: { id: true, name: true, whatsapp: true },
            });
            return atendentes.map((a) => ({
                id: a.id,
                nome: a.name,
                whatsapp: a.whatsapp,
            }));
        }),

    list: protectedProcedure
        .input(paginationSchema)
        .query(async ({ input }) => {
            const result = await getPaginatedResult<any>(prisma.user as any, input, {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    atendente: true,
                    whatsapp: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });

            const mappedData = result.data.map((u: any) => ({
                id: u.id,
                nome: u.name,
                email: u.email,
                atendente: u.atendente,
                whatsapp: u.whatsapp,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            }));

            return {
                ...result,
                data: mappedData,
            };
        }),

    create: protectedProcedure
        .input(usuarioCreateSchema)
        .mutation(async ({ input }) => {
            const userId = crypto.randomUUID();
            const accountId = crypto.randomUUID();
            const hashedPassword = await hashPassword(input.senha);

            const existing = await prisma.user.findUnique({
                where: { email: input.email }
            });
            if (existing) {
                throw new Error("E-mail já cadastrado");
            }

            return await prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        id: userId,
                        name: input.nome,
                        email: input.email,
                        atendente: input.atendente,
                        whatsapp: input.whatsapp,
                    }
                });

                await tx.account.create({
                    data: {
                        id: accountId,
                        userId: userId,
                        accountId: input.email,
                        providerId: "credential",
                        password: hashedPassword,
                    }
                });

                return {
                    id: user.id,
                    nome: user.name,
                    email: user.email,
                    atendente: user.atendente,
                    whatsapp: user.whatsapp,
                };
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            data: usuarioUpdateSchema,
        }))
        .mutation(async ({ input }) => {
            const { nome, email, senha, atendente, whatsapp } = input.data;

            return await prisma.$transaction(async (tx) => {
                const user = await tx.user.update({
                    where: { id: input.id },
                    data: {
                        name: nome,
                        email: email,
                        atendente: atendente,
                        whatsapp: whatsapp,
                    }
                });

                if (email) {
                    await tx.account.updateMany({
                        where: { userId: input.id, providerId: "credential" },
                        data: { accountId: email }
                    });
                }

                if (senha) {
                    const hashedPassword = await hashPassword(senha);
                    await tx.account.updateMany({
                        where: { userId: input.id, providerId: "credential" },
                        data: { password: hashedPassword }
                    });
                }

                return {
                    id: user.id,
                    nome: user.name,
                    email: user.email,
                    atendente: user.atendente,
                    whatsapp: user.whatsapp,
                };
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.user.delete({
                where: { id: input.id },
            });
        }),
});

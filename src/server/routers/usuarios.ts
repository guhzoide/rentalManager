import { z } from 'zod';
import { moduleProcedure, publicProcedure, router } from '../trpc.js';
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

    list: moduleProcedure('usuarios')
        .input(paginationSchema)
        .query(async ({ input }) => {
            const result = await getPaginatedResult<any>(prisma.user as any, input, {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    atendente: true,
                    master: true,
                    whatsapp: true,
                    grupoCodigo: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });

            const mappedData = result.data.map((u: any) => ({
                id: u.id,
                nome: u.name,
                email: u.email,
                atendente: u.atendente,
                master: u.master,
                whatsapp: u.whatsapp,
                grupoCodigo: u.grupoCodigo,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            }));

            return {
                ...result,
                data: mappedData,
            };
        }),

    create: moduleProcedure('usuarios')
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
            if (input.grupoCodigo) {
                const group = await prisma.grupos.findUnique({ where: { codigo: input.grupoCodigo } });
                if (!group) throw new Error('Grupo não encontrado');
            }

            return await prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        id: userId,
                        name: input.nome,
                        email: input.email,
                        atendente: input.atendente,
                        master: input.master,
                        whatsapp: input.whatsapp,
                        grupoCodigo: input.grupoCodigo,
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
                    master: user.master,
                    whatsapp: user.whatsapp,
                    grupoCodigo: user.grupoCodigo,
                };
            });
        }),

    update: moduleProcedure('usuarios')
        .input(z.object({
            id: z.string(),
            data: usuarioUpdateSchema,
        }))
        .mutation(async ({ input }) => {
            const { nome, email, senha, atendente, master, whatsapp, grupoCodigo } = input.data;

            if (grupoCodigo) {
                const group = await prisma.grupos.findUnique({ where: { codigo: grupoCodigo } });
                if (!group) throw new Error('Grupo não encontrado');
            }

            return await prisma.$transaction(async (tx) => {
                const user = await tx.user.update({
                    where: { id: input.id },
                    data: {
                        name: nome,
                        email: email,
                        atendente: atendente,
                        master: master,
                        whatsapp: whatsapp,
                        grupoCodigo: grupoCodigo,
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
                    master: user.master,
                    whatsapp: user.whatsapp,
                    grupoCodigo: user.grupoCodigo,
                };
            });
        }),

    delete: moduleProcedure('usuarios')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.user.delete({
                where: { id: input.id },
            });
        }),
});

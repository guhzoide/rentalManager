import crypto from 'node:crypto';
import { Client } from 'pg';
import { inspectDatabase, migrateDatabase } from '../deployment/updates.js';
import { runPrisma } from '../deployment/prisma.js';
import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';
import { EMPRESA_ID } from '../../lib/empresa.js';
import { DEFAULT_CATEGORY_ID, DEFAULT_CATEGORY_NAME } from '../../lib/categories.js';
import {
    databaseConnectionSchema,
    deployMasterSchema,
    empresaSchema,
    type DatabaseConnectionInput,
} from '../../lib/schemas.js';
import { publicProcedure, router } from '../trpc.js';

const deployTokenSchema = z.string().min(1, 'Informe o token de implantação');

const systemModules = [
    { id: 'clientes', nome: 'Clientes', descricao: 'Cadastro e gestão de clientes', icone: '👥', ordem: 1 },
    { id: 'estoque', nome: 'Estoque', descricao: 'Itens disponíveis para locação', icone: '📦', ordem: 2 },
    { id: 'agenda', nome: 'Agenda', descricao: 'Agenda de entregas e coletas', icone: '📅', ordem: 3 },
    { id: 'financeiro', nome: 'Financeiro', descricao: 'Controle financeiro', icone: '💰', ordem: 4 },
    { id: 'usuarios', nome: 'Usuários', descricao: 'Usuários do sistema', icone: '👤', ordem: 5 },
    { id: 'grupos', nome: 'Grupos de acesso', descricao: 'Permissões por grupo', icone: '🔐', ordem: 6 },
    { id: 'empresa', nome: 'Empresa', descricao: 'Dados da empresa', icone: '🏢', ordem: 7 },
    { id: 'canvas', nome: 'Kanvas', descricao: 'Editor de documentos', icone: '🖌️', ordem: 8 },
] as const;

let deploymentInProgress = false;

function assertDeployToken(receivedToken: string) {
    const configuredToken = process.env.DEPLOYTOKEN?.trim();
    if (!configuredToken) {
        throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'DEPLOYTOKEN não foi configurado no ambiente do servidor.',
        });
    }

    const receivedHash = crypto.createHash('sha256').update(receivedToken).digest();
    const configuredHash = crypto.createHash('sha256').update(configuredToken).digest();
    if (!crypto.timingSafeEqual(receivedHash, configuredHash)) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token de implantação inválido.' });
    }
}

function createDatabaseUrl(connection: DatabaseConnectionInput) {
    const host = connection.host.includes(':') && !connection.host.startsWith('[')
        ? `[${connection.host}]`
        : connection.host;
    return `postgresql://${encodeURIComponent(connection.username)}:${encodeURIComponent(connection.password)}`
        + `@${host}:${connection.port}/${encodeURIComponent(connection.database)}?schema=public&connect_timeout=10`;
}

function connectionClient(connection: DatabaseConnectionInput) {
    return new Client({
        host: connection.host, port: connection.port, database: connection.database,
        user: connection.username, password: connection.password, connectionTimeoutMillis: 10_000,
    });
}

async function checkConnection(connection: DatabaseConnectionInput) {
    const client = connectionClient(connection);
    try {
        await client.connect();
        return await inspectDatabase(client);
    } finally {
        await client.end();
    }
}

function safeDeploymentError(error: unknown, connection: DatabaseConnectionInput) {
    const rawMessage = error instanceof Error ? error.message : 'Não foi possível concluir a implantação.';
    return rawMessage
        .split(connection.password).join('********')
        .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'endereço do banco');
}

export const deployRouter = router({
    validateToken: publicProcedure
        .input(z.object({ token: deployTokenSchema }))
        .mutation(({ input }) => {
            assertDeployToken(input.token);
            return { valid: true };
        }),

    testConnection: publicProcedure
        .input(z.object({ token: deployTokenSchema, connection: databaseConnectionSchema }))
        .mutation(async ({ input }) => {
            assertDeployToken(input.token);
            try {
                const status = await checkConnection(input.connection);
                return { connected: true, ...status };
            } catch (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Não foi possível conectar ao banco: ${safeDeploymentError(error, input.connection)}`,
                });
            }
        }),

    update: publicProcedure
        .input(z.object({ token: deployTokenSchema, connection: databaseConnectionSchema }))
        .mutation(async ({ input }) => {
            assertDeployToken(input.token);
            if (deploymentInProgress) throw new TRPCError({ code: 'CONFLICT', message: 'Já existe uma operação de banco em andamento.' });
            deploymentInProgress = true;
            const lockClient = connectionClient(input.connection);
            let targetDatabase: PrismaClient | null = null;
            try {
                await lockClient.connect();
                const { rows: [lock] } = await lockClient.query('SELECT pg_try_advisory_lock(724631902) AS acquired');
                if (!lock.acquired) throw new TRPCError({ code: 'CONFLICT', message: 'Este banco já está sendo atualizado. Aguarde e tente novamente.' });
                const status = await inspectDatabase(lockClient);
                if (!status.installed) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Banco ainda não implantado. Teste a conexão novamente para iniciar a implantação.' });
                const databaseUrl = createDatabaseUrl(input.connection);
                await migrateDatabase(status, (args, allowed) => runPrisma(databaseUrl, args, allowed));
                const migrated = await inspectDatabase(lockClient);
                if (!migrated.hasMigrationHistory || migrated.pendingUpdates.length > 0) {
                    throw new Error('O Prisma não confirmou a aplicação das migrations. A operação não foi concluída.');
                }
                targetDatabase = new PrismaClient({ datasourceUrl: databaseUrl });
                await targetDatabase.$transaction(async (transaction) => {
                    await transaction.categorias.upsert({
                        where: { id: DEFAULT_CATEGORY_ID },
                        create: { id: DEFAULT_CATEGORY_ID, nome: DEFAULT_CATEGORY_NAME },
                        update: { nome: DEFAULT_CATEGORY_NAME },
                    });
                    for (const module of systemModules) {
                        await transaction.modulos.upsert({ where: { id: module.id }, create: { ...module }, update: {} });
                    }
                });
                return { success: true, mode: 'updated' as const };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Falha na atualização: ${safeDeploymentError(error, input.connection)}` });
            } finally {
                try { await targetDatabase?.$disconnect(); }
                finally { try { await lockClient.end(); } finally { deploymentInProgress = false; } }
            }
        }),

    execute: publicProcedure
        .input(z.object({
            token: deployTokenSchema,
            connection: databaseConnectionSchema,
            company: empresaSchema,
            masterUser: deployMasterSchema,
        }))
        .mutation(async ({ input }) => {
            assertDeployToken(input.token);
            if (deploymentInProgress) {
                throw new TRPCError({ code: 'CONFLICT', message: 'Já existe uma implantação em andamento.' });
            }

            deploymentInProgress = true;
            const databaseUrl = createDatabaseUrl(input.connection);
            let targetDatabase: PrismaClient | null = null;
            const lockClient = connectionClient(input.connection);

            try {
                await lockClient.connect();
                const { rows: [lock] } = await lockClient.query('SELECT pg_try_advisory_lock(724631902) AS acquired');
                if (!lock.acquired) throw new TRPCError({ code: 'CONFLICT', message: 'Este banco já está sendo atualizado. Aguarde e tente novamente.' });
                const status = await inspectDatabase(lockClient);
                if (status.installed) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Banco já implantado. Teste a conexão novamente para atualizar.' });
                await migrateDatabase(status, (args, allowed) => runPrisma(databaseUrl, args, allowed));
                const migrated = await inspectDatabase(lockClient);
                if (!migrated.hasMigrationHistory || migrated.pendingUpdates.length > 0) {
                    throw new Error('O Prisma não confirmou a aplicação das migrations. A operação não foi concluída.');
                }

                targetDatabase = new PrismaClient({ datasourceUrl: databaseUrl });
                await targetDatabase.$connect();

                const hashedPassword = await hashPassword(input.masterUser.senha);
                const userId = crypto.randomUUID();

                await targetDatabase.$transaction(async (transaction) => {
                    await transaction.empresas.upsert({
                        where: { id: EMPRESA_ID },
                        create: { id: EMPRESA_ID, ...input.company },
                        update: input.company,
                    });

                    await transaction.categorias.upsert({
                        where: { id: DEFAULT_CATEGORY_ID },
                        create: { id: DEFAULT_CATEGORY_ID, nome: DEFAULT_CATEGORY_NAME },
                        update: { nome: DEFAULT_CATEGORY_NAME },
                    });

                    for (const module of systemModules) {
                        await transaction.modulos.upsert({
                            where: { id: module.id },
                            create: { ...module },
                            update: { ...module, ativo: true },
                        });
                    }

                    await transaction.user.create({
                        data: {
                            id: userId,
                            name: input.masterUser.nome,
                            email: input.masterUser.email,
                            emailVerified: true,
                            master: true,
                            atendente: false,
                        },
                    });
                    await transaction.account.create({
                        data: {
                            id: crypto.randomUUID(),
                            userId,
                            accountId: input.masterUser.email,
                            providerId: 'credential',
                            password: hashedPassword,
                        },
                    });
                });

                return { success: true, mode: "created" as const };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Falha na implantação: ${safeDeploymentError(error, input.connection)}`,
                });
            } finally {
                try { await targetDatabase?.$disconnect(); }
                finally { try { await lockClient.end(); } finally { deploymentInProgress = false; } }
            }
        }),
});

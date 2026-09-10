import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';
import { EMPRESA_ID } from '../../lib/empresa.js';
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

async function checkConnection(connection: DatabaseConnectionInput) {
    const client = new PrismaClient({ datasourceUrl: createDatabaseUrl(connection) });
    try {
        await client.$connect();
        await client.$queryRaw`SELECT 1`;
    } finally {
        await client.$disconnect();
    }
}

function safeDeploymentError(error: unknown, connection: DatabaseConnectionInput) {
    const rawMessage = error instanceof Error ? error.message : 'Não foi possível concluir a implantação.';
    return rawMessage
        .split(connection.password).join('********')
        .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'endereço do banco');
}

async function applyMigrations(databaseUrl: string) {
    const processResult = spawn(
        process.execPath,
        ['x', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
        {
            cwd: process.cwd(),
            env: { ...process.env, DATABASE_URL: databaseUrl },
        },
    );

    let standardOutput = '';
    let errorOutput = '';
    processResult.stdout.on('data', (chunk) => { standardOutput += String(chunk); });
    processResult.stderr.on('data', (chunk) => { errorOutput += String(chunk); });
    const exitCode = await new Promise<number>((resolve, reject) => {
        processResult.once('error', reject);
        processResult.once('close', (code) => resolve(code ?? 1));
    });

    if (exitCode !== 0) {
        throw new Error(errorOutput.trim() || standardOutput.trim() || 'Falha ao aplicar o schema do banco.');
    }
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
                await checkConnection(input.connection);
                return { connected: true };
            } catch (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Não foi possível conectar ao banco: ${safeDeploymentError(error, input.connection)}`,
                });
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

            try {
                await checkConnection(input.connection);
                await applyMigrations(databaseUrl);

                targetDatabase = new PrismaClient({ datasourceUrl: databaseUrl });
                await targetDatabase.$connect();

                const existingUser = await targetDatabase.user.findUnique({
                    where: { email: input.masterUser.email },
                    select: { id: true },
                });
                if (existingUser) {
                    throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário com esse e-mail no banco informado.' });
                }

                const hashedPassword = await hashPassword(input.masterUser.senha);
                const userId = crypto.randomUUID();

                await targetDatabase.$transaction(async (transaction) => {
                    await transaction.empresas.upsert({
                        where: { id: EMPRESA_ID },
                        create: { id: EMPRESA_ID, ...input.company },
                        update: input.company,
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

                return { success: true };
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Falha na implantação: ${safeDeploymentError(error, input.connection)}`,
                });
            } finally {
                await targetDatabase?.$disconnect();
                deploymentInProgress = false;
            }
        }),
});

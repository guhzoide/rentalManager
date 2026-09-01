import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";
import { customSession } from "better-auth/plugins";

const origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];

let baseURL = process.env.BETTER_AUTH_URL?.trim() || "";

if (baseURL && !baseURL.startsWith("http://") && !baseURL.startsWith("https://")) {
    baseURL = `https://${baseURL}`;
}

if (baseURL && baseURL.endsWith("/")) {
    baseURL = baseURL.slice(0, -1);
}

if (baseURL && !origins.includes(baseURL)) {
    origins.push(baseURL);
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    session: {
        expiresIn: 60 * 60,
        updateAge: 60 * 5,
    },
    databaseHooks: {
        session: {
            create: {
                before: async (session) => {
                    await prisma.session.deleteMany({
                        where: { userId: session.userId },
                    });
                    return { data: session };
                },
            },
        },
    },
    baseURL: baseURL || undefined,
    trustedOrigins: origins,
    plugins: [
        customSession(async ({ user, session }) => {
            const databaseUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { grupoCodigo: true, master: true },
            });
            const group = !databaseUser?.master && databaseUser?.grupoCodigo
                ? await prisma.grupos.findUnique({ where: { codigo: databaseUser.grupoCodigo } })
                : null;
            const allowedPageIds = databaseUser?.master
                ? (await prisma.modulos.findMany({ where: { ativo: true }, select: { id: true } })).map((module) => module.id)
                : group?.moduloIds ?? [];
            const allowedModules = await prisma.modulos.findMany({
                where: { id: { in: allowedPageIds }, ativo: true },
                orderBy: { ordem: 'asc' },
                select: { id: true, nome: true, descricao: true, icone: true, ordem: true },
            });

            return {
                session,
                user: {
                    ...user,
                    grupoCodigo: databaseUser?.grupoCodigo ?? null,
                    master: databaseUser?.master ?? false,
                    allowedPages: allowedModules.map((module) => module.id),
                    allowedModules,
                },
            };
        }),
    ],
});
export type Auth = typeof auth;

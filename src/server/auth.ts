import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";

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
        provider: "mongodb",
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
});
export type Auth = typeof auth;

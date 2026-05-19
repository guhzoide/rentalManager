import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "mongodb",
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ["http://localhost:5173", "http://127.0.0.1:5173"],
});
export type Auth = typeof auth;

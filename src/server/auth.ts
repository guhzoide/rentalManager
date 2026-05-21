import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";

const origins = ["http://localhost:5173", "http://127.0.0.1:5173"];

if (process.env.BETTER_AUTH_URL) {
    origins.push(process.env.BETTER_AUTH_URL);
}
if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "mongodb",
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: origins,
});
export type Auth = typeof auth;

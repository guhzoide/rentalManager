import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";

const origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://rental-manager-rosy.vercel.app",
    "https://*.vercel.app",
];

let baseURL = process.env.BETTER_AUTH_URL?.trim() || "";

if (baseURL && !baseURL.startsWith("http://") && !baseURL.startsWith("https://")) {
    baseURL = `https://${baseURL}`;
}

if (baseURL && baseURL.endsWith("/")) {
    baseURL = baseURL.slice(0, -1);
}

if (!baseURL && process.env.VERCEL_URL) {
    baseURL = `https://${process.env.VERCEL_URL}`;
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
    baseURL: baseURL || undefined,
    trustedOrigins: origins,
});
export type Auth = typeof auth;

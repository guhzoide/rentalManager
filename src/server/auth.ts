import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";

const origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://rental-manager-rosy.vercel.app",
];

let baseURL = process.env.BETTER_AUTH_URL || "";

// Add protocol if missing
if (baseURL && !baseURL.startsWith("http://") && !baseURL.startsWith("https://")) {
    baseURL = `https://${baseURL}`;
}

// Remove trailing slash if present
if (baseURL && baseURL.endsWith("/")) {
    baseURL = baseURL.slice(0, -1);
}

// Fallback to Vercel URL if BETTER_AUTH_URL is missing
if (!baseURL && process.env.VERCEL_URL) {
    baseURL = `https://${process.env.VERCEL_URL}`;
}

if (baseURL) {
    origins.push(baseURL);
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "mongodb",
    }),
    emailAndPassword: {
        enabled: true,
    },
    baseURL: baseURL || undefined,
    trustedOrigins: origins,
});
export type Auth = typeof auth;

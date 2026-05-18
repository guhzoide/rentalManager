import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: window.location.origin, // Vite proxy handles /api/auth to backend
});

export const { signIn, signUp, signOut, useSession } = authClient;

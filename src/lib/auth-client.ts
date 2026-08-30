import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import type { auth } from "../server/auth";

export const authClient = createAuthClient({
    baseURL: window.location.origin, // Vite proxy handles /api/auth to backend
    plugins: [customSessionClient<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
